# Decision Log

**Last updated:** 2026-07-28

Each entry: **Decision** — Context — Rationale — Alternatives considered.

---

### D1 — Managed stack over self-hosted (2026-07-27)
**Decision:** Next.js + Supabase (Postgres/Auth/Storage) + Netlify, instead of the
originally-specified NestJS + Docker + self-hosted AWS/Azure/GCP.
**Context:** User is not a backend/DevOps engineer (needed help installing Git and Node).
**Rationale:** Zero server management, zero patching, free tier covers this household's
scale, faster to build correctly. User explicitly chose this over the full enterprise
stack when presented with the tradeoff.
**Alternatives considered:** Full self-hosted stack per original spec — rejected due to
ongoing ops burden with no corresponding benefit at this scale.

### D2 — MVP-first delivery over full waterfall (2026-07-27)
**Decision:** Build a working app incrementally, in reviewed chunks, rather than
formal SRS → ER diagrams → wireframes → prototype → build, as the original master prompt's
12-phase process specified.
**Rationale:** User explicitly chose this when asked. Faster feedback loop for a
non-technical stakeholder.

### D3 — Split configuration lives on Subcategory, not Category (2026-07-27→28)
**Decision:** `splitMethod` + `SubcategorySplitConfig` on `Subcategory`. (Originally built
on `Category`, then explicitly moved per user request.)
**Rationale:** Finer-grained control — e.g. "Electricity" and "Water" under "Utilities" can
have different split rules. Categories with zero subcategories, or expenses with none
selected, fall back to `EQUAL`.
**Consequence:** Required a migration dropping `CategorySplitConfig`/`Category.splitMethod`
and adding the subcategory equivalents. No real user data existed in that table yet, so
this was a clean swap, not a lossy migration.

### D4 — FIXED split = remainder-based, not sum-must-equal-total (2026-07-27)
**Decision:** `FIXED` split lets N−1 families have a fixed dollar amount; exactly one
family is marked "remaining balance" and absorbs whatever's left.
**Context:** Original spec example: "Family A = $300, Family B = Remaining Balance."
**Rationale:** A naive "fixed amounts must sum to the exact total" design breaks the moment
the expense total changes (e.g. rent varies slightly month to month) — the whole point of a
*default* rule is that it should keep working without re-entry. Remainder-based fixed
amounts stay correct regardless of total.
**Alternatives considered:** Treating `FIXED` amounts as proportional weights (mathematically
identical to `CUSTOM`) — rejected as redundant with `CUSTOM` and less faithful to the
spec's literal example.

### D5 — Recurring flag moved from per-expense to per-subcategory default (2026-07-28)
**Decision:** Removed the "This is a recurring expense" checkbox from expense entry;
`Subcategory.isRecurring` now determines it automatically, editable alongside the split
config.
**Rationale:** User request, following the same pattern as D3 — properties that are true of
*a category of spending* (rent is always recurring) shouldn't be re-asked every time.

### D6 — Vendor is a separate lookup table, decoupled from `Expense.vendor` (2026-07-28)
**Decision:** `Vendor` model for autocomplete/management; `Expense.vendor` stays a plain
string, not a foreign key.
**Rationale:** Deleting a saved vendor from the autocomplete list should never corrupt or
cascade into historical expense records. Simpler than a full FK relationship for what's
fundamentally a convenience feature.

### D7 — Delete is admin-only and permanent; Void is available to creators and is soft (2026-07-28)
**Decision:** Two distinct removal paths with different permission levels and reversibility.
**Rationale:** Matches the original spec principle "never delete financial history" for the
default/common case (Void), while still providing a real permanent-delete path for
admins cleaning up genuine mistakes/duplicates, explicitly requested by the user.

### D8 — No Row Level Security; all authorization is application-layer (2026-07-27)
**Decision:** Prisma connects directly to Postgres (bypassing PostgREST/RLS); every
Server Action and page independently calls `requireMember()`/`requireAdmin()`.
**Rationale:** Standard, well-documented pattern (Next.js's own "Data Access Layer"
guidance) for a single-tenant app; avoids maintaining two parallel authorization systems
(RLS policies + app checks) that could drift out of sync.
**Risk accepted:** If this app ever becomes genuinely multi-tenant, this should be
revisited — see Known Issues #11.

