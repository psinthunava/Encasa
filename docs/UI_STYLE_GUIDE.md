# UI Style Guide

**Last updated:** 2026-07-28

No component library is used — everything is hand-built with Tailwind CSS 4 utility
classes. This document captures the conventions actually in use so new UI stays consistent.

## Color semantics

| Meaning | Class pattern | Where used |
|---|---|---|
| Primary action / brand | `bg-indigo-600 hover:bg-indigo-500 text-white` | Submit buttons, "Add expense", active toggle pills, nav active state |
| Split-method badge (prominent) | `bg-indigo-600 text-white px-4 py-1.5 text-sm font-semibold rounded-full` | Expense form header badge — deliberately larger/bolder than other badges per explicit request |
| Void action | `text-yellow-600 dark:text-yellow-500` | Expenses list — soft/reversible correction |
| Edit action | `text-green-600 dark:text-green-500` | Expenses list |
| Delete / danger action | `text-red-600` | Expenses list Delete button, category/subcategory Archive links |
| Positive balance ("owed to this family") | `text-green-600` | Dashboard, Settlements |
| Negative balance ("this family owes") | `text-red-600` | Dashboard, Settlements |
| Neutral/secondary text | `text-slate-500 dark:text-slate-400` | Helper text, labels, timestamps |
| Body text | `text-slate-900 dark:text-slate-100` | Primary content |

## Typography

| Role | Class |
|---|---|
| Page title (e.g. "Add expense", "Categories & subcategories") | `text-2xl font-semibold` (or `font-bold` for the dashboard month/year heading, per explicit request) |
| Section heading | `text-lg font-semibold` |
| Stat figure (e.g. `$0.00` on dashboard cards) | `text-2xl font-semibold` |
| Form label | `text-sm font-medium text-slate-700 dark:text-slate-300` |
| Small badge/pill text | `text-xs font-medium` |

## Layout conventions

- Cards: `rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5`
- Inputs: `rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`
- Pills/badges: `rounded-full px-3 py-1 text-xs font-medium`
- Tables: `divide-y divide-slate-200 dark:divide-slate-800`, header row `bg-slate-50 dark:bg-slate-900`
- Page max width for forms: `max-w-2xl`; general content: unconstrained within the `(app)`
  layout's `max-w-6xl` shell (`src/app/(app)/layout.tsx`)

## Dark mode

Tailwind `dark:` variants throughout, driven by the visitor's OS/browser preference
(`prefers-color-scheme`) — there is **no manual light/dark toggle** in the UI. Every
component that ships color must include a `dark:` counterpart; don't ship light-only
styling.

## Component patterns established

- **Split-method selector** (`subcategory-split-editor.tsx`): a row of pill buttons
  (Equal/Percentage/Fixed+remainder/Custom shares), active state filled indigo, inactive
  outlined. Reused verbatim between the (removed) per-expense picker and the current
  per-subcategory editor.
- **Autocomplete combobox** (`vendor-combobox.tsx`): plain text input + absolutely
  positioned dropdown `<ul>` below it, `onFocus` opens, `onBlur` closes after a 150ms
  delay (to allow a suggestion click to register first). Suggestion rows use `onMouseDown`
  with `preventDefault()` (not `onClick`) so selecting a suggestion doesn't blur the input
  before the click registers.
- **Destructive action confirmation**: plain browser `confirm()` inside the button's
  `onClick`, wrapped in `useTransition()` so the button shows a disabled/pending state
  during the Server Action call. Not a custom modal — kept intentionally simple.
- **Collapsible rows**: category/subcategory rows expand via local `useState<Set<string>>`
  of expanded IDs, toggled by a `▸`/`▾` glyph button — no animation library.

## Known copy/labeling conventions

- Split method display names: "Equal", "Percentage", "Fixed + remainder", "Custom shares"
  (never just "Fixed" or "Custom" alone in user-facing text — the "+ remainder" and
  "shares" qualifiers were added deliberately for clarity).
- Recurring subcategory indicator: `↻ Recurring` amber pill (`bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400`).
