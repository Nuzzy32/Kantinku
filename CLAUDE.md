# KantinKu

Sistem pesan-dan-bayar online untuk kantin kampus multi-tenant. Pembeli scan QR meja, lalu pesan dan bayar QRIS. Pesanan otomatis masuk ke dashboard tenant yang bersangkutan, dan pengelola melihat semuanya.

## Baca dulu sebelum mengerjakan apa pun

| File | Isi |
|---|---|
| [PRD-KantinKu.md](PRD-KantinKu.md) | Apa yang dibangun dan kenapa. Fitur P0/P1/P2 dan non-goals |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, struktur folder, alur pembayaran, realtime, keamanan |
| [docs/schema.sql](docs/schema.sql) | Skema database + RLS + fungsi bisnis (sumber kebenaran) |
| [design/UI-SPEC.md](design/UI-SPEC.md) | Aturan UI, rute, layar per peran, microcopy. Token warna ada di `app/globals.css` |
| [docs/TASKS.md](docs/TASKS.md) | Urutan kerja (user stories + acceptance criteria) |

Kerjakan **satu story dari TASKS.md per sesi**. Jangan mengerjakan fitur di luar story yang diminta.

## Stack

Next.js (App Router) + TypeScript · Tailwind + shadcn/ui + lucide-react · Supabase (Postgres, Auth, Realtime, Storage) · Xendit QRIS · zod · Vercel.

## Perintah

```bash
npm run dev                                   # jalankan lokal
npm run build && npm run lint                 # wajib lulus sebelum commit
node docs/schema.test.mjs docs/schema.sql     # tes skema DB (wajib jika schema berubah)
```

## Aturan keras (jangan dilanggar)

1. **Harga & total dihitung di database** (`create_checkout`). Browser hanya mengirim `menu_item_id`, `quantity`, `note`.
2. **Uang = integer rupiah** (`bigint`/`number`), tidak pernah float. Format tampilan lewat `lib/rupiah.ts` (`Rp34.000`).
3. **RLS jangan dimatikan.** Perubahan pesanan hanya lewat fungsi DB (`create_checkout`, `mark_checkout_paid`, `set_order_status`, `expire_checkouts`), tidak lewat `update` langsung.
4. **Secret key hanya di server.** `lib/supabase/admin.ts` dan `lib/xendit.ts` wajib `import 'server-only'`. Jangan pernah memakai prefix `NEXT_PUBLIC_` untuk rahasia.
5. **Webhook Xendit:** verifikasi `x-callback-token` **dan** cocokkan nominal dengan `checkouts.total` sebelum `mark_checkout_paid`.
6. **Tenant tidak boleh melihat data tenant lain.** Setiap fitur tenant baru harus diuji dengan 2 akun tenant.
7. **Perubahan skema:** buat migration baru di `supabase/migrations/`, salin perubahannya ke `docs/schema.sql`, tambah kasus di `docs/schema.test.mjs`, lalu jalankan tesnya.
8. **Jangan menambah dependency** jika fitur bawaan Next.js/Supabase/browser sudah cukup. Jika memang perlu, sebutkan alasannya.
9. **Mode test Xendit** selama development. Jangan menebak format API. Baca dokumentasi resmi Xendit.

## Konvensi

- Kode, nama file, dan nama tabel dalam **bahasa Inggris**. **Teks UI dalam bahasa Indonesia** (lihat microcopy di design/UI-SPEC.md).
- Server Components untuk ambil data. Pakai `"use client"` hanya untuk interaksi (keranjang, realtime, tombol status).
- Mutasi dari UI admin/tenant lewat Server Actions atau Supabase client (RLS). Endpoint publik (`/api/checkout`, webhook, status pembeli) lewat Route Handlers.
- Validasi semua input di server dengan zod. Pesan error untuk user dalam bahasa Indonesia, tanpa stack trace.
- Warna hanya lewat token CSS di `globals.css`, bukan hex di komponen. Ikon lucide, bukan emoji.
- Komponen kecil dan satu tanggung jawab. Jangan buat abstraksi untuk sesuatu yang baru dipakai sekali.

## Glosarium

| UI (Indonesia) | Kode/DB |
|---|---|
| Kantin | `canteens` |
| Meja | `dining_tables` |
| Tenant / penjual | `tenants` |
| Checkout (1x bayar) | `checkouts` |
| Pesanan (per tenant) | `orders` |
| Pengelola | role `admin` |
| Kasir | role `cashier` |
| Bagi hasil | `revenue_share_percent`, view `tenant_daily_revenue` |