### D9 — Household name is data-driven, not hardcoded (2026-07-28)
**Decision:** Login/signup/dashboard header pull the household display name from the
`Household.name` DB column instead of a hardcoded string.
**Context:** User renamed the household from the placeholder "Sinthunava & Junya Household"
to "Encasa Household Expenses" and wanted it fixable without a code change next time.

### D10 — Prisma 7 driver-adapter architecture, two connection strings (2026-07-27)
**Decision:** `@prisma/adapter-pg` for the running app (pooled `DATABASE_URL`, port 6543);
plain direct connection (`DIRECT_URL`, port 5432) for the Prisma CLI via `prisma.config.ts`.
**Rationale:** Prisma 7 removed the Rust query engine binary in favor of JS driver
adapters; `prisma migrate`'s advisory locks are unreliable over a PgBouncer transaction
pool, so migrations need the direct connection while the app itself benefits from pooling.
**Note:** This was discovered by reading current Prisma documentation mid-build, since the
installed version was well beyond the assistant's training data — see `AGENTS.md` /
`CLAUDE.md` in the repo root, which instruct exactly this ("read bundled/current docs,
don't assume").

### D11 — Netlify env vars: prefer dashboard UI over API tool when in doubt (2026-07-28)
**Decision:** After the Netlify MCP connector's env-var write silently failed for 3 of 5
required variables (see Known Issues #1), the working fix was setting them directly via
the Netlify dashboard UI.
**Rationale:** Empirical — the UI path is confirmed reliable, the API path had an
unexplained gap between "success" response and actual build-time availability.

### D12 — Bill→Expense conversion happens per-payment, not once at full payment (2026-07-28)
**Decision:** Every recorded `BillPayment` (partial or final) immediately creates its own
`Expense`, paid by whichever family made that specific payment, split per the bill's
category/subcategory rule via the existing `computeSplitsFromSplitConfig`.
**Context:** `Expense.paidByFamilyId` is a single required field, but a bill can be paid off
in installments, potentially by different families. An initial design considered a single
"designated payer" field on `Bill` with one lump-sum `Expense` created only at full payment.
**Rationale:** Per-payment conversion correctly handles the multi-family-installment case
(two families each paying half of one bill produces two correctly-attributed, correctly-
split Expense rows) without any change to the core `Expense` model, and keeps
balances/settlements current as money actually moves rather than only at the end.
**Consequence:** No changes needed to `src/lib/settlements/engine.ts` or
`computeBalancesForPeriod` — bill-payment-generated Expenses are indistinguishable from
manually-entered ones.
**Alternatives considered:** Single designated payer + one lump-sum Expense at full payment
— rejected as simpler but incorrect for bills paid by more than one family over time.

### D13 — Bills: OCR deliberately deferred, attach-only for now (2026-07-28)
**Decision:** The Bills feature supports manual entry plus photo/PDF attach (including
mobile camera capture via `capture="environment"`), with no text-extraction/OCR step.
**Rationale:** Matches the PRD, which already lists "OCR on receipts" as a Future/deferred
item, and the stated "zero ongoing cost" success criterion — cloud OCR APIs are usage-
priced, and a free client-side OCR library was also explicitly declined in favor of keeping
this pass simple. Can be revisited later without any schema change (attachments already
exist as files; OCR would just read them).

### D14 — First use of Supabase Storage: private bucket + signed URLs + service-role client (2026-07-28)
**Decision:** Bill attachments use a new, private `bill-attachments` Storage bucket.
Uploads, downloads (via `createSignedUrl`, 1-hour expiry), and deletes all go through the
service-role admin client (`src/lib/supabase/admin.ts`), never the anon/browser client.
**Rationale:** Consistent with D8 — this app enforces all authorization in the application
layer (`requireMember`/`requireAdmin`), not via Supabase RLS/storage policies. Every bill
Server Action already re-checks identity/role before touching Storage, so the service-role
client is safe to use here the same way it's used for Postgres access.
