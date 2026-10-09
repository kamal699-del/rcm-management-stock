"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from '../lib/supabase';

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

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  danger = false,
}) {
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
      {label && (
        <span className="mb-1 block text-xs font-semibold text-gray-600">
          {label}
        </span>
      )}

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
      {label && (
        <span className="mb-1 block text-xs font-semibold text-gray-600">
          {label}
        </span>
      )}

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
      {label && (
        <span className="mb-1 block text-xs font-semibold text-gray-600">
          {label}
        </span>
      )}

      <textarea
        {...props}
        className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Card({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Notice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      className={cls(
        "mb-4 rounded-xl border px-4 py-3 text-sm",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
      )}
    >
      {error || success}
    </div>
  );
}

function ProductSelect({
  products,
  value,
  onChange,
  label = "Produk",
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    >
      <option value="">Pilih produk</option>

      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.code ? `${p.code} - ` : ""}
          {p.name}
        </option>
      ))}
    </Select>
  );
}

function unitOptions(product) {
  if (!product) return [];

  const result = [];

  const add = (unit, factor) => {
    if (
      unit &&
      Number(factor || 0) > 0 &&
      !result.some((x) => x.unit === unit)
    ) {
      result.push({
        unit,
        factor: Number(factor),
      });
    }
  };

  add(product.base_unit || product.unit, 1);
  add(product.unit_1, product.unit_1_per_base);
  add(product.unit_2, product.unit_2_per_base);
  add(product.unit_3, product.unit_3_per_base);

  return result;
}

