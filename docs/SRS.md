# Software Requirements Specification (SRS)

**Last updated:** 2026-07-28

## 1. Functional requirements

### FR-1 Authentication & Authorization
- FR-1.1 Users authenticate via email/password (Supabase Auth).
- FR-1.2 First-ever signup in the household is auto-assigned role `ADMIN`; all subsequent
  signups default to `MEMBER`.
- FR-1.3 Signup requires selecting an existing, non-archived Family.
- FR-1.4 Session refresh happens via `src/proxy.ts` (Next.js Proxy, formerly "Middleware")
  on every request; this is an *optimistic* check only.
- FR-1.5 Every Server Action and page must independently re-verify identity/role via
  `requireMember()` / `requireAdmin()` in `src/lib/auth/dal.ts` — the proxy check alone is
  not sufficient authorization (see Architecture doc, Auth section).
- FR-1.6 `ADMIN` role: full access to all settings, categories, users, expenses (any
  family), settlements, permanent deletion.
- FR-1.7 `MEMBER` role: view all household data; add/edit/void their own expenses only if
  `canAddExpenses` is true on their profile; cannot edit categories, cannot permanently
  delete expenses.

### FR-2 Household Structure
- FR-2.1 One Household → many Families → many Members.
- FR-2.2 Families and Members can be archived (soft-disable) but never hard-deleted via the
  UI (preserves referential integrity of historical expenses).

### FR-3 Categories & Subcategories
- FR-3.1 Admin can create, rename, archive/restore, and reorder categories.
- FR-3.2 Each category can have unlimited subcategories with the same CRUD operations.
- FR-3.3 Every subcategory carries its own default split configuration (see FR-5) and
  `isRecurring` flag.
- FR-3.4 Expenses filed directly under a category with no subcategory always split equally
  and are never recurring by default.

### FR-4 Expense Entry
- FR-4.1 Required fields: date, category, payer (family), description, amount.
- FR-4.2 Optional fields: subcategory, vendor, tax, notes, tags (comma-separated).
- FR-4.3 `total = amount + tax`, computed server-side, never trusted from the client.
- FR-4.4 Vendor field autocompletes from the household's saved `Vendor` list; typing a new
  name auto-saves it on successful expense submission; any saved vendor can be deleted from
  the autocomplete dropdown without affecting historical expenses (vendor is stored as free
  text on `Expense.vendor`, decoupled from the `Vendor` lookup table).
- FR-4.5 Split method and `isRecurring` are **not** chosen per-expense — they are inherited
  from the selected subcategory at creation/edit time (or `EQUAL` / not-recurring if no
  subcategory is selected).
- FR-4.6 Editing an expense recomputes `total`, `splitMethod`, `isRecurring`, and all
  `ExpenseSplit` rows from scratch based on the (possibly changed) category/subcategory.
- FR-4.7 **Void**: sets `status = VOID`. Soft delete. Excluded from balances/settlements.
  Remains visible in history (spec principle: "never delete financial history"). Allowed
  for the expense's creator or any Admin.
- FR-4.8 **Delete**: permanently removes the `Expense` row (cascades to `ExpenseSplit`,
  `Receipt`). Admin-only. Irreversible — UI must confirm before calling.

### FR-5 Split Methods (defined per Subcategory)
- FR-5.1 **EQUAL** — total divided evenly across all active families.
- FR-5.2 **PERCENTAGE** — admin sets a percent per family; must sum to exactly 100.
- FR-5.3 **FIXED** — admin sets a fixed dollar amount for all-but-one family; exactly one
  family must be marked "remaining balance" and receives `total − Σ(fixed amounts)`. This
  is what lets a fixed rule stay correct as the expense's total varies month to month.
- FR-5.4 **CUSTOM** — admin sets a relative weight/share per family (e.g. occupant count);
  amounts computed proportionally to weight.
- FR-5.5 All split math is done in integer cents internally to avoid floating-point drift;
  any leftover cent from rounding is assigned to the last family in the computation.

### FR-6 Settlements
- FR-6.1 For a given date range, compute per family: total paid, total owed, balance
  (`paid − owed`).
- FR-6.2 Compute a minimal set of transfers ("who pays whom") via greedy debt
  simplification (`src/lib/settlements/engine.ts`).
- FR-6.3 Admin can generate a `Settlement` snapshot (with `SettlementLine` per family) for
  an arbitrary period; re-generating for the same period overwrites its lines.
- FR-6.4 Admin can mark a Settlement `SETTLED` / reopen it to `OPEN`.
- FR-6.5 The current month's live balances are always shown on the Settlements page and
  Dashboard, independent of whether a Settlement snapshot has been generated.

### FR-7 Dashboard
- FR-7.1 Shows current month/year heading, this month's total spend, each family's live
  balance, top categories by spend (current month), and the 8 most recent active expenses.

## 2. Non-functional requirements

- **NFR-1 Security:** No secrets in client bundles (only `NEXT_PUBLIC_*` vars reach the
  browser). `SUPABASE_SERVICE_ROLE_KEY` used server-only. All mutating Server Actions
  re-check auth/role server-side regardless of what the UI shows.
- **NFR-2 Data integrity:** Financial history is never hard-deleted except via the explicit,
  admin-only, confirmed Delete action; Void is the default correction path.
- **NFR-3 Correctness:** Split calculations must sum exactly to the expense total (verified
  in dev testing across all four split methods).
- **NFR-4 Availability:** Runs entirely on free-tier managed services (Supabase, Netlify);
  no self-hosted infrastructure to patch or scale.
- **NFR-5 Responsiveness:** Usable on desktop, tablet, and mobile browsers; no native app
  required (PWA-capable architecture, not yet configured as installable PWA).
- **NFR-6 Accessibility:** Semantic HTML, labeled form fields; full WCAG audit not yet
  performed (tracked in Known Issues).
- **NFR-7 Maintainability:** Server Actions colocated by domain under `src/lib/<domain>/actions.ts`;
  shared UI components colocated with their route group.

## 3. Constraints

- Household size: 2 families today, schema supports up to ~10.
- Currency: USD only.
- Single household per deployment (schema is household-scoped for future multi-tenancy but
  the app currently assumes exactly one `Household` row).
- Free-tier budget: Supabase free project (auto-pauses after ~1 week idle; admin must
  manually resume), Netlify free tier.
