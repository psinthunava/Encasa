'use client'

import { useTransition } from 'react'
import { deleteExpense } from '@/lib/expenses/actions'

export function DeleteButton({ expenseId }: { expenseId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm('Permanently delete this expense? This cannot be undone and removes it from history entirely — use Void instead if you just want to correct a mistake.')) {
          startTransition(async () => {
            const result = await deleteExpense(expenseId)
            if (result?.error) alert(result.error)
          })
        }
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  )
}
