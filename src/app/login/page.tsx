import { prisma } from '@/lib/prisma'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const household = await prisma.household.findFirst({ select: { name: true } })

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-slate-950 bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-8 shadow-lg backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {household?.name ?? 'Household Expenses'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to manage shared expenses
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
