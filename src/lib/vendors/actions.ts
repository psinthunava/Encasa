'use server'

import { revalidatePath } from 'next/cache'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'

export async function deleteVendor(vendorId: string) {
  const member = await requireMember()
  await prisma.vendor.deleteMany({
    where: { id: vendorId, householdId: member.family.householdId },
  })
  revalidatePath('/expenses/new')
}

// Saves a vendor name the first time it's used on an expense, so it shows up
// in the autocomplete list next time. No-op if it's already saved.
export async function ensureVendorSaved(householdId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await prisma.vendor.upsert({
    where: { householdId_name: { householdId, name: trimmed } },
    create: { householdId, name: trimmed },
    update: {},
  })
}
