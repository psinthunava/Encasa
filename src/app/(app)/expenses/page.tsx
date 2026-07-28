import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { VoidButton } from './void-button'

export default async function ExpensesPage() {
  const member = await requireMember()

  const expenses = await prisma.expense.findMany({
    where: { householdId: member.family.householdId },
    orderBy: { date: 'desc' },
    take: 100,
    include: {
      category: true,
      subcategory: true,
      paidByFamily: true,
      createdBy: true,
      splits: { include: { family: true } },
    },
  })

  const canAdd = member.role === 'ADMIN' || member.canAddExpenses

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Expenses</h2>
        {canAdd && (
          <Link
            href="/expenses/new"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add expense
          </Link>
        )}
      </div>

      {expenses.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No expenses recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                  Description
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                  Category
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                  Paid by
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Total
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Split</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((e) => (
                <tr key={e.id} className={e.status === 'VOID' ? 'opacity-50' : ''}>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {e.date.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                    {e.description}
                    {e.status === 'VOID' && <span className="ml-2 text-xs text-red-500">(void)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                    {e.category.name}
                    {e.subcategory ? ` / ${e.subcategory.name}` : ''}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{e.paidByFamily.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    ${Number(e.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                    {e.splits.map((s) => `${s.family.name} $${Number(s.amountOwed).toFixed(2)}`).join(', ')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.status === 'ACTIVE' &&
                      (member.role === 'ADMIN' || e.createdById === member.id) && (
                        <VoidButton expenseId={e.id} />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
