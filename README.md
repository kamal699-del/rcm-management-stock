# RCM – Management Stock V4

Mobile-first Next.js + Supabase app for LC Rancamanyar.

## V4 additions
- Master Produk: tambah, edit, aktif/nonaktif, kategori, satuan, min/max stock.
- User / Role Management: Admin dapat mengubah role, store, dan status aktif profil.
- Role: admin, store_leader, team_leader, crew.
- Supabase RLS protects product writes and profile management.

## Setup
Create `.env.local` from `.env.local.example`:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Install and run:
`npm install`
`npm run dev`

Important: login accounts are managed by Supabase Auth. The User/Role screen manages the corresponding public profile after the account exists.


## RCM V7 — Simple Crew Mode
- Crew hanya melihat 3 menu: Stok, Input Sisa, Riwayat Saya.
- Crew tidak dapat mengakses Input Stok Gudang, Transfer, Revisi, Master Produk, atau User/Role.
- Input Sisa dibuat mobile-first dengan alur pilih produk → masukkan sisa → simpan.
- Riwayat Crew hanya menampilkan transaksi yang dibuat oleh akun Crew tersebut.
- Database juga membatasi RPC Transfer agar Crew tidak dapat menjalankan transfer langsung.

## V8 – Area Opname Operasional
- Tambah pilihan Area Operasional pada Input Sisa: Kasir / Kitchen.
- Area opname tersimpan di `stock_opnames.operational_area`.
- RPC `record_operational_opname` menerima parameter `p_operational_area`.


## V9 / V0.6 – Total Operasional Gabungan
- Total stok operasional ditampilkan sebagai satu saldo gabungan Kasir + Kitchen.
- Transfer Gudang → Operasional sekarang memilih tujuan Kasir atau Kitchen.
- Input Sisa tetap dilakukan per area, tetapi kontrol stok utama/status menggunakan total gabungan.
- Detail saldo area tetap tersimpan untuk audit dan pengendalian.

## V10 / V0.7 – PWA & Icon Pintasan Chrome
- Tambah favicon dan icon aplikasi RCM.
- Tambah `manifest.webmanifest` agar RCM dapat dipasang sebagai aplikasi dari Chrome Android.
- Shortcut menggunakan nama **RCM Stock** dan mode `standalone`.
- Tambah Apple Touch Icon untuk perangkat yang mendukungnya.
