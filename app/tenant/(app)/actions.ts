'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// Saklar BUKA/TUTUP di header tenant. RLS + trigger tenant_update_guard: tenant hanya boleh mengubah is_open miliknya.
export async function setShopOpen(open: boolean): Promise<{ error?: string }> {
  if (!z.boolean().safeParse(open).success) return { error: 'Status toko tidak valid.' }
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const { data, error } = await db.from('tenants').update({ is_open: open }).eq('id', profile.tenant_id!).select('id').maybeSingle()
  if (error || !data) return { error: 'Gagal mengubah status toko. Coba lagi.' }
  revalidatePath('/tenant/(app)', 'layout')
  return {}
}
