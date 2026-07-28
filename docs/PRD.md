# Product Requirements Document (PRD)

**Project:** Encasa Household Expenses
**Owner:** Paul Sinthunava
**Last updated:** 2026-07-28
**Status:** MVP live in production

## 1. Vision

A secure, web-based system for multiple families sharing one household to track shared
expenses, split costs flexibly, see who owes whom, and settle up monthly — accessible from
desktop, tablet, and mobile with no software installation.

## 2. Current household

- **Household:** Encasa Household Expenses
- **Families:** Sinthunava, Junya (2 families; schema supports up to ~10)
- **Administrator:** Paul Sinthunava (sole admin; first person to sign up becomes admin)
- **Members:** sign themselves up, self-select their family; default role MEMBER with
  permission to add expenses

## 3. Core features (delivered in MVP)

| Feature | Status |
|---|---|
| Email/password auth (Supabase Auth), role-based access (Admin/Member) | ✅ Live |
| Household → Families → Members structure | ✅ Live |
| Unlimited categories, unlimited subcategories per category | ✅ Live |
| Category/subcategory CRUD, archive/restore, reorder | ✅ Live |
| Per-subcategory default split rule (Equal / Percentage / Fixed+remainder / Custom shares) | ✅ Live |
| Per-subcategory default "recurring" flag | ✅ Live |
| Expense entry: date, category, subcategory, description, vendor, amount, tax, total, payer, notes, tags | ✅ Live |
| Vendor autocomplete (household-scoped saved list, auto-created on use, deletable) | ✅ Live |
| Expense list, Edit, Void (soft, keeps history), Delete (permanent, admin-only) | ✅ Live |
| Monthly settlement engine: who paid, who should pay, balance, debt-simplified transfer instructions | ✅ Live |
| Settlement history with Open/Settled status | ✅ Live |
| Dashboard: month/year heading, monthly spend, per-family balances, top categories, recent expenses | ✅ Live |
| Responsive layout, dark/light mode (system-driven) | ✅ Live |
| Deployment: Netlify (auto-deploy from GitHub `master`), Supabase (Postgres + Auth + Storage) | ✅ Live |

## 4. Deferred / not yet built

| Feature | Priority |
|---|---|
| Expense history view with filters (date/category/family/vendor/tag) and global search | Next up |
| Reports: monthly summary, category summary, family balance, CSV export, print layout | Next up |
| Receipt upload (PDF/JPEG/PNG/HEIC) attached to expenses, stored in Supabase Storage | Next up |
| Recurring expense auto-generation (template → scheduled expense creation) | Future |
| Two-factor authentication (2FA) | Future |
| Notifications (large expense alert, settlement reminder, upcoming recurring) | Future |
| Multiple households per account | Future |
| Budget planning, budget-vs-actual | Future |
| PDF/Excel export, direct printer configuration | Future |
| Bank/credit-card import, OCR on receipts | Future |
| Multi-language, multi-currency | Future |
| Audit log UI (data model exists, no admin-facing view yet) | Future |

## 5. Success criteria

- Paul and both families can log in from any device and record expenses in under 30 seconds.
- Settlement math is always correct and auditable (never silently rounds away cents).
- No family's data or credentials are ever exposed to another household (schema is
  household-scoped throughout, ready for future multi-household support).
- Zero ongoing cost at current usage (Supabase + Netlify free tiers).

## 6. Out of scope (explicitly)

- Investment/financial advice of any kind.
- Real payment processing — settlements are informational ("who owes whom"), not a
  payment rail.
- Public/multi-tenant SaaS use — this is a single-household deployment for now (though the
  schema is household-scoped so this could change later).
