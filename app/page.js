'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const UNITS = ['kg', 'gr', 'pcs', 'pack'];

const ROLES = {
  admin: 'Admin',
  store_leader: 'Store Leader',
  team_leader: 'Team Leader',
  crew: 'Crew',
};

const baseUnit = (p) => p?.base_unit || p?.unit || 'pcs';

const fmt = (n) =>
  Number(n || 0).toLocaleString('id-ID', {
    maximumFractionDigits: 3,
  });

const unitMap = (p) => ({
  [baseUnit(p)]: 1,

  ...(p?.unit_1 && p?.unit_1_per_base
    ? { [p.unit_1]: Number(p.unit_1_per_base) }
    : {}),

  ...(p?.unit_2 && p?.unit_2_per_base
    ? { [p.unit_2]: Number(p.unit_2_per_base) }
    : {}),

  ...(p?.unit_3 && p?.unit_3_per_base
    ? { [p.unit_3]: Number(p.unit_3_per_base) }
    : {}),
});

const toBase = (qty, unit, p) =>
  Number(qty || 0) * Number(unitMap(p)[unit] || 1);

const fromBase = (qty, unit, p) => {
  const factor = Number(unitMap(p)[unit] || 1);
  return factor > 0 ? Number(qty || 0) / factor : 0;
};

const canLeader = (role) =>
  ['admin', 'store_leader', 'team_leader'].includes(role);

const canAdmin = (role) => role === 'admin';

