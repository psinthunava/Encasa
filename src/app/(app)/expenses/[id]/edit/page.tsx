import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { updateExpense } from '@/lib/expenses/actions'
import { ExpenseForm } from '../../expense-form'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await requireMember()

  const expense = await prisma.expense.findFirst({
    where: { id, householdId: member.family.householdId },
  })
  if (!expense) notFound()

  const canEdit = member.role === 'ADMIN' || (expense.createdById === member.id && member.canAddExpenses)
  if (!canEdit) {
    return (
      <div>
        <p className="text-slate-600 dark:text-slate-400">
          You don&apos;t have permission to edit this expense.
        </p>
        <Link href="/expenses" className="text-indigo-600 hover:underline text-sm">
          Back to expenses
        </Link>
      </div>
    )
  }

  const [categories, families, vendors] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { archived: false },
          orderBy: { sortOrder: 'asc' },
          include: { splitConfigs: true },
        },
      },
    }),
    prisma.family.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { name: 'asc' },
    }),
    prisma.vendor.findMany({
      where: { householdId: member.family.householdId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const categoriesForClient = categories.map((c) => ({
    ...c,
    subcategories: c.subcategories.map((s) => ({
      ...s,
      splitConfigs: s.splitConfigs.map((sc) => ({
        familyId: sc.familyId,
        inputValue: sc.inputValue === null ? null : Number(sc.inputValue),
      })),
    })),
  }))

  return (
    <ExpenseForm
      categories={categoriesForClient}
      families={families}
      vendors={vendors}
      action={updateExpense.bind(null, expense.id)}
      title="Edit expense"
      submitLabel="Save changes"
      initialValues={{
        date: expense.date.toISOString().slice(0, 10),
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId ?? '',
        description: expense.description,
        vendor: expense.vendor ?? '',
        tags: expense.tags.join(', '),
        amount: Number(expense.amount),
        tax: Number(expense.tax),
        notes: expense.notes ?? '',
        paidByFamilyId: expense.paidByFamilyId,
      }}
    />
  )
}
