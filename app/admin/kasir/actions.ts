'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getProfile } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const cashInput = z.object({
  requestId: z.uuid(),
  customerName: z.string().trim().min(1).max(40),
  service: z.enum(['dine_in', 'takeaway']),
  received: z.number().int().positive().safe(),
  items: z.array(z.object({ menu_item_id: z.number().int().positive().safe(), quantity: z.number().int().min(1).max(50) }).strict()).min(1).max(100),
}).strict().refine((value) => new Set(value.items.map((item) => item.menu_item_id)).size === value.items.length)

export async function acceptCash(input: unknown): Promise<{ error?: string; status?: number; checkoutId?: number; total?: number; received?: number; change?: number }> {
  const profile = await getProfile()
  if (!profile || !['admin', 'cashier'].includes(profile.role)) return { error: 'Hanya kasir dan admin yang dapat menerima tunai.', status: 403 }
  const parsed = cashInput.safeParse(input)
  if (!parsed.success) return { error: 'Periksa nama, uang diterima, dan isi pesanan.', status: 400 }
  const value = parsed.data
  try {
    const { data, error } = await supabaseAdmin.rpc('create_cash_checkout', {
      p_canteen_id: profile.canteen_id, p_created_by: profile.id, p_request_id: value.requestId,
      p_customer_name: value.customerName, p_service_type: value.service, p_items: value.items, p_cash_received: value.received,
    })
    if (error) {
      if (error.code === 'P0001' && /^(Menu tidak tersedia:|Menu habis:|Jumlah tidak valid:|Keranjang kosong$|Uang diterima kurang dari total pesanan\. Periksa nominalnya\.$|Permintaan tunai ini sudah digunakan untuk pesanan berbeda\.$|Data pesanan tunai tidak valid\.$)| sedang tutup\. Hapus menunya dari pesanan\.$/.test(error.message)) return { error: error.message, status: 409 }
      // 23514 = constraint (mis. nominal/nama tidak sah): pasti gagal, bukan "belum dapat dipastikan".
      if (error.code === '23514') return { error: 'Data pesanan tunai tidak valid. Periksa nama dan nominal.', status: 409 }
      throw error
    }
    if (!data) throw new Error('Checkout kosong')
    revalidatePath('/admin/kasir')
    revalidatePath('/admin')
    revalidatePath('/tenant')
    return { checkoutId: data.id, total: data.total, received: data.cash_received!, change: data.cash_received! - data.total }
  } catch {
    return { error: 'Transaksi belum dapat dipastikan. Periksa riwayat sebelum mencoba lagi.', status: 502 }
  }
}