function Empty({
  text = "Belum ada data.",
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function Table({
  headers,
  children,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3 py-3 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] =
    useState("");

  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [pics, setPics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState("dashboard");
  const [masterOpen, setMasterOpen] =
    useState(true);

  const role = profile?.role || "";
  const isAdmin = role === "admin";

  const canManage = [
    "admin",
    "store_leader",
    "team_leader",
  ].includes(role);
  const store =
    stores.find(
      (s) => s.id === selectedStoreId
    ) || null;

  const show = (msg) => {
    setError("");
    setSuccess(msg);
  };

  const fail = (msg) => {
    setSuccess("");
    setError(msg);
  };

  async function loadStores() {
    const {
      data,
      error: e,
    } = await supabase
      .from("stores")
      .select(
        "id,code,name,active"
      )
      .order("name");

    if (e) throw e;

    setStores(data || []);

    return data || [];
  }

  async function loadProfile(userId) {
    const {
      data,
      error: e,
    } = await supabase
      .from("profiles")
      .select(
        "id,full_name,role,store_id,active"
      )
      .eq("id", userId)
      .maybeSingle();

    if (e) throw e;

    if (!data) {
      throw new Error(
        "Profil pengguna tidak ditemukan."
      );
    }

    if (!data.active) {
      throw new Error(
        "Akun Anda tidak aktif."
      );
    }

    setProfile(data);

    return data;
  }

  async function loadProducts() {
    const {
      data,
      error: e,
    } = await supabase
      .from("products")
      .select(
        "id,code,name,category,unit,min_stock,max_stock,active,base_unit,unit_1,unit_1_per_base,unit_2,unit_2_per_base,unit_3,unit_3_per_base"
      )
      .order("name");

    if (e) throw e;

    setProducts(data || []);
  }

  async function loadStock(storeId) {
    if (!storeId) {
      setStock([]);
      return;
    }

    const {
      data,
      error: e,
    } = await supabase
      .from("stock_control")
      .select(
        "store_id,product_id,warehouse_qty,operational_qty,opening_qty,usage_qty,last_so_at,updated_at"
      )
      .eq(
        "store_id",
        storeId
      );

    if (e) throw e;

    setStock(data || []);
  }

  async function loadPics(storeId) {
    if (!storeId) {
      setPics([]);
      return;
    }

    const {
      data,
      error: e,
    } = await supabase
      .from("master_pics")
      .select(
        "id,name,active,store_id,created_at"
      )
      .eq(
        "store_id",
        storeId
      )
      .order("name");

    if (e) throw e;

    setPics(data || []);
  }

  async function refreshAll(
    storeId = selectedStoreId
  ) {
    if (!storeId) return;

    await Promise.all([
      loadProducts(),
      loadStock(storeId),
      loadPics(storeId),
    ]);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session: s },
        } =
          await supabase.auth.getSession();

        if (!mounted) return;

        if (!s) {
          setSession(null);
          return;
        }

        setSession(s);

        const [
          p,
          allStores,
        ] = await Promise.all([
          loadProfile(s.user.id),
          loadStores(),
        ]);

        const defaultStore =
          p.role === "admin"
            ? allStores.find(
                (x) => x.active
              )?.id || ""
            : p.store_id || "";

        if (!mounted) return;

        setSelectedStoreId(
          defaultStore
        );
      } catch (e) {
        if (mounted) {
          fail(
            e.message ||
              "Gagal memuat aplikasi."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, s) => {
          setSession(s);

          if (!s) {
            setProfile(null);
            setSelectedStoreId("");
          }
        }
      );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;

    refreshAll(
      selectedStoreId
          ).catch((e) =>
      fail(
        e.message ||
          "Gagal memuat data toko."
      )
    );
  }, [selectedStoreId]);

  useEffect(() => {
    if (!selectedStoreId) return;

    const channel =
      supabase
        .channel(
          `rcm-page-${selectedStoreId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "stock_control",
            filter:
              `store_id=eq.${selectedStoreId}`,
          },
          () =>
            loadStock(
              selectedStoreId
            ).catch(() => {})
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "stock_transactions",
            filter:
              `store_id=eq.${selectedStoreId}`,
          },
          () =>
            loadStock(
              selectedStoreId
            ).catch(() => {})
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [selectedStoreId]);

  async function logout() {
    await supabase.auth.signOut();
  }

async function handleLoggedIn(newSession) {
  try {
    setError("");
    setSuccess("");
    setSession(newSession);

    const [p, allStores] = await Promise.all([
      loadProfile(newSession.user.id),
      loadStores(),
    ]);

    const defaultStore =
      p.role === "admin"
        ? allStores.find((s) => s.active)?.id || ""
        : p.store_id || "";

    setSelectedStoreId(defaultStore);
  } catch (e) {
    setProfile(null);
    setSession(null);
    setSelectedStoreId("");
    fail(e.message || "Gagal memuat profil pengguna.");

    await supabase.auth.signOut();
  }
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mb-2 text-lg font-bold">
            RCM Management Stock
          </div>

          <div className="text-sm text-gray-500">
            Memuat aplikasi...
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
  return <Login onLoggedIn={handleLoggedIn} />;
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-bold">
            Profil belum tersedia
          </h1>

          <p className="mb-4 text-sm text-gray-500">
            {error ||
              "Silakan hubungi admin."}
          </p>

          <Button onClick={logout}>
            Keluar
          </Button>
        </div>
      </main>
    );
  }

  const allowedPage =
    page.startsWith("master-")
      ? isAdmin
      : page === "revise"
      ? canManage
      : true;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3">
          <div>
            <div className="text-lg font-extrabold tracking-tight text-blue-700">
              RCM
            </div>

            <div className="text-[11px] font-semibold text-gray-500">
              Management Stock
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                value={
                  selectedStoreId
                }
                onChange={(e) =>
                  setSelectedStoreId(
                    e.target.value
                  )
                }
                className="max-w-44 rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs"
              >
                {stores
                  .filter(
                    (s) => s.active
                  )
                  .map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.code} -{" "}
                      {s.name}
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={logout}
              className="rounded-xl border px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-4 p-3">
        <aside className="hidden w-60 shrink-0 lg:block">
          <Sidebar
            role={role}
            page={page}
            setPage={setPage}
            masterOpen={
              masterOpen
            }
            setMasterOpen={
              setMasterOpen
            }
          />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-3 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold">
                  {pageTitle(page)}
                </h1>

                <p className="mt-1 text-xs text-gray-500">
                  {profile.full_name ||
                    session.user.email}{" "}
                  ·{" "}
                  {roleLabel(role)}{" "}
                  ·{" "}
                  {store
                    ? `${store.code} - ${store.name}`
                    : "Pilih toko"}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 lg:hidden">
            <Sidebar
              mobile
              role={role}
              page={page}
              setPage={setPage}
              masterOpen={
                masterOpen
              }
              setMasterOpen={
                setMasterOpen
              }
            />
          </div>

          <Notice
            error={error}
            success={success}
          />

          {!allowedPage ? (
            <Card title="Akses ditolak">
              <p className="text-sm text-gray-500">
                Menu ini hanya dapat
                digunakan oleh Admin.
              </p>
            </Card>
          ) : (
            <PageContent
              page={page}
              role={role}
              isAdmin={isAdmin}
              canManage={
                canManage
              }
              profile={profile}
              session={session}
              stores={stores}
              selectedStoreId={
                selectedStoreId
              }
              products={products.filter(
                (p) => p.active
              )}
              allProducts={
                products
              }
              stock={stock}
              pics={pics}
              onRefresh={() =>
                refreshAll(
                  selectedStoreId
                )
              }
              onMessage={show}
              onError={fail}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function pageTitle(page) {
  if (page === "dashboard")
    return MENU.dashboard;

  if (page === "stock")
    return MENU.stock;

  if (page === "input")
    return MENU.input;

  if (page === "output")
    return MENU.output;

  if (page === "opname")
    return MENU.opname;

  if (page === "history")
    return MENU.history;

  if (page === "report")
    return MENU.report;

  if (page === "revise")
    return "Revisi Stok";

  if (page === "master-stores")
    return MASTER_MENU.stores;

  if (page === "master-products")
    return MASTER_MENU.products;

  if (page === "master-users")
    return MASTER_MENU.users;

  if (page === "master-shifts")
    return MASTER_MENU.shifts;

  if (page === "master-recipes")
    return MASTER_MENU.recipes;

  if (page === "master-pics")
    return MASTER_MENU.pics;

  return "RCM Management Stock";
}

function roleLabel(role) {
  return (
    {
      admin: "Admin",
      store_leader: "Store Leader",
      team_leader: "Team Leader",
      crew: "Crew",
    }[role] || role
  );
}

function Sidebar({
  role,
  page,
  setPage,
  masterOpen,
  setMasterOpen,
  mobile = false,
}) {
  const isAdmin =
    role === "admin";

  const canManage = [
    "admin",
    "store_leader",
    "team_leader",
  ].includes(role);

  const item = (
    id,
    label
  ) => (
    <button
      key={id}
      onClick={() =>
        setPage(id)
      }
      className={cls(
        "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold",
        page === id
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      {label}
    </button>
  );

  return (
    <nav
      className={cls(
        "space-y-1 rounded-2xl border bg-white p-2 shadow-sm",
        mobile
          ? "grid grid-cols-2 gap-1 sm:grid-cols-3"
          : ""
      )}
    >
      {item(
        "dashboard",
        MENU.dashboard
      )}

      {item(
        "stock",
        MENU.stock
      )}

      {item(
        "input",
        MENU.input
      )}

      {item(
        "output",
        MENU.output
      )}

      {item(
        "opname",
        MENU.opname
      )}

      {item(
        "history",
        MENU.history
      )}

      {item(
        "report",
        MENU.report
      )}

      {canManage &&
        item(
          "revise",
          "Revisi Stok"
        )}

      {isAdmin && (
        <>
          <button
            onClick={() =>
              setMasterOpen(
                !masterOpen
              )
            }
            className={cls(
              "w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-gray-800 hover:bg-gray-100",
              mobile &&
                "col-span-2 sm:col-span-1"
            )}
          >
            Master{" "}
            {masterOpen
              ? "▾"
              : "▸"}
          </button>

          {masterOpen && (
            <div
              className={cls(
                "space-y-1 border-l-2 border-blue-100 pl-2",
                mobile &&
                  "col-span-2 sm:col-span-1"
              )}
            >
              {item(
                "master-stores",
                MASTER_MENU.stores
              )}

              {item(
                "master-products",
                MASTER_MENU.products
              )}

              {item(
                "master-users",
                MASTER_MENU.users
              )}

              {item(
                "master-shifts",
                MASTER_MENU.shifts
              )}

              {item(
                "master-recipes",
                MASTER_MENU.recipes
              )}

              {item(
                "master-pics",
                MASTER_MENU.pics
              )}
            </div>
          )}
        </>
      )}
    </nav>
  );
}

function PageContent(props) {
  const { page } = props;

  if (page === "dashboard")
    return <Dashboard {...props} />;

  if (page === "stock")
    return <StockView {...props} />;

  if (page === "input")
    return <InputGudang {...props} />;

  if (page === "output")
    return <OutputGudang {...props} />;

  if (page === "opname")
    return <Opname {...props} />;

  if (page === "history")
    return <History {...props} />;

  if (page === "report")
    return <Report {...props} />;

  if (page === "revise")
    return <Revision {...props} />;

  if (page === "master-stores")
    return (
      <MasterStores {...props} />
    );

  if (page === "master-products")
    return (
      <Products {...props} />
    );

  if (page === "master-users")
    return (
      <Users {...props} />
    );

  if (page === "master-shifts")
    return (
      <Shifts {...props} />
    );

  if (page === "master-recipes")
    return (
      <Recipes {...props} />
    );

  if (page === "master-pics")
    return (
      <Pics {...props} />
    );

  return (
    <Empty text="Menu belum tersedia." />
  );
}

function Dashboard({ stock, products }) {
  const kpi = useMemo(() => {
    let opening = 0;
    let usage = 0;
    let ending = 0;
    let low = 0;

    for (const row of stock) {
      const warehouse =
        Number(
          row.warehouse_qty || 0
        );

      const operational =
        Number(
          row.operational_qty || 0
        );

      const end =
        warehouse +
        operational;

      const op =
        Number(
          row.opening_qty ??
            end
        );

      const use =
        Number(
          row.usage_qty ??
            op - end
        );

      opening += op;
      usage += use;
      ending += end;

      const product =
  products?.find((p) => p.id === row.product_id);

const min = Number(product?.min_stock ?? 0);

if (min > 0 && end <= min) {
  low++;
}

      if (
        min > 0 &&
        end <= min
      ) {
        low++;
      }
    }

    return {
      opening,
      usage,
      ending,
      low,
    };
  }, [stock, products]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          title="Stok Awal"
          value={fmtQty(
            kpi.opening
          )}
        />

        <Kpi
          title="Pemakaian"
          value={fmtQty(
            kpi.usage
          )}
        />

        <Kpi
          title="Stok Akhir"
          value={fmtQty(
            kpi.ending
          )}
        />

        <Kpi
          title="Menipis"
          value={fmtQty(
            kpi.low
          )}
        />
      </div>

      <Card title="Ringkasan Stok">
        <p className="text-sm text-gray-600">
          Stok Akhir = Stok Gudang +
          Stok Operasional. Setiap
          transaksi baru dicatat
          berdasarkan urutan waktu.
        </p>
      </Card>
    </div>
  );
}

function Kpi({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-2xl font-extrabold">
        {value}
      </div>
    </div>
  );
}

function StockView({
  stock,
  products,
}) {
  const rows = useMemo(
    () =>
      stock.map((s) => {
        const p =
          products.find(
            (x) =>
              x.id ===
              s.product_id
          );

        const ending =
          Number(
            s.warehouse_qty ||
              0
          ) +
          Number(
            s.operational_qty ||
              0
          );

        const opening =
          Number(
            s.opening_qty ??
              ending
          );

        const usage =
          Number(
            s.usage_qty ??
              opening - ending
          );

        return {
          ...s,
          product: p,
          ending,
          opening,
          usage,
        };
      }),
    [stock, products]
  );

  return (
    <Card title="Stok Saat Ini">
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <Table
          headers={[
            "Produk",
            "Base",
            "Stok Awal",
            "Pemakaian",
            "Gudang",
            "Operasional",
            "Stok Akhir",
          ]}
        >
          {rows.map((r) => (
            <tr
              key={
                r.product_id
              }
            >
              <td className="px-3 py-3 font-semibold">
                {r.product?.name ||
                  r.product_id}
              </td>

              <td className="px-3 py-3">
                {r.product?.base_unit ||
                  r.product?.unit ||
                  "-"}
              </td>

              <td className="px-3 py-3">
                {fmtQty(
                  r.opening
                )}
              </td>

              <td className="px-3 py-3">
                {fmtQty(
                  r.usage
                )}
              </td>

              <td className="px-3 py-3">
                {fmtQty(
                  r.warehouse_qty
                )}
              </td>

              <td className="px-3 py-3">
                {fmtQty(
                  r.operational_qty
                )}
              </td>

              <td className="px-3 py-3 font-bold">
                {fmtQty(
                  r.ending
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function InputGudang({
  selectedStoreId,
  products,
  session,
  onRefresh,
  onMessage,
  onError,
}) {
  const [productId, setProductId] =
    useState("");

  const [qty, setQty] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const product =
    products.find(
      (p) => p.id === productId
    );

  const units =
    unitOptions(product);

  useEffect(() => {
    if (
      units.length &&
      !units.some(
        (u) => u.unit === unit
      )
    ) {
      setUnit(
        units[0].unit
      );
    }
  }, [
    productId,
    units.length,
  ]);

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const n = Number(qty);

      if (!selectedStoreId) {
        throw new Error(
          "Toko belum dipilih."
        );
      }

      if (!productId) {
        throw new Error(
          "Pilih produk."
        );
      }

      if (!(n > 0)) {
        throw new Error(
          "Qty harus lebih dari 0."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_input_gudang",
        {
          p_store_id:
            selectedStoreId,
          p_product_id:
            productId,
          p_created_by:
            session.user.id,
          p_qty: n,
          p_unit: unit,
          p_note:
            note || null,
        }
      );

      if (e2) throw e2;

      setQty("");
      setNote("");

      await onRefresh();

      onMessage(
        "Stok gudang berhasil ditambahkan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal input gudang."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Tambah Stok Gudang">
      <form
        onSubmit={save}
        className="grid gap-3 md:grid-cols-2"
      >
        <ProductSelect
          products={products}
          value={productId}
          onChange={
            setProductId
          }
        />

        <Input
            label="Qty"
          type="number"
          step="any"
          value={qty}
          onChange={(e) =>
            setQty(
              e.target.value
            )
          }
        />

        <Select
          label="Satuan"
          value={unit}
          onChange={(e) =>
            setUnit(
              e.target.value
            )
          }
        >
          {units.map((u) => (
            <option
              key={u.unit}
              value={u.unit}
            >
              {u.unit}
            </option>
          ))}
        </Select>

        <Textarea
          label="Catatan"
          value={note}
          onChange={(e) =>
            setNote(
              e.target.value
            )
          }
        />

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Stok Gudang"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function OutputGudang({
  selectedStoreId,
  products,
  session,
  onRefresh,
  onMessage,
  onError,
}) {
  const [productId, setProductId] =
    useState("");

  const [qty, setQty] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const product =
    products.find(
      (p) => p.id === productId
    );

  const units =
    unitOptions(product);

  useEffect(() => {
    if (
      units.length &&
      !units.some(
        (u) => u.unit === unit
      )
    ) {
      setUnit(
        units[0].unit
      );
    }
  }, [
    productId,
    units.length,
  ]);

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const n = Number(qty);

      if (!selectedStoreId) {
        throw new Error(
          "Toko belum dipilih."
        );
      }

      if (!productId) {
        throw new Error(
          "Pilih produk."
        );
      }

      if (!(n > 0)) {
        throw new Error(
          "Qty harus lebih dari 0."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_output_gudang",
        {
          p_store_id:
            selectedStoreId,
          p_product_id:
            productId,
          p_created_by:
            session.user.id,
          p_qty: n,
          p_unit: unit,
          p_note:
            note || null,
        }
      );

      if (e2) throw e2;

      setQty("");
      setNote("");

      await onRefresh();

      onMessage(
        "Stok berhasil dipindahkan dari gudang ke operasional."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal output gudang."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Output Gudang → Operasional">
      <form
        onSubmit={save}
        className="grid gap-3 md:grid-cols-2"
      >
        <ProductSelect
          products={products}
          value={productId}
          onChange={
            setProductId
          }
        />

        <Input
          label="Qty"
          type="number"
          step="any"
          value={qty}
          onChange={(e) =>
            setQty(
              e.target.value
            )
          }
        />

        <Select
          label="Satuan"
          value={unit}
          onChange={(e) =>
            setUnit(
              e.target.value
            )
          }
        >
          {units.map((u) => (
            <option
              key={u.unit}
              value={u.unit}
            >
              {u.unit}
            </option>
          ))}
        </Select>

        <Textarea
          label="Catatan"
          value={note}
          onChange={(e) =>
            setNote(
              e.target.value
            )
          }
        />

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Output Gudang"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Opname({
  selectedStoreId,
  products,
  session,
  pics,
  onRefresh,
  onMessage,
  onError,
}) {
  const [productId, setProductId] =
    useState("");

  const [section, setSection] =
    useState("kitchen");

  const [qty, setQty] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [waste, setWaste] =
    useState("");

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const product =
    products.find(
      (p) => p.id === productId
    );

  const units =
    unitOptions(product);

  useEffect(() => {
    if (
      units.length &&
      !units.some(
        (u) => u.unit === unit
      )
    ) {
      setUnit(
        units[0].unit
      );
    }
  }, [
    productId,
    units.length,
  ]);

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const n = Number(qty);

      if (!selectedStoreId) {
        throw new Error(
          "Toko belum dipilih."
        );
      }

      if (!productId) {
        throw new Error(
          "Pilih produk."
        );
      }

      if (!(n >= 0)) {
        throw new Error(
          "Qty fisik tidak valid."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_so_operasional",
        {
          p_store_id:
            selectedStoreId,
          p_product_id:
            productId,
          p_created_by:
            session.user.id,
          p_section: section,
          p_physical_qty: n,
          p_unit: unit,
          p_waste_qty:
            Number(
              waste || 0
            ),
          p_note:
            note || null,
        }
      );

      if (e2) throw e2;

      setQty("");
      setWaste("");
      setNote("");

      await onRefresh();

      onMessage(
        "SO operasional berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan SO."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="SO Operasional">
      <form
        onSubmit={save}
        className="grid gap-3 md:grid-cols-2"
      >
        <ProductSelect
          products={products}
          value={productId}
          onChange={
            setProductId
          }
        />

        <Select
          label="Section"
          value={section}
          onChange={(e) =>
            setSection(
              e.target.value
            )
          }
        >
          {SECTIONS.map((s) => (
            <option
              key={s}
              value={s}
            >
              {s === "kasir"
                ? "Kasir"
                : "Kitchen"}
            </option>
          ))}
        </Select>

        <Input
          label="Stok Fisik"
          type="number"
          step="any"
          min="0"
          value={qty}
          onChange={(e) =>
            setQty(
              e.target.value
            )
          }
        />

        <Select
          label="Satuan"
          value={unit}
          onChange={(e) =>
            setUnit(
              e.target.value
            )
          }
        >
          {units.map((u) => (
            <option
              key={u.unit}
              value={u.unit}
            >
              {u.unit}
            </option>
          ))}
        </Select>

        <Input
          label="Waste"
          type="number"
          step="any"
          min="0"
          value={waste}
          onChange={(e) =>
            setWaste(
              e.target.value
            )
          }
        />

        <Select
          label="PIC"
          value=""
          onChange={() => {}}
        >
          <option value="">
            PIC dicatat melalui histori transaksi
          </option>

          {pics.map((p) => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.name}
            </option>
          ))}
        </Select>

        <div className="md:col-span-2">
          <Textarea
            label="Catatan"
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value
              )
            }
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Menyimpan..."
              : "Simpan SO"}
          </Button>
        </div>
      </form>

      <p className="mt-3 text-xs text-gray-500">
        Stok awal mengikuti stok akhir
        update sebelumnya berdasarkan
        urutan waktu. Jika ada update
        berikutnya, histori menyimpan
        waktu dan nilai sebelum/sesudah
        transaksi.
      </p>
    </Card>
  );
}

function History({
  selectedStoreId,
  products,
}) {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  async function load() {
    try {
      setLoading(true);

      const {
        data,
        error: e,
      } = await supabase
        .from(
          "stock_transactions"
        )
        .select(
          "id,product_id,area,transaction_type,qty,reference_id,note,created_by,created_at,operational_area,transaction_no,pic_id,input_qty,input_unit,base_qty,section"
        )
        .eq(
          "store_id",
          selectedStoreId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(300);

      if (e) throw e;

      setRows(data || []);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId)
      load();
  }, [selectedStoreId]);

  return (
    <Card
      title="Riwayat Transaksi"
      action={
        <Button onClick={load}>
          Refresh
        </Button>
      }
    >
      {loading ? (
        <Empty text="Memuat..." />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table
          headers={[
            "Waktu",
            "Produk",
            "Jenis",
            "Qty",
            "Area",
            "Catatan",
          ]}
        >
          {rows.map((r) => {
            const p =
              products.find(
                (x) =>
                  x.id ===
                  r.product_id
              );

            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3 py-3">
                  {fmtDate(
                    r.created_at
                  )}
                </td>

                <td className="px-3 py-3 font-semibold">
                  {p?.name ||
                    r.product_id}
                </td>

                <td className="px-3 py-3">
                  {r.transaction_type}
                </td>

                <td className="px-3 py-3">
                  {fmtQty(r.qty)}
                </td>

                <td className="px-3 py-3">
                  {r.section ||
                    r.operational_area ||
                    r.area ||
                    "-"}
                </td>

                <td className="px-3 py-3">
                  {r.note || "-"}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}

function Report({
  selectedStoreId,
}) {
  const [start, setStart] =
    useState(today());

  const [end, setEnd] =
    useState(today());

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [err, setErr] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const {
        data,
        error: e,
      } = await supabase.rpc(
        "rcm_stock_report",
        {
          p_end_date: end,
          p_start_date: start,
          p_store_id:
            selectedStoreId,
        }
      );

      if (e) throw e;

      setRows(data || []);
    } catch (e) {
      setErr(
        e.message ||
          "Gagal mengambil report."
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId)
      load();
  }, [selectedStoreId]);

  return (
    <div className="space-y-4">
      <Card title="Filter Report">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={start}
            onChange={(e) =>
              setStart(
                e.target.value
              )
            }
          />

          <Input
            label="Tanggal Akhir"
            type="date"
            value={end}
            onChange={(e) =>
              setEnd(
                e.target.value
              )
            }
          />

          <div className="flex items-end">
            <Button
              onClick={load}
              disabled={loading}
            >
              {loading
                ? "Memuat..."
                : "Tampilkan Report"}
            </Button>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
      </Card>

      <Card title="Report Stok">
        {rows.length === 0 ? (
          <Empty
            text={
              loading
                ? "Memuat..."
                : "Tidak ada data pada periode tersebut."
            }
          />
        ) : (
          <Table
            headers={[
              "Produk",
              "Base",
              "Stok Awal",
              "Pemakaian",
              "Stok Akhir",
              "Penjualan",
              "Selisih",
            ]}
          >
            {rows.map((r) => (
              <tr
                key={
                  r.product_id
                }
              >
                <td className="px-3 py-3 font-semibold">
                  {r.product_name}
                </td>

                <td className="px-3 py-3">
                  {r.base_unit}
                </td>

                <td className="px-3 py-3">
                  {fmtQty(
                    r.opening_qty
                  )}
                </td>

                <td className="px-3 py-3">
                  {fmtQty(
                    r.usage_qty
                  )}
                </td>

                <td className="px-3 py-3 font-bold">
                  {fmtQty(
                    r.ending_qty
                  )}
                </td>

                <td className="px-3 py-3">
                  {fmtQty(
                    r.sales_qty
                  )}
                </td>

                <td
                  className={cls(
                    "px-3 py-3 font-bold",
                    Number(
                      r.selisih_qty
                    ) < 0
                      ? "text-red-600"
                      : "text-green-600"
                  )}
                >
                  {fmtQty(
                    r.selisih_qty
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Revision({
  selectedStoreId,
  products,
  session,
  onRefresh,
  onMessage,
  onError,
}) {
  const [productId, setProductId] =
    useState("");

  const [qty, setQty] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function save(e) {
    e.preventDefault();

    try {
      setSaving(true);

      if (!productId) {
        throw new Error(
          "Pilih produk."
        );
      }

      const n = Number(qty);

      if (!(n >= 0)) {
        throw new Error(
          "Qty tidak valid."
        );
      }

      if (!reason.trim()) {
        throw new Error(
          "Alasan revisi wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "record_operational_stock_revision",
        {
          p_store_id:
            selectedStoreId,
          p_product_id:
            productId,
          p_new_qty: n,
          p_note:
            reason.trim(),
          p_created_by:
            session.user.id,
        }
      );

      if (e2) throw e2;

      setQty("");
      setReason("");

      await onRefresh();

      onMessage(
        "Revisi stok berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "RPC revisi tidak cocok dengan schema saat ini. Silakan cek fungsi record_operational_stock_revision di Supabase."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Revisi Stok Operasional">
      <form
        onSubmit={save}
        className="grid gap-3 md:grid-cols-2"
      >
        <ProductSelect
          products={products}
          value={productId}
          onChange={
            setProductId
          }
        />

        <Input
          label="Stok Operasional Baru"
          type="number"
          step="any"
          min="0"
          value={qty}
          onChange={(e) =>
            setQty(
              e.target.value
            )
          }
        />

        <div className="md:col-span-2">
          <Textarea
            label="Alasan Revisi"
            value={reason}
            onChange={(e) =>
              setReason(
                e.target.value
              )
            }
            required
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Menyimpan..."
              : "Simpan Revisi"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function MasterStores({
  stores: initialStores,
  onMessage,
  onError,
}) {
  const [stores, setStores] =
    useState(
      initialStores || []
    );

  const [form, setForm] =
    useState({
      id: "",
      code: "",
      name: "",
      active: true,
    });

  async function load() {
    const {
      data,
      error: e,
    } = await supabase
      .from("stores")
      .select(
        "id,code,name,active"
      )
      .order("name");

    if (e) throw e;

    setStores(data || []);
  }

  async function save(e) {
    e.preventDefault();

    try {
      if (
        !form.code.trim() ||
        !form.name.trim()
      ) {
        throw new Error(
          "Kode dan nama toko wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_admin_save_store",
        {
          p_store_id:
            form.id || null,
          p_code:
            form.code.trim(),
          p_name:
            form.name.trim(),
          p_active:
            form.active,
        }
      );

      if (e2) throw e2;

      setForm({
        id: "",
        code: "",
        name: "",
        active: true,
      });

      await load();

      onMessage(
        "Master toko berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan toko."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={
          form.id
            ? "Edit Toko"
            : "Tambah Toko"
        }
      >
        <form
          onSubmit={save}
          className="grid gap-3 md:grid-cols-3"
        >
          <Input
            label="Kode"
            value={form.code}
            onChange={(e) =>
              setForm({
                ...form,
                code:
                  e.target.value,
              })
            }
          />
                        <Input
            label="Nama Toko"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name:
                  e.target.value,
              })
            }
          />

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={
                form.active
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  active:
                    e.target.checked,
                })
              }
            />
            Aktif
          </label>

          <div className="md:col-span-3 flex gap-2">
            <Button type="submit">
              Simpan
            </Button>

            {form.id && (
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() =>
                  setForm({
                    id: "",
                    code: "",
                    name: "",
                    active: true,
                  })
                }
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Daftar Toko">
        <Table
          headers={[
            "Kode",
            "Nama",
            "Status",
            "Aksi",
          ]}
        >
          {stores.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-3">
                {s.code}
              </td>

              <td className="px-3 py-3 font-semibold">
                {s.name}
              </td>

              <td className="px-3 py-3">
                {s.active
                  ? "Aktif"
                  : "Nonaktif"}
              </td>

              <td className="px-3 py-3">
                <button
                  className="text-sm font-semibold text-blue-600"
                  onClick={() =>
                    setForm({
                      id: s.id,
                      code:
                        s.code || "",
                      name:
                        s.name || "",
                      active:
                        !!s.active,
                    })
                  }
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function Products({
  allProducts,
  onRefresh,
  onMessage,
  onError,
}) {
  const blank = {
    id: "",
    code: "",
    name: "",
    category: "",
    base_unit: "pcs",
    unit: "pcs",
    unit_1: "",
    unit_1_per_base: "",
    unit_2: "",
    unit_2_per_base: "",
    unit_3: "",
    unit_3_per_base: "",
    min_stock: "0",
    max_stock: "0",
    active: true,
  };

  const [form, setForm] =
    useState(blank);

  function set(k, v) {
    setForm((x) => ({
      ...x,
      [k]: v,
    }));
  }

  function edit(p) {
    setForm({
      id: p.id,
      code: p.code || "",
      name: p.name || "",
      category:
        p.category || "",
      base_unit:
        p.base_unit ||
        p.unit ||
        "pcs",
      unit:
        p.unit ||
        p.base_unit ||
        "pcs",
      unit_1:
        p.unit_1 || "",
      unit_1_per_base:
        p.unit_1_per_base ??
        "",
      unit_2:
        p.unit_2 || "",
      unit_2_per_base:
        p.unit_2_per_base ??
        "",
      unit_3:
        p.unit_3 || "",
      unit_3_per_base:
        p.unit_3_per_base ??
        "",
      min_stock:
        p.min_stock ??
        "0",
      max_stock:
        p.max_stock ??
        "0",
      active:
        !!p.active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function save(e) {
    e.preventDefault();

    try {
      if (
        !form.code.trim() ||
        !form.name.trim()
      ) {
        throw new Error(
          "Kode dan nama produk wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_save_product",
        {
          p_active:
            form.active,
          p_base_unit:
            form.base_unit,
          p_category:
            form.category ||
            null,
          p_code:
            form.code.trim(),
          p_id:
            form.id || null,
          p_max_stock:
            Number(
              form.max_stock || 0
            ),
          p_min_stock:
            Number(
              form.min_stock || 0
            ),
          p_name:
            form.name.trim(),
          p_unit:
            form.unit ||
            form.base_unit,
          p_unit_1:
            form.unit_1 ||
            null,
          p_unit_1_per_base:
            form.unit_1
              ? Number(
                  form.unit_1_per_base ||
                    0
                )
              : null,
          p_unit_2:
            form.unit_2 ||
            null,
          p_unit_2_per_base:
            form.unit_2
              ? Number(
                  form.unit_2_per_base ||
                    0
                )
              : null,
          p_unit_3:
            form.unit_3 ||
            null,
          p_unit_3_per_base:
            form.unit_3
              ? Number(
                  form.unit_3_per_base ||
                    0
                )
              : null,
        }
      );

      if (e2) throw e2;

      setForm(blank);

      await onRefresh();

      onMessage(
        "Master produk berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan produk."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={
          form.id
            ? "Edit Produk"
            : "Tambah Produk"
        }
      >
        <form
          onSubmit={save}
          className="grid gap-3 md:grid-cols-3"
        >
          <Input
            label="Kode Produk"
            value={form.code}
            onChange={(e) =>
              set(
                "code",
                e.target.value
              )
            }
          />

          <Input
            label="Nama Produk"
            value={form.name}
            onChange={(e) =>
              set(
                "name",
                e.target.value
              )
            }
          />

          <Input
            label="Kategori"
            value={
              form.category
            }
            onChange={(e) =>
              set(
                "category",
                e.target.value
              )
            }
          />

          <Input
            label="Base Unit"
            value={
              form.base_unit
            }
            onChange={(e) =>
              set(
                "base_unit",
                e.target.value
              )
            }
          />

          <Input
            label="Unit Utama"
            value={form.unit}
            onChange={(e) =>
              set(
                "unit",
                e.target.value
              )
            }
          />

          <Input
            label="Min Stock"
            type="number"
            step="any"
            value={
              form.min_stock
            }
            onChange={(e) =>
              set(
                "min_stock",
                e.target.value
              )
            }
          />

          <Input
            label="Max Stock"
            type="number"
            step="any"
            value={
              form.max_stock
            }
            onChange={(e) =>
              set(
                "max_stock",
                e.target.value
              )
            }
          />

          <div className="rounded-xl border p-3">
            <div className="mb-2 text-xs font-bold text-gray-600">
              Unit 1
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={
                  form.unit_1
                }
                placeholder="kg/gr/pcs"
                onChange={(e) =>
                  set(
                    "unit_1",
                    e.target.value
                  )
                }
              />

              <Input
                type="number"
                step="any"
                placeholder="per base"
                value={
                  form.unit_1_per_base
                }
                onChange={(e) =>
                  set(
                    "unit_1_per_base",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="mb-2 text-xs font-bold text-gray-600">
              Unit 2
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={
                  form.unit_2
                }
                placeholder="kg/gr/pcs"
                onChange={(e) =>
                  set(
                    "unit_2",
                    e.target.value
                  )
                }
              />

              <Input
                type="number"
                step="any"
                placeholder="per base"
                value={
                  form.unit_2_per_base
                }
                onChange={(e) =>
                  set(
                    "unit_2_per_base",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="mb-2 text-xs font-bold text-gray-600">
              Unit 3
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={
                  form.unit_3
                }
                placeholder="kg/gr/pcs"
                onChange={(e) =>
                  set(
                    "unit_3",
                    e.target.value
                  )
                }
              />

              <Input
                type="number"
                step="any"
                placeholder="per base"
                value={
                  form.unit_3_per_base
                }
                onChange={(e) =>
                  set(
                    "unit_3_per_base",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={
                form.active
              }
              onChange={(e) =>
                set(
                  "active",
                  e.target.checked
                )
              }
            />
                            Produk aktif
          </label>

          <div className="md:col-span-3 flex gap-2">
            <Button type="submit">
              Simpan Produk
            </Button>

            {form.id && (
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() =>
                  setForm(blank)
                }
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Daftar Produk">
        {allProducts.length ===
        0 ? (
          <Empty />
        ) : (
          <Table
            headers={[
              "Kode",
              "Produk",
              "Kategori",
              "Base",
              "Min",
              "Max",
              "Status",
              "Aksi",
            ]}
          >
            {allProducts.map(
              (p) => (
                <tr key={p.id}>
                  <td className="px-3 py-3">
                    {p.code}
                  </td>

                  <td className="px-3 py-3 font-semibold">
                    {p.name}
                  </td>

                  <td className="px-3 py-3">
                    {p.category ||
                      "-"}
                  </td>

                  <td className="px-3 py-3">
                    {p.base_unit ||
                      p.unit}
                  </td>

                  <td className="px-3 py-3">
                    {fmtQty(
                      p.min_stock
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {fmtQty(
                      p.max_stock
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {p.active
                      ? "Aktif"
                      : "Nonaktif"}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      className="font-semibold text-blue-600"
                      onClick={() =>
                        edit(p)
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            )}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Users({
  stores,
  onMessage,
  onError,
}) {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({
      email: "",
      password: "",
      full_name: "",
      role: "crew",
      store_id: "",
    });

  async function load() {
    try {
      setLoading(true);

      const {
        data,
        error: e,
      } = await supabase
        .from("profiles")
        .select(
          "id,full_name,role,store_id,active,created_at"
        )
        .order("full_name");

      if (e) throw e;

      setRows(data || []);
    } catch (e) {
      onError(
        e.message ||
          "Gagal mengambil user."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e) {
    e.preventDefault();

    try {
      if (
        !form.email ||
        !form.password ||
        !form.full_name
      ) {
        throw new Error(
          "Email, password, dan nama wajib diisi."
        );
      }

      const {
        data,
        error: e2,
      } =
        await supabase.functions.invoke(
          "admin-create-user",
          {
            body: form,
          }
        );

      if (e2) throw e2;

      if (data?.error) {
        throw new Error(
          data.error
        );
      }

      setForm({
        email: "",
        password: "",
        full_name: "",
        role: "crew",
        store_id: "",
      });

      await load();

      onMessage(
        data?.message ||
          "User berhasil dibuat."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal membuat user."
      );
    }
  }

  async function updateUser(
    id,
    patch
  ) {
    try {
      const {
        error: e,
      } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", id);

      if (e) throw e;

      await load();

      onMessage(
        "Data user diperbarui."
      );
    } catch (e) {
      onError(
        e.message ||
          "Gagal memperbarui user."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Tambah Account / User">
        <form
          onSubmit={createUser}
          className="grid gap-3 md:grid-cols-2"
        >
          <Input
            label="Nama Lengkap"
            value={
              form.full_name
            }
            onChange={(e) =>
              setForm({
                ...form,
                full_name:
                  e.target.value,
              })
            }
          />

          <Input
            label="Email Login"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email:
                  e.target.value,
              })
            }
          />

          <Input
            label="Password Awal"
            type="password"
            value={
              form.password
            }
            onChange={(e) =>
              setForm({
                ...form,
                password:
                  e.target.value,
              })
            }
          />

          <Select
            label="Role"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role:
                  e.target.value,
              })
            }
          >
            {ROLES.map((r) => (
              <option
                key={r}
                value={r}
              >
                {roleLabel(r)}
              </option>
            ))}
          </Select>

          <Select
            label="Toko"
            value={
              form.store_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                store_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Tidak ada toko
            </option>

            {stores
              .filter(
                (s) => s.active
              )
              .map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                >
                  {s.code} -{" "}
                  {s.name}
                </option>
              ))}
          </Select>

          <div className="flex items-end">
            <Button type="submit">
              Buat User
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Daftar User">
        {loading ? (
          <Empty text="Memuat..." />
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={[
              "Nama",
              "Role",
              "Toko",
              "Status",
              "Aksi",
            ]}
          >
            {rows.map((u) => {
              const s =
                stores.find(
                  (x) =>
                    x.id ===
                    u.store_id
                );

              return (
                <tr key={u.id}>
                  <td className="px-3 py-3 font-semibold">
                    {u.full_name ||
                      "-"}
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={
                        u.role ||
                        "crew"
                      }
                      onChange={(e) =>
                        updateUser(
                          u.id,
                          {
                            role:
                              e.target
                                .value,
                          }
                        )
                      }
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      {ROLES.map(
                        (r) => (
                          <option
                            key={r}
                            value={r}
                          >
                            {roleLabel(
                              r
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      value={
                        u.store_id ||
                        ""
                      }
                      onChange={(e) =>
                        updateUser(
                          u.id,
                          {
                            store_id:
                              e.target
                                .value ||
                              null,
                          }
                        )
                      }
                      className="max-w-40 rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="">
                        -
                      </option>

                      {stores.map(
                        (x) => (
                          <option
                            key={x.id}
                            value={x.id}
                          >
                            {x.code}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    <button
                      onClick={() =>
                        updateUser(
                          u.id,
                          {
                            active:
                              !u.active,
                          }
                        )
                      }
                      className={cls(
                        "rounded-lg px-2 py-1 text-xs font-bold",
                        u.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {u.active
                        ? "Aktif"
                        : "Nonaktif"}
                    </button>
                  </td>

                  <td className="px-3 py-3 text-xs text-gray-400">
                    {fmtDate(
                      u.created_at
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Shifts({
  stores,
  onMessage,
  onError,
}) {
  const blank = {
    id: "",
    store_id:
      stores.find(
        (s) => s.active
      )?.id || "",
    code: "",
    name: "",
    start_time: "08:00",
    end_time: "17:00",
    active: true,
  };

  const [form, setForm] =
    useState(blank);

  const [rows, setRows] =
    useState([]);

  async function load() {
    const {
      data,
      error: e,
    } = await supabase
      .from("master_shifts")
      .select(
        "id,store_id,code,name,start_time,end_time,active"
      )
      .order("store_id")
      .order("start_time");

    if (e) throw e;

    setRows(data || []);
  }

  useEffect(() => {
    load().catch((e) =>
      onError(
        e.message ||
          "Gagal memuat shift."
      )
    );
  }, []);

  async function save(e) {
    e.preventDefault();

    try {
      if (
        !form.store_id ||
        !form.code ||
        !form.name
      ) {
        throw new Error(
          "Toko, kode, dan nama shift wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_admin_save_shift",
        {
          p_shift_id:
            form.id || null,
          p_store_id:
            form.store_id,
          p_code:
            form.code,
          p_name:
            form.name,
          p_start_time:
            form.start_time,
          p_end_time:
            form.end_time,
          p_active:
            form.active,
        }
      );

      if (e2) throw e2;

      setForm({
        ...blank,
        store_id:
          form.store_id,
      });

      await load();

      onMessage(
        "Master shift berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan shift."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={
          form.id
            ? "Edit Shift"
            : "Tambah Shift"
        }
      >
        <form
          onSubmit={save}
          className="grid gap-3 md:grid-cols-3"
        >
          <Select
            label="Toko"
            value={
              form.store_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                store_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Pilih toko
            </option>

            {stores.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.code} -{" "}
                {s.name}
              </option>
            ))}
          </Select>

          <Input
            label="Kode Shift"
            value={form.code}
            onChange={(e) =>
              setForm({
                ...form,
                code:
                  e.target.value,
              })
            }
          />

          <Input
            label="Nama Shift"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name:
                  e.target.value,
              })
            }
          />

          <Input
            label="Jam Mulai"
            type="time"
            value={
              form.start_time
            }
            onChange={(e) =>
              setForm({
                ...form,
                start_time:
                  e.target.value,
              })
            }
          />

          <Input
            label="Jam Selesai"
            type="time"
            value={
              form.end_time
            }
            onChange={(e) =>
              setForm({
                ...form,
                end_time:
                  e.target.value,
              })
            }
          />

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={
                form.active
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  active:
                    e.target.checked,
                })
              }
            />

            Aktif
          </label>

          <div className="md:col-span-3 flex gap-2">
            <Button type="submit">
              Simpan Shift
            </Button>

            {form.id && (
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() =>
                  setForm({
                    ...blank,
                    store_id:
                      form.store_id,
                  })
                }
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Daftar Shift">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={[
              "Toko",
              "Kode",
              "Nama",
              "Mulai",
              "Selesai",
              "Status",
              "Aksi",
            ]}
          >
            {rows.map((r) => {
              const s =
                stores.find(
                  (x) =>
                    x.id ===
                    r.store_id
                );

              return (
                <tr key={r.id}>
                  <td className="px-3 py-3">
                    {s?.code || "-"}
                  </td>

                  <td className="px-3 py-3">
                    {r.code}
                  </td>

                  <td className="px-3 py-3 font-semibold">
                    {r.name}
                  </td>

                  <td className="px-3 py-3">
                    {r.start_time}
                  </td>

                  <td className="px-3 py-3">
                    {r.end_time}
                  </td>

                  <td className="px-3 py-3">
                    {r.active
                      ? "Aktif"
                      : "Nonaktif"}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      className="font-semibold text-blue-600"
                      onClick={() =>
                        setForm({
                          id: r.id,
                          store_id:
                            r.store_id,
                          code:
                            r.code,
                          name:
                            r.name,
                          start_time:
                            r.start_time?.slice(
                              0,
                              5
                            ) ||
                            "08:00",
                          end_time:
                            r.end_time?.slice(
                              0,
                              5
                            ) ||
                            "17:00",
                          active:
                            !!r.active,
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Recipes({
  stores,
  products,
  onMessage,
  onError,
}) {
  const blank = {
    id: "",
    store_id:
      stores.find(
        (s) => s.active
      )?.id || "",
    menu_code: "",
    menu_name: "",
    product_id: "",
    qty_per_menu: "",
    unit: "",
    active: true,
  };

  const [form, setForm] =
    useState(blank);

  const [rows, setRows] =
    useState([]);

  const [storeFilter, setStoreFilter] =
    useState(
      blank.store_id
    );

  const product =
    products.find(
      (p) =>
        p.id ===
        form.product_id
    );

  const units =
    unitOptions(product);

  useEffect(() => {
    if (
      units.length &&
      !units.some(
        (u) =>
          u.unit ===
          form.unit
      )
    ) {
      setForm((x) => ({
        ...x,
        unit:
          units[0].unit,
      }));
    }
  }, [
    form.product_id,
    units.length,
  ]);

  async function load() {
    let q =
      supabase
        .from(
          "recipe_items"
        )
        .select(
          "id,store_id,menu_code,menu_name,product_id,qty_per_menu,unit,base_qty_per_menu,active,created_at,updated_at"
        )
        .order(
          "menu_code"
        );

    if (storeFilter) {
      q = q.eq(
        "store_id",
        storeFilter
      );
    }

    const {
      data,
      error: e,
    } = await q;

    if (e) throw e;

    setRows(data || []);
  }

  useEffect(() => {
    load().catch((e) =>
      onError(
        e.message ||
          "Gagal memuat recipe."
      )
    );
  }, [storeFilter]);

  async function save(e) {
    e.preventDefault();

    try {
      if (
        !form.store_id ||
        !form.menu_code ||
        !form.menu_name ||
        !form.product_id
      ) {
        throw new Error(
          "Toko, kode menu, nama menu, dan produk wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_save_recipe",
        {
          p_active:
            form.active,
          p_menu_code:
            form.menu_code,
          p_menu_name:
            form.menu_name,
          p_product_id:
            form.product_id,
          p_qty_per_menu:
            Number(
              form.qty_per_menu ||
                0
            ),
          p_store_id:
            form.store_id,
          p_unit:
            form.unit,
        }
      );

      if (e2) throw e2;

      setForm({
        ...blank,
        store_id:
          form.store_id,
      });

      await load();

      onMessage(
        "Master recipe berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan recipe."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={
          form.id
            ? "Edit Recipe"
            : "Tambah Recipe"
        }
      >
        <form
          onSubmit={save}
          className="grid gap-3 md:grid-cols-2"
        >
          <Select
            label="Toko"
            value={
              form.store_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                store_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Pilih toko
            </option>

            {stores.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.code} -{" "}
                {s.name}
              </option>
            ))}
          </Select>

          <Input
            label="Kode Menu POS"
            value={
              form.menu_code
            }
            onChange={(e) =>
              setForm({
                ...form,
                menu_code:
                  e.target.value,
              })
            }
          />

          <Input
            label="Nama Menu"
            value={
              form.menu_name
            }
            onChange={(e) =>
              setForm({
                ...form,
                menu_name:
                  e.target.value,
              })
            }
          />

          <ProductSelect
            products={products}
            value={
              form.product_id
            }
            onChange={(v) =>
              setForm({
                ...form,
                product_id: v,
              })
            }
            label="Produk / Bahan"
          />

          <Input
            label="Qty per Menu"
            type="number"
            step="any"
            min="0"
            value={
              form.qty_per_menu
            }
            onChange={(e) =>
              setForm({
                ...form,
                qty_per_menu:
                  e.target.value,
              })
            }
          />

          <Select
            label="Satuan"
            value={form.unit}
            onChange={(e) =>
              setForm({
                ...form,
                unit:
                  e.target.value,
              })
            }
          >
            {units.map((u) => (
              <option
                key={u.unit}
                value={u.unit}
              >
                {u.unit}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={
                form.active
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  active:
                    e.target.checked,
                })
              }
            />

            Recipe aktif
          </label>

          <div>
            <Button type="submit">
              Simpan Recipe
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Daftar Recipe"
        action={
          <select
            value={
              storeFilter
            }
            onChange={(e) =>
              setStoreFilter(
                e.target.value
              )
            }
            className="rounded-xl border px-3 py-2 text-xs"
          >
            {stores.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.code}
              </option>
            ))}
          </select>
        }
      >
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={[
              "Menu POS",
              "Nama Menu",
              "Produk/Bahan",
              "Qty",
              "Satuan",
              "Status",
              "Aksi",
            ]}
          >
            {rows.map((r) => {
              const p =
                products.find(
                  (x) =>
                    x.id ===
                    r.product_id
                );

              return (
                <tr key={r.id}>
                  <td className="px-3 py-3">
                    {r.menu_code}
                  </td>

                  <td className="px-3 py-3 font-semibold">
                    {r.menu_name}
                  </td>

                  <td className="px-3 py-3">
                    {p?.name ||
                      r.product_id}
                  </td>

                  <td className="px-3 py-3">
                    {fmtQty(
                      r.qty_per_menu
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {r.unit}
                  </td>

                  <td className="px-3 py-3">
                    {r.active
                      ? "Aktif"
                      : "Nonaktif"}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      className="font-semibold text-blue-600"
                      onClick={() =>
                        setForm({
                          id: r.id,
                          store_id:
                            r.store_id,
                          menu_code:
                            r.menu_code,
                          menu_name:
                            r.menu_name,
                          product_id:
                            r.product_id,
                          qty_per_menu:
                            r.qty_per_menu,
                          unit:
                            r.unit,
                          active:
                            !!r.active,
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Pics({
  stores,
  onMessage,
  onError,
}) {
  const blank = {
    id: "",
    store_id:
      stores.find(
        (s) => s.active
      )?.id || "",
    name: "",
    active: true,
  };

  const [form, setForm] =
    useState(blank);

  const [rows, setRows] =
    useState([]);

  async function load() {
    const {
      data,
      error: e,
    } = await supabase
      .from("master_pics")
      .select(
        "id,store_id,name,active,created_at"
      )
      .order("name");

    if (e) throw e;

    setRows(data || []);
  }

  useEffect(() => {
    load().catch((e) =>
      onError(
        e.message ||
          "Gagal memuat PIC."
      )
    );
  }, []);

  async function save(e) {
    e.preventDefault();

    try {
      if (
        !form.store_id ||
        !form.name.trim()
      ) {
        throw new Error(
          "Toko dan nama PIC wajib diisi."
        );
      }

      const {
        error: e2,
      } = await supabase.rpc(
        "rcm_admin_save_pic",
        {
          p_pic_id:
            form.id || null,
          p_store_id:
            form.store_id,
          p_name:
            form.name.trim(),
          p_active:
            form.active,
        }
      );

      if (e2) throw e2;

      setForm({
        ...blank,
        store_id:
          form.store_id,
      });

      await load();

      onMessage(
        "Master PIC berhasil disimpan."
      );
    } catch (e2) {
      onError(
        e2.message ||
          "Gagal menyimpan PIC."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={
          form.id
            ? "Edit PIC"
            : "Tambah PIC"
        }
      >
        <form
          onSubmit={save}
          className="grid gap-3 md:grid-cols-3"
        >
          <Select
            label="Toko"
            value={
              form.store_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                store_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Pilih toko
            </option>

            {stores.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.code} -{" "}
                {s.name}
              </option>
            ))}
          </Select>

          <Input
            label="Nama PIC"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name:
                  e.target.value,
              })
            }
          />

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={
                form.active
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  active:
                    e.target.checked,
                })
              }
            />

            Aktif
          </label>

          <div className="md:col-span-3">
            <Button type="submit">
              Simpan PIC
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Daftar PIC">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={[
              "Toko",
              "Nama PIC",
              "Status",
              "Aksi",
            ]}
          >
            {rows.map((r) => {
              const s =
                stores.find(
                  (x) =>
                    x.id ===
                    r.store_id
                );

              return (
                <tr key={r.id}>
                  <td className="px-3 py-3">
                    {s?.code || "-"}
                  </td>

                  <td className="px-3 py-3 font-semibold">
                    {r.name}
                  </td>

                  <td className="px-3 py-3">
                    {r.active
                      ? "Aktif"
                      : "Nonaktif"}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      className="font-semibold text-blue-600"
                      onClick={() =>
                        setForm({
                          id: r.id,
                          store_id:
                            r.store_id,
                          name:
                            r.name,
                          active:
                            !!r.active,
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

function Login({
  onLoggedIn,
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function login(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const {
        data,
        error: e2,
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password,
          }
        );

      if (e2) throw e2;

      onLoggedIn(
        data.session
      );
    } catch (e2) {
      setError(
        e2.message ||
          "Login gagal."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl font-black text-blue-700">
            RCM
          </div>

          <div className="text-sm font-semibold text-gray-500">
            Management Stock
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={login}
          className="space-y-3"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />

          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Masuk..."
              : "Login"}
          </Button>
        </form>
      </div>
    </main>
  );
                }