const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [tab, setTab] = useState('dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setStores([]);
      setSelectedStoreId('');
      return;
    }

    loadProfile();
  }, [session]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,full_name,role,store_id,active,stores(name,code)'
      )
      .eq('id', session.user.id)
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setProfile(data);

    setTab(
      data.role === 'crew'
        ? 'crew-stock'
        : 'dashboard'
    );

    if (data.role === 'admin') {
      const {
        data: storeRows,
        error: storeError,
      } = await supabase
        .from('stores')
        .select('id,name,code')
        .eq('active', true)
        .order('name');

      if (storeError) {
        setMsg(storeError.message);
      } else {
        setStores(storeRows || []);

        setSelectedStoreId(
          (current) =>
            current ||
            storeRows?.[0]?.id ||
            ''
        );
      }
    } else {
      setSelectedStoreId(data.store_id || '');
    }
  }

  async function login(e) {
    e.preventDefault();

    setBusy(true);
    setMsg('');

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setMsg(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setTab('dashboard');
  }

  if (!session) {
    return (
      <Login
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        login={login}
        busy={busy}
        msg={msg}
      />
    );
  }

  const role = profile?.role;
  const isCrew = role === 'crew';

  const storeId =
    role === 'admin'
      ? selectedStoreId
      : profile?.store_id;

  const menu = isCrew
    ? [
        ['dashboard', 'Dashboard'],
        ['crew-stock', 'Stok'],
        ['stockin', 'Input Gudang'],
        ['transfer', 'Output Gudang'],
        ['crew-opname', 'SO Operasional'],
        ['crew-history', 'Riwayat Saya'],
      ]
    : [
        ['dashboard', 'Dashboard'],
        ['stockin', 'Input Gudang'],
        ['warehouse', 'Stok'],
        ['transfer', 'Output Gudang'],
        ['opname', 'SO Operasional'],
        ['history', 'Riwayat'],
        ['sales', 'Posting Penjualan'],
        ['reports', 'Report'],

        ...(canLeader(role)
          ? [
              ['recipes', 'Master Recipe'],
              ['revise', 'Revisi'],
            ]
          : []),

        ...(canAdmin(role)
          ? [
              ['products', 'Master Produk'],
              ['pics', 'Master PIC'],
              ['users', 'User / Role'],
            ]
          : []),
      ];

  return (
    <div
      className={
        'shell ' +
        (isCrew ? 'crew-shell' : '')
      }
    >
      <aside>
        <div className="sidebrand">
          <b>RCM</b>
          <span>Management Stock</span>
        </div>

        <nav>
          {menu.map(([id, label]) => (
            <button
              key={id}
              className={
                tab === id ? 'active' : ''
              }
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          className="logout"
          onClick={logout}
        >
          Keluar
        </button>
      </aside>

      <main className="content">
        <header>
          <div>
            <small>STORE</small>

            {role === 'admin' ? (
              <select
                value={selectedStoreId}
                onChange={(e) =>
                  setSelectedStoreId(
                    e.target.value
                  )
                }
              >
                {stores.map((store) => (
                  <option
                    key={store.id}
                    value={store.id}
                  >
                    {store.name} ({store.code})
                  </option>
                ))}
              </select>
            ) : (
              <h2>
                {profile?.stores?.name ||
                  'LC Rancamanyar'}
              </h2>
            )}
          </div>

          <div className="user">
            {profile?.full_name ||
              session.user.email}

            <small>
              {ROLES[role] || role}
            </small>
          </div>
        </header>

        {msg && (
          <div className="error top-error">
            {msg}
          </div>
        )}

        <section>
          {tab === 'dashboard' && (
            <Dashboard
              storeId={storeId}
              setTab={setTab}
            />
          )}

          {(tab === 'warehouse' ||
            tab === 'crew-stock') && (
            <StockView
              storeId={storeId}
            />
          )}

          {tab === 'stockin' && (
            <StockIn
              storeId={storeId}
            />
          )}

          {tab === 'transfer' && (
            <OutputGudang
              storeId={storeId}
            />
          )}

          {(tab === 'opname' ||
            tab === 'crew-opname') && (
            <SOOperasional
              storeId={storeId}
            />
          )}

          {tab === 'history' &&
            !isCrew && (
              <History
                storeId={storeId}
              />
            )}

          {tab === 'crew-history' && (
            <MyHistory
              storeId={storeId}
            />
          )}

          {tab === 'sales' &&
            canLeader(role) && (
              <PostingPenjualan
                storeId={storeId}
              />
            )}

          {tab === 'reports' &&
            canLeader(role) && (
              <Reports
                storeId={storeId}
              />
            )}

          {tab === 'recipes' &&
            canLeader(role) && (
              <Recipes
                storeId={storeId}
              />
            )}

          {tab === 'revise' &&
            canLeader(role) && (
              <Revision
                storeId={storeId}
              />
            )}

          {tab === 'products' &&
            canAdmin(role) && (
              <Products />
            )}

          {tab === 'pics' &&
            canAdmin(role) && (
              <Pics
                storeId={storeId}
              />
            )}

          {tab === 'users' &&
            canAdmin(role) && (
              <Users />
            )}
        </section>
      </main>
    </div>
  );
}

function Login({
  email,
  password,
  setEmail,
  setPassword,
  login,
  busy,
  msg,
}) {
  return (
    <main className="login">
      <div className="brand">
        <div className="logo">RCM</div>

        <h1>Management Stock</h1>

        <p>LC Rancamanyar</p>

        <form
          onSubmit={login}
          className="card"
        >
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </label>

          <button disabled={busy}>
            {busy
              ? 'Memproses…'
              : 'Masuk'}
          </button>

          {msg && (
            <div className="error">
              {msg}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}

function useData(storeId) {
  const [products, setProducts] =
    useState([]);

  const [states, setStates] =
    useState([]);

  const [pics, setPics] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function load() {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [
      { data: p, error: pe },
      { data: s, error: se },
      { data: pc, error: ce },
    ] = await Promise.all([
      supabase
        .from('products')
        .select(
          'id,code,name,category,unit,min_stock,max_stock,active,base_unit,unit_1,unit_1_per_base,unit_2,unit_2_per_base,unit_3,unit_3_per_base'
        )
        .eq('active', true)
        .order('name'),

      supabase
        .from('stock_control')
        .select('*')
        .eq('store_id', storeId),

      supabase
        .from('master_pics')
        .select(
          'id,name,active'
        )
        .eq('store_id', storeId)
        .eq('active', true)
        .order('name'),
    ]);

    if (pe || se || ce) {
      setError(
        (pe || se || ce).message
      );
    }

    setProducts(p || []);
    setStates(s || []);
    setPics(pc || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    const channel =
      supabase
        .channel(
          'rcm-' + storeId
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stock_control',
            filter:
              'store_id=eq.' +
              storeId,
          },
          load
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'stock_transactions',
            filter:
              'store_id=eq.' +
              storeId,
          },
          load
        );

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [storeId]);

  const items = useMemo(
    () =>
      products.map((p) => {
        const s =
          states.find(
            (x) =>
              x.product_id === p.id
          ) || {};

        const warehouse =
          Number(
            s.warehouse_qty || 0
          );

        const operational =
          Number(
            s.operational_qty || 0
          );

        const ending =
          warehouse + operational;

        const opening =
          Number(
            s.opening_qty ??
              ending
          );

        const usage =
          Number(
            s.usage_qty ??
              (opening - ending)
          );

        return {
          ...p,
          warehouse_qty: warehouse,
          operational_qty:
            operational,
          opening_qty: opening,
          usage_qty: usage,
          ending_qty: ending,
          last_so_at:
            s.last_so_at || null,
        };
      }),
    [products, states]
  );

  return {
    items,
    pics,
    loading,
    error,
    reload: load,
  };
}

function Page({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="notice">
      {children}
    </div>
  );
}

function Message({ msg }) {
  if (!msg) return null;

  return (
    <div
      className={
        msg.ok
          ? 'success'
          : 'error'
      }
    >
      {msg.text}
    </div>
  );
}

function UnitSelect({
  value,
  onChange,
  p,
}) {
  const units = [
    ...new Set(
      Object.keys(unitMap(p))
    ),
  ];

  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      required
    >
      {units.map((unit) => (
        <option
          key={unit}
          value={unit}
        >
          {unit}
        </option>
      ))}
    </select>
  );
}

function PicSelect({
  pics,
  value,
  onChange,
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      required
    >
      <option value="">
        Pilih nama PIC
      </option>

      {pics.map((pic) => (
        <option
          key={pic.id}
          value={pic.id}
        >
          {pic.name}
        </option>
      ))}
    </select>
  );
}

function StockView({
  storeId,
}) {
  const [start, setStart] =
    useState(today());

  const [end, setEnd] =
    useState(today());

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function load() {
    if (!storeId) return;

    setLoading(true);
    setError('');

    const {
      data,
      error,
    } = await supabase.rpc(
      'rcm_stock_report',
      {
        p_store_id: storeId,
        p_start_date: start,
        p_end_date: end,
      }
    );

    if (error) {
      setError(error.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  return (
    <Page
      title="Stok"
      subtitle="Stok awal, penjualan, pemakaian, selisih dan stok akhir dalam Base Unit"
    >
      <Notice>
        <b>Selisih = Penjualan − Pemakaian.</b>
        <br />
        Nilai positif berarti penjualan
        lebih besar daripada pemakaian
        aktual.
      </Notice>

      <div className="card">
        <div className="two">
          <label>
            Dari tanggal

            <input
              type="date"
              value={start}
              onChange={(e) =>
                setStart(
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Sampai tanggal

            <input
              type="date"
              value={end}
              onChange={(e) =>
                setEnd(
                  e.target.value
                )
              }
            />
          </label>
        </div>

        <button
          onClick={load}
          disabled={loading}
        >
          {loading
            ? 'Memuat…'
            : 'Tampilkan'}
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Base</th>
              <th>Stok Awal</th>
              <th>Penjualan</th>
              <th>Pemakaian</th>
              <th>Selisih</th>
              <th>Stok Akhir</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.product_id}
              >
                <td>
                  <b>
                    {row.product_name}
                  </b>

                  <small>
                    {row.product_code}
                  </small>
                </td>

                <td>
                  {row.base_unit}
                </td>

                <td>
                  {fmt(
                    row.opening_qty
                  )}
                </td>

                <td>
                  {fmt(
                    row.sales_qty
                  )}
                </td>

                <td>
                  {fmt(
                    row.usage_qty
                  )}
                </td>

                <td
                  className={
                    Number(
                      row.selisih_qty
                    ) < 0
                      ? 'negative'
                      : ''
                  }
                >
                  {fmt(
                    row.selisih_qty
                  )}
                </td>

                <td>
                  <b>
                    {fmt(
                      row.ending_qty
                    )}
                  </b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
  }
function Dashboard({ storeId, setTab }) {
  const { items, loading, error } =
    useData(storeId);

  const summary = useMemo(() => {
    const total = items.length;

    const low = items.filter((p) => {
      const min = Number(p.min_stock || 0);
      return (
        min > 0 &&
        Number(p.ending_qty || 0) <= min
      );
    }).length;

    const out = items.filter(
      (p) =>
        Number(p.ending_qty || 0) <= 0
    ).length;

    const warehouse = items.reduce(
      (a, p) =>
        a + Number(p.warehouse_qty || 0),
      0
    );

    const operational = items.reduce(
      (a, p) =>
        a + Number(p.operational_qty || 0),
      0
    );

    return {
      total,
      low,
      out,
      warehouse,
      operational,
    };
  }, [items]);

  return (
    <Page
      title="Dashboard"
      subtitle="Ringkasan kondisi stok store"
    >
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="stats">
        <div
          className="stat"
          onClick={() => setTab('warehouse')}
        >
          <small>Total Produk</small>
          <strong>
            {loading ? '…' : summary.total}
          </strong>
        </div>

        <div
          className="stat"
          onClick={() => setTab('warehouse')}
        >
          <small>Stok Menipis</small>
          <strong>
            {loading ? '…' : summary.low}
          </strong>
        </div>

        <div
          className="stat"
          onClick={() => setTab('warehouse')}
        >
          <small>Stock Out</small>
          <strong>
            {loading ? '…' : summary.out}
          </strong>
        </div>

        <div className="stat">
          <small>Stok Gudang</small>
          <strong>
            {loading
              ? '…'
              : fmt(summary.warehouse)}
          </strong>
        </div>

        <div className="stat">
          <small>Stok Operasional</small>
          <strong>
            {loading
              ? '…'
              : fmt(summary.operational)}
          </strong>
        </div>
      </div>

      <div className="card">
        <h3>Alur Stok</h3>

        <div className="flow">
          <div>
            <b>Input Gudang</b>
            <span>
              Menambah stok gudang
            </span>
          </div>

          <div>→</div>

          <div>
            <b>Output Gudang</b>
            <span>
              Gudang → Operasional
            </span>
          </div>

          <div>→</div>

          <div>
            <b>Pemakaian</b>
            <span>
              SO / pemakaian aktual
            </span>
          </div>

          <div>→</div>

          <div>
            <b>Penjualan</b>
            <span>
              Rekap POS
            </span>
          </div>
        </div>
      </div>
    </Page>
  );
}

function TransactionForm({
  storeId,
  mode,
}) {
  const { items, pics, loading, error } =
    useData(storeId);

  const isInput = mode === 'input';

  const [productId, setProductId] =
    useState('');

  const [picId, setPicId] =
    useState('');

  const [qty, setQty] =
    useState('');

  const [unit, setUnit] =
    useState('');

  const [note, setNote] =
    useState('');

  const [msg, setMsg] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const product = items.find(
    (p) => p.id === productId
  );

  useEffect(() => {
    if (!product) {
      setUnit('');
      return;
    }

    setUnit(baseUnit(product));
  }, [productId]);

  async function submit(e) {
    e.preventDefault();

    if (!storeId || !productId) {
      setMsg({
        ok: false,
        text: 'Store dan produk wajib dipilih.',
      });
      return;
    }

    if (!picId) {
      setMsg({
        ok: false,
        text: 'PIC wajib dipilih.',
      });
      return;
    }

    if (Number(qty) <= 0) {
      setMsg({
        ok: false,
        text: 'Qty harus lebih dari 0.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    const rpc = isInput
      ? 'rcm_input_gudang'
      : 'rcm_output_gudang';

    const { error } =
      await supabase.rpc(rpc, {
        p_store_id: storeId,
        p_product_id: productId,
        p_pic_id: picId,
        p_qty: Number(qty),
        p_unit: unit,
        p_note: note || null,
      });

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setMsg({
        ok: true,
        text: isInput
          ? 'Input gudang berhasil disimpan.'
          : 'Output gudang berhasil disimpan.',
      });

      setQty('');
      setNote('');
    }

    setBusy(false);
  }

  return (
    <Page
      title={
        isInput
          ? 'Input Gudang'
          : 'Output Gudang'
      }
      subtitle={
        isInput
          ? 'Menambahkan stok ke gudang'
          : 'Memindahkan stok dari gudang ke operasional'
      }
    >
      {loading && (
        <Notice>
          Memuat data produk…
        </Notice>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <form
        className="card form"
        onSubmit={submit}
      >
        <label>
          Produk

          <select
            value={productId}
            onChange={(e) =>
              setProductId(
                e.target.value
              )
            }
            required
          >
            <option value="">
              Pilih produk
            </option>

            {items.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          PIC

          <PicSelect
            pics={pics}
            value={picId}
            onChange={setPicId}
          />
        </label>

        <div className="two">
          <label>
            Qty

            <input
              type="number"
              step="any"
              min="0"
              value={qty}
              onChange={(e) =>
                setQty(e.target.value)
              }
              required
            />
          </label>

          <label>
            Satuan

            <UnitSelect
              p={product}
              value={
                unit ||
                baseUnit(product)
              }
              onChange={setUnit}
            />
          </label>
        </div>

        {product && (
          <Notice>
            Base Unit:{' '}
            <b>
              {baseUnit(product)}
            </b>

            <br />

            Qty Base:{' '}
            <b>
              {fmt(
                toBase(
                  qty,
                  unit ||
                    baseUnit(product),
                  product
                )
              )}
            </b>
          </Notice>
        )}

        <label>
          Catatan

          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            rows={3}
            placeholder="Opsional"
          />
        </label>

        <button disabled={busy}>
          {busy
            ? 'Menyimpan…'
            : 'Simpan'}
        </button>

        <Message msg={msg} />
      </form>
    </Page>
  );
}

function StockIn({
  storeId,
}) {
  return (
    <TransactionForm
      storeId={storeId}
      mode="input"
    />
  );
}

function OutputGudang({
  storeId,
}) {
  return (
    <TransactionForm
      storeId={storeId}
      mode="output"
    />
  );
}

function SOOperasional({
  storeId,
}) {
  const { items, pics, loading, error } =
    useData(storeId);

  const [productId, setProductId] =
    useState('');

  const [picId, setPicId] =
    useState('');

  const [section, setSection] =
    useState('Kitchen');

  const [qty, setQty] =
    useState('');

  const [unit, setUnit] =
    useState('');

  const [waste, setWaste] =
    useState('');

  const [note, setNote] =
    useState('');

  const [msg, setMsg] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const product = items.find(
    (p) => p.id === productId
  );

  useEffect(() => {
    if (product) {
      setUnit(baseUnit(product));
    }
  }, [productId]);

  async function submit(e) {
    e.preventDefault();

    if (
      !storeId ||
      !productId ||
      !picId
    ) {
      setMsg({
        ok: false,
        text:
          'Store, produk dan PIC wajib diisi.',
      });
      return;
    }

    if (Number(qty) < 0) {
      setMsg({
        ok: false,
        text:
          'Qty tidak boleh negatif.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    const { error } =
      await supabase.rpc(
        'rcm_so_operasional',
        {
          p_store_id: storeId,
          p_product_id: productId,
          p_pic_id: picId,
          p_section: section,
          p_qty: Number(qty),
          p_unit:
            unit ||
            baseUnit(product),
          p_waste: Number(waste || 0),
          p_note: note || null,
        }
      );

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setMsg({
        ok: true,
        text:
          'SO operasional berhasil disimpan.',
      });

      setQty('');
      setWaste('');
      setNote('');
    }

    setBusy(false);
  }

  return (
    <Page
      title="SO Operasional"
      subtitle="Input stok aktual dan waste operasional"
    >
      {loading && (
        <Notice>
          Memuat data…
        </Notice>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <form
        className="card form"
        onSubmit={submit}
      >
        <label>
          Produk

          <select
            value={productId}
            onChange={(e) =>
              setProductId(
                e.target.value
              )
            }
            required
          >
            <option value="">
              Pilih produk
            </option>

            {items.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          PIC

          <PicSelect
            pics={pics}
            value={picId}
            onChange={setPicId}
          />
        </label>

        <label>
          Section

          <select
            value={section}
            onChange={(e) =>
              setSection(
                e.target.value
              )
            }
          >
            <option value="Kitchen">
              Kitchen
            </option>
            <option value="Cashier">
              Cashier
            </option>
            <option value="Bar">
              Bar
            </option>
            <option value="Other">
              Other
            </option>
          </select>
        </label>

        <div className="two">
          <label>
            Stok Aktual

            <input
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={(e) =>
                setQty(e.target.value)
              }
              required
            />
          </label>

          <label>
            Satuan

            <UnitSelect
              p={product}
              value={
                unit ||
                baseUnit(product)
              }
              onChange={setUnit}
            />
          </label>
        </div>

        <label>
          Waste

          <input
            type="number"
            min="0"
            step="any"
            value={waste}
            onChange={(e) =>
              setWaste(e.target.value)
            }
          />
        </label>

        <label>
          Catatan

          <textarea
            rows={3}
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
          />
        </label>

        <button disabled={busy}>
          {busy
            ? 'Menyimpan…'
            : 'Simpan SO'}
        </button>

        <Message msg={msg} />
      </form>
    </Page>
  );
}

function History({
  storeId,
}) {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function load() {
    if (!storeId) return;

    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('stock_transactions')
      .select(
        'id,transaction_no,transaction_type,area,section,input_qty,input_unit,base_qty,note,created_at,pic_id,products(name,base_unit),master_pics(name)'
      )
      .eq('store_id', storeId)
      .order('created_at', {
        ascending: false,
      })
      .limit(200);

    if (error) {
      setError(error.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  return (
    <Page
      title="Riwayat"
      subtitle="Riwayat transaksi stok store"
    >
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {loading ? (
        <Notice>
          Memuat riwayat…
        </Notice>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No Transaksi</th>
                <th>Produk</th>
                <th>Tipe</th>
                <th>Qty</th>
                <th>Base Qty</th>
                <th>PIC</th>
                <th>Catatan</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {new Date(
                      row.created_at
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </td>

                  <td>
                    {row.transaction_no}
                  </td>

                  <td>
                    {row.products?.name ||
                      '-'}
                  </td>

                  <td>
                    {row.transaction_type}
                  </td>

                  <td>
                    {fmt(
                      row.input_qty
                    )}{' '}
                    {row.input_unit}
                  </td>

                  <td>
                    {fmt(
                      row.base_qty
                    )}
                  </td>

                  <td>
                    {row.master_pics?.name ||
                      '-'}
                  </td>

                  <td>
                    {row.note || '-'}
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="empty"
                  >
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

function MyHistory({
  storeId,
}) {
  return (
    <History
      storeId={storeId}
    />
  );
        }
