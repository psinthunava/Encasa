export type FamilyBalance = { familyId: string; familyName: string; balance: number }
export type Transfer = { fromFamilyId: string; fromName: string; toFamilyId: string; toName: string; amount: number }

// Greedy debt simplification: repeatedly match the biggest debtor with the
// biggest creditor until all balances are (near) zero. Minimizes transfer count.
export function computeTransfers(balances: FamilyBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b, balance: Math.round(b.balance * 100) / 100 }))
    .sort((a, b) => a.balance - b.balance)
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ ...b, balance: Math.round(b.balance * 100) / 100 }))
    .sort((a, b) => b.balance - a.balance)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(-debtor.balance, creditor.balance)

    if (amount > 0.005) {
      transfers.push({
        fromFamilyId: debtor.familyId,
        fromName: debtor.familyName,
        toFamilyId: creditor.familyId,
        toName: creditor.familyName,
        amount: Math.round(amount * 100) / 100,
      })
    }

    debtor.balance += amount
    creditor.balance -= amount

    if (Math.abs(debtor.balance) < 0.005) i++
    if (Math.abs(creditor.balance) < 0.005) j++
  }

  return transfers
}
