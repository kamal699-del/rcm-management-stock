<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aplikasi Kartu Stok multi-Satuan</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
        h3 { text-align: center; color: #7f8c8d; margin-top: 0; font-weight: normal; font-size: 14px; }
        .action-buttons { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
        button { padding: 10px 20px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; color: white; font-weight: bold; }
        .btn-add { background-color: #27ae60; }
        .btn-add:hover { background-color: #219150; }
        .btn-reduce { background-color: #e74c3c; }
        .btn-reduce:hover { background-color: #c0392b; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background-color: #34495e; color: white; }
        tr:hover { background-color: #f1f1f1; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-kitchen { background-color: #e67e22; color: white; }
        .badge-kasir { background-color: #2980b9; color: white; }
        .total-highlight { font-weight: bold; color: #2c3e50; background-color: #eaeded; padding: 4px 8px; border-radius: 4px; }
        
        /* Modal Styles */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; padding: 20px; width: 100%; max-width: 450px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
        .modal-title { margin-top: 0; color: #2c3e50; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .btn-submit { background-color: #3498db; flex: 1; }
        .btn-cancel { background-color: #95a5a6; flex: 1; }
        .info-konversi { font-size: 12px; color: #7f8c8d; margin-top: 5px; font-style: italic; }
    </style>
</head>
<body>

<div class="container">
    <h1>Dashboard Kartu Stok</h1>
    <h3>Sinkronisasi Otomatis Multi-Unit (Kitchen & Kasir)</h3>
    
    <div class="action-buttons">
        <button class="btn-add" onclick="openModal('add')">+ Input Transaksi Masuk</button>
        <button class="btn-reduce" onclick="openModal('reduce')">- Input Transaksi Keluar</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>Nama Item</th>
                <th>Stok Kasir (Pcs)</th>
                <th>Stok Kitchen (Kg/Liter)</th>
                <th>Total Sisa Stok (Konversi Ke Satuan Besar)</th>
                <th>Terakhir Diperbarui</th>
            </tr>
        </thead>
        <tbody id="stockTableBody">
            <!-- Data otomatis dirender di sini -->
        </tbody>
    </table>
</div>

<!-- Modal Form -->
<div id="transactionModal" class="modal">
    <div class="modal-content">
        <h2 id="modalTitle" class="modal-title">Transaksi Item</h2>
        <form id="transactionForm">
            
            <div class="form-group">
                <label for="itemName">Nama Item</label>
                <select id="itemName" onchange="UbahInfoSatuan()" required>
                    <option value="">-- Pilih Produk --</option>
                    <!-- Opsi produk dari Master Data akan muncul di sini -->
                </select>
                <div id="konversiInfo" class="info-konversi"></div>
            </div>

            <div class="form-group">
                <label for="area">Area Input</label>
                <select id="area" onchange="UbahLabelSatuan()" required>
                    <option value="kasir">Kasir (Satuan Kecil / Pcs)</option>
                    <option value="kitchen">Kitchen (Satuan Besar / Kg / Liter)</option>
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
                <label id="labelQuantity" for="quantity">Jumlah (Pcs)</label>
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
    // MODULE 1: MASTER DATA PRODUK & KONVERSI
    // Mudah disesuaikan! Jika ada produk baru tinggal tambah baris di bawah ini.
    // rasioKonversi artinya: Berapa 'pcs' untuk membentuk 1 'Kg/Liter'
    // ==========================================
    const MASTER_PRODUK = {
        "Beras": { rasioKonversi: 12, satuanBesar: "Kg", satuanKecil: "Pcs" },
        "Minyak Goreng": { rasioKonversi: 4, satuanBesar: "Liter", satuanKecil: "Pcs" },
        "Gula Pasir": { rasioKonversi: 10, satuanBesar: "Kg", satuanKecil: "Pcs" },
        "Susu UHT": { rasioKonversi: 12, satuanBesar: "Box", satuanKecil: "Pcs" }
    };

    // Inisialisasi data transaksi stok dari localStorage
    let stockData = JSON.parse(localStorage.getItem('multiUnitStokData')) || {};
    let transactionType = '';

    // Referensi DOM
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    const transactionForm = document.getElementById('transactionForm');
    const stockTableBody = document.getElementById('stockTableBody');
    const itemSelect = document.getElementById('itemName');
    const areaSelect = document.getElementById('area');
    const labelQuantity = document.getElementById('labelQuantity');
    const konversiInfo = document.getElementById('konversiInfo');

    // Load Pilihan Master Produk ke Dropdown Form saat aplikasi jalan
    initMasterProdukDropdown();
    updateUI();

    function initMasterProdukDropdown() {
        Object.keys(MASTER_PRODUK).forEach(produk => {
            const opt = document.createElement('option');
            opt.value = produk;
            opt.innerText = produk;
            itemSelect.appendChild(opt);
        });
    }

    function UbahInfoSatuan() {
        const produk = itemSelect.value;
        if(produk && MASTER_PRODUK[produk]) {
            const p = MASTER_PRODUK[produk];
            konversiInfo.innerText = `Catatan Konversi: ${p.rasioKonversi} ${p.satuanKecil} = 1 ${p.satuanBesar}`;
            UbahLabelSatuan();
        } else {
            konversiInfo.innerText = "";
        }
    }

    function UbahLabelSatuan() {
        const produk = itemSelect.value;
        const area = areaSelect.value;
        if(produk && MASTER_PRODUK[produk]) {
            const satuan = area === 'kasir' ? MASTER_PRODUK[produk].satuanKecil : MASTER_PRODUK[produk].satuanBesar;
            labelQuantity.innerText = `Jumlah (${satuan})`;
        } else {
            labelQuantity.innerText = "Jumlah";
        }
    }

    function openModal(type) {
        transactionType = type;
        modalTitle.innerText = type === 'add' ? 'Input Barang Masuk' : 'Input Barang Keluar';
        transactionForm.reset();
        konversiInfo.innerText = "";
        labelQuantity.innerText = "Jumlah";
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // Handle Form Submit
    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const itemName = itemSelect.value;
        const area = areaSelect.value;
        const qty = parseInt(document.getElementById('quantity').value);
        
        if (!stockData[itemName]) {
            stockData[itemName] = { stokKasir: 0, stokKitchen: 0, lastUpdated: '' };
        }

        // Eksekusi kalkulasi berdasarkan area input (Kasir / Kitchen)
        if (transactionType === 'add') {
            if (area === 'kasir') stockData[itemName].stokKasir += qty;
            if (area === 'kitchen') stockData[itemName].stokKitchen += qty;
        } else if (transactionType === 'reduce') {
            if (area === 'kasir') {
                if (stockData[itemName].stokKasir < qty) { alert('Stok kasir tidak mencukupi!'); return; }
                stockData[itemName].stokKasir -= qty;
            }
            if (area === 'kitchen') {
                if (stockData[itemName].stokKitchen < qty) { alert('Stok kitchen tidak mencukupi!'); return; }
                stockData[itemName].stokKitchen -= qty;
            }
        }

        // Generate Waktu Sinkronisasi
        const now = new Date();
