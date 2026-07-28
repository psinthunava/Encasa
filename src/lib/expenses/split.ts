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

export function computeFixedSplit(
  entries: { familyId: string; amount: number }[]
): SplitResult[] {
  return entries.map((e) => ({
    familyId: e.familyId,
    inputValue: e.amount,
    amountOwed: Math.round(e.amount * 100) / 100,
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
