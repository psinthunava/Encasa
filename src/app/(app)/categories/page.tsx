import { requireAdmin } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { CategoryManager } from './category-manager'

export default async function CategoriesPage() {
  const member = await requireAdmin()

  const categories = await prisma.category.findMany({
    where: { householdId: member.family.householdId },
    orderBy: { sortOrder: 'asc' },
    include: { subcategories: { orderBy: { sortOrder: 'asc' } } },
  })

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Categories &amp; subcategories
      </h2>
      <CategoryManager categories={categories} />
    </div>
  )
}
