'use server'
import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Hanya admin. Data tenant lewat sesi admin (RLS: hanya kantinnya). Akun login lewat secret key (auth.admin).
export type AccountResult = { error?: string; password?: string }

const tenantFields = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/),
  name: z.string().trim().min(1).max(40),
  percent: z.number().min(0).max(100).multipleOf(0.01),
})
const email = z.email().trim().toLowerCase()
const id = z.number().int().positive()

async function adminSession() {
  const profile = await requireRole(['admin'], '/admin/login')
  return { db: await createClient(), canteenId: profile.canteen_id }
}

const tempPassword = () => randomBytes(9).toString('base64url') // 12 karakter, ditampilkan sekali ke admin

const fail = (error: { code?: string; message?: string } | null, fallback: string): AccountResult => {
  if (error?.code === '23505') return { error: 'Kode sudah dipakai tenant lain.' }
  return { error: fallback }
}

// Buat akun login + baris profiles. Gagal di tengah = akun dihapus lagi, jadi tidak ada akun tanpa profil.
async function createAccount(input: { email: string; full_name: string; role: 'tenant' | 'cashier'; canteen_id: number; tenant_id?: number }) {
  const password = tempPassword()
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: input.email, password, email_confirm: true })
  if (error) return { error: /already|exists|registered/i.test(error.message) ? 'Email ini sudah dipakai akun lain.' : 'Akun login gagal dibuat. Coba lagi.' }
  const { error: profileError } = await supabaseAdmin.from('profiles')
    .insert({ id: data.user.id, full_name: input.full_name, role: input.role, canteen_id: input.canteen_id, tenant_id: input.tenant_id })
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id)
    return { error: 'Akun login gagal dibuat. Coba lagi.' }
  }
  return { password }
}

export async function createTenant(input: { code: string; name: string; percent: number; email: string }): Promise<AccountResult> {
  const { db, canteenId } = await adminSession()
  const fields = tenantFields.safeParse(input)
  const mail = email.safeParse(input.email)
  if (!fields.success || !mail.success) return { error: 'Periksa kode, nama, bagi hasil, dan email.' }

  const { data: tenant, error } = await db.from('tenants')
    .insert({ canteen_id: canteenId, code: fields.data.code, name: fields.data.name, revenue_share_percent: fields.data.percent, is_open: false })
    .select('id').single()
  if (error) return fail(error, 'Tenant gagal dibuat. Coba lagi.')

  const account = await createAccount({ email: mail.data, full_name: fields.data.name, role: 'tenant', canteen_id: canteenId, tenant_id: tenant.id })
  if (account.error) await db.from('tenants').delete().eq('id', tenant.id) // tenant tanpa akun tidak berguna
  revalidatePath('/admin/tenant')
  return account
}

export async function updateTenant(tenantId: number, input: { code: string; name: string; percent: number }): Promise<AccountResult> {
  const { db } = await adminSession()
  const fields = tenantFields.safeParse(input)
  if (!fields.success || !id.safeParse(tenantId).success) return { error: 'Periksa kode, nama, dan bagi hasil.' }
  const { data, error } = await db.from('tenants')
    .update({ code: fields.data.code, name: fields.data.name, revenue_share_percent: fields.data.percent })
    .eq('id', tenantId).select('id').maybeSingle()
  if (error || !data) return fail(error, 'Tenant gagal disimpan. Muat ulang halaman.')
  revalidatePath('/admin/tenant')
  return {}
}

// Nonaktif: hilang dari menu pembeli dan checkout ditolak (RLS + create_checkout). Data lama tetap utuh.
export async function setTenantActive(tenantId: number, active: boolean): Promise<AccountResult> {
  const { db } = await adminSession()
  if (!id.safeParse(tenantId).success) return { error: 'Tenant tidak valid.' }
  const { data, error } = await db.from('tenants').update({ is_active: active === true, ...(!active && { is_open: false }) })
    .eq('id', tenantId).select('id').maybeSingle()
  if (error || !data) return fail(error, 'Status tenant gagal diubah. Muat ulang halaman.')
  revalidatePath('/admin/tenant')
  return {}
}

export async function createCashier(input: { name: string; email: string }): Promise<AccountResult> {
  const { canteenId } = await adminSession()
  const name = z.string().trim().min(1).max(40).safeParse(input.name)
  const mail = email.safeParse(input.email)
  if (!name.success || !mail.success) return { error: 'Periksa nama dan email.' }
  const account = await createAccount({ email: mail.data, full_name: name.data, role: 'cashier', canteen_id: canteenId })
  revalidatePath('/admin/tenant')
  return account
}
