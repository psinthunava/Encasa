# API Specification

**Last updated:** 2026-07-28

This app has **no REST/GraphQL API layer**. All mutations go through Next.js **Server
Actions** (`'use server'` functions), called directly from forms/components. This document
is the inventory of that surface — treat it as the API contract.

Every action re-derives the caller's identity/role via `requireMember()`/`requireAdmin()`
(see Architecture doc §3) — none of them trust client-supplied identity.

## `src/lib/auth/actions.ts`

| Action | Auth required | Behavior |
|---|---|---|
| `login(prevState, formData)` | none (public) | Validates email/password via Zod, calls Supabase `signInWithPassword`. Returns `{message}` on failure (maps `email_not_confirmed` to a specific message), redirects to `/` on success. |
| `signup(prevState, formData)` | none (public) | Validates name/email/password/familyId. Password must be ≥8 chars with a letter and a number. Creates Supabase Auth user, then a `Member` row (role = `ADMIN` if this household has zero members yet, else `MEMBER`). If Supabase email confirmation is pending, returns a message instead of redirecting. |
| `logout()` | any signed-in member | Supabase `signOut()`, redirect to `/login`. |

## `src/lib/categories/actions.ts`

All require `requireAdmin()`.

| Action | Behavior |
|---|---|
| `createCategory(formData)` | Appends a new category at the end of sort order. |
| `renameCategory(categoryId, formData)` | Renames, scoped to caller's household. |
| `archiveCategory(categoryId)` / `unarchiveCategory(categoryId)` | Soft toggle. |
| `moveCategory(categoryId, 'up'|'down')` | Swaps `sortOrder` with the adjacent active category. |
| `createSubcategory(categoryId, formData)` | Appends under the given category. |
| `renameSubcategory(subcategoryId, formData)` | — |
| `archiveSubcategory(subcategoryId)` / `unarchiveSubcategory(subcategoryId)` | — |
| `updateSubcategorySplit(subcategoryId, prevState, formData)` | Sets `splitMethod`, `isRecurring`, and replaces all `SubcategorySplitConfig` rows. Validates: percentages sum to 100; exactly one `FIXED` family marked "remainder"; `CUSTOM` has ≥1 positive share. |

## `src/lib/expenses/actions.ts`

| Action | Auth | Behavior |
|---|---|---|
| `createExpense(prevState, formData)` | member with `canAddExpenses`, or admin | Validates via Zod. Looks up the chosen category/subcategory, derives `splitMethod`/`isRecurring`/split config from the subcategory (or `EQUAL`/`false` if none chosen). Computes `total` and per-family `ExpenseSplit` rows via `computeSplitsFromSplitConfig`. Auto-saves a new `Vendor` if the typed name isn't already saved. Redirects to `/expenses`. |
| `updateExpense(expenseId, prevState, formData)` | admin, or the expense's creator (if still `canAddExpenses`) | Same validation/derivation as create; replaces the expense's `ExpenseSplit` rows entirely (delete + recreate) since category/subcategory/amount may have changed. |
| `voidExpense(expenseId)` | admin, or the expense's creator | Sets `status = VOID`. Does not touch `ExpenseSplit` rows (kept for history; excluded from balance calculations via the `status: 'ACTIVE'` filter used everywhere balances are computed). |
| `deleteExpense(expenseId)` | **admin only** | Permanently deletes the `Expense` row (cascades `ExpenseSplit`, `Receipt`). No confirmation server-side — the client's `confirm()` dialog is the only guard, so treat this as trusted-client UX, not a security boundary (the admin-only check *is* the security boundary). |

## `src/lib/vendors/actions.ts`

| Action | Auth | Behavior |
|---|---|---|
| `deleteVendor(vendorId)` | any signed-in member | Removes a saved vendor name from the household's autocomplete list. Does not affect any `Expense.vendor` text already saved. |
| `ensureVendorSaved(householdId, name)` | *(internal helper, not a Server Action itself)* | Called from `createExpense`/`updateExpense`. Upserts by `(householdId, name)` — no-op if already saved. |

## `src/lib/bills/actions.ts`

