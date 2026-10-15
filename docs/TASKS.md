# KantinKu — Rencana Build MVP (User Stories)

**Format**: User Stories
**Cakupan**: Semua fitur **P0** di [PRD](../PRD-KantinKu.md)
**Total**: 19 story MVP dalam 7 milestone, ditambah 1 story P1 (Story 20)
**Estimasi**: S = ≤ ½ hari · M = 1–2 hari · L = 3–4 hari (1 developer + AI)

## Cara pakai dengan AI (vibe coding)

Kerjakan **satu story per sesi/prompt**, urut dari atas. Contoh prompt:

> Kerjakan **Story 7** dari `docs/TASKS.md`. Baca dulu `CLAUDE.md`, `docs/ARCHITECTURE.md` bagian 5.3, dan `design/UI-SPEC.md` bagian "B. Tenant". Selesai jika semua acceptance criteria terpenuhi. Centang story-nya setelah selesai.

Setelah satu story selesai: uji manual sesuai acceptance criteria, commit, baru lanjut ke story berikutnya.

---

## Milestone 0 — Fondasi

### Story 0: Setup project ⚙️ *(teknis)*
**Sebagai developer, saya ingin project siap jalan dengan database dan data contoh, agar story berikutnya bisa langsung dikerjakan.**

- [x] Next.js (App Router, TypeScript), Tailwind, shadcn/ui, lucide-react, dan zod terpasang. Token warna dari `design/UI-SPEC.md` ada di `globals.css`.
- [x] `supabase/migrations/0001_init.sql` = isi `docs/schema.sql`, sudah dijalankan di project Supabase. *(Supabase lokal via `supabase start`; project cloud menyusul sebelum pilot.)*
- [x] `node docs/schema.test.mjs docs/schema.sql` lulus.
- [x] Seed script: 1 kantin, 3 tenant, 10 menu, 5 meja, 1 akun admin, 1 akun kasir, 3 akun tenant.
- [x] `lib/supabase/{client,server,admin}.ts` ada. `admin.ts` diberi `import 'server-only'`.

Prioritas: P0 · Effort: M · Dependensi: —

---

## Milestone 1 — Pembeli melihat menu

### Story 1: Lihat menu dari QR meja
**Sebagai pembeli, saya ingin langsung melihat menu semua tenant setelah scan QR di meja, agar bisa memilih makanan tanpa antre.**

- [x] `/t/[qrToken]` menampilkan nama kantin, label meja, tab tenant, dan daftar menu per tenant.
- [x] Menu `is_available = false` tampil abu-abu dengan label "Habis" dan tidak bisa ditambah.
- [x] Tenant dengan `is_open = false` menampilkan banner "Tutup sekarang" dan menunya tidak bisa ditambah.
- [x] QR token tidak valid menampilkan halaman "Meja tidak ditemukan".
- [x] Halaman terbuka ≤ 2 detik di 4G (data diambil di server component).

Prioritas: P0 · Effort: M · Dependensi: 0

### Story 2: Keranjang multi-tenant
**Sebagai pembeli, saya ingin memasukkan menu dari beberapa tenant ke satu keranjang, agar cukup bayar sekali.**

- [x] Tombol `+` menambah item, lalu berubah jadi stepper `− n +`. Jumlah 0 berarti item dihapus.
- [x] Bar keranjang sticky menampilkan jumlah item dan total, dan terbaca screen reader (`role="status"`).
- [x] Keranjang tersimpan di localStorage (per kantin + meja), jadi tetap ada setelah refresh.
- [x] Setiap item bisa diberi catatan (maks 100 karakter).

Prioritas: P0 · Effort: S · Dependensi: 1

---

## Milestone 2 — Bayar QRIS

### Story 3: Checkout dan tampilkan QRIS 🔍 *(butuh spike Xendit)*
**Sebagai pembeli, saya ingin membayar seluruh keranjang dengan QRIS, agar tidak perlu ke kasir.**

