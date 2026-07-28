import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { CategoryManager } from './category-manager'

export default async function CategoriesPage() {
  const member = await requireAdmin()

  const [categories, families] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: member.family.householdId },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          orderBy: { sortOrder: 'asc' },
          include: { splitConfigs: true },
        },
      },
    }),
    prisma.family.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const categoriesForClient = categories.map((c) => ({
    ...c,
    subcategories: c.subcategories.map((s) => ({
      ...s,
      splitConfigs: s.splitConfigs.map((sc) => ({
        familyId: sc.familyId,
        inputValue: sc.inputValue === null ? null : Number(sc.inputValue),
      })),
    })),
  }))

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Categories &amp; subcategories
      </h2>
      <CategoryManager categories={categoriesForClient} families={families} />
    </div>
  )
}
