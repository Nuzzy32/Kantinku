# Handoff KantinKu

Tanggal: 16 Oktober 2026 (WIB). Lingkungan yang diperiksa adalah checkout lokal `/Users/adrian/dev/Kantinku` dengan Supabase lokal; perubahan belum di-commit, di-push, atau di-deploy.

## Mulai dari sini

[Daftar story dan acceptance criteria](TASKS.md) mencatat cakupan implementasi dan keterbatasan verifikasi. [Arsitektur](ARCHITECTURE.md) menjelaskan kontrak pembayaran dan akses data. [Skema](schema.sql) adalah sumber aturan bisnis; terapkan perubahan lewat folder `supabase/migrations/`, bukan menjalankan ulang seluruh skema di database berisi data.

Batas terpenting untuk penerima handoff: alur QRIS belum bisa dinyatakan lulus end-to-end dengan Xendit asli. `XENDIT_SECRET_KEY` dan `XENDIT_WEBHOOK_TOKEN` belum diisi pada lingkungan lokal. Supabase Cloud, domain publik, dan deployment produksi juga belum disiapkan. Jangan menerima uang pelanggan sebelum simulasi pembayaran dan uji perangkat di bawah lulus.

## Menjalankan lokal

Prasyarat: Node.js, npm, Docker yang sedang berjalan, dan Supabase CLI.

```sh
npm ci
supabase start
supabase migration up --local
npm run dev
```

Salin `.env.example` ke `.env.local` hanya jika file lokal belum ada. Isi URL dan publishable key Supabase, secret key server, serta `NEXT_PUBLIC_APP_URL`. Jangan masukkan secret key ke repository atau variabel `NEXT_PUBLIC_*`.

`npm run seed` hanya untuk database pengembangan yang kosong; skrip seed menambah data dan akun, bukan proses sinkronisasi yang aman diulang. Password akun contoh berasal dari `SEED_PASSWORD`; tidak dicantumkan dalam dokumen ini. Email contoh: `admin@kantinku.test`, `kasir@kantinku.test`, serta `t7@kantinku.test`, `t9@kantinku.test`, dan akun tenant lain sesuai `scripts/seed.mjs`.

Rute utama: `/tenant/login`, `/tenant`, `/tenant/menu`, `/tenant/rekap`, `/admin/login`, `/admin`, `/admin/kasir`, `/admin/tenant`, `/admin/meja`, dan `/admin/laporan`. Pembeli membuka `/t/<qr_token>` dari QR meja dan `/order/<public_token>` untuk pembayaran/status.

## Database dan pekerjaan terjadwal

Terapkan semua migration berdasarkan urutan file, termasuk:

- `0001_init.sql`: skema awal.
- `20261015162115_shop_checkout_validation.sql`: validasi tenant tutup/menu tidak tersedia.
- `20261016012332_story18_mark_refund_done.sql`: penyelesaian refund manual khusus admin kantin terkait.
- `20261016013131_story16_cash_checkout.sql`: checkout tunai dengan validasi kasir, nominal diterima, dan perlindungan retry.

Migration checkout tunai sudah diterapkan lokal. RPC `create_cash_checkout` hanya dapat dipanggil server dengan `service_role`, memeriksa peran dan kantin aktor, menghitung harga melalui database, dan membatalkan transaksi jika uang kurang. UUID permintaan yang sama dengan input sama mengembalikan checkout lama; UUID yang digunakan ulang untuk input/aktor berbeda ditolak. Nilai uang diterima tersimpan sebagai `checkouts.cash_received`. RPC juga diuji langsung di Supabase lokal sebagai `service_role`: total sesuai menu database, status `paid`, nominal diterima tersimpan, dan retry kembali ke ID checkout yang sama; fixture dibatalkan dengan `ROLLBACK`.

Jalankan [setup-expiry.sql](setup-expiry.sql) sebagai `postgres` di SQL Editor setiap database target sesudah migration. Skrip mengaktifkan `pg_cron` dan membuat/memperbarui satu job `expire-checkouts` setiap menit. Skrip ini terpisah dari tes PGlite karena PGlite tidak menjalankan ekstensi cron.

Verifikasi lokal: skrip dijalankan dua kali, tetap satu job aktif, dan riwayat cron mencatat `succeeded`. Pengujian transaksi sementara memastikan `expire_checkouts()` mengubah checkout menjadi `expired`; fixture dibatalkan dengan `ROLLBACK`. Lingkungan cloud harus diperiksa terpisah lewat `cron.job` dan `cron.job_run_details`.

