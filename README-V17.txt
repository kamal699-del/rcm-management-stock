RCM Management Stock V17

Perubahan:
1. Menu Stok Crew menggunakan tampilan tabel yang sama dengan Stok Gudang Leader.
2. Kolom: Produk, Satuan, Stok Awal, Pemakaian, Stok Akhir, Status.
3. Stok Akhir = Stok Gudang + Stok Operasional terbaru.
4. Stok Operasional ditampilkan sebagai satu total gabungan Kasir + Kitchen.
5. Input Sisa menggunakan total fisik gabungan Kasir + Kitchen.
6. Input Sisa memakai RPC record_operational_stock_snapshot.
7. Data Stok Awal/Pemakaian/Stok Akhir membaca stock_daily_snapshots terbaru.
8. Realtime diperbarui saat stock_transactions maupun stock_daily_snapshots berubah.
9. Tombol simpan Input Sisa memakai try/finally agar tidak tertahan di status Menyimpan.

File utama: RCM-Management-Stock-V17.js

Catatan implementasi:
- Ganti app/page.js dengan file ini jika struktur proyek sama dengan versi sebelumnya.
- Supabase harus memiliki RPC record_operational_stock_snapshot dan tabel stock_daily_snapshots sesuai skema V17 yang sudah dibuat sebelumnya.
