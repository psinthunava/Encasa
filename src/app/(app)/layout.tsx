import Link from 'next/link'
import { requireMember } from '@/lib/auth/dal'
import { logout } from '@/lib/auth/actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember()

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/bills', label: 'Bills' },
    { href: '/expenses', label: 'Payment' },
    { href: '/settlements', label: 'Settlements' },
    ...(member.role === 'ADMIN' ? [{ href: '/categories', label: 'Categories' }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {member.family.household.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {member.name} · {member.family.name} family ·{' '}
              {member.role === 'ADMIN' ? 'Administrator' : 'Member'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
