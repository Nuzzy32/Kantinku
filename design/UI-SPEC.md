# KantinKu — Spesifikasi UI

Sumber: prototype Claude Design (tenant, kasir, pengelola) + halaman self-order ESB Kantin GOR (pembeli), lalu diperbaiki.
Tahap sekarang: **layar dengan data contoh** (`lib/mock.ts`). Supabase/Xendit disambung per story di `docs/TASKS.md`.

## Aturan umum

- Teks UI **bahasa Indonesia**. Kode, nama file, nama tabel bahasa Inggris. Uang lewat `rupiah()` di `lib/rupiah.ts` (`Rp34.000`).
- Warna **hanya token** di `app/globals.css` (`bg-primary`, `text-muted-foreground`, `bg-danger-soft`, `border-border`, ...). Dilarang hex di komponen. Ikon `lucide-react`, bukan emoji.
- Tema terang saja. Tenant dan pengelola: font Plus Jakarta Sans, sudut 8px, garis tipis, padat informasi, **satu aksen hijau**. **Pembeli memakai tema oranye ala ESB (kelas `theme-buyer`, font Inter): lihat bagian A.**
- Target sentuh ≥ 44px. Aksi utama di tablet tenant ≥ 56px (`size="lg"`). Jarak antar target ≥ 8px.
- Status = teks **dan** warna (pakai `Pill`), jangan hanya warna. Teks biasa kontras ≥ 4.5:1.
- Setiap input punya `<Label>` yang terlihat. Error di dekat field, bahasa ramah, tanpa istilah teknis.
- Tombol ikon wajib `aria-label`. Dialog memakai `components/ui/dialog` (fokus terkunci, Esc menutup).
- Keadaan wajib ada: kosong, loading/disabled saat proses, error, dan "habis/tutup".
- Gerakan halus (≤ 200ms), hormati `prefers-reduced-motion` (sudah global). Jangan animasi lebar/tinggi.
- Komponen kecil, satu tanggung jawab. Server Component untuk halaman, `"use client"` hanya untuk interaksi.
- Next.js 16: `params`/`searchParams` di page adalah **Promise**. Baca `node_modules/next/dist/docs/01-app` sebelum memakai API yang belum akrab.

## Bahan bersama (sudah ada, jangan ditulis ulang)

`components/ui/{button,dialog,input,label,switch}.tsx` · `components/pill.tsx` · `components/stat-card.tsx` ·
`components/toast.tsx` (`useToast()(pesan, {label,onClick}?)`) · `components/login-form.tsx` ·
`lib/{types,mock,cart,rupiah,utils}.ts`.

## Rute

| Rute | Peran | Isi |
|---|---|---|
| `/` | semua | Halaman awal pengembangan: tautan ke tiap layar |
| `/t/[qrToken]` | pembeli | Menu dari QR meja |
| `/info` · `/profil` | pembeli | Info kantin, profil tamu |
| `/checkout` | pembeli | Keranjang, data pembeli, bayar |
| `/order/[publicToken]` | pembeli | QRIS lalu status pesanan |
| `/tenant/login` · `/tenant` · `/tenant/menu` · `/tenant/rekap` | tenant | Tablet |
| `/admin/login` · `/admin` · `/admin/tenant` · `/admin/meja` · `/admin/kasir` · `/admin/laporan` | pengelola, kasir | Tablet/desktop |

---

## A. Pembeli (HP, 360–430px) — meniru tampilan ESB

**Keputusan pemilik:** layar pembeli dibuat **sama dengan halaman self-order ESB Kantin GOR** (yang sudah dikenal mahasiswa), bukan versi yang "diperbaiki". Jadi: susunan, bentuk, warna oranye, dan font mengikuti ESB. Perbedaan yang disengaja hanya: teks bahasa Indonesia, tidak memakai logo/banner kampus (itu aset ESB; diganti banner KantinKu dengan susunan yang sama), dan area sentuh minimal 44px.