- [ ] **Spike dulu (≤ ½ hari):** buat akun Xendit mode test, coba buat QR dan simulasi bayar, lalu catat format payload webhook di `docs/ARCHITECTURE.md`.
- [ ] `/checkout` berisi item per tenant, pilihan Makan di sini/Bawa pulang, nama panggilan (wajib), dan No. WA (opsional).
- [ ] `POST /api/checkout` memvalidasi dengan zod, memanggil `create_checkout`, membuat QR Xendit dengan nominal = `total`, menyimpan `provider_ref`, `qr_string`, dan `expires_at` (+10 menit), lalu mengembalikan `publicToken`.
- [ ] `/order/[publicToken]` menampilkan QR (≥ 260px), total, hitung mundur, dan tombol "Simpan gambar QR".
- [ ] Tombol bayar nonaktif saat loading, jadi tidak bisa terbuat checkout dobel.

Prioritas: P0 · Effort: L · Dependensi: 2

### Story 4: Konfirmasi pembayaran otomatis
**Sebagai pembeli, saya ingin halaman langsung berubah jadi "Pembayaran berhasil" setelah saya bayar, agar yakin pesanan sudah terkirim.**

- [ ] `POST /api/webhooks/xendit` menolak (401) jika token salah dan menolak jika nominal tidak sama dengan `total`.
- [ ] Webhook sukses memanggil `mark_checkout_paid`. Webhook yang dikirim 2× tidak menimbulkan efek ganda.
- [ ] `/order/[publicToken]` melakukan polling setiap 5 detik dan pindah ke tampilan status dalam ≤ 5 detik setelah lunas.
- [ ] Tombol "Saya sudah bayar" mengecek status langsung ke Xendit (cadangan jika webhook telat).

Prioritas: P0 · Effort: M · Dependensi: 3

### Story 5: Pembayaran kedaluwarsa
**Sebagai pembeli, saya ingin tahu jika QR sudah kedaluwarsa dan bisa pesan ulang dengan mudah, agar tidak bingung.**

- [ ] pg_cron menjalankan `expire_checkouts()` setiap menit.
- [ ] Hitung mundur habis atau status `expired` menampilkan pesan ramah dan tombol "Pesan ulang" yang memulihkan isi keranjang.
- [ ] Pesanan kedaluwarsa tidak pernah muncul di dashboard tenant.

Prioritas: P0 · Effort: S · Dependensi: 4

---

## Milestone 3 — Dashboard tenant

### Story 6: Login tenant
**Sebagai tenant, saya ingin login sekali di HP dan tetap login, agar tidak repot setiap hari.**

- [x] `/tenant/login` dengan email + password (akun dibuat admin).
- [x] Sesi bertahan (refresh token). Logout hanya lewat menu.
- [x] Peran selain `tenant` yang membuka `/tenant` diarahkan ke halaman yang sesuai.

Prioritas: P0 · Effort: S · Dependensi: 0

### Story 7: Antrean pesanan real-time dengan bunyi
**Sebagai tenant, saya ingin pesanan yang sudah lunas langsung muncul dengan bunyi keras, agar tidak ada pesanan terlewat walau saya sedang masak.**

- [ ] Tombol "Mulai Terima Pesanan" membuka izin audio dan mengaktifkan Wake Lock.
- [ ] Pesanan `paid` muncul ≤ 3 detik setelah webhook (Supabase Realtime) dan berbunyi berulang sampai diterima.
- [ ] Tab Baru / Dimasak / Siap dengan jumlahnya. Kartu menampilkan nomor pesanan besar, nama, meja, item, catatan (kotak kuning), dan timer.
- [ ] Tenant A **tidak pernah** melihat pesanan tenant B (uji dengan 2 akun).
- [ ] Banner "Koneksi terputus" muncul jika realtime putus. Data di-refetch setiap 10 detik sampai tersambung lagi.

