# Known Issues

**Last updated:** 2026-07-28

## Operational / infrastructure

1. **Netlify env-var API can silently no-op.** During initial deployment, the Netlify MCP
   connector's `manage-env-vars` write operation reported `"Environment variable upserted"`
   for `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `DIRECT_URL`, but a subsequent
   `getAllEnvVars` read — and the actual build — showed only the two vars that had been set
   through a different path. Root cause not confirmed (possibly a legacy-vs-new env-var
   store split on Netlify's backend). **Workaround in place:** those three vars were set
   directly via the Netlify dashboard UI, which resolved it. If env vars ever need to
   change again, prefer the UI over the API tool, or verify via a real rebuild afterward —
   don't trust the "upserted" response alone.
2. **Supabase free-tier project auto-pauses** after ~1 week of inactivity. If the app stops
   responding, check the Supabase dashboard and click "Restore" — no data loss, ~1 minute.
3. **Supabase free-tier email sending is rate-limited** (a handful of emails/hour). Rapid
   repeated signups during testing can trigger "email rate limit exceeded." Not an app bug.
4. **Local `.next` build cache must never be included in a manual zip-based deploy** — it
   can exceed 500MB and causes the upload to fail with an opaque `400 Bad Request`. Not
   relevant now that deployment is git-based (Netlify builds fresh from source), but if
   anyone ever reaches for a manual `netlify deploy`-style zip upload again, delete `.next`
   first.

## Application-level

5. **No automated test suite.** All verification so far has been manual (browser-driven,
   via temporary QA accounts created and torn down each session). `src/lib/expenses/split.ts`
   and `src/lib/settlements/engine.ts` are pure functions and would be cheap to unit test —
   recommended first testing investment.
6. **`deleteExpense` has no server-side confirmation step** — the client's `confirm()`
   dialog is the only guard against an accidental permanent delete. The admin-only role
   check is the real security boundary; the confirm dialog is just a UX safety net and
   could theoretically be bypassed by a crafted request from an admin's own session (they'd
   only be deleting their own household's data, so impact is limited to "admin deletes
   something without meaning to").
7. **No WCAG accessibility audit performed.** Forms have labels and semantic HTML but
   contrast ratios, keyboard navigation, and screen-reader behavior haven't been
   systematically checked.
8. **Timezone formatting requires `timeZone: 'UTC'` explicitly.** A real bug was caught and
   fixed during development: `Date.toLocaleString()` without an explicit `timeZone: 'UTC'`
   option rolled month boundaries back by one day depending on the server's local timezone
   (showed "June 2026" instead of "July 2026"). All date-math in this app uses
   `Date.UTC(...)` construction and `timeZone: 'UTC'` in formatting — **keep this pattern**
   for any new date display code.
9. **`RecurringExpenseTemplate` and `AuditLog` tables exist but do nothing.** Don't assume
   recurring expenses auto-generate, or that an audit trail is being recorded, just because
   the schema has tables for them.

## Design limitations (accepted, not bugs)

10. **Vendor uniqueness is case-sensitive** (`@@unique([householdId, name])` on exact
    string match). "Costco" and "costco" would be saved as two separate vendor entries.
    Acceptable for MVP; would need a citext column or normalized-lowercase index to fix.
11. **No RLS on the database** — see Architecture doc §4. All authorization is
    application-layer. This is a deliberate simplification for a single-household app, not
    an oversight, but should be revisited before any multi-tenant use.
