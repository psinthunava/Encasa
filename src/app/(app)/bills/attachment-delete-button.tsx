'use client'

import { useTransition } from 'react'
import { deleteBillAttachment } from '@/lib/bills/actions'

export function AttachmentDeleteButton({ attachmentId }: { attachmentId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm('Delete this attachment?')) {
          startTransition(() => deleteBillAttachment(attachmentId))
        }
      }}
      className="ml-2 text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
      aria-label="Delete attachment"
    >
      ✕
    </button>
  )
}
