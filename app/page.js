// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const ROLES = ["admin", "store_leader", "team_leader", "crew"];
const SECTIONS = ["kasir", "kitchen"];

const MENU = {
  dashboard: "Dashboard",
  stock: "Stok",
  input: "Input Gudang",
  output: "Output Gudang",
  opname: "SO Operasional",
  history: "Riwayat",
  report: "Report",
};

const MASTER_MENU = {
  stores: "Master Toko",
  products: "Master Produk",
  users: "Master Account",
  shifts: "Master Shift",
  recipes: "Master Recipe",
  pics: "Master PIC",
};

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

function fmtQty(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
  }).format(n);
}

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Button({ children, onClick, type = "button", disabled = false, danger = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls(
        "rounded-xl px-4 py-2 text-sm font-semibold transition",
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-blue-600 text-white hover:bg-blue-700",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>}
      <input
        {...props}
        className={cls(
          "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        )}
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>}
      <select
        {...props}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>}
      <textarea
        {...props}
        className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-3