Prioritas: P0 · Effort: L · Dependensi: 4, 6

### Story 8: Ubah status pesanan
**Sebagai tenant, saya ingin menandai pesanan diterima, siap, dan selesai dengan satu tap, agar pembeli tahu progresnya.**

- [ ] Tombol Terima, Siap, dan Selesai diambil memanggil `set_order_status`, dengan tinggi tombol ≥ 56px.
- [ ] Transisi tidak sah tidak bisa dilakukan (tombolnya tidak tampil, dan DB juga menolak).
- [ ] Optimistic update dikembalikan dengan pesan error jika gagal.

Prioritas: P0 · Effort: S · Dependensi: 7

### Story 9: Tolak pesanan
**Sebagai tenant, saya ingin menolak pesanan dengan alasan saat bahan habis, agar pembeli tahu dan uangnya dikembalikan.**

- [ ] Link "Tolak" membuka dialog wajib alasan (Bahan habis / Tutup / Lainnya + teks).
- [ ] Setelah ditolak: status `cancelled`, `refund_status = needed`, dan pembeli melihat pesan pembatalan berikut alasannya.
- [ ] Pesanan dari tenant lain di checkout yang sama tetap berjalan normal.

Prioritas: P0 · Effort: S · Dependensi: 8

### Story 10: Kelola menu & stok habis
**Sebagai tenant, saya ingin menambah atau mengubah menu dan menandai "habis" dengan satu tap, agar pembeli tidak memesan yang tidak ada.**

- [x] Saklar Tersedia/Habis per menu langsung berpengaruh ke halaman pembeli (≤ 5 detik).
- [x] Tambah/edit: nama, harga (> 0), kategori, foto opsional (dikompres ≤ 300KB, Supabase Storage).
- [x] Hapus = soft delete (`is_active = false`). Riwayat pesanan lama tetap utuh.

Prioritas: P0 · Effort: M · Dependensi: 6

### Story 11: Buka/tutup toko
**Sebagai tenant, saya ingin menutup toko dari HP, agar tidak menerima pesanan saat saya istirahat atau habis.**

- [ ] Saklar BUKA/TUTUP di header mengubah `tenants.is_open`.
- [ ] Saat tutup, menu tenant tidak bisa dipesan, dan checkout yang berisi menu tenant itu ditolak dengan pesan jelas.

Prioritas: P0 · Effort: S · Dependensi: 6

### Story 12: Rekap uang masuk hari ini
**Sebagai tenant, saya ingin melihat uang masuk dan jumlah pesanan hari ini, agar tahu hasil jualan tanpa menghitung manual.**

- [ ] `/tenant/rekap` mengambil data dari view `tenant_daily_revenue` untuk hari ini (WIB).
- [ ] Menampilkan omzet kotor, bagian pengelola, bagian tenant, dan jumlah pesanan. Pesanan yang ditolak tidak dihitung.
- [ ] Daftar ringkas pesanan hari ini.

Prioritas: P0 · Effort: S · Dependensi: 8

---

## Milestone 4 — Pembeli tahu kapan pesanan siap

### Story 13: Status per tenant & notifikasi siap
**Sebagai pembeli, saya ingin tahu status tiap pesanan dan diberi tahu saat siap, agar tidak perlu bolak-balik bertanya.**

- [ ] Satu kartu per tenant: nomor pesanan (T7-042), item, dan progress Diterima → Dimasak → Siap.
- [ ] Saat `ready`: kartu hijau, getar + bunyi, judul tab "✅ Pesanan siap!", dan teks "Ambil di … sebut nomor …".
- [ ] API status hanya mengirim data minimum (tanpa No. HP).

Prioritas: P0 · Effort: M · Dependensi: 8

---

## Milestone 5 — Pengelola & kasir

### Story 14: Kelola tenant & akun
**Sebagai pengelola, saya ingin menambah tenant dan membuat akun login mereka, agar tenant baru bisa langsung berjualan.**

