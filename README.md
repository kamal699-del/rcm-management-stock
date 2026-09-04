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
