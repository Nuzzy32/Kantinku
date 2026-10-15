# KantinKu — Arsitektur Teknis

Dokumen ini menjelaskan **bagaimana** sistem dibangun. Untuk **apa** dan **kenapa**, lihat [PRD-KantinKu.md](../PRD-KantinKu.md).

## 1. Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Satu project untuk halaman pembeli, tenant, admin, sekaligus API & webhook |
| UI | **Tailwind CSS + shadcn/ui**, ikon **lucide-react** | Cepat dan konsisten. Token warna ada di [design/UI-SPEC.md](../design/UI-SPEC.md) dan `app/globals.css` |
| Database & Auth | **Supabase** (Postgres + Auth + Realtime + Storage) | Realtime bawaan untuk dashboard tenant. RLS untuk isolasi data per tenant |
| Pembayaran | **Xendit QR Codes (QRIS dinamis)** + webhook | QRIS dinamis dengan nominal otomatis. Midtrans bisa jadi alternatif |
| Hosting | **Vercel** (app) + **Supabase Cloud** (DB) | Free tier cukup untuk pilot |
| Validasi input | **zod** | Validasi body API dan form |

Jangan menambah library lain tanpa alasan kuat. Lihat aturan di [CLAUDE.md](../CLAUDE.md).

## 2. Struktur folder

```
app/
  t/[qrToken]/page.tsx            # Pembeli: menu (dibuka dari QR meja)
  checkout/page.tsx               # Pembeli: isi nama, pilih dine-in/takeaway, bayar
  order/[publicToken]/page.tsx    # Pembeli: QRIS + status pesanan
  tenant/
    login/page.tsx
    page.tsx                      # Antrean pesanan (realtime)
    menu/page.tsx                 # Kelola menu & stok habis
    rekap/page.tsx                # Uang masuk hari ini
  admin/
    login/page.tsx
    page.tsx                      # Dashboard omzet semua tenant
    tenant/page.tsx               # Kelola tenant & akun
    meja/page.tsx                 # Kelola meja & cetak QR
    kasir/page.tsx                # Input pesanan tunai
    laporan/page.tsx              # Bagi hasil per periode + refund
  api/
    checkout/route.ts             # POST: buat checkout + QRIS
    order/[publicToken]/route.ts  # GET: status pesanan untuk pembeli
    webhooks/xendit/route.ts      # POST: notifikasi pembayaran
lib/
  supabase/client.ts              # browser (publishable key)
  supabase/server.ts              # server component/route, pakai sesi user
  supabase/admin.ts               # server-only, secret key. JANGAN di-import di client
  supabase/proxy.ts               # refresh sesi, dipanggil proxy.ts (root) untuk /tenant & /admin
  auth.ts                         # getProfile, requireRole: penjaga peran di layout/halaman staf
  xendit.ts                       # buat QR, cek status
  rupiah.ts                       # format Rp
  cart.ts                         # keranjang di localStorage
  menu.ts                         # data menu pembeli dari token QR (server)
  database.types.ts               # hasil `npm run types` (jangan diedit manual)
components/                       # komponen UI bersama
supabase/migrations/0001_init.sql # salinan docs/schema.sql
```

## 3. Peran & akses

| Peran | Login? | Bisa apa | Lewat apa |
|---|---|---|---|
| Pembeli | Tidak | Lihat menu, checkout, lihat status pesanannya | Baca menu langsung (RLS publik). Tulis lewat `/api/*` |
| Tenant | Ya | Lihat pesanan lunas miliknya, ubah status, kelola menu, buka/tutup | Supabase client + RLS + `set_order_status()` |
| Kasir | Ya | Buat pesanan tunai, lihat semua transaksi kantin | `/api/checkout` dengan sesi kasir |
| Admin (pengelola) | Ya | Semua di kantinnya: tenant, meja, laporan, refund | Supabase client + RLS |

Akun tenant, kasir, dan admin **dibuat oleh admin** (tidak ada daftar mandiri). Data peran disimpan di tabel `profiles`.

## 4. Model data

Skema lengkap dan teruji: [schema.sql](schema.sql). Tes: [schema.test.mjs](schema.test.mjs).

