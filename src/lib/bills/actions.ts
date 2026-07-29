'use server'

import * as z from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import type { Member } from '@prisma/client'
import { computeSplitsFromSplitConfig } from '@/lib/expenses/split'
import { ensureVendorSaved } from '@/lib/vendors/actions'
import {
  assertValidAttachmentFile,
  uploadBillAttachment,
  removeAttachmentFile,
  BillAttachmentError,
} from '@/lib/supabase/storage'

export type BillFormState = { message?: string } | undefined

const BillSchema = z.object({
  categoryId: z.uuid({ error: 'Select a category.' }),
  subcategoryId: z.uuid().optional().or(z.literal('')),
  vendor: z.string().trim().min(1, { error: 'Store / vendor name is required.' }),
  invoiceId: z.string().trim().min(1, { error: 'Invoice ID is required.' }),
  description: z.string().trim().optional().or(z.literal('')),
  statementDate: z.iso.date({ error: 'Enter a valid statement date.' }),
  dueDate: z.iso.date({ error: 'Enter a valid due date.' }),
  amountDue: z.coerce.number({ error: 'Enter a valid amount due.' }).positive(),
  notes: z.string().trim().optional().or(z.literal('')),
})

const SplitMethodSchema = z.enum(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM'])

const RecordPaymentSchema = z.object({
  amount: z.coerce.number({ error: 'Enter a valid amount.' }).positive(),
  paidDate: z.iso.date({ error: 'Enter a valid payment date.' }),
  paidByFamilyId: z.uuid({ error: 'Select who paid.' }),
  notes: z.string().trim().optional().or(z.literal('')),
  splitMethod: SplitMethodSchema,
})

type MemberWithFamily = Member & { family: { householdId: string } }

function canManageBills(member: Member) {
  return member.role === 'ADMIN' || member.canAddExpenses
}

function attachmentFilesFrom(formData: FormData): File[] {
  return formData
    .getAll('attachments')
    .filter((f): f is File => f instanceof File && f.size > 0)
}

// Shared by create/update: validates the form and re-derives category/
// subcategory scoped to the caller's household (never trusts the client).
async function prepareBillWrite(member: MemberWithFamily, formData: FormData) {
  const validated = BillSchema.safeParse({
    categoryId: formData.get('categoryId'),
    subcategoryId: formData.get('subcategoryId') || '',
    vendor: formData.get('vendor'),
    invoiceId: formData.get('invoiceId'),
    description: formData.get('description') || '',
    statementDate: formData.get('statementDate'),
    dueDate: formData.get('dueDate'),
    amountDue: formData.get('amountDue'),
    notes: formData.get('notes') || '',
  })

  if (!validated.success) {
    return {
      error: z.flattenError(validated.error).formErrors.join(' ') || 'Please check the form for errors.',
    } as const
  }

  const data = validated.data

  const [category, subcategory] = await Promise.all([
    prisma.category.findFirst({
      where: { id: data.categoryId, householdId: member.family.householdId },
    }),
    data.subcategoryId
      ? prisma.subcategory.findFirst({
          where: { id: data.subcategoryId, categoryId: data.categoryId },
        })
      : Promise.resolve(null),
  ])

  if (!category) return { error: 'Category not found.' } as const
  if (data.subcategoryId && !subcategory) return { error: 'Subcategory not found.' } as const

  await ensureVendorSaved(member.family.householdId, data.vendor)

  return {
    fields: {
      householdId: member.family.householdId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId || null,
      vendor: data.vendor,
      invoiceId: data.invoiceId,
      description: data.description || null,
      statementDate: new Date(data.statementDate),
      dueDate: new Date(data.dueDate),
      amountDue: data.amountDue,
      notes: data.notes || null,
    },
  } as const
}

export async function createBill(_prevState: BillFormState, formData: FormData): Promise<BillFormState> {
  const member = await requireMember()
  if (!canManageBills(member)) {
    return { message: 'You do not have permission to add bills.' }
  }

  const files = attachmentFilesFrom(formData)
  try {
    files.forEach(assertValidAttachmentFile)
  } catch (err) {
    return { message: err instanceof BillAttachmentError ? err.message : 'Invalid attachment.' }
  }

  const result = await prepareBillWrite(member, formData)
  if ('error' in result) return { message: result.error }

  const bill = await prisma.bill.create({
    data: { ...result.fields, createdById: member.id },
  })

  for (const file of files) {
    try {
      const storagePath = await uploadBillAttachment(member.family.householdId, bill.id, file)
      await prisma.billAttachment.create({
        data: {
          billId: bill.id,
          storagePath,
          fileName: file.name,
          mimeType: file.type,
          uploadedById: member.id,
        },
      })
    } catch {
      // Bill itself is already saved; an attachment failing to upload
      // shouldn't lose the rest of the entry. User can retry from the
      // bill detail page.
    }
  }

  revalidatePath('/bills')
  redirect('/bills')
}

export async function updateBill(
  billId: string,
  _prevState: BillFormState,
  formData: FormData
): Promise<BillFormState> {
  const member = await requireMember()

  const existing = await prisma.bill.findFirst({
    where: { id: billId, householdId: member.family.householdId },
  })
  if (!existing) return { message: 'Bill not found.' }
  const canEdit = member.role === 'ADMIN' || (existing.createdById === member.id && member.canAddExpenses)
  if (!canEdit) return { message: 'You do not have permission to edit this bill.' }

  const files = attachmentFilesFrom(formData)
  try {
    files.forEach(assertValidAttachmentFile)
  } catch (err) {
    return { message: err instanceof BillAttachmentError ? err.message : 'Invalid attachment.' }
  }

  const result = await prepareBillWrite(member, formData)
  if ('error' in result) return { message: result.error }

  await prisma.bill.update({ where: { id: billId }, data: result.fields })

  for (const file of files) {
    try {
      const storagePath = await uploadBillAttachment(member.family.householdId, billId, file)
      await prisma.billAttachment.create({
        data: {
          billId,
          storagePath,
          fileName: file.name,
          mimeType: file.type,
          uploadedById: member.id,
        },
      })
    } catch {
      // See createBill — don't let a failed attachment block the save.
    }
  }

  revalidatePath('/bills')
  revalidatePath(`/bills/${billId}`)
  redirect(`/bills/${billId}`)
}

// Permanent removal of the bill-tracking record (and its payments/
// attachments metadata + files). Does NOT delete the Expense rows that
// payments already generated — those are independent financial history.
export async function deleteBill(billId: string) {
  const member = await requireMember()
  if (member.role !== 'ADMIN') return

  const bill = await prisma.bill.findFirst({
    where: { id: billId, householdId: member.family.householdId },
    include: { attachments: true },
  })
  if (!bill) return

  await Promise.all(bill.attachments.map((a) => removeAttachmentFile(a.storagePath)))
  await prisma.bill.deleteMany({ where: { id: billId, householdId: member.family.householdId } })

  revalidatePath('/bills')
}

export async function deleteBillAttachment(attachmentId: string) {
  const member = await requireMember()

  const attachment = await prisma.billAttachment.findFirst({
    where: { id: attachmentId, bill: { householdId: member.family.householdId } },
    include: { bill: true },
  })
  if (!attachment) return
  const canDelete = member.role === 'ADMIN' || attachment.bill.createdById === member.id
  if (!canDelete) return

  await removeAttachmentFile(attachment.storagePath)
  await prisma.billAttachment.delete({ where: { id: attachmentId } })

  revalidatePath(`/bills/${attachment.billId}`)
}

// The conversion step: every recorded payment (partial or final)
// immediately becomes its own Expense, paid by whichever family made that
// payment, split per the bill's category/subcategory rule via the same
// computeSplitsFromSplitConfig used for manually-entered expenses. Once
// cumulative payments reach amountDue, the bill flips to PAID and drops
// out of the open-bills list.
export async function recordBillPayment(
  billId: string,
  _prevState: BillFormState,
  formData: FormData
): Promise<BillFormState> {
  const member = await requireMember()
  if (!canManageBills(member)) {
    return { message: 'You do not have permission to record bill payments.' }
  }

  const validated = RecordPaymentSchema.safeParse({
    amount: formData.get('amount'),
    paidDate: formData.get('paidDate'),
    paidByFamilyId: formData.get('paidByFamilyId'),
    notes: formData.get('notes') || '',
    splitMethod: formData.get('splitMethod'),
  })
  if (!validated.success) {
    return {
      message: z.flattenError(validated.error).formErrors.join(' ') || 'Please check the form for errors.',
    }
  }
  const data = validated.data
  const amount = Math.round(data.amount * 100) / 100

  const [bill, family, families] = await Promise.all([
    prisma.bill.findFirst({
      where: { id: billId, householdId: member.family.householdId },
      include: {
        subcategory: { include: { splitConfigs: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.family.findFirst({
      where: { id: data.paidByFamilyId, householdId: member.family.householdId, archived: false },
    }),
    prisma.family.findMany({
      where: { householdId: member.family.householdId, archived: false },
      select: { id: true },
    }),
  ])

  if (!bill) return { message: 'Bill not found.' }
  if (bill.status === 'PAID') return { message: 'This bill is already fully paid.' }
  if (!family) return { message: 'Select a valid family.' }

  // Split method/config chosen here applies only to this payment's Expense —
  // the subcategory's stored default (bill.subcategory.splitMethod /
  // SubcategorySplitConfig) is never written to, so future payments still
  // fall back to it unless overridden again.
  const splitMethod = data.splitMethod
  const isRecurring = bill.subcategory?.isRecurring ?? false

  let splitConfigs: { familyId: string; inputValue: number | null }[] = []
  if (splitMethod === 'PERCENTAGE') {
    splitConfigs = families.map((f) => ({
      familyId: f.id,
      inputValue: Number(formData.get(`split_${f.id}`)) || 0,
    }))
    const sum = splitConfigs.reduce((s, c) => s + (c.inputValue ?? 0), 0)
    if (Math.round(sum) !== 100) {
      return { message: `Percentages must add up to 100 (currently ${sum}).` }
    }
  } else if (splitMethod === 'FIXED') {
    splitConfigs = families.map((f) => {
      const isRemainder = formData.get(`remainder_${f.id}`) === 'on'
      return { familyId: f.id, inputValue: isRemainder ? null : Number(formData.get(`split_${f.id}`)) || 0 }
    })
    const remainderCount = splitConfigs.filter((c) => c.inputValue === null).length
    if (remainderCount !== 1) {
      return { message: 'Exactly one family must be marked "remaining balance" for a fixed split.' }
    }
  } else if (splitMethod === 'CUSTOM') {
    splitConfigs = families.map((f) => ({
      familyId: f.id,
      inputValue: Number(formData.get(`split_${f.id}`)) || 0,
    }))
    if (splitConfigs.every((c) => (c.inputValue ?? 0) <= 0)) {
      return { message: 'Enter at least one positive share value.' }
    }
  }

  const splits = computeSplitsFromSplitConfig(
    splitMethod,
    splitConfigs,
    families.map((f) => f.id),
    amount
  )

  const alreadyPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const cumulativePaid = Math.round((alreadyPaid + amount) * 100) / 100
  const newStatus = cumulativePaid >= Number(bill.amountDue) ? 'PAID' : 'PARTIAL'

  await ensureVendorSaved(member.family.householdId, bill.vendor)

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        householdId: member.family.householdId,
        date: new Date(data.paidDate),
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId,
        description: bill.description || `${bill.vendor} — Invoice ${bill.invoiceId}`,
        vendor: bill.vendor,
        amount,
        tax: 0,
        total: amount,
        paidByFamilyId: data.paidByFamilyId,
        notes: bill.notes,
        isRecurring,
        splitMethod,
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

    await tx.billPayment.create({
      data: {
        billId: bill.id,
        amount,
        paidDate: new Date(data.paidDate),
        paidByFamilyId: data.paidByFamilyId,
        notes: data.notes || null,
        expenseId: expense.id,
        createdById: member.id,
      },
    })

    await tx.bill.update({ where: { id: bill.id }, data: { status: newStatus } })
  })

  revalidatePath('/bills')
  revalidatePath(`/bills/${billId}`)
  revalidatePath('/expenses')
  revalidatePath('/')
}
