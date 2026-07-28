'use server'

import * as z from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import {
  computeEqualSplit,
  computeFixedSplit,
  computePercentageSplit,
  computeCustomSplit,
  sumOwed,
  type SplitResult,
} from './split'

export type ExpenseFormState = { message?: string } | undefined

const ExpenseSchema = z.object({
  date: z.iso.date({ error: 'Enter a valid date.' }),
  categoryId: z.uuid({ error: 'Select a category.' }),
  subcategoryId: z.uuid().optional().or(z.literal('')),
  description: z.string().trim().min(1, { error: 'Description is required.' }),
  vendor: z.string().trim().optional().or(z.literal('')),
  amount: z.coerce.number({ error: 'Enter a valid amount.' }).positive(),
  tax: z.coerce.number().min(0).default(0),
  paidByFamilyId: z.uuid({ error: 'Select who paid.' }),
  notes: z.string().trim().optional().or(z.literal('')),
  tags: z.string().trim().optional().or(z.literal('')),
  isRecurring: z.coerce.boolean().default(false),
  splitMethod: z.enum(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM']),
})

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const member = await requireMember()
  if (member.role !== 'ADMIN' && !member.canAddExpenses) {
    return { message: 'You do not have permission to add expenses.' }
  }

  const validated = ExpenseSchema.safeParse({
    date: formData.get('date'),
    categoryId: formData.get('categoryId'),
    subcategoryId: formData.get('subcategoryId') || '',
    description: formData.get('description'),
    vendor: formData.get('vendor') || '',
    amount: formData.get('amount'),
    tax: formData.get('tax') || 0,
    paidByFamilyId: formData.get('paidByFamilyId'),
    notes: formData.get('notes') || '',
    tags: formData.get('tags') || '',
    isRecurring: formData.get('isRecurring') === 'on',
    splitMethod: formData.get('splitMethod'),
  })

  if (!validated.success) {
    return { message: z.flattenError(validated.error).formErrors.join(' ') || 'Please check the form for errors.' }
  }

  const data = validated.data
  const total = Math.round((data.amount + data.tax) * 100) / 100

  const families = await prisma.family.findMany({
    where: { householdId: member.family.householdId, archived: false },
    select: { id: true },
  })
  const familyIds = families.map((f) => f.id)

  let splits: SplitResult[]

  if (data.splitMethod === 'EQUAL') {
    splits = computeEqualSplit(total, familyIds)
  } else if (data.splitMethod === 'PERCENTAGE') {
    const entries = familyIds.map((familyId) => ({
      familyId,
      percent: Number(formData.get(`split_${familyId}`)) || 0,
    }))
    const percentSum = entries.reduce((s, e) => s + e.percent, 0)
    if (Math.round(percentSum) !== 100) {
      return { message: `Percentages must add up to 100 (currently ${percentSum}).` }
    }
    splits = computePercentageSplit(total, entries)
  } else if (data.splitMethod === 'FIXED') {
    const entries = familyIds.map((familyId) => ({
      familyId,
      amount: Number(formData.get(`split_${familyId}`)) || 0,
    }))
    splits = computeFixedSplit(entries)
    if (Math.abs(sumOwed(splits) - total) > 0.01) {
      return {
        message: `Fixed amounts must add up to the total ($${total.toFixed(2)}). Currently $${sumOwed(splits).toFixed(2)}.`,
      }
    }
  } else {
    const entries = familyIds.map((familyId) => ({
      familyId,
      weight: Number(formData.get(`split_${familyId}`)) || 0,
    }))
    if (entries.every((e) => e.weight <= 0)) {
      return { message: 'Enter at least one positive share value.' }
    }
    splits = computeCustomSplit(total, entries)
  }

  await prisma.expense.create({
    data: {
      householdId: member.family.householdId,
      date: new Date(data.date),
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId || null,
      description: data.description,
      vendor: data.vendor || null,
      amount: data.amount,
      tax: data.tax,
      total,
      paidByFamilyId: data.paidByFamilyId,
      notes: data.notes || null,
      tags: data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      isRecurring: data.isRecurring,
      splitMethod: data.splitMethod,
      createdById: member.id,
      splits: {
        create: splits.map((s) => ({
          familyId: s.familyId,
          inputValue: s.inputValue,
          amountOwed: s.amountOwed,
        })),
      },
    },
  })

  revalidatePath('/expenses')
  revalidatePath('/')
  redirect('/expenses')
}

export async function voidExpense(expenseId: string) {
  const member = await requireMember()
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, householdId: member.family.householdId },
  })
  if (!expense) return
  if (member.role !== 'ADMIN' && expense.createdById !== member.id) return

  await prisma.expense.update({ where: { id: expenseId }, data: { status: 'VOID' } })
  revalidatePath('/expenses')
  revalidatePath('/')
}
