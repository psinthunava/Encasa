'use client'

import { useState, useActionState } from 'react'
import { recordBillPayment, type BillFormState } from '@/lib/bills/actions'

type Family = { id: string; name: string }
type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'
type SplitConfig = { familyId: string; inputValue: number | null }

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'
const smallInputClass =
  'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function RecordPaymentForm({
  billId,
  families,
  maxAmount,
  defaultSplitMethod,
  defaultSplitConfigs,
}: {
  billId: string
  families: Family[]
  maxAmount: number
  defaultSplitMethod: SplitMethod
  defaultSplitConfigs: SplitConfig[]
}) {
  const action = recordBillPayment.bind(null, billId)
  const [state, formAction, pending] = useActionState<BillFormState, FormData>(action, undefined)
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(defaultSplitMethod)
  const configByFamily = new Map(defaultSplitConfigs.map((c) => [c.familyId, c.inputValue]))

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={maxAmount > 0 ? maxAmount.toFixed(2) : ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="paidByFamilyId" className={labelClass}>
            Paid by
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

      <div>
        <label htmlFor="paidDate" className={labelClass}>
          Payment date
        </label>
        <input
          id="paidDate"
          name="paidDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes (optional)
        </label>
        <input id="notes" name="notes" type="text" className={inputClass} />
      </div>

      <div className="space-y-3 rounded-md bg-slate-50 dark:bg-slate-800/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Split for this payment only — the subcategory&apos;s default split is unchanged
        </p>

        <div className="flex flex-wrap gap-2">
          {(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSplitMethod(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                splitMethod === m
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {m === 'EQUAL' && 'Equal'}
              {m === 'PERCENTAGE' && 'Percentage'}
              {m === 'FIXED' && 'Fixed + remainder'}
              {m === 'CUSTOM' && 'Custom shares'}
            </button>
          ))}
        </div>
        <input type="hidden" name="splitMethod" value={splitMethod} />

        {splitMethod === 'EQUAL' && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Split evenly across all {families.length} families.
          </p>
        )}

        {splitMethod === 'PERCENTAGE' && (
          <div className="space-y-2">
            {families.map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-700 dark:text-slate-300">{f.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name={`split_${f.id}`}
                  defaultValue={configByFamily.get(f.id) ?? ''}
                  placeholder="%"
                  className={`${smallInputClass} w-28`}
                />
              </div>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">Must add up to 100.</p>
          </div>
        )}

        {splitMethod === 'FIXED' && (
          <div className="space-y-2">
            {families.map((f) => {
              const isRemainder = configByFamily.has(f.id) && configByFamily.get(f.id) === null
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-slate-700 dark:text-slate-300">{f.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name={`split_${f.id}`}
                    defaultValue={configByFamily.get(f.id) ?? ''}
                    placeholder="$"
                    className={`${smallInputClass} w-28`}
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      name={`remainder_${f.id}`}
                      defaultChecked={isRemainder}
                      className="rounded border-slate-300 dark:border-slate-700"
                    />
                    Remaining balance
                  </label>
                </div>
              )
            })}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check &quot;remaining balance&quot; for exactly one family.
            </p>
          </div>
        )}

        {splitMethod === 'CUSTOM' && (
          <div className="space-y-2">
            {families.map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <span className="w-28 text-xs text-slate-700 dark:text-slate-300">{f.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name={`split_${f.id}`}
                  defaultValue={configByFamily.get(f.id) ?? ''}
                  placeholder="shares"
                  className={`${smallInputClass} w-28`}
                />
              </div>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relative shares (e.g. number of occupants) — split proportionally.
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
        {pending ? 'Recording…' : 'Record payment'}
      </button>
    </form>
  )
}
