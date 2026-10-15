'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { homeOf } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const credentials = z.object({ email: z.email(), password: z.string().min(1) })

export type SignInState = { error?: string; email?: string }

// Login staf (tenant, admin, kasir). Setelah berhasil, diarahkan ke halaman awal sesuai peran di profiles.
export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim()
  const parsed = credentials.safeParse({ email, password: form.get('password') })
  if (!parsed.success) return { error: 'Isi email dan kata sandi dengan benar.', email }

  const db = await createClient()
  const { data, error } = await db.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Email atau kata sandi salah.', email }

  // Client yang sama sudah memegang sesi barunya (cookie baru belum terbaca request ini).
  const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  if (!profile) {
    await db.auth.signOut()
    return { error: 'Akun ini belum terdaftar di kantin. Hubungi pengelola.', email }
  }
  redirect(homeOf[profile.role])
}

export async function signOut(loginPath: string) {
  const db = await createClient()
  await db.auth.signOut()
  redirect(loginPath === '/admin/login' ? '/admin/login' : '/tenant/login')
}