```
canteens ─┬─ dining_tables (qr_token)
          ├─ tenants ─┬─ menu_categories
          │           └─ menu_items
          └─ checkouts (public_token, payment_status) ── orders (1 per tenant, status) ── order_items (snapshot harga)
profiles (auth user → role, canteen, tenant)
view tenant_daily_revenue (omzet & bagi hasil per tenant per hari)
```

**Status pesanan**

```
pending_payment ──(lunas)──▶ paid ──▶ accepted ──▶ ready ──▶ completed
       │                      │          │
       └─(10 menit)─▶ expired └──────────┴─(tenant tolak + alasan)─▶ cancelled (refund_status = needed)
```

Aturan transisi dijaga di database (`set_order_status`), bukan hanya di UI.

## 5. Alur utama

### 5.1 Checkout QRIS

```
Pembeli            Next.js /api/checkout              Supabase               Xendit
  │ POST {items, nama, ...} │                              │                      │
  │────────────────────────▶│ validasi zod                 │                      │
  │                         │ rpc create_checkout() ──────▶│ hitung harga dari DB │
  │                         │◀──────── checkout (pending) ─│                      │
  │                         │ buat QR (amount = total) ────────────────────────────▶│
  │                         │◀──────────────────────────────── qr_string, qr_id ──│
  │                         │ update checkouts: provider_ref, qr_string, expires_at│
  │◀── {publicToken} ───────│                              │                      │
  │ redirect /order/{publicToken} → tampilkan QRIS          │                      │
```

- `expires_at` = sekarang + 10 menit.
- Jika pembuatan QR di Xendit gagal, tandai checkout `failed` dan tampilkan pesan "Coba lagi".
- **Harga tidak pernah diambil dari browser.** Browser hanya mengirim `menu_item_id` + `quantity` + `note`.

### 5.2 Webhook pembayaran

```
Xendit ── POST /api/webhooks/xendit ──▶ 1. Cek header x-callback-token == XENDIT_WEBHOOK_TOKEN (selain itu 401)
                                        2. Cari checkout by provider_ref
                                        3. Pastikan amount == checkout.total (selain itu log + tolak)
                                        4. Jika status sukses → rpc mark_checkout_paid(id, amount)  (idempoten; DB juga menolak jika amount ≠ total)
                                        5. Balas 200 secepatnya
```

- Webhook bisa datang dua kali atau terlambat. `mark_checkout_paid` aman dipanggil berkali-kali. Pembayaran yang masuk setelah checkout `expired` tetap dicatat lunas dan pesanannya muncul lagi di tenant.
- **Cadangan:** halaman `/order/[publicToken]` punya tombol "Saya sudah bayar". Tombol ini memanggil API yang mengecek status QR langsung ke Xendit, lalu `mark_checkout_paid` jika lunas.
- Format payload dan nama event: **baca dokumentasi resmi Xendit QR Codes** saat implementasi. Jangan menebak.

### 5.3 Dashboard tenant (realtime)

1. Tenant login, lalu halaman `/tenant` mengambil pesanan berstatus `paid | accepted | ready` hari ini.
2. Subscribe Supabase Realtime `postgres_changes` di tabel `orders` dengan filter `tenant_id=eq.<id>`, event `*`. Setiap ada event, ambil ulang daftar pesanan (lebih sederhana dan pasti benar daripada menambal state).
3. Pesanan baru (`paid`) memicu **bunyi berulang** sampai ditekan "Terima".
4. Browser memblokir suara sebelum ada interaksi. Karena itu, tampilkan tombol besar **"Mulai Terima Pesanan"** saat halaman dibuka. Tombol ini membuka izin audio dan mengaktifkan **Wake Lock** agar layar tidak mati.
5. Jika koneksi realtime putus, tampilkan banner merah "Koneksi terputus" dan ambil ulang data setiap 10 detik sampai tersambung lagi.

### 5.4 Status untuk pembeli

- `/order/[publicToken]` melakukan polling `GET /api/order/[publicToken]` setiap **5 detik**. Pembeli tidak login, jadi tidak bisa memakai Realtime + RLS.
  *(ponytail: polling 5 detik cukup untuk 1 kantin. Ganti ke Realtime Broadcast per token jika beban terasa berat.)*
