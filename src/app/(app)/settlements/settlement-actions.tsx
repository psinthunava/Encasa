'use client'

import { useTransition } from 'react'
import { markSettled, reopenSettlement } from '@/lib/settlements/actions'

export function SettlementStatusButton({
  settlementId,
  status,
}: {
  settlementId: string
  status: 'OPEN' | 'SETTLED'
}) {
  const [pending, startTransition] = useTransition()

  if (status === 'OPEN') {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => markSettled(settlementId))}
        className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-60"
      >
        Mark settled
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => reopenSettlement(settlementId))}
      className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
    >
      Reopen
    </button>
  )
}
