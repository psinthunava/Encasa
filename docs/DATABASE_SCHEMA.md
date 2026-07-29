# Database Schema

**Last updated:** 2026-07-28
**Canonical source:** `prisma/schema.prisma` — this document explains and summarizes it;
if they ever disagree, `schema.prisma` (and the applied migrations in
`prisma/migrations/`) wins.

## Entity overview

```
Household
 ├─ Family (×N, 2 today: Sinthunava, Junya)
 │   ├─ Member (×N — Member.id === Supabase auth.users.id)
 │   ├─ ExpenseSplit (as payer-family owed-amount rows)
 │   ├─ SettlementLine
 │   └─ SubcategorySplitConfig (as a family's split input)
 ├─ Category (×N)
 │   └─ Subcategory (×N)
 │       ├─ splitMethod (EQUAL default) + isRecurring (false default)
 │       └─ SubcategorySplitConfig (×N families, only when splitMethod ≠ EQUAL)
 ├─ Expense (×N)
 │   ├─ ExpenseSplit (×N, one per family)
 │   └─ Receipt (×N, feature not yet built)
 ├─ Vendor (×N — autocomplete list, independent of Expense.vendor free text)
 ├─ Settlement (×N, one per generated period)
 │   └─ SettlementLine (×N families)
 ├─ RecurringExpenseTemplate (×N — model exists, no generation logic built yet)
 └─ AuditLog (×N — model exists, no admin UI built yet)
```

## Models

### Household
Top-level tenant. Exactly one row exists today (`name = "Encasa Household Expenses"`).
Every other table hangs off `householdId` (directly or transitively), so the schema is
already shaped for multi-household support even though the app doesn't expose it.

### Family
`archived` (soft-disable, never hard-deleted from the UI). Has a unique-by-household `name`.

### Member
`id` **is** the Supabase `auth.users.id` — no password/credential fields live here, Supabase
Auth owns those. `role` (`ADMIN` | `MEMBER`), `canAddExpenses` (member-level permission
toggle), `archived`.

### Category / Subcategory
Ordered (`sortOrder`), archivable, household/category-scoped respectively.

**Subcategory owns the split configuration**, not Category. This changed twice during
development — first split lived on Category, then moved to Subcategory per explicit user
request (see Decision Log). A category with zero subcategories, or an expense with no
subcategory selected, always uses `EQUAL` split and `isRecurring = false`.

### SubcategorySplitConfig
One row per (subcategory, family) pair, only populated when `splitMethod ≠ EQUAL`.
`inputValue` meaning depends on the parent subcategory's `splitMethod`:
- `PERCENTAGE` → percent, 0–100, must sum to 100 across the subcategory's families.
- `CUSTOM` → arbitrary positive weight/share.
- `FIXED` → a fixed dollar amount, **or `NULL`** meaning "this family gets the remaining
  balance." Exactly one family per subcategory must be `NULL` when `splitMethod = FIXED`.

### Expense
Snapshot fields (`splitMethod`, `isRecurring`) are copied from the subcategory **at
creation/edit time** — later changes to the subcategory's defaults do not retroactively
change already-saved expenses. `amount + tax = total` (computed server-side).
`status` (`ACTIVE` | `VOID`) — Void is the soft-delete path; hard delete removes the row
entirely (admin-only).

### ExpenseSplit
One row per (expense, family): `amountOwed` is the actual dollar amount that family owes
for that expense, always summing exactly to `Expense.total` across all rows for that
expense (verified in testing for all 4 split methods, including edge cases with rounding).

### Vendor
Household-scoped, unique on `(householdId, name)`. Purely a UI convenience list — deleting
a Vendor row never touches any `Expense.vendor` text already saved (that field is
independent free text).

### Settlement / SettlementLine
A `Settlement` is a **snapshot** for an arbitrary `[periodStart, periodEnd]` window
(unique per household+period). Regenerating for the same period **replaces** its
`SettlementLine` rows. `status` (`OPEN` | `SETTLED`) is admin-toggleable. The
Settlements page also shows **live** (non-snapshotted) balances for the current month,
computed on the fly — a Settlement snapshot is optional bookkeeping, not required to see
current balances.

### RecurringExpenseTemplate
Schema exists (category/subcategory/amount/frequency/nextRunDate/active) but **no code
generates actual Expense rows from it yet** — this is scaffolding for a future feature, not
a working feature today. Don't assume it does anything.

### AuditLog
Schema exists (`action`, `entityType`, `entityId`, `beforeData`/`afterData` as JSON) but
**nothing currently writes to this table** and there's no admin UI to read it. Scaffolding
only.

### Bill / BillPayment / BillAttachment

Tracks a vendor invoice from arrival to payoff, independent of `Expense` until money
actually moves. `Bill` carries `categoryId`/`subcategoryId` (same household/category-scoped
FKs as `Expense`), `vendor`, `invoiceId`, `statementDate`, `dueDate`, `amountDue`,
`description`/`notes` (optional), and `status` (`BillStatus`: `UNPAID` → `PARTIAL` → `PAID`).

**Each `BillPayment` immediately generates its own `Expense`** — paid by whichever family
made that specific payment, split per the bill's live category/subcategory rule via the
same `computeSplitsFromSplitConfig` function `Expense` creation uses.
`BillPayment.expenseId` (unique) points at the Expense it produced. This means a bill paid
off in installments by different families produces multiple correctly-attributed Expense
rows, with no changes needed to `Expense`, `ExpenseSplit`, or the settlement engine. `Bill`
recomputes `status` after each payment: `PARTIAL` once any payment lands, `PAID` once
cumulative payments reach `amountDue` — at which point it drops out of the default
open-bills list (`/bills`), though the row and its history remain queryable
(`/bills?status=paid`).

`BillAttachment` stores scanned/photographed/attached files (Supabase Storage, private
bucket, JPEG/PNG/HEIC/PDF up to 10MB) — see Architecture doc for the storage approach. No
OCR is performed on these; see Decision Log.

Deleting a `Bill` cascades to its `BillPayment`/`BillAttachment` rows (and their storage
files) but **never** to the `Expense` rows those payments generated — there is no cascade
path from `BillPayment` to `Expense`, so financial history survives even if the bill
tracking record is removed (consistent with NFR-2).

## Enums

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `MEMBER` |
| `SplitMethod` | `EQUAL`, `PERCENTAGE`, `FIXED`, `CUSTOM` |
| `ExpenseStatus` | `ACTIVE`, `VOID` |
| `RecurringFrequency` | `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` |
| `SettlementStatus` | `OPEN`, `SETTLED` |
| `BillStatus` | `UNPAID`, `PARTIAL`, `PAID` |

## Migration history

| Migration | What it did |
|---|---|
| `..._init` | Initial 12-table schema. |
| `..._category_split_config` | Added `Category.splitMethod` + `CategorySplitConfig` (superseded). |
| `..._subcategory_split_config` | Dropped the above; added `Subcategory.splitMethod` + `SubcategorySplitConfig` instead. |
| `..._vendor_and_subcategory_recurring` | Added `Vendor` model + `Subcategory.isRecurring`. |
| `..._add_bills` | Added `Bill`, `BillPayment`, `BillAttachment` models + `BillStatus` enum. |

All migrations are additive/corrective — no data-loss-risk migrations have been applied
against real (non-empty) data; the `CategorySplitConfig → SubcategorySplitConfig` swap
happened while that table was empty of real user data.