Tema: bungkus semua halaman pembeli dengan kelas `theme-buyer` (token di `app/globals.css`). Font **Inter** (otomatis dari `theme-buyer`). Pakai token: `bg-primary` / `text-primary` (isi dan teks aksen, oranye gelap 4,6:1), `border-brand-line` dan `text-brand-line` **hanya untuk garis dan ikon** (oranye ESB asli `#f05a28`), `bg-accent` (krem `#fef2e6`), `text-muted-foreground`, `border-border`, `text-success` / `bg-success-soft` (hijau untuk status Siap), `bg-destructive` (Tutup/Ditolak). Dilarang hex di komponen.

Ukuran dari ESB asli (lebar 375px): teks dasar 14px; nama menu 14px bold; harga 14px bold (semibold); judul grup 16px; kartu kantin dan kotak meja bersudut 16px; foto menu 72×72 sudut 8px; tombol Add kecil ±64×28 sudut 8px; pemisah antar menu garis 1px `border-border`.

### A1. Menu `/t/[qrToken]` (susunan persis ESB)
1. **Banner** tinggi ±160px, latar gradasi krem ke oranye muda, kata "KantinKu" besar tebal di kanan dan nama kantin kecil; dua tombol bulat putih 44px di pojok kanan atas: **cari** (ikon) dan **menu** (ikon hamburger → `/profil`). Tanpa logo kampus.
2. **Kartu kantin** (putih, garis `border-border`, sudut 16, padding 16): nama kantin bold 16px; di bawahnya pil status; ikon panah `>` di kanan; seluruh kartu adalah tautan ke `/info`. Pil: buka = "BUKA · Tutup 21.00" (latar `bg-accent`, teks `text-primary`, huruf kapital kecil bold); kantin tutup = "TUTUP · Buka besok 08.00" (latar `bg-destructive`, teks putih).
3. **Kotak meja**: latar `bg-accent` (krem), sudut atas 16, teks tengah "Nomor Meja: Meja 34", 14px medium.
4. **Baris tab sticky** (menempel di atas saat digulung): kiri **pemilih tenant** berupa teks oranye bold kapital "T7 MIE MAS JOKO" + panah bawah (dipotong dengan elipsis bila panjang); garis pemisah vertikal; di kanannya **tab kategori** milik tenant itu (MIE, BAKSO, MINUMAN), kapital, 14px semibold, tab aktif bergaris bawah oranye (`border-brand-line`) 3px. Tab bisa digeser mendatar.
5. **Pemilih tenant** = bottom sheet berjudul "Pilih Tenant" dengan tombol tutup (X): daftar tombol lebar penuh, tinggi ≥48px, sudut 8, huruf kapital bold. Terpilih = isi oranye (`bg-primary`, teks putih) + ikon centang bulat di kanan. Lainnya = garis oranye (`border-brand-line`) dengan teks `text-primary`. Tenant tutup diberi label kecil "Tutup". Memilih tenant menutup sheet dan menggulung ke daftar menu.
6. **Daftar menu**: judul grup kapital ringan (nama tenant, 16px, abu `text-muted-foreground`, garis tipis memanjang di kanannya) lalu judul kategori **bold kapital 18px**. Baris: foto 72×72 kiri (tanpa foto = kotak abu muda polos bersudut 8 dengan ikon `UtensilsCrossed` samar), nama bold di kanan atas, harga bold di bawahnya, tombol **Tambah** di kanan bawah (kecil, putih, garis `border-brand-line`, teks `text-primary` bold). Area sentuh tombol ≥44×44 lewat padding tak terlihat (mis. `after:absolute after:-inset-2`), bentuk tampak tetap kecil seperti ESB. Setelah ditekan berubah jadi stepper `−  n  +` dengan gaya yang sama (garis oranye). Pemisah garis antar baris.
7. **Habis**: foto jadi hitam-putih (`grayscale`) + teks redup + label "Habis", tombol hilang. **Tenant tutup / kantin tutup**: semua foto `grayscale`, tidak ada tombol Tambah, banner kecil "Tutup sekarang".
8. **Gulir**: setelah banner/kartu/kotak meja tergulir keluar, baris ringkas menempel di atas: strip krem "Meja 34" kecil, lalu baris "Nama kantin" kiri + ikon cari kanan, lalu baris tab. Muncul tombol bulat abu gelap 44px berpanah naik di kanan bawah (di atas bar keranjang) untuk kembali ke atas.
9. **Bar keranjang** sticky bawah (bila ada item): tombol lebar penuh oranye (`bg-primary`, teks putih bold), sudut 12, margin 16: kiri "3 item", kanan "Rp34.000 · Lihat pesanan". `role="status"`.
10. **Pencarian** (tombol cari): halaman/sheet penuh dengan kolom cari fokus otomatis (sudut 8, ikon cari), hasil lintas tenant memakai baris menu yang sama + nama tenant kecil di atas nama menu; kosong = "Tidak ada yang cocok".
11. Token `salah` = halaman "Meja tidak ditemukan". Query demo `?tutup=1` menampilkan keadaan kantin tutup.

