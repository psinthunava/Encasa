import { prisma } from '@/lib/prisma'
import { SignupForm } from './signup-form'

export default async function SignupPage() {
  const families = await prisma.family.findMany({
    where: { archived: false },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join the Sinthunava &amp; Junya household
          </p>
        </div>
        <SignupForm families={families} />
      </div>
    </div>
  )
}
