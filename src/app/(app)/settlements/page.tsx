import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { computeBalancesForPeriod, generateSettlement } from '@/lib/settlements/actions'
import { computeTransfers } from '@/lib/settlements/engine'
import { SettlementStatusButton } from './settlement-actions'

function monthBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
  return { start, end }
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function SettlementsPage() {
  const member = await requireMember()
  const { start, end } = monthBounds(new Date())

  const liveBalances = await computeBalancesForPeriod(member.family.householdId, start, end)
  const liveTransfers = computeTransfers(
    liveBalances.map((b) => ({ familyId: b.familyId, familyName: b.familyName, balance: b.balance }))
  )

  const settlements = await prisma.settlement.findMany({
    where: { householdId: member.family.householdId },
    orderBy: { periodStart: 'desc' },
    include: { lines: { include: { family: true } } },
  })

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Current month (
          {start.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })})
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Family</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Paid</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Should pay
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {liveBalances.map((b) => (
                <tr key={b.familyId}>
                  <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{b.familyName}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    ${b.totalPaid.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    ${b.totalOwed.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {b.balance > 0 ? '+' : ''}
                    ${b.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          {liveTransfers.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">All families are settled up.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {liveTransfers.map((t, i) => (
                <li key={i}>
                  <span className="font-medium">{t.fromName}</span> pays{' '}
                  <span className="font-medium">{t.toName}</span>{' '}
                  <span className="font-semibold">${t.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {member.role === 'ADMIN' && (
          <form action={generateSettlement} className="mt-6 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Period start
              </label>
              <input
                type="date"
                name="periodStart"
                defaultValue={toDateInput(start)}
                className="mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Period end
              </label>
              <input
                type="date"
                name="periodEnd"
                defaultValue={toDateInput(end)}
                className="mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Generate settlement for this period
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settlement history</h2>
        {settlements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No settlements generated yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {settlements.map((s) => {
              const transfers = computeTransfers(
                s.lines.map((l) => ({
                  familyId: l.familyId,
                  familyName: l.family.name,
                  balance: Number(l.balance),
                }))
              )
              return (
                <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {toDateInput(s.periodStart)} to {toDateInput(s.periodEnd)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Status: {s.status === 'SETTLED' ? 'Settled' : 'Open'}
                      </p>
                    </div>
                    {member.role === 'ADMIN' && (
                      <SettlementStatusButton settlementId={s.id} status={s.status} />
                    )}
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {transfers.length === 0 ? (
                      <li className="text-slate-500 dark:text-slate-400">No transfers needed.</li>
                    ) : (
                      transfers.map((t, i) => (
                        <li key={i}>
                          <span className="font-medium">{t.fromName}</span> pays{' '}
                          <span className="font-medium">{t.toName}</span>{' '}
                          <span className="font-semibold">${t.amount.toFixed(2)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