- [ ] `/admin/login` dan `/admin/tenant`: tambah/edit tenant (kode, nama, % bagi hasil), nonaktifkan tenant.
- [ ] Membuat akun tenant/kasir (server action + secret key → `auth.admin.createUser` + baris `profiles`).
- [ ] Hanya peran `admin` yang bisa mengakses halaman ini.

Prioritas: P0 · Effort: M · Dependensi: 0

### Story 15: Meja & cetak QR
**Sebagai pengelola, saya ingin membuat meja dan mencetak QR-nya, agar bisa ditempel di setiap meja.**

- [ ] Tambah meja (label unik per kantin). QR berisi `NEXT_PUBLIC_APP_URL/t/<qr_token>`.
- [ ] Halaman cetak: kartu "Pesan di Sini!" berisi label meja + QR + 3 langkah (Scan → Bayar QRIS → Ambil), siap cetak A4 (beberapa kartu per halaman).

Prioritas: P0 · Effort: S · Dependensi: 14

### Story 16: Kasir input pesanan tunai
**Sebagai kasir, saya ingin mencatat pesanan pembeli yang bayar tunai, agar pesanan mereka tetap masuk ke tenant.**

- [ ] `/admin/kasir`: cari menu semua tenant, keranjang, nama pembeli, lalu "Terima Tunai Rp…".
- [ ] Pesanan langsung berstatus `paid` dan muncul di tenant seperti pesanan QRIS.
- [ ] `created_by` = id kasir. Peran selain kasir/admin ditolak (403).

Prioritas: P0 · Effort: M · Dependensi: 7, 14

### Story 17: Dashboard omzet pengelola
**Sebagai pengelola, saya ingin melihat omzet dan aktivitas semua tenant hari ini, agar bisa memantau kantin dari satu layar.**

- [ ] Kartu ringkasan: omzet hari ini, pesanan aktif, dan jumlah "perlu refund".
- [ ] Tabel per tenant: status buka, jumlah pesanan, dan omzet hari ini.

Prioritas: P0 · Effort: S · Dependensi: 14

### Story 18: Laporan bagi hasil & refund manual
**Sebagai pengelola, saya ingin rekap bagi hasil per tenant per periode dan daftar refund, agar setoran ke tenant akurat.**

- [ ] Filter rentang tanggal. Tabel per tenant berisi omzet, bagian pengelola, dan bagian tenant (dari view).
- [ ] Daftar pesanan `refund_status = needed` dengan tombol "Sudah direfund" (lalu `done`).
- [ ] Angka laporan sama dengan jumlah manual dari data pesanan (uji dengan data seed).

Prioritas: P0 · Effort: M · Dependensi: 17

---

## Milestone 6 — Tahan banting

### Story 19: Error & kasus tepi
**Sebagai pembeli dan tenant, saya ingin sistem tetap jelas saat ada masalah, agar tidak ada uang atau pesanan yang "hilang".**

- [ ] Menu habis/tenant tutup saat checkout: pesan menyebut nama menunya dan memberi opsi hapus dari keranjang.
- [ ] Rate limit `/api/checkout`: maksimal 10 per IP per menit (balas 429 dengan pesan ramah).
- [ ] Gagal membuat QR di Xendit: checkout ditandai `failed` dan tampil tombol "Coba lagi".
- [ ] Semua error API mengembalikan pesan bahasa Indonesia, tanpa stack trace.

Prioritas: P0 · Effort: M · Dependensi: 3–13

---

## Milestone 7 — Setelah MVP (P1)

### Story 20: Notifikasi saat pesanan siap, walau halaman ditutup 🔍 *(butuh spike)*
**Sebagai pembeli, saya ingin HP saya berbunyi dan bergetar saat pesanan siap walau browser sudah saya tutup, agar tidak perlu menunggui layar.**

