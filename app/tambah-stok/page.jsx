"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Koneksi frontend menggunakan ANON KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HalamanTambahStok() {
  const [daftarItem, setDaftarItem] = useState([]);
  const [itemId, setItemId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ambil daftar barang dari database
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from("item_gudang").select("id, nama_item");
      if (!error && data) {
        setDaftarItem(data);
      }
    };
    fetchItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/stok/tambah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, jumlah: Number(jumlah), keterangan }),
      });

      if (response.ok) {
        alert("Stok berhasil ditambahkan!");
        setJumlah("");
        setKeterangan("");
      } else {
        alert("Gagal menambahkan stok.");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md p-6 mx-auto mt-10 bg-white border rounded-lg shadow-sm text-black">
      <h2 className="mb-4 text-xl font-bold">Form Penambahan Stok</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-semibold">Pilih Barang</label>
          <select
            required
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">-- Pilih --</option>
            {daftarItem.map((item) => (
              <option key={item.id} value={item.id}>{item.nama_item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-semibold">Jumlah Tambah</label>
          <input
            type="number"
            required min="1"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-semibold">Keterangan / Referensi</label>
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Misal: Suplier pagi"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !itemId}
          className="w-full p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Menyimpan..." : "Simpan Penambahan"}
        </button>
      </form>
    </div>
  );
    }
