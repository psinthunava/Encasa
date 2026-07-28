'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'

// Sums what each family paid vs. owes for expenses dated within [periodStart, periodEnd].
export async function computeBalancesForPeriod(
  householdId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const families = await prisma.family.findMany({
    where: { householdId, archived: false },
    orderBy: { name: 'asc' },
  })

  const expenses = await prisma.expense.findMany({
    where: {
      householdId,
      status: 'ACTIVE',
      date: { gte: periodStart, lte: periodEnd },
    },
    include: { splits: true },
  })

  return families.map((family) => {
    const totalPaid = expenses
      .filter((e) => e.paidByFamilyId === family.id)
      .reduce((sum, e) => sum + Number(e.total), 0)

    const totalOwed = expenses.reduce((sum, e) => {
      const split = e.splits.find((s) => s.familyId === family.id)
      return sum + (split ? Number(split.amountOwed) : 0)
    }, 0)

    return {
      familyId: family.id,
      familyName: family.name,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      balance: Math.round((totalPaid - totalOwed) * 100) / 100,
    }
  })
}

export async function generateSettlement(formData: FormData) {
  const member = await requireAdmin()
  const periodStart = new Date(String(formData.get('periodStart')))
  const periodEnd = new Date(String(formData.get('periodEnd')))

  const balances = await computeBalancesForPeriod(
    member.family.householdId,
    periodStart,
    periodEnd
  )

  await prisma.settlement.upsert({
    where: {
      householdId_periodStart_periodEnd: {
        householdId: member.family.householdId,
        periodStart,
        periodEnd,
      },
    },
    create: {
      householdId: member.family.householdId,
      periodStart,
      periodEnd,
      lines: {
        create: balances.map((b) => ({
          familyId: b.familyId,
          totalPaid: b.totalPaid,
          totalOwed: b.totalOwed,
          balance: b.balance,
        })),
      },
    },
    update: {
      lines: {
        deleteMany: {},
        create: balances.map((b) => ({
          familyId: b.familyId,
          totalPaid: b.totalPaid,
          totalOwed: b.totalOwed,
          balance: b.balance,
        })),
      },
    },
  })

  revalidatePath('/settlements')
}

export async function markSettled(settlementId: string) {
  const member = await requireAdmin()
  await prisma.settlement.updateMany({
    where: { id: settlementId, householdId: member.family.householdId },
    data: { status: 'SETTLED', settledAt: new Date() },
  })
  revalidatePath('/settlements')
}

export async function reopenSettlement(settlementId: string) {
  const member = await requireAdmin()
  await prisma.settlement.updateMany({
    where: { id: settlementId, householdId: member.family.householdId },
    data: { status: 'OPEN', settledAt: null },
  })
  revalidatePath('/settlements')
}

