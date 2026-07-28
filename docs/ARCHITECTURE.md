# Architecture Document

**Last updated:** 2026-07-28

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.12 (App Router, Turbopack) | **Not** the Next.js of common training data — see `AGENTS.md` / `CLAUDE.md`. Bundled docs live at `node_modules/next/dist/docs/`. |
| Language | TypeScript | Strict mode on. |
| UI | React 19, Tailwind CSS 4 | No component library; hand-built with Tailwind utility classes. |
| ORM | Prisma 7.9.1 | Uses the new **no-Rust-engine / driver-adapter** architecture (breaking change from Prisma ≤6). |
| DB driver adapter | `@prisma/adapter-pg` + `pg` | Wraps `node-postgres`. |
| Database | Postgres, hosted on Supabase | Accessed via **direct Postgres connection**, not Supabase's PostgREST/RLS layer — see §4. |
| Auth | Supabase Auth via `@supabase/ssr` | Email/password only currently. |
| File storage | Supabase Storage | Provisioned, not yet wired to any feature (receipts are planned, not built). |
| Hosting | Netlify | Auto-deploys from GitHub `master` via `@netlify/plugin-nextjs` (Next Runtime v5). |
| Source control | GitHub — `psinthunava/Encasa` | `master` is the only branch in use. |
| Validation | Zod 4 | Server Action input validation. |

## 2. Repository layout

```
apt-expense-share/
├── prisma/
│   ├── schema.prisma          # canonical DB schema (see DATABASE_SCHEMA.md)
│   ├── migrations/            # one folder per migration, applied via `prisma migrate`
│   └── seed.ts                # one-time seed: household, families, default categories
├── prisma.config.ts           # Prisma CLI config (Prisma 7 moved config out of schema.prisma)
├── src/
│   ├── proxy.ts                # Next.js Proxy (was "middleware" pre-v16) — session refresh + optimistic auth redirect
│   ├── app/
│   │   ├── layout.tsx           # root layout (fonts, metadata)
│   │   ├── login/, signup/      # public routes, outside the (app) group
│   │   └── (app)/                # route group with the authenticated shell
│   │       ├── layout.tsx        # header/nav, calls requireMember()
│   │       ├── page.tsx          # dashboard
│   │       ├── categories/       # category/subcategory management (admin-only)
│   │       ├── expenses/         # list, new, [id]/edit, shared expense-form.tsx
│   │       └── settlements/      # settlement engine UI
│   └── lib/
│       ├── auth/                 # dal.ts (getCurrentMember/requireMember/requireAdmin), actions.ts (login/signup/logout)
│       ├── categories/actions.ts # category & subcategory Server Actions incl. split config
│       ├── expenses/             # actions.ts (CRUD), split.ts (pure split-math functions)
│       ├── settlements/          # actions.ts, engine.ts (debt simplification)
│       ├── vendors/actions.ts    # vendor autocomplete save/delete
│       ├── supabase/             # client.ts (browser), server.ts (RSC/Actions), proxy.ts (session refresh helper), admin.ts (service-role client)
│       └── prisma.ts             # PrismaClient singleton (pooled connection, driver adapter)
└── docs/                        # this documentation set
```

## 3. Authentication & authorization flow

1. **Signup/login** (`src/lib/auth/actions.ts`) use the Supabase server client
   (`src/lib/supabase/server.ts`) to create/verify the Supabase Auth user, then create/read
   a matching `Member` row in our own Postgres via Prisma. `Member.id` **equals** the
   Supabase `auth.users.id` (uuid) — there is no separate password/credential storage in
   our schema.
2. **Session refresh**: `src/proxy.ts` runs on (almost) every request, refreshes the
   Supabase session cookie, and does an *optimistic* redirect (unauthenticated → `/login`,
   authenticated hitting `/login`|`/signup` → `/`). This is a UX convenience only.
3. **Real authorization**: every page and Server Action calls `requireMember()` or
   `requireAdmin()` from `src/lib/auth/dal.ts`, which re-fetches the Supabase user and the
   corresponding `Member` (with role) fresh, per Next.js's official Data Access Layer
   pattern. Nothing trusts the proxy alone.

## 4. Data access: Prisma bypasses Supabase RLS — by design

Supabase's typical model routes app queries through PostgREST with Row Level Security
policies. **This app does not do that.** `src/lib/prisma.ts` connects directly to Postgres
using `@prisma/adapter-pg`, with credentials that have full table access. Supabase is used
here purely as **managed Postgres + Auth + Storage infrastructure**, not as the query layer.

Consequence: **all authorization is enforced in the application layer** (the DAL and each
Server Action), not in the database via RLS policies. This was a deliberate simplification
for a single-household app — see Decision Log entry on this topic. If the app ever becomes
multi-tenant/multi-household, this should be revisited.

## 5. Database connection strategy

Two separate Postgres connection strings are used, both to the same Supabase project:

- `DATABASE_URL` — **pooled** (PgBouncer, port 6543), used by the running app
  (`src/lib/prisma.ts`) for normal query traffic.
- `DIRECT_URL` — **direct** (port 5432), used only by the Prisma CLI (`prisma.config.ts`)
  for migrations, since pooled connections can break Prisma Migrate's advisory locks.

## 6. Split-calculation architecture

`src/lib/expenses/split.ts` contains pure, framework-free functions:
`computeEqualSplit`, `computePercentageSplit`, `computeFixedSplit` (remainder-aware),
`computeCustomSplit`, and the dispatcher `computeSplitsFromSplitConfig`. This same
dispatcher is called from both the server (`createExpense`/`updateExpense`) and the client
(`expense-form.tsx`, for the live preview badge), so the preview shown to the user is
guaranteed to match what actually gets persisted.

## 7. Deployment topology

```
GitHub (psinthunava/Encasa, master)
        │  push
        ▼
Netlify (encasa-household-expenses)
   - auto-builds via @netlify/plugin-nextjs on every push to master
   - build command: npm run build → "prisma generate && next build"
   - env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
     SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, DIRECT_URL
        │
        ▼
Supabase project (agtgpmautigfylbkeeyn)
   - Postgres (data)
   - Auth (credentials/sessions)
   - Storage (provisioned, unused so far)
```

Live URL: https://encasa-household-expenses.netlify.app

**Known operational gotcha:** the Netlify MCP tool's `manage-env-vars` write operation can
report success while the value is not actually visible to the build process (a real
incident during initial deploy — see Known Issues and Decision Log). When in doubt, verify
or set env vars directly via the Netlify dashboard UI, not just the API.

## 8. What Next.js 16 changed that matters here

- `middleware.ts` → renamed **`proxy.ts`**, exported function renamed `proxy`.
- Route params/searchParams are `Promise`s — always `await params`.
- `PageProps<'/route'>` / `LayoutProps<'/route'>` global helper types are available,
  generated at build/dev time.
- Cache Components (`cacheComponents: true` in `next.config.ts`) is **opt-in** and **not
  enabled** in this project — we use the conventional (pre-PPR) caching/rendering model
  throughout, which behaves closer to Next.js 13–15.
- `create-next-app` ships an `AGENTS.md`/`CLAUDE.md` pair instructing agents to consult
  `node_modules/next/dist/docs/` (version-matched docs) instead of training data. Honor
  this before making any Next.js-specific architectural change.