| Action | Auth | Behavior |
|---|---|---|
| `createBill(prevState, formData)` | member with `canAddExpenses`, or admin | Validates via Zod (category, vendor, invoice ID, statement/due dates, amount due required; subcategory/description/notes optional). Auto-saves the vendor via `ensureVendorSaved`, same as expense entry. Any attached files (`accept`ed: JPEG/PNG/HEIC/PDF, ≤10MB) are validated up front, then the `Bill` row is created before files are uploaded to Supabase Storage and `BillAttachment` rows created — a failed upload doesn't lose the bill's core data. Redirects to the new bill's detail page. |
| `updateBill(billId, prevState, formData)` | admin, or the bill's creator (if still `canAddExpenses`) | Same validation as create; no status-based lock — editing after payments exist only affects the snapshot future payments will use (existing precedent: changing a Subcategory's default doesn't retroactively touch already-saved Expenses). Appends any newly attached files. |
| `deleteBill(billId)` | **admin only** | Permanently deletes the `Bill` row (cascades `BillPayment`/`BillAttachment` rows and their storage files). Does **not** delete the `Expense` rows its payments already generated. |
| `recordBillPayment(billId, prevState, formData)` | member with `canAddExpenses`, or admin | The Bill→Expense conversion step. Validates amount/date/paying family; rejects if the bill is already `PAID`. In one transaction: creates an `Expense` (+ `ExpenseSplit[]` via `computeSplitsFromSplitConfig`, reusing `src/lib/expenses/split.ts` unchanged) for exactly this payment's amount, paid by the selected family; creates the `BillPayment` row linking to that Expense; recomputes the bill's cumulative paid total and sets `status` to `PARTIAL` or `PAID`. |
| `deleteBillAttachment(attachmentId)` | admin, or the bill's creator | Removes the storage object and the `BillAttachment` row. |

## `src/lib/supabase/storage.ts`

Not Server Actions — plain server-only functions used by `bills/actions.ts` and the bill
detail page, via the service-role admin client (`src/lib/supabase/admin.ts`):
`assertValidAttachmentFile(file)` (mime/size pre-check), `uploadBillAttachment(householdId,
billId, file)`, `getSignedAttachmentUrl(storagePath)` (1-hour signed URL, bucket is
private), `removeAttachmentFile(storagePath)`.

## `src/lib/settlements/actions.ts`

| Action | Auth | Behavior |
|---|---|---|
| `computeBalancesForPeriod(householdId, periodStart, periodEnd)` | *(plain function, not a Server Action — callable from Server Components)* | Sums `total` paid per family and `amountOwed` per family for `ACTIVE` expenses in the date range; returns `{familyId, familyName, totalPaid, totalOwed, balance}[]`. |
| `generateSettlement(formData)` | admin | Computes balances for the given period, upserts a `Settlement` (unique on household+period) and replaces its `SettlementLine` rows. |
| `markSettled(settlementId)` | admin | Sets `status = SETTLED`, `settledAt = now()`. |
| `reopenSettlement(settlementId)` | admin | Sets `status = OPEN`, `settledAt = null`. |

`src/lib/settlements/engine.ts` exports `computeTransfers(balances)` — a pure function
(greedy debt simplification), used both for live balances and for historical `Settlement`
snapshots. Not a Server Action; safe to unit test directly.

## `src/lib/expenses/split.ts`

Pure calculation functions, **not Server Actions**, imported by both server code and the
client-side expense form (for the live split preview):

- `computeEqualSplit(total, familyIds)`
- `computePercentageSplit(total, entries)`
- `computeFixedSplit(total, entries)` — `entries[i].amount === null` means "gets the
  remainder"
- `computeCustomSplit(total, entries)`
- `computeSplitsFromSplitConfig(splitMethod, splitConfigs, familyIds, total)` — dispatcher;
  this is the one call site both server and client should use rather than the individual
  functions directly.
- `sumOwed(splits)` — helper, sums `amountOwed` across a `SplitResult[]`.

## Route surface (pages, not APIs, listed for completeness)

| Route | Access |
|---|---|
| `/login`, `/signup` | Public |
| `/` (dashboard) | Any signed-in member |
| `/expenses`, `/expenses/new`, `/expenses/[id]/edit` | Any signed-in member (new/edit gated by `canAddExpenses` inside) |
| `/bills`, `/bills/new`, `/bills/[id]`, `/bills/[id]/edit` | Any signed-in member (new/edit/record-payment gated by `canAddExpenses` inside) |
| `/settlements` | Any signed-in member (generate/mark-settled buttons admin-only) |
| `/categories` | Admin only (`requireAdmin()` at the page level) |
