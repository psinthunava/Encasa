'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type AuthFormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
        familyId?: string[]
      }
      message?: string
    }
  | undefined

const LoginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email.' }),
  password: z.string().min(1, { error: 'Password is required.' }),
})

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(validated.data)

  if (error) {
    console.error('Login failed:', error.code, error.message)
    if (error.code === 'email_not_confirmed') {
      return {
        message: 'Please confirm your email before signing in — check your inbox for a confirmation link.',
      }
    }
    return { message: 'Incorrect email or password.' }
  }

  redirect('/')
}

const SignupSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  email: z.email({ error: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { error: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { error: 'Password must contain at least one number.' }),
  familyId: z.uuid({ error: 'Please select a family.' }),
})

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    familyId: formData.get('familyId'),
  })

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const { name, email, password, familyId } = validated.data

  const family = await prisma.family.findUnique({ where: { id: familyId } })
  if (!family) {
    return { message: 'Selected family does not exist.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) {
    return { message: error.message }
  }
  if (!data.user) {
    return { message: 'Could not create account. Please try again.' }
  }

  const existingMemberCount = await prisma.member.count({
    where: { family: { householdId: family.householdId } },
  })

  await prisma.member.create({
    data: {
      id: data.user.id,
      familyId,
      email,
      name,
      role: existingMemberCount === 0 ? 'ADMIN' : 'MEMBER',
    },
  })

  if (!data.session) {
    return {
      message:
        'Account created. Check your email to confirm your address before logging in.',
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
