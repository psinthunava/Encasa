import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { getSignedAttachmentUrl } from '@/lib/supabase/storage'
import { RecordPaymentForm } from './record-payment-form'
import { DeleteButton } from '../delete-button'
import { AttachmentDeleteButton } from '../attachment-delete-button'

const statusPillClass: Record<string, string> = {
  UNPAID: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  PARTIAL: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  PAID: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
}
const statusLabel: Record<string, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid' }

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await requireMember()

  const bill = await prisma.bill.findFirst({
    where: { id, householdId: member.family.householdId },
    include: {
      category: true,
      subcategory: { include: { splitConfigs: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      payments: {
        orderBy: { paidDate: 'asc' },
        include: { paidByFamily: true },
      },
    },
  })
  if (!bill) notFound()

  const families = await prisma.family.findMany({
    where: { householdId: member.family.householdId, archived: false },
    orderBy: { name: 'asc' },
  })

  const attachmentsWithUrls = await Promise.all(
    bill.attachments.map(async (a) => ({ ...a, url: await getSignedAttachmentUrl(a.storagePath) }))
  )

  const paid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = Math.round((Number(bill.amountDue) - paid) * 100) / 100
  const canEdit =
    bill.status !== 'PAID' && (member.role === 'ADMIN' || (bill.createdById === member.id && member.canAddExpenses))
  const canRecordPayment = (member.role === 'ADMIN' || member.canAddExpenses) && bill.status !== 'PAID'

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/bills" className="text-sm text-indigo-600 hover:underline">
          ← Back to bills
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{bill.vendor}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Invoice #{bill.invoiceId}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-2xl font-semibold ${statusPillClass[bill.status]}`}>
            {statusLabel[bill.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Category</p>
          <p className="text-slate-900 dark:text-slate-100">
            {bill.category.name}
            {bill.subcategory ? ` / ${bill.subcategory.name}` : ''}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Statement date</p>
          <p className="text-slate-900 dark:text-slate-100">{bill.statementDate.toISOString().slice(0, 10)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Due date</p>
          <p className="text-slate-900 dark:text-slate-100">{bill.dueDate.toISOString().slice(0, 10)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Amount due</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">${Number(bill.amountDue).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Paid so far</p>
          <p className="text-slate-900 dark:text-slate-100">${paid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400">Balance</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">${balance.toFixed(2)}</p>
        </div>
        {bill.notes && (
          <div className="col-span-2">
            <p className="text-slate-500 dark:text-slate-400">Notes</p>
            <p className="text-slate-900 dark:text-slate-100">{bill.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-4">
        {canEdit && (
          <Link
            href={`/bills/${bill.id}/edit`}
            className="text-sm font-medium text-green-600 dark:text-green-500 hover:underline"
          >
            Edit
          </Link>
        )}
        {member.role === 'ADMIN' && <DeleteButton billId={bill.id} />}
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Attachments</h3>
        {attachmentsWithUrls.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachmentsWithUrls.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm"
              >
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-indigo-600 hover:underline"
                  >
                    {a.fileName}
                  </a>
                ) : (
                  <span className="truncate text-slate-500 dark:text-slate-400">{a.fileName} (unavailable)</span>
                )}
                <AttachmentDeleteButton attachmentId={a.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Payment history</h3>
        {bill.payments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Paid by</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bill.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {p.paidDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{p.paidByFamily.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                      ${Number(p.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{p.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canRecordPayment && (
        <section id="pay">
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Record a payment</h3>
          <RecordPaymentForm
            billId={bill.id}
            families={families}
            maxAmount={balance}
            defaultSplitMethod={bill.subcategory?.splitMethod ?? 'EQUAL'}
            defaultSplitConfigs={(bill.subcategory?.splitConfigs ?? []).map((c) => ({
              familyId: c.familyId,
              inputValue: c.inputValue === null ? null : Number(c.inputValue),
            }))}
          />
        </section>
      )}
    </div>
  )
}