### A2. Info kantin `/info` dan Profil `/profil`
- Header putih bergaris bayangan tipis: panah kembali kiri, judul tengah bold ("Info Kantin" / "Profil"). Tanpa banner.
- `/info`: nama kantin bold 20px, alamat contoh, tabel "Jam Operasional" Senin–Minggu 08.00–21.00 (hari ini ditebalkan; hari dihitung di client setelah mount supaya tidak hydration mismatch).
- `/profil`: avatar bulat abu + "Masuk sebagai Tamu" (pembeli tidak login). Dua kartu bersudut 16: **Riwayat pesanan** (tautan ke `/order/demo`) dan **Info kantin** (ke `/info`).

### A3. Checkout `/checkout`
Gaya halaman dalam ESB: header putih dengan panah kembali dan judul tengah "Pesanan Kamu" (sub: "Kantin Teknik · Meja 34"). Konten:
- Satu **kartu per tenant** (sudut 16, garis `border-border`): kepala "T3 · Dapur Bu Sri" bold; baris item (foto 48px, nama bold, harga; stepper kuantitas bergaya oranye; "+ Tambah catatan" teks oranye, maks 100 karakter + penghitung); subtotal tenant.
- **Cara makan**: dua pilihan besar sejajar (Makan di sini / Bawa pulang), terpilih = latar `bg-accent` + garis `border-brand-line` + centang. `role="radiogroup"`.
- Nama panggilan (wajib, maks 40) dan No. WA (opsional, format Indonesia). Input tinggi 44px, sudut 8, garis `border-input`, label di atas, error di bawah ("Nama wajib diisi.").
- Footer sticky: baris "Total … Rp27.000" lalu tombol oranye lebar penuh "Bayar QRIS · Rp27.000" (disabled + "Membuat QRIS…" saat proses ±900ms, lalu ke `/order/demo`).
- Keranjang kosong: ikon, "Keranjang masih kosong", tombol oranye "Pilih menu". Item yang habis/tenant tutup (sisa lama) ditandai dan menonaktifkan tombol bayar dengan penjelasan.

### A4. Bayar & status `/order/[publicToken]` (client)
Header putih seperti A3, judul "Pembayaran" lalu "Status Pesanan".
- **Bayar**: total besar, kotak QR ≥260px (garis putus `border-brand-line`, tulisan "QRIS dinamis"), hitung mundur 10 menit ("Bayar dalam 09:59"), 3 langkah bernomor lingkaran krem, tombol "Simpan gambar QR" (garis oranye) dan "Saya sudah bayar" (oranye penuh). "Simulasi: lewati 10 menit" hanya di `NODE_ENV !== 'production'`.
- **Status**: pita "Lunas · Rp… Pesanan terkirim" (latar `bg-success`, teks putih). Satu kartu per tenant (sudut 16): nama, nomor (T7-042), item, progress 3 langkah Diterima → Dimasak → Siap (aktif/selesai = oranye, siap = hijau), teks status. Demo: kartu maju otomatis; `ready` = kartu `bg-success-soft` berbingkai `border-success`, teks "Siap! Ambil di {tenant}, sebut nomor {nomor}.", `navigator.vibrate([200,100,200])`, bunyi pendek, judul tab "Pesanan siap!". Ditolak = kartu merah dengan alasan. Tombol "Pesan lagi". Tidak ada data pembeli lain di layar ini.
- **Kedaluwarsa**: "Waktu bayar habis", "tidak ada uang yang terpotong", tombol "Pesan ulang".
- Ada tambahan demo yang sudah ada (`?demo=tolak`) dipertahankan.

