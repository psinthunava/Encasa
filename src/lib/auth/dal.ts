import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Combines the Supabase auth session with our own Member profile (role, family).
// Cached per request so multiple calls during a render don't re-hit auth + DB.
export const getCurrentMember = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const member = await prisma.member.findUnique({
    where: { id: user.id },
    include: { family: { include: { household: true } } },
  })

  return member
})

// Use in Server Components/Actions that require any signed-in member.
export async function requireMember() {
  const member = await getCurrentMember()
  if (!member || member.archived) {
    redirect('/login')
  }
  return member
}

// Use in Server Components/Actions that require the Administrator role.
export async function requireAdmin() {
  const member = await requireMember()
  if (member.role !== 'ADMIN') {
    redirect('/')
  }
  return member
}
