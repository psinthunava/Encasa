import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { computeBalancesForPeriod } from '@/lib/settlements/actions'

function monthBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
  return { start, end }
}

export default async function DashboardPage() {
  const member = await requireMember()
  const { start, end } = monthBounds(new Date())

  const [balances, monthExpenses, monthBills] = await Promise.all([
    computeBalancesForPeriod(member.family.householdId, start, end),
    prisma.expense.findMany({
      where: {
        householdId: member.family.householdId,
        status: 'ACTIVE',
        date: { gte: start, lte: end },
      },
      include: { category: true, paidByFamily: true },
    }),
    prisma.bill.findMany({
      where: {
        householdId: member.family.householdId,
        dueDate: { gte: start, lte: end },
      },
      include: { category: true },
    }),
  ])

  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.total), 0)

  const byCategory = new Map<string, number>()
  for (const e of monthExpenses) {
    byCategory.set(e.category.name, (byCategory.get(e.category.name) ?? 0) + Number(e.total))
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxCategoryAmount = topCategories[0]?.[1] ?? 1

  type FeedItem = {
    id: string
    date: Date
    href: string
    title: string
    subtitle: string
    amount: number
  }
  const billItems: FeedItem[] = monthBills.map((b) => ({
    id: `bill-${b.id}`,
    date: b.dueDate,
    href: `/bills/${b.id}/edit`,
    title: b.vendor,
    subtitle: `Bill due · ${b.category.name} · ${b.dueDate.toISOString().slice(0, 10)}`,
    amount: Number(b.amountDue),
  }))
  const paymentItems: FeedItem[] = monthExpenses.map((e) => ({
    id: `payment-${e.id}`,
    date: e.date,
    href: `/expenses/${e.id}/edit`,
    title: e.description,
    subtitle: `Payment · ${e.category.name} · ${e.paidByFamily.name} · ${e.date.toISOString().slice(0, 10)}`,
    amount: Number(e.total),
  }))
  const billsAndPayments = [...billItems, ...paymentItems].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  return (
    <div className="space-y-10">
      <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
        {start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">This month&apos;s spending</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            ${monthTotal.toFixed(2)}
          </p>
        </div>
        {balances.map((b) => (
          <div
            key={b.familyId}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{b.familyName} balance</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {b.balance > 0 ? '+' : ''}
              ${b.balance.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {b.balance > 0 ? 'owed to this family' : b.balance < 0 ? 'this family owes' : 'settled up'}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top categories this month</h2>
          </div>
          {topCategories.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded this month yet.</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([name, amount]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>{name}</span>
                    <span className="font-medium">${amount.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bills &amp; Payments</h2>
          </div>
          {billsAndPayments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No bills or payments this month yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
              {billsAndPayments.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    ${item.amount.toFixed(2)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