- API mengembalikan data minimum: status tiap pesanan per tenant, nomor pesanan, total, dan QR (jika masih pending). **Jangan** kirim nomor HP atau data pembeli lain.
- Saat ada pesanan yang berubah ke `ready`: HP bergetar (`navigator.vibrate`), bunyi, dan judul tab berubah "✅ Pesanan siap!".
- Push notification saat halaman ditutup = **P1** (butuh service worker + izin; di iPhone hanya jalan jika PWA di-install).

### 5.5 Pesanan tunai (kasir)

Kasir memilih menu di `/admin/kasir`, lalu `POST /api/checkout` dengan `payment_method: "cash"`. Server memastikan sesi adalah kasir/admin dan mengirim `p_created_by`. Checkout langsung lunas dan masuk ke tenant.

### 5.6 Refund (MVP = manual)

Tenant menolak pesanan, maka `refund_status = needed`. Pesanan muncul di `/admin/laporan` → "Perlu refund". Pengelola mengembalikan uang (transfer atau tunai), lalu menekan "Sudah direfund" (`refund_status = done`). Refund otomatis lewat API Xendit = P1, setelah dukungan refund QRIS dikonfirmasi.

## 6. Nomor pesanan

Ditampilkan sebagai `<kode tenant>-<id % 1000, 3 digit>`, contoh **T7-042**. Nomor ini dipakai untuk memanggil pembeli.
*(ponytail: bisa sama setelah 1000 pesanan per tenant. Ganti ke counter harian jika jadi masalah.)*

## 7. Variabel lingkungan

Lihat [.env.example](../.env.example).

| Nama | Dipakai di | Rahasia? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client & server | Tidak |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client & server | Tidak |
| `SUPABASE_SECRET_KEY` | **server saja** (`lib/supabase/admin.ts`) | **Ya** |
| `XENDIT_SECRET_KEY` | server saja | **Ya** |
| `XENDIT_WEBHOOK_TOKEN` | server saja (verifikasi webhook) | **Ya** |
| `NEXT_PUBLIC_APP_URL` | membuat link QR meja | Tidak |

## 8. Checklist keamanan

- [ ] RLS aktif di semua tabel (sudah di `schema.sql`, jangan dimatikan).
- [ ] `GRANT` eksplisit untuk setiap tabel, view, dan fungsi baru (blok "Hak akses Data API" di `schema.sql`). Mulai 30 Okt 2026 Supabase tidak lagi memberi hak otomatis ke objek baru di `public`; tanpa `GRANT` hasilnya `42501 permission denied`. Tes skema sengaja berjalan tanpa default privileges agar kekurangan `GRANT` ketahuan.
- [ ] `SUPABASE_SECRET_KEY` tidak pernah muncul di kode client. Pasang `import 'server-only'` di `lib/supabase/admin.ts`.
- [ ] Webhook: verifikasi token **dan** cocokkan nominal.
- [ ] Harga dan total dihitung di database (`create_checkout`).
- [ ] Rate limit sederhana di `/api/checkout` (misal maksimal 10 checkout per IP per menit) untuk mencegah spam QR.
- [ ] Gunakan mode **test** Xendit selama development. Kunci live hanya di environment production.
- [ ] Uang masuk ke rekening/merchant **pengelola**, tidak pernah ke rekening developer.

## 9. Testing

- **Skema & aturan bisnis DB:** `node docs/schema.test.mjs docs/schema.sql` (PGlite, tanpa Docker). Jalankan setiap kali `schema.sql` diubah.
- **Pembayaran:** pakai mode test Xendit dan simulasi pembayaran QR dari dashboard Xendit.
- **Manual end-to-end** sebelum pilot: 2 HP sebagai tenant + 1 HP pembeli. Jalankan skenario di [TASKS.md](TASKS.md) bagian "Uji akhir".

## 10. Deploy

1. Buat project Supabase (region Singapore), jalankan `supabase/migrations/0001_init.sql`, aktifkan ekstensi **pg_cron**, lalu jadwalkan `expire_checkouts()` (perintah ada di `schema.sql`).
2. Deploy ke Vercel dan isi env.
3. Daftarkan URL webhook `https://<domain>/api/webhooks/xendit` di dashboard Xendit.
4. Seed data: kantin, 10 tenant, meja, akun admin. Cetak QR dari `/admin/meja`.
