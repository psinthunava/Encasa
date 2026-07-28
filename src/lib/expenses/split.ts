export type SplitMethod = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'CUSTOM'

export type SplitResult = { familyId: string; inputValue: number | null; amountOwed: number }

// All math done in integer cents to avoid floating point drift, with any
// leftover cent from rounding assigned to the last family in the list.
function distributeCents(totalCents: number, shares: number[]): number[] {
  const shareSum = shares.reduce((a, b) => a + b, 0)
  if (shareSum <= 0) return shares.map(() => 0)

  const amounts = shares.map((share) => Math.floor((totalCents * share) / shareSum))
  const distributed = amounts.reduce((a, b) => a + b, 0)
  const remainder = totalCents - distributed

  if (amounts.length > 0) {
    amounts[amounts.length - 1] += remainder
  }
  return amounts
}

export function computeEqualSplit(total: number, familyIds: string[]): SplitResult[] {
  const totalCents = Math.round(total * 100)
  const amounts = distributeCents(totalCents, familyIds.map(() => 1))
  return familyIds.map((familyId, i) => ({
    familyId,
    inputValue: null,
    amountOwed: amounts[i] / 100,
  }))
}

export function computePercentageSplit(
  total: number,
  entries: { familyId: string; percent: number }[]
): SplitResult[] {
  const totalCents = Math.round(total * 100)
  const amounts = distributeCents(
    totalCents,
    entries.map((e) => e.percent)
  )
  return entries.map((e, i) => ({
    familyId: e.familyId,
    inputValue: e.percent,
    amountOwed: amounts[i] / 100,
  }))
}

// entries with amount === null receive the remaining balance after fixed
// amounts are subtracted from total (split evenly if more than one is null).
// This is what lets a FIXED category default keep working as the expense
// total varies month to month (e.g. "Family A always pays $300, Family B covers the rest").
export function computeFixedSplit(
  total: number,
  entries: { familyId: string; amount: number | null }[]
): SplitResult[] {
  const totalCents = Math.round(total * 100)
  const fixedCents = entries.map((e) => (e.amount == null ? null : Math.round(e.amount * 100)))
  const sumFixed = fixedCents.reduce((sum: number, c) => sum + (c ?? 0), 0)
  const remainderRecipients = fixedCents.filter((c) => c === null).length
  const remainderTotalCents = totalCents - sumFixed
  const perRemainderCents = remainderRecipients > 0 ? Math.floor(remainderTotalCents / remainderRecipients) : 0

  let remainderIndex = 0
  const amountsCents = fixedCents.map((c) => {
    if (c !== null) return c
    remainderIndex++
    const isLast = remainderIndex === remainderRecipients
    return isLast ? remainderTotalCents - perRemainderCents * (remainderRecipients - 1) : perRemainderCents
  })

  return entries.map((e, i) => ({
    familyId: e.familyId,
    inputValue: e.amount,
    amountOwed: amountsCents[i] / 100,
  }))
}

export function computeCustomSplit(
  total: number,
  entries: { familyId: string; weight: number }[]
): SplitResult[] {
  const totalCents = Math.round(total * 100)
  const amounts = distributeCents(
    totalCents,
    entries.map((e) => e.weight)
  )
  return entries.map((e, i) => ({
    familyId: e.familyId,
    inputValue: e.weight,
    amountOwed: amounts[i] / 100,
  }))
}

export function sumOwed(splits: SplitResult[]): number {
  return Math.round(splits.reduce((sum, s) => sum + s.amountOwed, 0) * 100) / 100
}

// Computes an expense's splits from its category's stored default split
// configuration. This is the single place expense creation (and, later,
// recurring expense generation) should call so the category's rule is
// always applied consistently.
export function computeSplitsFromCategoryConfig(
  splitMethod: SplitMethod,
  splitConfigs: { familyId: string; inputValue: number | null }[],
  familyIds: string[],
  total: number
): SplitResult[] {
  if (splitMethod === 'EQUAL' || splitConfigs.length === 0) {
    return computeEqualSplit(total, familyIds)
  }

  const configByFamily = new Map(splitConfigs.map((c) => [c.familyId, c.inputValue]))

  if (splitMethod === 'PERCENTAGE') {
    return computePercentageSplit(
      total,
      familyIds.map((familyId) => ({ familyId, percent: configByFamily.get(familyId) ?? 0 }))
    )
  }

  if (splitMethod === 'FIXED') {
    return computeFixedSplit(
      total,
      familyIds.map((familyId) => ({
        familyId,
        amount: configByFamily.has(familyId) ? configByFamily.get(familyId)! : null,
      }))
    )
  }

  // CUSTOM
  return computeCustomSplit(
    total,
    familyIds.map((familyId) => ({ familyId, weight: configByFamily.get(familyId) ?? 0 }))
  )
}
