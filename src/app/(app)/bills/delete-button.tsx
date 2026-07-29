'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteBill } from '@/lib/bills/actions'

export function DeleteButton({ billId }: { billId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            'Permanently delete this bill? This removes its tracking record, payment history, and attachments — but does NOT delete any Expense records already created from its payments.'
          )
        ) {
          startTransition(async () => {
            await deleteBill(billId)
            router.push('/bills')
          })
        }
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  )
}