- [ ] **Spike dulu (≤ 1 hari):** pastikan Web Push (service worker + VAPID) jalan di Android Chrome dan di iPhone. Di iPhone notifikasi **hanya** jalan jika situs di-install ke Layar Utama (PWA, iOS 16.4+). Catat hasilnya di `docs/ARCHITECTURE.md`.
- [ ] Setelah pembayaran lunas, halaman status menawarkan "Beri tahu saya saat pesanan siap". Izin notifikasi **hanya diminta setelah ketukan pembeli**, tidak saat halaman dibuka.
- [ ] Saat `set_order_status` menjadi `ready`, server mengirim push berisi "Pesanan {nomor} siap! Ambil di {tenant}." Pola getar: `[200, 100, 200]`. Push hanya ke pembeli pemilik checkout itu.
- [ ] Langganan push disimpan per `checkouts.id`, dibuang setelah semua order selesai atau 3 jam. Tidak ada nomor HP atau data pribadi di payload.
- [ ] Jika izin ditolak atau perangkat tidak mendukung, tetap berfungsi lewat getar + bunyi + judul tab di halaman status (Story 13). Getar (`navigator.vibrate`) tidak didukung Safari iPhone; bunyi dan teks harus cukup sendiri.

Prioritas: P1 · Effort: L · Dependensi: 13

---

## Story map

```
Fondasi     Pembeli: menu      Bayar            Tenant                      Pembeli: status   Pengelola            Tahan banting
─────────   ────────────────   ──────────────   ─────────────────────────   ───────────────   ──────────────────   ─────────────
S0 Setup    S1 Menu dari QR    S3 Checkout QR   S6 Login                    S13 Notif siap    S14 Tenant & akun    S19 Error
            S2 Keranjang       S4 Webhook       S7 Antrean realtime                           S15 Meja & QR
                               S5 Kedaluwarsa   S8 Ubah status                                S16 Kasir tunai
                                                S9 Tolak                                      S17 Dashboard
                                                S10 Menu & stok habis                         S18 Laporan & refund
                                                S11 Buka/tutup
                                                S12 Rekap
```

Bagian **demo pertama** paling cepat: S0 → S1 → S2 → S3 → S4 → S6 → S7 → S8. Setelah itu alur inti "scan → bayar → masuk ke tenant" sudah jalan.

## Uji akhir (sebelum pilot)

Pakai 3 HP: **A** = tenant T7, **B** = tenant T9, **C** = pembeli.

1. C scan QR Meja 34, pesan 2 menu T7 + 1 menu T9, lalu bayar (simulasi Xendit). A dan B menerima pesanan masing-masing dengan bunyi dalam ≤ 3 detik.
2. A: Terima → Siap. C bergetar dan melihat "Siap diambil" untuk T7. Kartu T9 masih "Menunggu".
3. B menolak dengan alasan "Bahan habis". C melihat pembatalan, dan admin melihat 1 "Perlu refund".
4. C membuat checkout baru tapi tidak membayar selama 10 menit. Status kedaluwarsa, dan A/B tidak melihat apa-apa.
5. A menandai menu "Habis". C tidak bisa menambah menu itu.
6. Kasir membuat pesanan tunai untuk T7. A menerimanya.
7. Rekap A = jumlah manual. Laporan admin cocok dengan rekap A + B.
8. Matikan Wi-Fi HP A selama 30 detik. Banner koneksi putus muncul, dan setelah tersambung pesanan yang masuk saat putus tampil.

## Open questions (perlu jawaban sebelum story terkait)

- **Story 3:** Rekening/merchant Xendit atas nama pengelola. Siapa yang mendaftar dan memverifikasi?
- **Story 14/18:** Berapa % bagi hasil per tenant sekarang? Apakah sama untuk semua tenant?
- **Story 9/18:** Kebijakan refund: penuh selalu? Lewat tunai atau transfer?
