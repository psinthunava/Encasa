# Changelog

All notable changes to this project, newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## 2026-07-28

- **Added Bills** (`Bill`/`BillPayment`/`BillAttachment` + `BillStatus`): a "Bills" page for
  tracking a vendor invoice from arrival to payoff — manual entry plus attach/scan
  (photo/PDF via Supabase Storage, no OCR). Bills list shows open (Unpaid/Partial) bills
  with due date and balance; each recorded payment immediately generates its own `Expense`
  (paid by whichever family made that payment, split per the bill's category/subcategory
  rule), so a bill paid off in installments — possibly by different families — produces
  correctly-attributed Expense rows with no changes to the settlement engine. A bill drops
  off the open list once fully paid but stays reachable under "View paid bills." First use
  of Supabase Storage in this app (private bucket, signed URLs, service-role client).
- **Deployed to production.** Fixed a missed local commit (`prisma generate` step in
  `package.json`'s build script) and a set of environment variables that failed to persist
  via the Netlify API. Site live at https://encasa-household-expenses.netlify.app,
  auto-deploying from GitHub `master`.
- **GitHub backup established** at `psinthunava/Encasa`.
- Added centered "Month Year" heading to the dashboard, sized/weighted to match the stat
  figures (`438c7fa`).
- Added Edit and Delete actions to the expenses list (in that order alongside Void);
  recolored Void → yellow, Edit → green (`01c28d8`).
- Added vendor autocomplete (create-on-use, deletable from the dropdown), a "Clear All"
  button on the expense form, and moved the "recurring expense" flag from a per-expense
  checkbox to a per-subcategory default (`6da6ff1`).
- Moved the split-method indicator to the expense form's page header as a badge; removed
  the old split-preview box (`5c7a27e`).
- **Moved split configuration from Category to Subcategory** (`3c8950b`) — each
  subcategory now owns its own default split rule; a category with no subcategories (or an
  expense with none selected) falls back to Equal split.
- Moved split-method selection off the per-expense entry form entirely, onto the category
  level first (later superseded by the subcategory-level move above) (`f76989f`).
- Renamed the household to "Encasa Household Expenses," sourced the title from the
  database instead of hardcoding it (`eae59b4`).

## 2026-07-27

- **Initial MVP shipped** (`338c8fb`): authentication, household/family/member structure,
  category & subcategory management, expense entry with all 4 split methods, monthly
  settlement engine, dashboard.
- Project scaffolded: Next.js 16 + TypeScript + Tailwind CSS 4, Prisma 7 (driver-adapter
  architecture) connected to Supabase Postgres, Supabase Auth wired via `@supabase/ssr`.
- Seeded initial data: Household, Families (Sinthunava, Junya), 15 default categories with
  subcategories under Utilities/Food/Cleaning.
- Git repository initialized locally; Git and Node.js installed on the development machine
  (neither was present at project start).

## Notable fixes along the way

- Fixed a timezone bug where the settlements page showed the wrong month name ("June"
  instead of "July") due to missing `timeZone: 'UTC'` in date formatting.
- Fixed npm's `allow-scripts` security feature blocking Prisma/sharp/esbuild install
  scripts by explicitly approving them.
- Navigated Prisma 7's breaking config changes (datasource `url`/`directUrl` moved out of
  `schema.prisma` into `prisma.config.ts`; client instantiation now requires an explicit
  driver adapter) by consulting current Prisma documentation rather than training data.
