'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// Tambah meja di kantin admin (RLS tables_admin_write). Token QR dibuat database (gen_random_uuid).
export async function addTable(label: string): Promise<{ error?: string; qrToken?: string }> {
  const profile = await requireRole(['admin'], '/admin/login')
  const parsed = z.string().trim().transform((v) => v.replace(/\s+/g, ' ')).pipe(z.string().min(1).max(30)).safeParse(label)
  if (!parsed.success) return { error: 'Isi label meja, contoh: Meja 35.' }
  const db = await createClient()
  const { data, error } = await db.from('dining_tables').insert({ canteen_id: profile.canteen_id, label: parsed.data }).select('qr_token').single()
  if (error) return { error: error.code === '23505' ? 'Label meja sudah dipakai.' : 'Meja gagal ditambahkan. Coba lagi.' }
  revalidatePath('/admin/meja')
  return { qrToken: data.qr_token }
}
