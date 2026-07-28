import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { ExpenseForm } from './expense-form'

export default async function NewExpensePage() {
  const member = await requireMember()

  if (member.role !== 'ADMIN' && !member.canAddExpenses) {
    return (
      <div>
        <p className="text-slate-600 dark:text-slate-400">
          You don&apos;t have permission to add expenses. Ask your administrator to enable it for your account.
        </p>
        <Link href="/expenses" className="text-indigo-600 hover:underline text-sm">
          Back to expenses
        </Link>
      </div>
    )
  }

  const [categories, families] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: { where: { archived: false }, orderBy: { sortOrder: 'asc' } },
        splitConfigs: true,
      },
    }),
    prisma.family.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { name: 'asc' },
    }),
  ])

  const categoriesForClient = categories.map((c) => ({
    ...c,
    splitConfigs: c.splitConfigs.map((sc) => ({
      familyId: sc.familyId,
      inputValue: sc.inputValue === null ? null : Number(sc.inputValue),
    })),
  }))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Add expense</h2>
        <Link href="/expenses" className="text-sm text-indigo-600 hover:underline">
          ← Back to expenses
        </Link>
      </div>
      <ExpenseForm categories={categoriesForClient} families={families} />
    </div>
  )
}
