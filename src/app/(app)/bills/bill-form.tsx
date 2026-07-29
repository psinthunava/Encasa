'use client'

import { useMemo, useRef, useState, useActionState } from 'react'
import Link from 'next/link'
import type { BillFormState } from '@/lib/bills/actions'
import { VendorCombobox } from '../expenses/vendor-combobox'

type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'
type Subcategory = { id: string; name: string; splitMethod: SplitMethod }
type Category = { id: string; name: string; subcategories: Subcategory[] }
type Vendor = { id: string; name: string }

export type BillInitialValues = {
  categoryId: string
  subcategoryId: string
  vendor: string
  invoiceId: string
  description: string
  statementDate: string
  dueDate: string
  amountDue: number
  notes: string
}

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

const splitMethodLabel: Record<SplitMethod, string> = {
  EQUAL: 'Equal',
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed + remainder',
  CUSTOM: 'Custom shares',
}

const defaultCategoryId = (categories: Category[]) => categories[0]?.id ?? ''
const today = () => new Date().toISOString().slice(0, 10)

export function BillForm({
  categories,
  vendors,
  action,
  initialValues,
  title,
  submitLabel,
}: {
  categories: Category[]
  vendors: Vendor[]
  action: (state: BillFormState, formData: FormData) => Promise<BillFormState>
  initialValues?: BillInitialValues
  title: string
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<BillFormState, FormData>(action, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? defaultCategoryId(categories))
  const [subcategoryId, setSubcategoryId] = useState(initialValues?.subcategoryId ?? '')
  const [vendor, setVendor] = useState(initialValues?.vendor ?? '')

  const category = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId])
  const subcategories = category?.subcategories ?? []
  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === subcategoryId),
    [subcategories, subcategoryId]
  )

  function handleClearAll() {
    formRef.current?.reset()
    setCategoryId(defaultCategoryId(categories))
    setSubcategoryId('')
    setVendor('')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <Link href="/bills" className="text-sm text-indigo-600 hover:underline">
            ← Back to bills
          </Link>
        </div>
        {subcategory && (
          <span className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm whitespace-nowrap">
            Split: {splitMethodLabel[subcategory.splitMethod]}
          </span>
        )}
      </div>

      <form ref={formRef} action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryId" className={labelClass}>
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
              }}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subcategoryId" className={labelClass}>
              Subcategory (optional)
            </label>
            <select
              id="subcategoryId"
              name="subcategoryId"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VendorCombobox vendors={vendors} value={vendor} onChange={setVendor} />
          <div>
            <label htmlFor="invoiceId" className={labelClass}>
              Invoice ID
            </label>
            <input
              id="invoiceId"
              name="invoiceId"
              type="text"
              required
              defaultValue={initialValues?.invoiceId ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="statementDate" className={labelClass}>
              Statement date
            </label>
            <input
              id="statementDate"
              name="statementDate"
              type="date"
              required
              defaultValue={initialValues?.statementDate ?? today()}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dueDate" className={labelClass}>
              Due date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              defaultValue={initialValues?.dueDate ?? today()}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amountDue" className={labelClass}>
              Amount due
            </label>
            <input
              id="amountDue"
              name="amountDue"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={initialValues?.amountDue || ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClass}>
              Description (optional)
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="Defaults to vendor + invoice #"
              defaultValue={initialValues?.description ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initialValues?.notes ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="attachments" className={labelClass}>
            Attach or scan bill (optional — JPEG, PNG, HEIC, or PDF, up to 10MB each)
          </label>
          <input
            id="attachments"
            name="attachments"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
            capture="environment"
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white`}
          />
        </div>

        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Clear All
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
