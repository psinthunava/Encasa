'use client'

import { useTransition } from 'react'
import { voidExpense } from '@/lib/expenses/actions'

export function VoidButton({ expenseId }: { expenseId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm('Void this expense? It will be excluded from balances but kept in history.')) {
          startTransition(() => voidExpense(expenseId))
        }
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Void
    </button>
  )
}
