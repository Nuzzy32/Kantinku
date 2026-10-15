# KantinKu

Pesan dan bayar QRIS dari meja kantin kampus. Pesanan langsung masuk ke dashboard tenant. Aturan kerja dan arsitektur ada di [CLAUDE.md](CLAUDE.md) dan [docs/](docs/). Spesifikasi layar ada di [design/UI-SPEC.md](design/UI-SPEC.md).

## Jalankan

```bash
npm install
cp .env.example .env.local   # isi kunci Supabase dan Xendit (mode test)
npm run dev                  # http://localhost:3000
```

Tahap UI memakai data contoh dari `lib/mock.ts`, jadi bisa dijalankan tanpa Supabase. Halaman `/` berisi tautan ke semua layar.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run build && npm run lint` | Wajib lulus sebelum commit |
| `npm run test:schema` | Uji skema database (PGlite, tanpa Docker). Wajib jika `docs/schema.sql` berubah |
| `npm run seed` | Data contoh ke Supabase (butuh `.env.local` dan `SEED_PASSWORD`) |
