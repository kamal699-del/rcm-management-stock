<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aplikasi Kartu Stok</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 950px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #2c3e50; }
        .action-buttons { display: flex; gap: 10px; margin-bottom: 20px; }
        button { padding: 10px 20px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; color: white; font-weight: bold; }
        .btn-add { background-color: #27ae60; }
        .btn-add:hover { background-color: #219150; }
        .btn-reduce { background-color: #e74c3c; }
        .btn-reduce:hover { background-color: #c0392b; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background-color: #34495e; color: white; }
        tr:hover { background-color: #f1f1f1; }
        
        /* Modal Styles */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; }
        .modal-content { background: white; padding: 20px; width: 100%; max-width: 400px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
        .modal-title { margin-top: 0; color: #2c3e50; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .btn-submit { background-color: #3498db; flex: 1; }
        .btn-cancel { background-color: #95a5a6; flex: 1; }

        /* Style Tambahan Fitur Multi-Satuan */
        .badge { padding: 3px 6px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .badge-kasir { background-color: #2980b9; }
        .badge-kitchen { background-color: #e67e22; }
        .total-highlight { font-weight: bold; color: #2c3e50; background-color: #eaeded; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .info-konversi { font-size: 11px; color: #7f8c8d; font-style: italic; margin-top: 2px; }
    </style>
</head>
<body>

<div class="container">
    <h1>Dashboard Kartu Stok</h1>
    
    <div class="action-buttons">
        <button class="btn-add" onclick="openModal('add')">+ Penambahan Item</button>
        <button class="btn-reduce" onclick="openModal('reduce')">- Pengurangan Item</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>Nama Item</th>
                <th>Stok Kasir (Pcs)</th>
                <th>Stok Kitchen (Kg)</th>
                <th>Total Gabungan Stok</th>
                <th>PIC & Shift</th>
                <th>Terakhir Diperbarui</th>
            </tr>
        </thead>
        <tbody id="stockTableBody">
            <!-- Data akan dimunculkan di sini -->
        </tbody>
    </table>
</div>

<!-- Modal Form (FITUR 100% ASLI DIPERTAHANKAN) -->
<div id="transactionModal" class="modal">
    <div class="modal-content">
        <h2 id="modalTitle" class="modal-title">Transaksi Item</h2>
        <form id="transactionForm">
            <div class="form-group">
                <label for="itemName">Nama Item</label>
                <input type="text" id="itemName" list="itemOptions" placeholder="Ketik atau pilih item..." required autocomplete="off">
                <datalist id="itemOptions">
                    <!-- Opsi item yang sudah ada akan muncul di sini -->
                </datalist>
            </div>

            <!-- Fitur Baru: Dropdown Area untuk memisahkan hitungan Kasir/Kitchen -->
            <div class="form-group">
                <label for="areaInput">Area Penyimpanan / Satuan</label>
                <select id="areaInput" required>
                    <option value="kasir">Kasir (Hitungan Pcs)</option>
                    <option value="kitchen">Kitchen (Hitungan Kg)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="picName">PIC (Person In Charge)</label>
                <input type="text" id="picName" placeholder="Nama petugas..." required>
            </div>

            <div class="form-group">
                <label for="shift">Shift</label>
                <select id="shift" required>
                    <option value="">-- Pilih Shift --</option>
                    <option value="Pagi">Pagi</option>
                    <option value="Siang">Siang</option>
                    <option value="Malam">Malam</option>
                </select>
            </div>

            <div class="form-group">
                <label for="quantity">Nilai / Jumlah</label>
                <input type="number" id="quantity" min="1" placeholder="Masukkan jumlah..." required>
            </div>

            <div class="modal-buttons">
                <button type="submit" class="btn-submit">Simpan</button>
                <button type="button" class="btn-cancel" onclick="closeModal()">Batal</button>
            </div>
        </form>
    </div>
</div>

<script>
    // ==========================================
    // MASTER KONVERSI PRODUK (MUDAH DISESUAIKAN)
    // Silakan tambah atau ubah rasio angka (pcs per 1 kg) di bawah ini.
    // Jika nama produk tidak terdaftar di bawah, otomatis memakai rasio bawaan: 12 pcs = 1 kg.
    // ==========================================
    const MASTER_KONVERSI = {
        "Beras": 12,
        "Gula": 10,
        "Tepung": 8
    };

    // Inisialisasi data dari localStorage atau buat objek kosong
    let stockData = JSON.parse(localStorage.getItem('kartuStokData')) || {};
    let transactionType = '';

    // Referensi elemen DOM
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    const transactionForm = document.getElementById('transactionForm');
    const stockTableBody = document.getElementById('stockTableBody');
    const itemOptions = document.getElementById('itemOptions');
    const areaInput = document.getElementById('areaInput');

    // Tampilkan data saat halaman dimuat
    updateUI();

    function openModal(type) {
        transactionType = type;
        modalTitle.innerText = type === 'add' ? 'Penambahan Item' : 'Pengurangan Item';
        transactionForm.reset();
        modal.style.display = 'flex';
        updateDatalist();
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // Tangani saat form disubmit
    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Ambil nilai input asli
        const nameInput = document.getElementById('itemName').value.trim();
        const itemName = nameInput.charAt(0).toUpperCase() + nameInput.slice(1).toLowerCase();
        const qty = parseInt(document.getElementById('quantity').value);
        const area = areaInput.value;
        const pic = document.getElementById('picName').value.trim();
        const shift = document.getElementById('shift').value;
        
        // Jika item belum ada di database, buat format dasarnya tanpa merusak struktur lama
        if (!stockData[itemName]) {
            stockData[itemName] = { 
                stock: 0, // Tetap dipertahankan demi validitas data lama Anda
                stokKasir: 0, 
                stokKitchen: 0, 
                lastUpdated: '',
                pic: '',
                shift: ''
            };
        }

        // Kalkulasi stok berdasarkan Area yang dipilih
        if (transactionType === 'add') {
            if (area === 'kasir') stockData[itemName].stokKasir += qty;
            if (area === 'kitchen') stockData[itemName].stokKitchen += qty;
        } else if (transactionType === 'reduce') {
            if (area === 'kasir') {
                if (stockData[itemName].stokKasir < qty) {
                    alert('Stok Kasir tidak mencukupi untuk pengurangan ini!');
                    return;
                }
                stockData[itemName].stokKasir -= qty;
            } else if (area === 'kitchen') {
                if (stockData[itemName].stokKitchen < qty) {
                    alert('Stok Kitchen tidak mencukupi untuk pengurangan ini!');
                    return;
                }
                stockData[itemName].stokKitchen -= qty;
            }
        }

        // Sinkronisasi ke variabel stock lama agar data internal tetap aman
        stockData[itemName].stock = stockData[itemName].stokKasir; 

        // Update data petugas & waktu
        stockData[itemName].pic = pic;
        stockData[itemName].shift = shift;
        const now = new Date();
        const timeString = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        stockData[itemName].lastUpdated = timeString;

        // Simpan ke localStorage
        localStorage.setItem('kartuStokData', JSON.stringify(stockData));

        closeModal();
        updateUI();
    });

    // Render tabel dengan fitur kalkulasi konversi baru
    function updateUI() {
        stockTableBody.innerHTML = '';
        const items = Object.keys(stockData).sort();

        if (items.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada item yang terinput.</td></tr>';
            return;
        }

