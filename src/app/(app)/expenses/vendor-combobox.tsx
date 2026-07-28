'use client'

import { useMemo, useState, useTransition } from 'react'
import { deleteVendor } from '@/lib/vendors/actions'

type Vendor = { id: string; name: string }

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function VendorCombobox({
  vendors,
  value,
  onChange,
}: {
  vendors: Vendor[]
  value: string
  onChange: (value: string) => void
}) {
  const [localVendors, setLocalVendors] = useState(vendors)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return localVendors
    return localVendors.filter((v) => v.name.toLowerCase().includes(query))
  }, [localVendors, value])

  function handleDelete(vendorId: string) {
    setLocalVendors((prev) => prev.filter((v) => v.id !== vendorId))
    startTransition(() => deleteVendor(vendorId))
  }

  return (
    <div className="relative">
      <label htmlFor="vendor" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Store / Vendor (optional)
      </label>
      <input
        id="vendor"
        name="vendor"
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inputClass}
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {matches.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(v.name)
                  setOpen(false)
                }}
                className="flex-1 text-left"
              >
                {v.name}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleDelete(v.id)
                }}
                className="ml-2 text-xs text-red-500 hover:text-red-600"
                aria-label={`Delete saved vendor ${v.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
