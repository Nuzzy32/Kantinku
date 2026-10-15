# KantinKu

Pesan dan bayar QRIS dari meja kantin kampus. Pesanan langsung masuk ke dashboard tenant. Aturan kerja dan arsitektur ada di [CLAUDE.md](CLAUDE.md) dan [docs/](docs/). Spesifikasi layar ada di [design/UI-SPEC.md](design/UI-SPEC.md).

## Jalankan

Butuh Docker untuk Supabase lokal (di Mac: `brew install --cask orbstack`, lalu buka OrbStack sekali).

```bash
npm install
supabase start               # Supabase lokal: Postgres, Auth, Realtime, Storage. Studio di http://127.0.0.1:54323
supabase status -o env       # salin API_URL, PUBLISHABLE_KEY, SECRET_KEY ke .env.local (lihat .env.example)
npm run seed                 # 1 kantin, 3 tenant, 10 menu, 5 meja, akun @kantinku.test (password = SEED_PASSWORD)
npm run dev                  # http://localhost:3000
```

Skema berubah? `supabase db reset` menjalankan ulang migration (data hilang), lalu `npm run seed` lagi.

Tahap UI memakai data contoh dari `lib/mock.ts`, jadi bisa dijalankan tanpa Supabase. Halaman `/` berisi tautan ke semua layar.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run build && npm run lint` | Wajib lulus sebelum commit |
| `npm run test:schema` | Uji skema database (PGlite, tanpa Docker). Wajib jika `docs/schema.sql` berubah |
| `npm run seed` | Data contoh ke Supabase (butuh `.env.local` dan `SEED_PASSWORD`) |
