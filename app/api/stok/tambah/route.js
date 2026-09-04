import { NextResponse } from "next/server";
import { supabaseBackend } from "@/lib/supabase"; // Sesuaikan jalur jika diperlukan

export async function POST(request) {
  try {
    const data = await request.json();
    const { itemId, jumlah, keterangan } = data;

    // 1. Ambil stok lama
    const { data: itemData, error: fetchError } = await supabaseBackend
      .from("item_gudang")
      .select("stok_tersedia")
      .eq("id", itemId)
      .single();

    if (fetchError || !itemData) throw new Error("Gagal mengambil master barang");

    // 2. Hitung stok baru
    const stokBaru = itemData.stok_tersedia + Number(jumlah);

    // 3. Update master barang
    const { error: updateError } = await supabaseBackend
      .from("item_gudang")
      .update({ stok_tersedia: stokBaru })
      .eq("id", itemId);

    if (updateError) throw updateError;

    // 4. Catat ke tabel riwayat_stok
    const { error: insertError } = await supabaseBackend
      .from("riwayat_stok")
      .insert([{
          item_id: itemId,
          jenis_transaksi: "Masuk",
          jumlah: Number(jumlah),
          keterangan: keterangan || ""
      }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: "Sukses!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
        }
