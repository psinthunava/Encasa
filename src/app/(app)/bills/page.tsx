import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { DeleteButton } from './delete-button'
import { SortControl } from './sort-control'

const sortFields = ['due', 'amount', 'balance', 'category', 'vendor'] as const
type SortField = (typeof sortFields)[number]

const statusPillClass: Record<string, string> = {
  UNPAID: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  PARTIAL: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  PAID: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
}
const statusLabel: Record<string, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid' }

// Days between today and a bill's due date, in whole days, UTC-based (see
// Known Issues #8 — all date math in this app must stay in UTC).
function daysUntilDue(dueDate: Date): number {
  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate())
  return Math.round((dueUTC - todayUTC) / 86400000)
}

function dueDateClass(dueDate: Date): string {
  const days = daysUntilDue(dueDate)
  if (days <= 3) return 'text-red-600 dark:text-red-400 font-semibold'
  if (days <= 5) return 'text-amber-600 dark:text-amber-400 font-semibold'
  return 'text-slate-700 dark:text-slate-300'
}
const splitMethodLabel: Record<string, string> = {
  EQUAL: 'Equal',
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed + remainder',
  CUSTOM: 'Custom shares',
}

type BillRow = {
  id: string
  vendor: string
  invoiceId: string
  dueDate: Date
  amountDue: unknown
  status: string
  category: { name: string }
  subcategory: { name: string; splitMethod: string } | null
  balance: number
  lastPaidDate: Date | null
}

function BillsTable({
  bills,
  showPaid,
  canAdd,
  isAdmin,
}: {
  bills: BillRow[]
  showPaid: boolean
  canAdd: boolean
  isAdmin: boolean
}) {
  if (bills.length === 0) {
    return (
      <p className="text-slate-500 dark:text-slate-400">
        {showPaid ? 'No paid bills yet.' : 'No open bills.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
              {showPaid ? 'Paid date' : 'Due date'}
            </th>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Vendor</th>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Invoice #</th>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Category</th>
            <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Amount due</th>
            <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Balance</th>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Split</th>
            <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {bills.map((b) => {
            const { balance, lastPaidDate } = b
            return (
              <tr key={b.id}>
                <td
                  className={`px-4 py-2 whitespace-nowrap ${
                    showPaid ? 'text-slate-700 dark:text-slate-300' : dueDateClass(b.dueDate)
                  }`}
                >
                  {showPaid
                    ? (lastPaidDate?.toISOString().slice(0, 10) ?? '—')
                    : b.dueDate.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                  <Link href={`/bills/${b.id}`} className="hover:underline">
                    {b.vendor}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{b.invoiceId}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                  {b.category.name}
                  {b.subcategory ? ` / ${b.subcategory.name}` : ''}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                  ${Number(b.amountDue).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                  ${balance.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                  {splitMethodLabel[b.subcategory?.splitMethod ?? 'EQUAL']}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPillClass[b.status]}`}>
                    {statusLabel[b.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canAdd && b.status !== 'PAID' && (
                      <Link
                        href={`/bills/${b.id}#pay`}
                        className="text-xs font-medium text-green-600 dark:text-green-500 hover:underline"
                      >
                        Pay
                      </Link>
                    )}
                    <Link
                      href={`/bills/${b.id}/edit`}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      View
                    </Link>
                    {isAdmin && <DeleteButton billId={b.id} />}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>
}) {
  const { sort: sortParam, dir: dirParam } = await searchParams
  const sort: SortField = sortFields.includes(sortParam as SortField) ? (sortParam as SortField) : 'due'
  const dir: 'asc' | 'desc' = dirParam === 'desc' ? 'desc' : 'asc'
  const member = await requireMember()

  const rawBills = await prisma.bill.findMany({
    where: { householdId: member.family.householdId },
    include: {
      category: true,
      subcategory: true,
      payments: { select: { amount: true, paidDate: true } },
    },
  })

  const enriched = rawBills
    .map((b) => {
      const paid = b.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const balance = Math.round((Number(b.amountDue) - paid) * 100) / 100
      const lastPaidDate = b.payments.reduce<Date | null>(
        (latest, p) => (!latest || p.paidDate > latest ? p.paidDate : latest),
        null
      )
      return { ...b, balance, lastPaidDate }
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sort) {
        case 'amount':
          cmp = Number(a.amountDue) - Number(b.amountDue)
          break
        case 'balance':
          cmp = a.balance - b.balance
          break
        case 'category':
          cmp = a.category.name.localeCompare(b.category.name)
          break
        case 'vendor':
          cmp = a.vendor.localeCompare(b.vendor)
          break
        default:
          cmp = a.dueDate.getTime() - b.dueDate.getTime()
      }
      return dir === 'desc' ? -cmp : cmp
    })

  const openBills = enriched.filter((b) => b.status !== 'PAID')
  const paidBills = enriched.filter((b) => b.status === 'PAID')

  const canAdd = member.role === 'ADMIN' || member.canAddExpenses
  const isAdmin = member.role === 'ADMIN'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bills</h2>
        <div className="flex items-center gap-4">
          <SortControl sort={sort} dir={dir} />
          {canAdd && (
            <Link
              href="/bills/new"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add bill
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Open bills</h3>
          <BillsTable bills={openBills} showPaid={false} canAdd={canAdd} isAdmin={isAdmin} />
        </section>

        <hr className="border-slate-200 dark:border-slate-800" />

        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Paid bills</h3>
          <BillsTable bills={paidBills} showPaid={true} canAdd={canAdd} isAdmin={isAdmin} />
        </section>
      </div>
    </div>
  )
}
