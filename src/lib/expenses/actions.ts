'use server'

import * as z from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import type { Member } from '@prisma/client'
import { computeSplitsFromSplitConfig } from './split'
import { ensureVendorSaved } from '@/lib/vendors/actions'

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
})

type MemberWithFamily = Member & { family: { householdId: string } }

// Shared by create/update: validates the form, derives the split from the
// chosen subcategory (or EQUAL if none), and auto-saves any new vendor name.
async function prepareExpenseWrite(member: MemberWithFamily, formData: FormData) {
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
  })

  if (!validated.success) {
    return {
      error: z.flattenError(validated.error).formErrors.join(' ') || 'Please check the form for errors.',
    } as const
  }

  const data = validated.data
  const total = Math.round((data.amount + data.tax) * 100) / 100

  const [category, subcategory, families] = await Promise.all([
    prisma.category.findFirst({
      where: { id: data.categoryId, householdId: member.family.householdId },
    }),
    data.subcategoryId
      ? prisma.subcategory.findFirst({
          where: { id: data.subcategoryId, categoryId: data.categoryId },
          include: { splitConfigs: true },
        })
      : Promise.resolve(null),
    prisma.family.findMany({
      where: { householdId: member.family.householdId, archived: false },
      select: { id: true },
    }),
  ])

  if (!category) return { error: 'Category not found.' } as const
  if (data.subcategoryId && !subcategory) return { error: 'Subcategory not found.' } as const

  // No subcategory chosen (or the subcategory has no config saved) -> split evenly, not recurring.
  const splitMethod = subcategory?.splitMethod ?? 'EQUAL'
  const isRecurring = subcategory?.isRecurring ?? false
  const splitConfigs = (subcategory?.splitConfigs ?? []).map((c) => ({
    familyId: c.familyId,
    inputValue: c.inputValue === null ? null : Number(c.inputValue),
  }))

  const splits = computeSplitsFromSplitConfig(
    splitMethod,
    splitConfigs,
    families.map((f) => f.id),
    total
  )

  if (data.vendor) {
    await ensureVendorSaved(member.family.householdId, data.vendor)
  }

  return {
    fields: {
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
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      isRecurring,
      splitMethod,
    },
    splits,
  } as const
}

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const member = await requireMember()
  if (member.role !== 'ADMIN' && !member.canAddExpenses) {
    return { message: 'You do not have permission to add expenses.' }
  }

  const result = await prepareExpenseWrite(member, formData)
  if ('error' in result) return { message: result.error }

  await prisma.expense.create({
    data: {
      ...result.fields,
      createdById: member.id,
      splits: {
        create: result.splits.map((s) => ({
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

export async function updateExpense(
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const member = await requireMember()

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, householdId: member.family.householdId },
  })
  if (!existing) return { message: 'Expense not found.' }
  const canEdit = member.role === 'ADMIN' || (existing.createdById === member.id && member.canAddExpenses)
  if (!canEdit) return { message: 'You do not have permission to edit this expense.' }

  const result = await prepareExpenseWrite(member, formData)
  if ('error' in result) return { message: result.error }

  await prisma.$transaction([
    prisma.expense.update({ where: { id: expenseId }, data: result.fields }),
    prisma.expenseSplit.deleteMany({ where: { expenseId } }),
    prisma.expenseSplit.createMany({
      data: result.splits.map((s) => ({
        expenseId,
        familyId: s.familyId,
        inputValue: s.inputValue,
        amountOwed: s.amountOwed,
      })),
    }),
  ])

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

// Permanent removal (unlike Void, which keeps the record for history).
// Restricted to admins since it can't be undone.
export async function deleteExpense(expenseId: string) {
  const member = await requireMember()
  if (member.role !== 'ADMIN') return

  await prisma.expense.deleteMany({
    where: { id: expenseId, householdId: member.family.householdId },
  })
  revalidatePath('/expenses')
  revalidatePath('/')
}