Tipe TypeScript database dihasilkan dari skema lokal:

```sh
npm run types
```

## Verifikasi sebelum menyerahkan perubahan

```sh
npm run build
npm run lint
npm test
npm run smoke:local
```

Jalankan juga skrip tes tambahan yang tercantum di `package.json`. Tes skema berjalan dalam dua mode hak akses: hak eksplisit baru dan default privileges lama. Pengujian wrapper tunai mencakup penolakan akses browser/tenant/kantin lain, rollback uang kurang, retry identik, dan penolakan perubahan nominal/nama/aktor pada request yang sama. Tes dengan stub gateway membuktikan perilaku kode, bukan keberhasilan pembayaran Xendit asli.

Hasil akhir lokal: build dan ESLint lulus; `npm test` meluluskan 59 tes aplikasi serta tes skema kedua mode hak akses. `npm run smoke:local` lulus dengan transaksi dan akun lokal nyata: harga/tender/kembalian, retry tunai bersamaan tanpa duplikasi, rollback uang kurang, status tenant, refund, kecocokan laporan, dan privasi payload publik. Realtime diuji melalui WebSocket Node untuk T7/T9, termasuk subscriber T9 yang mencoba filter T7 dan tidak menerima datanya. Semua fixture dibersihkan. Tidak ada klaim pengukuran latensi UI 3 detik atau uji HP fisik.

Webhook juga diuji lewat HTTP build produksi dengan callback token sementara dan Supabase lokal: token salah 401, nominal salah 409, sukses/duplikat 200, pembayaran telat sesudah expired, serta callback yang datang sebelum referensi QR tersimpan. Server uji dan fixture sudah dihentikan/dibersihkan. Ini bukan simulasi dari Xendit asli.

## Yang harus diselesaikan operator sebelum pilot

1. Siapkan project Supabase Cloud milik pengelola, terapkan seluruh migration, isi data operasional, dan aktifkan cron. Pastikan Realtime aktif pada tabel `orders`; akses tenant harus tetap dibatasi RLS.
2. Daftarkan merchant Xendit milik pengelola. Isi kunci **mode test** dan callback token di environment server. Pastikan API QR Codes yang dipakai project tersedia untuk akun tersebut. Atur URL webhook publik HTTPS `/api/webhooks/xendit`.
3. Buat QR melalui API asli, simulasikan pembayaran, dan catat payload webhook yang benar-benar diterima tanpa menyimpan secret. Periksa jumlah transaksi, nominal, retry webhook, pembayaran telat, dan tombol pemeriksaan pembayaran cadangan.
4. Deploy aplikasi dengan environment yang benar. Atur `NEXT_PUBLIC_APP_URL` ke domain pilot sebelum mencetak QR meja. QR localhost hanya berfungsi pada komputer sendiri.
5. Jalankan skenario [uji akhir](TASKS.md#uji-akhir-sebelum-pilot) dengan dua HP tenant dan satu HP pembeli. Periksa bunyi sesudah ketukan pengguna, Wake Lock, putus-sambung jaringan, pesanan multi-tenant, penolakan/refund, transaksi tunai, dan kecocokan rekap.
6. Tentukan persentase bagi hasil, prosedur pengembalian uang, dan petugas yang menangani pengecekan pembayaran. Tombol refund hanya mencatat transfer/tunai yang telah dilakukan; aplikasi tidak mengirim uang otomatis.

Rate limit checkout yang disimpan per proses tidak cukup untuk deployment beberapa instance. Gunakan pembatasan bersama di edge/database sebelum meningkatkan skala. Audio dan getar mengikuti kemampuan/izin browser; uji pada HP yang akan dipakai tenant dan pembeli.

Jika respons pembuatan QRIS hilang karena jaringan, periksa status/riwayat dan nominal sebelum membuat pembayaran baru. Perlindungan retry persisten saat ini khusus transaksi kasir tunai; jangan membayar dua QR untuk pesanan yang sama.

## Setelah MVP

Story 20 (P1) untuk Web Push ketika halaman ditutup belum dibangun dan belum diuji. Ini memerlukan service worker, langganan push per checkout, kunci VAPID/server sender, pembersihan langganan, serta spike Android Chrome dan iPhone dengan situs terpasang ke Layar Utama. Notifikasi di halaman status adalah cakupan Story 13; jangan menyamakan keduanya.

Tidak ada commit/push atau deployment otomatis dalam handoff ini. Simpan dan tinjau seluruh perubahan lokal sebelum memindahkan checkout; jangan menyalin `.env.local` ke repository.
