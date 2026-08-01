'use client'

import { useRouter } from 'next/navigation'

const inputClass =
  'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

const options = [
  { value: 'due_asc', label: 'Due date (earliest first)' },
  { value: 'due_desc', label: 'Due date (latest first)' },
  { value: 'amount_desc', label: 'Amount due (highest first)' },
  { value: 'amount_asc', label: 'Amount due (lowest first)' },
  { value: 'balance_desc', label: 'Balance (highest first)' },
  { value: 'balance_asc', label: 'Balance (lowest first)' },
  { value: 'category_asc', label: 'Category (A–Z)' },
  { value: 'category_desc', label: 'Category (Z–A)' },
  { value: 'vendor_asc', label: 'Vendor (A–Z)' },
  { value: 'vendor_desc', label: 'Vendor (Z–A)' },
] as const

export function SortControl({ sort, dir, showPaid }: { sort: string; dir: string; showPaid: boolean }) {
  const router = useRouter()
  const current = `${sort}_${dir}`

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      Sort by
      <select
        value={current}
        onChange={(e) => {
          const [newSort, newDir] = e.target.value.split('_')
          const params = new URLSearchParams()
          if (showPaid) params.set('status', 'paid')
          params.set('sort', newSort)
          params.set('dir', newDir)
          router.push(`/bills?${params.toString()}`)
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
