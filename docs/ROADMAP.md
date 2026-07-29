# Development Roadmap

**Last updated:** 2026-07-28

## Phase 1 — MVP (complete, live in production)

- [x] Next.js + TypeScript + Tailwind + Prisma + Supabase scaffolding
- [x] Database schema (household/family/member/category/subcategory/expense/settlement/vendor)
- [x] Supabase authentication (signup/login/logout, role-based access)
- [x] Seed data (household, 2 families, 15 default categories)
- [x] Category & subcategory management (CRUD, archive/restore, reorder)
- [x] Expense entry with 4 split methods, vendor autocomplete, Edit/Void/Delete
- [x] Per-subcategory default split rule + recurring flag (moved off per-expense entry)
- [x] Monthly settlement engine with debt-simplified transfer instructions
- [x] Dashboard (balances, top categories, recent expenses, month/year heading)
- [x] GitHub backup (`psinthunava/Encasa`)
- [x] Netlify deployment with CI (auto-deploy on push to `master`)

## Phase 1.5 — Bills (complete, added ahead of the Phase 2 queue below)

Inserted 2026-07-28 per explicit user request, out of the priority order set below (History
view → Reports → Receipt upload never included Bills at all).

- [x] `Bill`/`BillPayment`/`BillAttachment` schema — track a vendor invoice from arrival to
  payoff (vendor, invoice #, statement/due dates, amount due)
- [x] Manual entry + attach/scan (photo/PDF, Supabase Storage) — **no OCR** (deliberately
  deferred, see PRD §4 and Decision Log)
- [x] Open-bills list (Unpaid/Partial, sorted by due date, balance shown), paid bills drop
  out of the default list but remain reachable (`/bills?status=paid`)
- [x] Each recorded payment (partial or final) immediately generates its own `Expense`,
  split per the bill's category/subcategory rule — no changes needed to the settlement
  engine or balance calculations

## Phase 2 — Usability layer (not started)

Priority order, per user direction 2026-07-28:

1. **History view with filters/search** — Expenses page currently shows only the last 100
   with no filtering. Add: date range, category, family, vendor, tag filters; free-text
   search across description/vendor/notes.
2. **Reports + CSV export** — Monthly summary, category summary, family balance report,
   vendor report; CSV export; print-friendly layout. (PDF/Excel export deferred to Phase 3.)
3. **Receipt upload** — Attach PDF/JPEG/PNG/HEIC to an expense, stored in Supabase Storage
   (bucket not yet created). Needs: storage bucket + RLS-equivalent access policy (or
   signed URLs, consistent with the app's no-RLS architecture — see Architecture doc §4),
   upload UI on the expense form, thumbnail/link display on the expenses list.

## Phase 3 — Deferred features (from original spec, not yet scheduled)

- Recurring expense **auto-generation** (the `RecurringExpenseTemplate` table exists;
  nothing generates `Expense` rows from it yet)
- Two-factor authentication (2FA)
- Notifications (large-expense alert, settlement reminder, upcoming recurring expense)
- Audit log UI (the `AuditLog` table exists; nothing writes to it yet, no admin viewer)
- Multiple households per account (schema already supports it structurally; app logic
  currently assumes one household)
- Budget planning / budget-vs-actual
- PDF/Excel export, direct printer configuration
- Bank/credit card import, OCR on receipts
- Multi-language, multi-currency
- Automated test suite (unit tests for `split.ts`/`engine.ts` would be high-value and low
  effort — pure functions, no mocking needed)
- Installable PWA configuration (manifest + service worker not yet added)
- WCAG accessibility audit

## Explicitly out of scope

See PRD §6.
