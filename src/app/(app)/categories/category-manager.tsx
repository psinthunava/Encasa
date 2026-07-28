'use client'

import { useState, useTransition } from 'react'
import {
  archiveCategory,
  archiveSubcategory,
  createCategory,
  createSubcategory,
  moveCategory,
  renameCategory,
  renameSubcategory,
  unarchiveCategory,
  unarchiveSubcategory,
} from '@/lib/categories/actions'
import { SubcategorySplitEditor } from './subcategory-split-editor'

type SplitConfig = { familyId: string; inputValue: number | null }
type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'
type Subcategory = {
  id: string
  name: string
  archived: boolean
  splitMethod: SplitMethod
  splitConfigs: SplitConfig[]
}
type Category = {
  id: string
  name: string
  archived: boolean
  subcategories: Subcategory[]
}
type Family = { id: string; name: string }

const inputClass =
  'rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

const splitMethodLabel: Record<SplitMethod, string> = {
  EQUAL: 'Equal',
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed + remainder',
  CUSTOM: 'Custom shares',
}

export function CategoryManager({ categories, families }: { categories: Category[]; families: Family[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  const active = categories.filter((c) => !c.archived)
  const archived = categories.filter((c) => c.archived)

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSplit(id: string) {
    setExpandedSplits((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Add category
        </h3>
        <form
          action={(formData) => {
            createCategory(formData)
          }}
          className="flex gap-2"
        >
          <input name="name" placeholder="Category name" required className={`${inputClass} flex-1`} />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {active.map((category, i) => {
          const activeSubs = category.subcategories.filter((s) => !s.archived)
          const archivedSubs = category.subcategories.filter((s) => s.archived)

          return (
            <div key={category.id} className="rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle subcategories"
                >
                  {expandedCategories.has(category.id) ? '▾' : '▸'}
                </button>

                <form action={renameCategory.bind(null, category.id)} className="flex flex-1 items-center gap-2">
                  <input name="name" defaultValue={category.name} className={`${inputClass} flex-1`} />
                  <button type="submit" className="text-xs font-medium text-indigo-600 hover:underline">
                    Save
                  </button>
                </form>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0 || pending}
                    onClick={() => startTransition(() => moveCategory(category.id, 'up'))}
                    className="rounded px-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === active.length - 1 || pending}
                    onClick={() => startTransition(() => moveCategory(category.id, 'down'))}
                    className="rounded px-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => archiveCategory(category.id))}
                    className="ml-2 text-xs font-medium text-red-600 hover:underline"
                  >
                    Archive
                  </button>
                </div>
              </div>

              {expandedCategories.has(category.id) && (
                <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 pl-10 space-y-3">
                  {activeSubs.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No subcategories yet. Expenses filed directly under {category.name} (no subcategory) always
                      split equally.
                    </p>
                  )}

                  {activeSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-md border border-slate-200 dark:border-slate-800 p-2 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <form
                          action={renameSubcategory.bind(null, sub.id)}
                          className="flex flex-1 items-center gap-2"
                        >
                          <input name="name" defaultValue={sub.name} className={`${inputClass} flex-1`} />
                          <button type="submit" className="text-xs font-medium text-indigo-600 hover:underline">
                            Save
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => toggleSplit(sub.id)}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          {splitMethodLabel[sub.splitMethod]} {expandedSplits.has(sub.id) ? '▾' : '▸'}
                        </button>

                        <button
                          type="button"
                          onClick={() => startTransition(() => archiveSubcategory(sub.id))}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Archive
                        </button>
                      </div>

                      {expandedSplits.has(sub.id) && (
                        <SubcategorySplitEditor
                          subcategoryId={sub.id}
                          splitMethod={sub.splitMethod}
                          splitConfigs={sub.splitConfigs}
                          families={families}
                        />
                      )}
                    </div>
                  ))}

                  <form action={createSubcategory.bind(null, category.id)} className="flex gap-2 pt-1">
                    <input name="name" placeholder="New subcategory" required className={`${inputClass} flex-1`} />
                    <button type="submit" className="text-xs font-medium text-indigo-600 hover:underline">
                      Add
                    </button>
                  </form>

                  {archivedSubs.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {archivedSubs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                        >
                          {sub.name} (archived)
                          <button
                            type="button"
                            onClick={() => startTransition(() => unarchiveSubcategory(sub.id))}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {archived.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Archived categories
          </h3>
          <div className="space-y-1">
            {archived.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm text-slate-500 dark:text-slate-400"
              >
                {category.name}
                <button
                  type="button"
                  onClick={() => startTransition(() => unarchiveCategory(category.id))}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