---

## B. Tenant (tablet landscape 1024–1280px, tetap rapi di 768px)

### Rangka (`app/tenant/layout.tsx`, tidak untuk `/tenant/login`)
Header 64px: kode T7 + "Mie Mas Joko", tab Antrean · Menu · Rekap (tab aktif jelas), pemisah, **saklar Toko** (`Switch` besar + teks BUKA/TUTUP, toast saat ganti), tombol keluar (ikon). Banner merah "Koneksi terputus. Mengambil ulang data setiap 10 detik…" muncul bila `?offline=1` (hanya untuk melihat tampilannya).

### B1. Antrean `/tenant`
- Gerbang awal sebelum tombol ditekan: kartu besar "Siap jualan hari ini?" + tombol **Mulai Terima Pesanan** (membuka izin audio, `navigator.wakeLock` bila ada) + ringkasan hitungan. Penjelasan satu kalimat kenapa tombol perlu ditekan.
- Setelah mulai: **tiga kolom sekaligus** (Baru · Dimasak · Siap), tiap kolom ada judul + jumlah. Di bawah `lg` jadi tab dengan jumlah.
- Strip **Ringkasan masak** di atas: total item dari kolom Baru + Dimasak ("Mie Ayam ×5 · Bakso Urat ×2"). Sembunyi bila kosong.
- Kartu: nomor besar (T7-039), umur ("5 mnt", warna netral < 5 mnt, kuning 5–9, merah ≥ 10, tidak untuk Siap), nama pembeli, "Meja 5 · Bawa pulang" atau "Kasir · Tunai", daftar item (jumlah tebal), catatan item di kotak kuning (`bg-warn-soft text-warn`).
- Aksi (≥56px): Baru → **Terima** + Tolak. Dimasak → **Siap** + Tolak (kecil). Siap → **Selesai diambil**. Transisi sah mengikuti `docs/schema.sql`: paid → accepted|cancelled, accepted → ready|cancelled, ready → completed.
- Setelah Terima/Siap/Selesai muncul toast "Urungkan" 6 detik yang mengembalikan status sebelumnya.
- Tolak: dialog "Tolak pesanan T7-039?", pilihan alasan (Bahan habis / Tutup / Lainnya), "Lainnya" wajib teks. Tombol "Tolak pesanan" disabled bila belum valid. Pesan: "Pembeli melihat alasannya. Uang dikembalikan pengelola."
- Bunyi: bip berulang (WebAudio, tiap ±2,4 dtk) selama ada pesanan Baru, berhenti saat tidak ada. Tombol **Bisukan/Nyalakan suara** terlihat di header antrean. Kolom kosong punya teks ("Belum ada pesanan baru. Tablet berbunyi saat ada yang masuk.").
- Data: salin `tenantOrders` ke state lokal. Umur = `ageMin` + menit sejak halaman dibuka (ticker `setInterval` di effect; render pertama tanpa `Date.now()`).

### B2. Menu `/tenant/menu`
- Judul "Menu", keterangan "Saklar Habis langsung terlihat di HP pembeli.", kolom cari, tombol **Tambah menu**.
- Daftar per kategori; baris ≥ 56px: nama, harga, `Switch` + teks "Tersedia"/"Habis", tombol Edit, tombol hapus (ikon, `aria-label`). Hapus = soft delete + toast "Urungkan" ("Riwayat pesanan lama tetap utuh.").
- Dialog Tambah/Edit: nama, harga (angka saja, > 0), kategori (chip dari kategori yang ada + "Kategori baru"), kotak foto placeholder "Foto · maks 300KB" (belum aktif). Error: "Isi nama dan harga lebih dari 0."
- Data: `menuItems` milik tenant 7 di state lokal.

### B3. Rekap `/tenant/rekap`
- "Kamis, 15 Oktober 2026 · WIB", judul "Uang masuk hari ini".
- 4 `StatCard`: Omzet kotor, Bagian pengelola (10%), Bagian kamu, Jumlah pesanan. Pesanan ditolak **tidak dihitung** (tulis di catatan kecil).
- "Menu terlaris hari ini" top 3 dari pesanan yang dihitung.
- Tabel pesanan: No., Jam (`clockFromAge`), Pembeli, Item, Total, Status (`Pill`). Yang ditolak dicoret.

