'use client'

import { useRouter } from 'next/navigation'

const inputClass =
  'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

const options = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc', label: 'Date (oldest first)' },
  { value: 'total_desc', label: 'Total (highest first)' },
  { value: 'total_asc', label: 'Total (lowest first)' },
  { value: 'category_asc', label: 'Category (A–Z)' },
  { value: 'category_desc', label: 'Category (Z–A)' },
  { value: 'paidBy_asc', label: 'Paid by (A–Z)' },
  { value: 'paidBy_desc', label: 'Paid by (Z–A)' },
] as const

export function SortControl({ sort, dir }: { sort: string; dir: string }) {
  const router = useRouter()
  const current = `${sort}_${dir}`

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      Sort by
      <select
        value={current}
        onChange={(e) => {
          const [newSort, newDir] = e.target.value.split('_')
          router.push(`/expenses?sort=${newSort}&dir=${newDir}`)
        }}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
