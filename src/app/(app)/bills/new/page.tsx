import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { createBill } from '@/lib/bills/actions'
import { BillForm } from '../bill-form'

export default async function NewBillPage() {
  const member = await requireMember()

  if (member.role !== 'ADMIN' && !member.canAddExpenses) {
    return (
      <div>
        <p className="text-slate-600 dark:text-slate-400">
          You don&apos;t have permission to add bills. Ask your administrator to enable it for your account.
        </p>
        <Link href="/bills" className="text-indigo-600 hover:underline text-sm">
          Back to bills
        </Link>
      </div>
    )
  }

  const [categories, vendors] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { archived: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.vendor.findMany({
      where: { householdId: member.family.householdId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <BillForm categories={categories} vendors={vendors} action={createBill} title="Add bill" submitLabel="Save bill" />
  )
}
