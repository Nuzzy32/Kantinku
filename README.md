<div align="center">

# 🍽️ KantinKu

### Satu meja. Banyak pilihan. Satu pembayaran.

Pesan makanan lintas tenant dari meja kantin kampus.<br />
Scan QR, pilih menu, dan ikuti progres pesanan dari ponsel.

![Next.js](https://img.shields.io/badge/Next.js-16-171717?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-181818?style=flat-square&logo=supabase&logoColor=3FCF8E) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0891B2?style=flat-square&logo=tailwindcss&logoColor=white) ![Status](https://img.shields.io/badge/Status-MVP_dalam_pengembangan-E8790C?style=flat-square)

[Kenali proyek](#tentang-proyek) · [Mulai lokal](#jalankan-di-lokal) · [Progres](#status-pengembangan) · [Dokumentasi](#dokumentasi)

</div>

---

## Tentang proyek

KantinKu menyatukan pemesanan dari beberapa penjual dalam satu kantin. Pembeli tidak perlu membuat akun untuk melihat menu atau menyiapkan pesanan. Setiap tenant memiliki area kerja sendiri, sedangkan pengelola menangani operasional kantin.

Satu pembayaran QRIS memuat menu dari beberapa tenant, lalu pesanan diteruskan ke penjual masing-masing. **Jalur QRIS sudah diimplementasikan, tetapi kunci dan simulasi Xendit asli masih diperlukan sebelum pilot.** Status terperinci dan kebutuhan operator ada di [catatan handoff](docs/HANDOFF.md).

## Satu aplikasi, tiga area

| Area | Untuk siapa | Fungsi yang dituju |
| :--- | :--- | :--- |
| 📱 **Pembeli** | Pengunjung kantin | Scan QR meja, cari menu, keranjang lintas tenant, bayar QRIS, pantau pesanan |
| 🍳 **Tenant** | Penjual makanan dan minuman | Terima pesanan, kelola menu, atur stok dan jam buka, lihat rekap |
| 🧾 **Pengelola & kasir** | Operator kantin | Pesanan tunai, pengelolaan tenant dan meja, laporan bagi hasil, refund |

## Dari meja ke dapur

```mermaid
flowchart LR
    A[Scan QR meja] --> B[Pilih menu]
    B --> C[Satu keranjang]
    C --> D[Bayar QRIS]
    D --> E[Pesanan per tenant]
    E --> F[Siap diambil]
    style A fill:#FFF3E6,stroke:#E8790C,color:#7C3500
    style B fill:#FFF3E6,stroke:#E8790C,color:#7C3500
    style C fill:#FFF3E6,stroke:#E8790C,color:#7C3500
    style D fill:#FFF3E6,stroke:#E8790C,color:#7C3500
    style E fill:#FFF3E6,stroke:#E8790C,color:#7C3500
    style F fill:#E8F5EC,stroke:#238636,color:#14532D
```

*Alur implementasi MVP. Pembayaran gateway dan perilaku perangkat fisik masih memerlukan uji pilot.*

## Status pengembangan

Status berikut menggambarkan kode di checkout ini; lihat [handoff](docs/HANDOFF.md) untuk batas verifikasi dan deployment.

| Bagian | Status |
| :--- | :--- |
| Fondasi database, RLS, dan data seed | ✅ Tersedia |
| Menu pembeli dari QR meja dengan data Supabase | ✅ Tersedia |
| Keranjang lintas tenant, catatan, dan penyimpanan lokal | ✅ Tersedia |
| Login staf dan pembatasan akses per peran | ✅ Tersedia |
| Pengelolaan menu tenant dan status buka/tutup | ✅ Supabase |
| Checkout QRIS, webhook, pengecekan gateway | 🚧 Kode dan tes kontrak tersedia; belum simulasi Xendit asli |
| Antrean tenant, perubahan status, dan rekap WIB | ✅ Supabase; uji perangkat fisik masih diperlukan |
| Kasir tunai, laporan, bagi hasil, refund manual | ✅ Supabase; retry tunai idempoten |
| Job kedaluwarsa setiap menit | ✅ Aktif dan terverifikasi lokal; setup ulang di cloud |

Rincian pekerjaan dan acceptance criteria ada di [rencana build MVP](docs/TASKS.md).

## Teknologi

| Lapisan | Teknologi |
| :--- | :--- |
| Aplikasi | Next.js App Router, React, TypeScript |
| Antarmuka | Tailwind CSS, shadcn/ui, Lucide |
| Data & autentikasi | Supabase Postgres, Auth, Realtime, Storage |
| Validasi | Zod |
| Pembayaran yang direncanakan | Xendit QRIS |
| Pengujian database | PGlite |

## Jalankan di lokal

Siapkan **Node.js**, **npm**, **Supabase CLI**, dan **Docker**. Di macOS, Docker dapat dijalankan melalui OrbStack atau Docker Desktop.

**1. Ambil proyek dan pasang dependency**

```bash
git clone https://github.com/Nuzzy32/Kantinku.git
cd Kantinku
npm install
```

**2. Jalankan Supabase lokal**

```bash
supabase start
cp .env.example .env.local
supabase status -o env
```

Salin konfigurasi Supabase ke `.env.local`:

| Dari Supabase | Variabel aplikasi |
| :--- | :--- |
| `API_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SECRET_KEY` | `SUPABASE_SECRET_KEY` |

Isi juga `SEED_PASSWORD` dengan password akun contoh yang kamu pilih sendiri. Secret key hanya digunakan di server. Jangan unggah `.env.local` ke repository.

**3. Isi data contoh dan jalankan aplikasi**

```bash
npm run seed
npm run dev
```

| Halaman lokal | Alamat |
| :--- | :--- |
| Daftar layar pengembangan | [localhost:3000](http://localhost:3000) |
| Menu contoh Meja 34 | [Buka menu pembeli](http://localhost:3000/t/00000000-0000-4000-8000-000000000034) |
| Login tenant | [localhost:3000/tenant/login](http://localhost:3000/tenant/login) |
| Login pengelola & kasir | [localhost:3000/admin/login](http://localhost:3000/admin/login) |
| Supabase Studio | [127.0.0.1:54323](http://127.0.0.1:54323) |

Seed menyiapkan **1 kantin, 3 tenant, 10 menu, 5 meja**, serta akun staf dengan domain `@kantinku.test`. Lihat [script seed](scripts/seed.mjs) untuk alamat akunnya. Menu, transaksi, antrean, dan operasional memakai Supabase. Simulasi `/order/demo` hanya tersedia saat development.

## Perintah pengembangan

| Perintah | Kegunaan |
| :--- | :--- |
| `npm run dev` | Jalankan aplikasi lokal |
| `npm run build` | Buat build produksi dan periksa tipe |
| `npm run lint` | Periksa kualitas kode |
| `npm run test:schema` | Uji aturan bisnis database dan RLS tanpa Docker (wajib jika skema berubah) |
| `npm run test:checkout` / `test:buyer` / `test:menu` | Tes API checkout, keranjang, dan aksi menu dengan stub (tanpa Xendit/Supabase) |
| `npm run seed` | Isi data contoh ke Supabase lokal |
| `npm run types` | Perbarui tipe TypeScript dari skema Supabase lokal |

Skema berubah? Buat migration baru di `supabase/migrations/`, lalu `supabase db reset` (data lokal hilang), `npm run seed`, dan `npm run types`.

## Struktur proyek

```text
app/                   Halaman pembeli, tenant, admin, dan server actions
components/            Komponen UI per area pengguna
lib/                   Auth, menu, keranjang, tipe, dan klien Supabase
supabase/migrations/   Migration database
docs/                  Arsitektur, rencana fitur, skema, dan tes
design/                Spesifikasi layar dan aturan visual
scripts/               Seed data pengembangan
```

## Dokumentasi

| Dokumen | Isi |
| :--- | :--- |
| [Arsitektur](docs/ARCHITECTURE.md) | Model data, alur pembayaran, akses, dan integrasi |
| [Rencana MVP](docs/TASKS.md) | User stories, dependensi, dan acceptance criteria |
| [Spesifikasi UI](design/UI-SPEC.md) | Layar, komponen, dan perilaku antarmuka |
| [Skema database](docs/schema.sql) | Tabel, RLS, fungsi transaksi, dan bagi hasil |
| [Tes database](docs/schema.test.mjs) | Pengujian aturan bisnis dan isolasi data |

---

<div align="center">
  <strong>KantinKu</strong><br />
  <sub>Dikembangkan untuk alur pesan makanan di kantin kampus.</sub>
</div>
