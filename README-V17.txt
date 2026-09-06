RCM Management Stock V17

Perubahan utama:
1. Input Sisa sekarang memakai satu angka total Stok Operasional (Kasir + Kitchen).
2. Input sisa terbaru menggantikan saldo operasional sebelumnya, bukan menambahkannya.
3. Stok Operasional ditampilkan sebagai satu saldo gabungan dalam Base Unit.
4. Stok Gudang tetap terpisah.
5. Stok Akhir = Stok Gudang + Stok Operasional terbaru.
6. Stok Awal memakai ending hari sebelumnya (atau saldo awal pertama jika belum ada snapshot).
7. Pemakaian = Stok Awal - Stok Akhir.
8. Nomor transaksi ditampilkan pada hasil input sisa.
9. RPC baru: record_operational_stock_snapshot.
10. RPC baru sudah dibatasi untuk authenticated dan memvalidasi role/store.

File:
- app/page.js -> gunakan page_v17.js
- migration_v17_operational_total.sql -> dokumentasi perubahan

Catatan:
Database RPC sudah diterapkan pada project Supabase RCM. Karena akses tulis GitHub/Vercel sebelumnya ditolak integration, file app/page.js perlu di-commit ke repository secara manual jika deployment belum otomatis.
