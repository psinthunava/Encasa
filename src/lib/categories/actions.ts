'use server'

import * as z from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'

const NameSchema = z.string().trim().min(1, { error: 'Name is required.' }).max(60)

export async function createCategory(formData: FormData) {
  const member = await requireAdmin()
  const name = NameSchema.parse(formData.get('name'))

  const maxOrder = await prisma.category.aggregate({
    where: { householdId: member.family.householdId },
    _max: { sortOrder: true },
  })

  await prisma.category.create({
    data: {
      householdId: member.family.householdId,
      name,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })

  revalidatePath('/categories')
}

export async function renameCategory(categoryId: string, formData: FormData) {
  const member = await requireAdmin()
  const name = NameSchema.parse(formData.get('name'))

  await prisma.category.updateMany({
    where: { id: categoryId, householdId: member.family.householdId },
    data: { name },
  })

  revalidatePath('/categories')
}

export async function archiveCategory(categoryId: string) {
  const member = await requireAdmin()
  await prisma.category.updateMany({
    where: { id: categoryId, householdId: member.family.householdId },
    data: { archived: true },
  })
  revalidatePath('/categories')
}

export async function unarchiveCategory(categoryId: string) {
  const member = await requireAdmin()
  await prisma.category.updateMany({
    where: { id: categoryId, householdId: member.family.householdId },
    data: { archived: false },
  })
  revalidatePath('/categories')
}

export async function moveCategory(categoryId: string, direction: 'up' | 'down') {
  const member = await requireAdmin()

  const categories = await prisma.category.findMany({
    where: { householdId: member.family.householdId, archived: false },
    orderBy: { sortOrder: 'asc' },
  })

  const index = categories.findIndex((c) => c.id === categoryId)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= categories.length) return

  const a = categories[index]
  const b = categories[swapWith]

  await prisma.$transaction([
    prisma.category.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.category.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ])

  revalidatePath('/categories')
}

export async function createSubcategory(categoryId: string, formData: FormData) {
  const member = await requireAdmin()
  const name = NameSchema.parse(formData.get('name'))

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId: member.family.householdId },
  })
  if (!category) return

  const maxOrder = await prisma.subcategory.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  })

  await prisma.subcategory.create({
    data: { categoryId, name, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  })

  revalidatePath('/categories')
}

export async function renameSubcategory(subcategoryId: string, formData: FormData) {
  await requireAdmin()
  const name = NameSchema.parse(formData.get('name'))
  await prisma.subcategory.update({ where: { id: subcategoryId }, data: { name } })
  revalidatePath('/categories')
}

export async function archiveSubcategory(subcategoryId: string) {
  await requireAdmin()
  await prisma.subcategory.update({ where: { id: subcategoryId }, data: { archived: true } })
  revalidatePath('/categories')
}

export async function unarchiveSubcategory(subcategoryId: string) {
  await requireAdmin()
  await prisma.subcategory.update({ where: { id: subcategoryId }, data: { archived: false } })
  revalidatePath('/categories')
}

export type UpdateSplitState = { message?: string } | undefined

const SplitMethodSchema = z.enum(['EQUAL', 'PERCENTAGE', 'FIXED', 'CUSTOM'])

export async function updateCategorySplit(
  categoryId: string,
  _prevState: UpdateSplitState,
  formData: FormData
): Promise<UpdateSplitState> {
  const member = await requireAdmin()

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId: member.family.householdId },
  })
  if (!category) return { message: 'Category not found.' }

  const splitMethodResult = SplitMethodSchema.safeParse(formData.get('splitMethod'))
  if (!splitMethodResult.success) return { message: 'Invalid split method.' }
  const splitMethod = splitMethodResult.data

  const families = await prisma.family.findMany({
    where: { householdId: member.family.householdId, archived: false },
    select: { id: true },
  })

  let configs: { familyId: string; inputValue: number | null }[] = []

  if (splitMethod === 'PERCENTAGE') {
    configs = families.map((f) => ({
      familyId: f.id,
      inputValue: Number(formData.get(`split_${f.id}`)) || 0,
    }))
    const sum = configs.reduce((s, c) => s + (c.inputValue ?? 0), 0)
    if (Math.round(sum) !== 100) {
      return { message: `Percentages must add up to 100 (currently ${sum}).` }
    }
  } else if (splitMethod === 'FIXED') {
    configs = families.map((f) => {
      const isRemainder = formData.get(`remainder_${f.id}`) === 'on'
      return {
        familyId: f.id,
        inputValue: isRemainder ? null : Number(formData.get(`split_${f.id}`)) || 0,
      }
    })
    const remainderCount = configs.filter((c) => c.inputValue === null).length
    if (remainderCount !== 1) {
      return { message: 'Exactly one family must be marked "remaining balance" for a fixed split.' }
    }
  } else if (splitMethod === 'CUSTOM') {
    configs = families.map((f) => ({
      familyId: f.id,
      inputValue: Number(formData.get(`split_${f.id}`)) || 0,
    }))
    if (configs.every((c) => (c.inputValue ?? 0) <= 0)) {
      return { message: 'Enter at least one positive share value.' }
    }
  }

  await prisma.$transaction([
    prisma.category.update({ where: { id: categoryId }, data: { splitMethod } }),
    prisma.categorySplitConfig.deleteMany({ where: { categoryId } }),
    ...(configs.length > 0
      ? [
          prisma.categorySplitConfig.createMany({
            data: configs.map((c) => ({
              categoryId,
              familyId: c.familyId,
              inputValue: c.inputValue,
            })),
          }),
        ]
      : []),
  ])

  revalidatePath('/categories')
  revalidatePath('/expenses/new')
}
