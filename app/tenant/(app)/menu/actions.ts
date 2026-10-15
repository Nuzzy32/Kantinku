'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Semua perubahan memakai sesi tenant (RLS: hanya menu miliknya). Error dikembalikan sebagai teks untuk toast.
export type ActionResult = { error?: string }

const MAX_PHOTO = 300 * 1024
const PHOTO_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg' } as const

const id = z.number().int().positive()
const draft = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(60),
  price: z.number().int().positive().max(9_999_999),
  category: z.string().trim().min(1).max(30),
  removePhoto: z.boolean(),
})

async function session() {
  const profile = await requireRole(['tenant'], '/tenant/login')
  return { db: await createClient(), tenantId: profile.tenant_id! }
}

const done = (error?: { message: string } | null): ActionResult => {
  if (error) return { error: 'Gagal menyimpan. Coba lagi.' }
  revalidatePath('/tenant/menu')
  return {}
}

export async function setAvailable(itemId: number, available: boolean): Promise<ActionResult> {
  const { db } = await session()
  const { error } = await db.from('menu_items').update({ is_available: available }).eq('id', id.parse(itemId))
  return done(error)
}

// Hapus = soft delete: baris tetap ada supaya order_items lama tetap utuh. `restore` untuk Urungkan.
export async function setActive(itemId: number, active: boolean): Promise<ActionResult> {
  const { db } = await session()
  const { error } = await db.from('menu_items').update({ is_active: active }).eq('id', id.parse(itemId))
  return done(error)
}

// Tambah/edit. Kategori dicari per nama (tanpa beda huruf besar/kecil), dibuat bila belum ada.
export async function saveMenuItem(form: FormData): Promise<ActionResult> {
  const { db, tenantId } = await session()
  const parsed = draft.safeParse({
    id: form.get('id') ? Number(form.get('id')) : undefined,
    name: form.get('name'),
    price: Number(form.get('price')),
    category: form.get('category'),
    removePhoto: form.get('removePhoto') === '1',
  })
  if (!parsed.success) return { error: 'Isi nama, harga lebih dari 0, dan kategori.' }
  const d = parsed.data

  const photo = form.get('photo')
  let imageUrl: string | null | undefined = d.removePhoto ? null : undefined
  if (photo instanceof File && photo.size > 0) {
    const ext = PHOTO_TYPES[photo.type as keyof typeof PHOTO_TYPES]
    if (!ext || photo.size > MAX_PHOTO) return { error: 'Foto harus JPG/WebP dan maksimal 300KB.' }
    // Upload lewat secret key ke folder milik tenant ini (tenant_id dari sesi, bukan dari browser).
    const path = `${tenantId}/${crypto.randomUUID()}.${ext}`
    const up = await supabaseAdmin.storage.from('menu-photos').upload(path, photo, { contentType: photo.type })
    if (up.error) return { error: 'Foto gagal diunggah. Coba lagi.' }
    imageUrl = supabaseAdmin.storage.from('menu-photos').getPublicUrl(path).data.publicUrl
  }

  const { data: cats, error: catErr } = await db.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenantId)
  if (catErr) return done(catErr)
  let categoryId = cats.find((c) => c.name.toLowerCase() === d.category.toLowerCase())?.id
  if (!categoryId) {
    const sort = Math.max(-1, ...cats.map((c) => c.sort_order)) + 1
    const { data, error } = await db.from('menu_categories').insert({ tenant_id: tenantId, name: d.category, sort_order: sort }).select('id').single()
    if (error) return done(error)
    categoryId = data.id
  }

  const row = { name: d.name, price: d.price, category_id: categoryId, ...(imageUrl !== undefined && { image_url: imageUrl }) }
  if (d.id) return done((await db.from('menu_items').update(row).eq('id', d.id)).error)

  // Menu baru di urutan terakhir kategorinya.
  const { data: last } = await db.from('menu_items').select('sort_order').eq('category_id', categoryId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  return done((await db.from('menu_items').insert({ ...row, tenant_id: tenantId, sort_order: (last?.sort_order ?? -1) + 1 })).error)
}
