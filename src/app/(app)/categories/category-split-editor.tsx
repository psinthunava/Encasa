'use client'

import { useActionState, useState } from 'react'
import { updateCategorySplit, type UpdateSplitState } from '@/lib/categories/actions'

type Family = { id: string; name: string }
type SplitConfig = { familyId: string; inputValue: number | null }
type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'

const inputClass =
  'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function CategorySplitEditor({
  categoryId,
  splitMethod: initialMethod,
  splitConfigs,
  families,
}: {
  categoryId: string
  splitMethod: SplitMethod
  splitConfigs: SplitConfig[]
  families: Family[]
}) {
  const action = updateCategorySplit.bind(null, categoryId)
  const [state, formAction, pending] = useActionState<UpdateSplitState, FormData>(action, undefined)
  const [method, setMethod] = useState<SplitMethod>(initialMethod)

  const configByFamily = new Map(splitConfigs.map((c) => [c.familyId, c.inputValue]))

  return (
    <form action={formAction} className="space-y-3 rounded-md bg-slate-50 dark:bg-slate-800/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Default split for expenses in this category
      </p>

      <div className="flex flex-wrap gap-2">
        {(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              method === m
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
      <input type="hidden" name="splitMethod" value={method} />

      {method === 'EQUAL' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Split evenly across all {families.length} families.
        </p>
      )}

      {method === 'PERCENTAGE' && (
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
                className={`${inputClass} w-28`}
              />
            </div>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">Must add up to 100.</p>
        </div>
      )}

      {method === 'FIXED' && (
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
                  className={`${inputClass} w-28`}
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
            Check &quot;remaining balance&quot; for exactly one family (e.g. rent: Family A always pays a fixed
            $300, Family B covers whatever is left).
          </p>
        </div>
      )}

      {method === 'CUSTOM' && (
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
                className={`${inputClass} w-28`}
              />
            </div>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Relative shares (e.g. number of occupants) — split proportionally.
          </p>
        </div>
      )}

      {state?.message && <p className="text-xs text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save split settings'}
      </button>
    </form>
  )
}
