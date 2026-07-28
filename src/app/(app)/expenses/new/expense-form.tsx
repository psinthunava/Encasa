'use client'

import { useActionState, useMemo, useState } from 'react'
import { createExpense, type ExpenseFormState } from '@/lib/expenses/actions'

type Subcategory = { id: string; name: string }
type Category = { id: string; name: string; subcategories: Subcategory[] }
type Family = { id: string; name: string }

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function ExpenseForm({
  categories,
  families,
}: {
  categories: Category[]
  families: Family[]
}) {
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(
    createExpense,
    undefined
  )
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'>('EQUAL')
  const [amount, setAmount] = useState(0)
  const [tax, setTax] = useState(0)

  const subcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId]
  )
  const total = Math.round((amount + tax) * 100) / 100

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="paidByFamilyId" className={labelClass}>
            Who paid
          </label>
          <select id="paidByFamilyId" name="paidByFamilyId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select family
            </option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            onChange={(e) => setCategoryId(e.target.value)}
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
          <select id="subcategoryId" name="subcategoryId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <input id="description" name="description" type="text" required className={inputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vendor" className={labelClass}>
            Store / Vendor (optional)
          </label>
          <input id="vendor" name="vendor" type="text" className={inputClass} />
        </div>
        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags (comma separated, optional)
          </label>
          <input id="tags" name="tags" type="text" placeholder="e.g. urgent, shared" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="tax" className={labelClass}>
            Tax
          </label>
          <input
            id="tax"
            name="tax"
            type="number"
            step="0.01"
            min="0"
            value={tax || ''}
            onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Total</label>
          <div className={`${inputClass} bg-slate-100 dark:bg-slate-800 font-medium`}>
            ${total.toFixed(2)}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes (optional)
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" name="isRecurring" className="rounded border-slate-300 dark:border-slate-700" />
        This is a recurring expense
      </label>

      <div>
        <label className={labelClass}>Split method</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSplitMethod(m)}
              className={`rounded-full px-3 py-1 text-sm font-medium border ${
                splitMethod === m
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {m === 'EQUAL' && 'Equal'}
              {m === 'PERCENTAGE' && 'Percentage'}
              {m === 'FIXED' && 'Fixed amount'}
              {m === 'CUSTOM' && 'Custom shares'}
            </button>
          ))}
        </div>
        <input type="hidden" name="splitMethod" value={splitMethod} />

        {splitMethod === 'EQUAL' && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Split evenly across {families.length} families (${(total / (families.length || 1)).toFixed(2)} each).
          </p>
        )}

        {splitMethod !== 'EQUAL' && (
          <div className="mt-3 space-y-2">
            {families.map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <span className="w-32 text-sm text-slate-700 dark:text-slate-300">{f.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name={`split_${f.id}`}
                  placeholder={
                    splitMethod === 'PERCENTAGE' ? '%' : splitMethod === 'FIXED' ? '$' : 'shares'
                  }
                  className={`${inputClass} mt-0`}
                />
              </div>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {splitMethod === 'PERCENTAGE' && 'Percentages must add up to 100.'}
              {splitMethod === 'FIXED' && `Amounts must add up to the total ($${total.toFixed(2)}).`}
              {splitMethod === 'CUSTOM' &&
                'Enter relative shares (e.g. number of occupants) — amounts are split proportionally.'}
            </p>
          </div>
        )}
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save expense'}
      </button>
    </form>
  )
}
