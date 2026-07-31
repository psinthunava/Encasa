import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireMember } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'
import { updateBill } from '@/lib/bills/actions'
import { getSignedAttachmentUrl } from '@/lib/supabase/storage'
import { BillForm } from '../../bill-form'

export default async function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await requireMember()

  const bill = await prisma.bill.findFirst({
    where: { id, householdId: member.family.householdId },
    include: { attachments: { orderBy: { createdAt: 'asc' } } },
  })
  if (!bill) notFound()

  const canEdit = member.role === 'ADMIN' || (bill.createdById === member.id && member.canAddExpenses)
  if (!canEdit) {
    return (
      <div>
        <p className="text-slate-600 dark:text-slate-400">
          You don&apos;t have permission to edit this bill.
        </p>
        <Link href="/bills" className="text-indigo-600 hover:underline text-sm">
          Back to bills
        </Link>
      </div>
    )
  }

  const [categories, vendors, existingAttachments] = await Promise.all([
    prisma.category.findMany({
      where: { householdId: member.family.householdId, archived: false },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { archived: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.vendor.findMany({
      where: { householdId: member.family.householdId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    Promise.all(
      bill.attachments.map(async (a) => ({
        id: a.id,
        fileName: a.fileName,
        url: await getSignedAttachmentUrl(a.storagePath),
      }))
    ),
  ])

  return (
    <BillForm
      categories={categories}
      vendors={vendors}
      existingAttachments={existingAttachments}
      action={updateBill.bind(null, bill.id)}
      title="Edit bill"
      submitLabel="Save changes"
      initialValues={{
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId ?? '',
        vendor: bill.vendor,
        invoiceId: bill.invoiceId,
        description: bill.description ?? '',
        statementDate: bill.statementDate.toISOString().slice(0, 10),
        dueDate: bill.dueDate.toISOString().slice(0, 10),
        amountDue: Number(bill.amountDue),
        notes: bill.notes ?? '',
      }}
    />
  )
}