---

## C. Pengelola & kasir (tablet/desktop)

### Rangka (`app/admin/layout.tsx`, tidak untuk `/admin/login`)
Bilah atas: KantinKu · "Pengelola · Kantin Teknik", navigasi Dashboard · Tenant · Meja & QR · Kasir · Laporan (badge jumlah refund di Laporan), nama + peran, keluar. **Kasir hanya melihat menu Kasir**: bila `?as=kasir` tampilkan nav kasir saja dan alihkan akses halaman lain ke `/admin/kasir` (hanya demonstrasi; peran asli dari profil di Story 14/16).

### C1. Dashboard `/admin`
Tiga kartu: Omzet hari ini, Pesanan aktif (hitung nyata dari data contoh, tanpa angka karangan), **Perlu refund** (merah bila > 0, bisa diklik ke Laporan). Tabel per tenant: kode, nama, status Buka/Tutup (`Pill`), pesanan, omzet + batang proporsional omzet (div dengan lebar %, teks angka tetap ada).

### C2. Tenant `/admin/tenant`
Tabel: kode, nama, jenis, bagi hasil %, akun login (email), tombol Nonaktifkan/Aktifkan. Dialog **Tambah tenant** (kode, nama, bagi hasil %, email; wajib semua, error ramah, toast "Tenant & akun dibuat. Kirim kata sandi sementara ke tenant."). Tenant nonaktif redup.

### C3. Meja & QR `/admin/meja`
Kiri: tambah meja (label unik, error "Label meja sudah dipakai."), daftar meja dengan kotak centang dan tautan `/t/<token>`. Kanan: **pratinjau A4** (maks 4 kartu per halaman): "Pesan di Sini!", label meja, kotak QR placeholder, 3 langkah (Scan → Bayar QRIS → Ambil). Tombol "Cetak QR" memanggil `window.print()`; CSS cetak hanya menampilkan pratinjau. QR sungguhan (butuh paket `qrcode`) dikerjakan di Story 15, bukan sekarang.

### C4. Kasir `/admin/kasir`
- Kiri: kolom cari + chip filter tenant. Menu dikelompokkan per tenant. Tenant tutup tetap tampil, terlipat dengan label "Tutup" (tidak disembunyikan diam-diam). Menu habis tidak bisa ditambah. Kotak menu ≥ 56px, menampilkan jumlah di keranjang.
- Kanan: keranjang (stepper), nama pembeli (wajib), **Cara makan** (Makan di sini / Bawa pulang, wajib karena `create_checkout` butuh `service_type`), **Uang diterima**: tombol cepat Pas / Rp20.000 / Rp50.000 / Rp100.000 + isian angka, tampilkan **Kembalian** (atau "Uang kurang Rp…" merah bila kurang; tombol disabled). Tombol "Terima Tunai Rp…".
- Setelah terima: toast "Tunai Rp… diterima · masuk ke T7-041, T9-020", keranjang kosong. Tab **Riwayat** menampilkan pesanan tunai sesi ini.
- Pesanan tunai hanya soal tampilan di tahap ini (state lokal).

### C5. Laporan `/admin/laporan`
Filter tanggal Dari/Sampai (`type="date"`). Tabel bagi hasil per tenant: kode, nama, %, omzet, bagian pengelola, bagian tenant, baris total (dari `periodGross`). Daftar **Perlu refund**: nomor, tenant, pembeli, nominal, alasan, tombol "Sudah direfund" (dialog konfirmasi singkat) → tampil "Selesai". Kosong: "Tidak ada refund."

---

## Tahap berikutnya (bukan sekarang)

Sambung ke Supabase/Xendit per story: S1–S2 (menu + keranjang nyata), S3–S5 (checkout, webhook, kedaluwarsa), S6–S13 (tenant), S14–S18 (pengelola/kasir), S19 (error & kasus tepi). Hapus `lib/mock.ts` per layar saat data aslinya terpasang.
