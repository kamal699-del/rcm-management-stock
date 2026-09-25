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

      <GlobalStyles />
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
function PostingPenjualan({
  storeId,
}) {
  const [file, setFile] =
    useState(null);

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

  const [periodStart, setPeriodStart] =
    useState('');

  const [periodEnd, setPeriodEnd] =
    useState('');

  function normalizeKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  function findColumn(headers, names) {
    for (const name of names) {
      const found = headers.find(
        (h) =>
          normalizeKey(h) ===
          normalizeKey(name)
      );

      if (found) return found;
    }

    return null;
  }

  function parseDate(value) {
    if (!value) return null;

    if (
      Object.prototype.toString.call(
        value
      ) === '[object Date]'
    ) {
      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return null;
      }

      return value
        .toISOString()
        .slice(0, 10);
    }

    if (
      typeof value === 'number'
    ) {
      const date =
        XLSX.SSF.parse_date_code(
          value
        );

      if (!date) return null;

      return [
        date.y,
        String(date.m).padStart(
          2,
          '0'
        ),
        String(date.d).padStart(
          2,
          '0'
        ),
      ].join('-');
    }

    const text =
      String(value).trim();

    if (
      /^\d{4}-\d{1,2}-\d{1,2}$/.test(
        text
      )
    ) {
      const parts =
        text.split('-');

      return [
        parts[0],
        String(parts[1]).padStart(
          2,
          '0'
        ),
        String(parts[2]).padStart(
          2,
          '0'
        ),
      ].join('-');
    }

    const match =
      text.match(
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
      );

    if (match) {
      return [
        match[3],
        String(match[2]).padStart(
          2,
          '0'
        ),
        String(match[1]).padStart(
          2,
          '0'
        ),
      ].join('-');
    }

    const parsed =
      new Date(text);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed
      .toISOString()
      .slice(0, 10);
  }

  async function sha256(buffer) {
    const hashBuffer =
      await crypto.subtle.digest(
        'SHA-256',
        buffer
      );

    return Array.from(
      new Uint8Array(hashBuffer)
    )
      .map((b) =>
        b
          .toString(16)
          .padStart(2, '0')
      )
      .join('');
  }

  async function readFile(
    selectedFile
  ) {
    setMsg(null);

    if (!selectedFile) {
      setRows([]);
      return;
    }

    setFile(selectedFile);

    try {
      const buffer =
        await selectedFile.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
        });

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          'Sheet Excel tidak ditemukan.'
        );
      }

      const sheet =
        workbook.Sheets[
          sheetName
        ];

      const data =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: '',
          }
        );

      if (!data.length) {
        throw new Error(
          'Data Excel kosong.'
        );
      }

      const headers =
        Object.keys(data[0]);

      const dateColumn =
        findColumn(headers, [
          'tanggal',
          'date',
          'sale_date',
          'tanggal_penjualan',
        ]);

      const menuCodeColumn =
        findColumn(headers, [
          'kode_menu',
          'menu_code',
          'kode',
          'code',
          'plu',
          'item_code',
        ]);

      const menuNameColumn =
        findColumn(headers, [
          'nama_menu',
          'menu_name',
          'nama',
          'menu',
          'item',
          'product_name',
        ]);

      const qtyColumn =
        findColumn(headers, [
          'qty',
          'quantity',
          'jumlah',
          'terjual',
          'sales_qty',
        ]);

      if (
        !menuCodeColumn &&
        !menuNameColumn
      ) {
        throw new Error(
          'Kolom kode menu atau nama menu tidak ditemukan.'
        );
      }

      if (!qtyColumn) {
        throw new Error(
          'Kolom Qty tidak ditemukan.'
        );
      }

      const parsed =
        data
          .map((row, index) => {
            const date =
              dateColumn
                ? parseDate(
                    row[dateColumn]
                  )
                : today();

            const menuCode =
              String(
                menuCodeColumn
                  ? row[
                      menuCodeColumn
                    ]
                  : ''
              ).trim();

            const menuName =
              String(
                menuNameColumn
                  ? row[
                      menuNameColumn
                    ]
                  : ''
              ).trim();

            const rawQty =
              row[qtyColumn];

            const qty =
              Number(
                String(
                  rawQty
                ).replace(
                  /,/g,
                  ''
                )
              );

            return {
              row_number:
                index + 2,
              sale_date:
                date,
              menu_code:
                menuCode ||
                menuName,
              menu_name:
                menuName ||
                menuCode,
              qty,
              raw_data: row,
            };
          })
          .filter(
            (row) =>
              row.menu_code &&
              row.qty !== 0
          );

      if (!parsed.length) {
        throw new Error(
          'Tidak ada data penjualan yang valid.'
        );
      }

      const invalidDate =
        parsed.find(
          (row) =>
            !row.sale_date
        );

      if (invalidDate) {
        throw new Error(
          `Tanggal pada baris ${invalidDate.row_number} tidak valid.`
        );
      }

      const invalidQty =
        parsed.find(
          (row) =>
            !Number.isFinite(
              row.qty
            )
        );

      if (invalidQty) {
        throw new Error(
          `Qty pada baris ${invalidQty.row_number} tidak valid.`
        );
      }

      const dates =
        parsed
          .map(
            (r) =>
              r.sale_date
          )
          .sort();

      setPeriodStart(
        dates[0]
      );

      setPeriodEnd(
        dates[
          dates.length - 1
        ]
      );

      setRows(parsed);

      setMsg({
        ok: true,
        text: `${parsed.length} baris penjualan berhasil dibaca dari Excel.`,
      });
    } catch (error) {
      setRows([]);

      setMsg({
        ok: false,
        text:
          error.message ||
          'Gagal membaca file Excel.',
      });
    }
  }

  async function submit() {
    if (!storeId) {
      setMsg({
        ok: false,
        text:
          'Store belum dipilih.',
      });
      return;
    }

    if (!file) {
      setMsg({
        ok: false,
        text:
          'Silakan pilih file Excel.',
      });
      return;
    }

    if (!rows.length) {
      setMsg({
        ok: false,
        text:
          'Tidak ada data yang akan diposting.',
      });
      return;
    }

    if (
      !periodStart ||
      !periodEnd
    ) {
      setMsg({
        ok: false,
        text:
          'Periode penjualan wajib diisi.',
      });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const buffer =
        await file.arrayBuffer();

      const fileHash =
        await sha256(buffer);

      const payload =
        rows.map((row) => ({
          sale_date:
            row.sale_date,
          menu_code:
            row.menu_code,
          menu_name:
            row.menu_name,
          qty: Number(row.qty),
          raw_data:
            row.raw_data,
        }));

      const { data, error } =
        await supabase.rpc(
          'rcm_post_sales_import',
          {
            p_store_id: storeId,
            p_source_file_name:
              file.name,
            p_file_hash:
              fileHash,
            p_period_start:
              periodStart,
            p_period_end:
              periodEnd,
            p_rows: payload,
          }
        );

      if (error) {
        throw error;
      }

      setMsg({
        ok: true,
        text:
          `Posting penjualan berhasil. ${data?.row_count || rows.length} baris tersimpan.`,
      });

      setFile(null);
      setRows([]);
    } catch (error) {
      setMsg({
        ok: false,
        text:
          error.message ||
          'Posting penjualan gagal.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page
      title="Posting Penjualan"
      subtitle="Upload recap menu penjualan dari aplikasi POS"
    >
      <div className="card">
        <h3>
          Upload Rekap Penjualan
        </h3>

        <p className="muted">
          Format yang didukung:
          XLSX, XLS atau CSV.
        </p>

        <label>
          File POS

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) =>
              readFile(
                e.target.files?.[0]
              )
            }
          />
        </label>

        {file && (
          <Notice>
            File:{' '}
            <b>{file.name}</b>
          </Notice>
        )}

        {rows.length > 0 && (
          <>
            <div className="two">
              <label>
                Periode Mulai

                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) =>
                    setPeriodStart(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Periode Akhir

                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) =>
                    setPeriodEnd(
                      e.target.value
                    )
                  }
                />
              </label>
            </div>

            <Notice>
              Ditemukan{' '}
              <b>
                {rows.length}
              </b>{' '}
              baris penjualan.
            </Notice>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kode Menu</th>
                    <th>Nama Menu</th>
                    <th>Qty</th>
                  </tr>
                </thead>

                <tbody>
                  {rows
                    .slice(0, 100)
                    .map((row, index) => (
                      <tr
                        key={
                          index
                        }
                      >
                        <td>
                          {
                            row.sale_date
                          }
                        </td>

                        <td>
                          {
                            row.menu_code
                          }
                        </td>

                        <td>
                          {
                            row.menu_name
                          }
                        </td>

                        <td>
                          {fmt(
                            row.qty
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {rows.length >
              100 && (
              <small>
                Menampilkan 100 baris
                pertama dari{' '}
                {rows.length}{' '}
                baris.
              </small>
            )}

            <button
              onClick={submit}
              disabled={loading}
            >
              {loading
                ? 'Posting…'
                : 'Posting Penjualan'}
            </button>
          </>
        )}

        <Message msg={msg} />
      </div>
    </Page>
  );
}

function Reports({
  storeId,
}) {
  const [start, setStart] =
    useState(today());

  const [end, setEnd] =
    useState(today());

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

  async function load() {
    if (!storeId) return;

    setLoading(true);
    setMsg(null);

    const { data, error } =
      await supabase.rpc(
        'rcm_stock_report',
        {
          p_store_id: storeId,
          p_start_date: start,
          p_end_date: end,
        }
      );

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setRows(data || []);

      setMsg({
        ok: true,
        text:
          `${data?.length || 0} produk berhasil dimuat.`,
      });
    }

    setLoading(false);
  }

  async function downloadExcel() {
    if (!rows.length) {
      setMsg({
        ok: false,
        text:
          'Tidak ada data untuk didownload.',
      });
      return;
    }

    const exportRows =
      rows.map((row) => ({
        'Kode Produk':
          row.product_code,

        'Nama Produk':
          row.product_name,

        'Base Unit':
          row.base_unit,

        'Stok Awal':
          Number(
            row.opening_qty || 0
          ),

        Penjualan:
          Number(
            row.sales_qty || 0
          ),

        Pemakaian:
          Number(
            row.usage_qty || 0
          ),

        Selisih:
          Number(
            row.selisih_qty || 0
          ),

        'Stok Akhir':
          Number(
            row.ending_qty || 0
          ),
      }));

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportRows
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Report Stok'
    );

    const fileName =
      `RCM-Report-Stok-${start}-${end}.xlsx`;

    XLSX.writeFile(
      workbook,
      fileName
    );
  }

  return (
    <Page
      title="Report"
      subtitle="Report stok dan selisih berdasarkan penjualan POS"
    >
      <div className="card">
        <div className="two">
          <label>
            Dari

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
            Sampai

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

        <div className="actions">
          <button
            onClick={load}
            disabled={loading}
          >
            {loading
              ? 'Memuat…'
              : 'Tampilkan Report'}
          </button>

          <button
            type="button"
            onClick={
              downloadExcel
            }
            disabled={
              !rows.length
            }
          >
            Download Excel
          </button>
        </div>

        <Message msg={msg} />
      </div>

      {rows.length > 0 && (
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
                  key={
                    row.product_id
                  }
                >
                  <td>
                    <b>
                      {
                        row.product_name
                      }
                    </b>

                    <small>
                      {
                        row.product_code
                      }
                    </small>
                  </td>

                  <td>
                    {
                      row.base_unit
                    }
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
      )}
    </Page>
  );
}

function Recipes({
  storeId,
}) {
  const [menus, setMenus] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [recipes, setRecipes] =
    useState([]);

  const [menuCode, setMenuCode] =
    useState('');

  const [menuName, setMenuName] =
    useState('');

  const [productId, setProductId] =
    useState('');

  const [qty, setQty] =
    useState('');

  const [unit, setUnit] =
    useState('');

  const [active, setActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

  async function load() {
    if (!storeId) return;

    setLoading(true);

    const [
      menusResult,
      productsResult,
      recipesResult,
    ] = await Promise.all([
      supabase
        .from('sales_menus')
        .select(
          'id,menu_code,menu_name,active'
        )
        .eq('store_id', storeId)
        .order('menu_code'),

      supabase
        .from('products')
        .select(
          'id,code,name,unit,base_unit,unit_1,unit_1_per_base,unit_2,unit_2_per_base,unit_3,unit_3_per_base'
        )
        .eq('active', true)
        .order('name'),

      supabase
        .from('recipe_items')
        .select(
          'id,menu_code,menu_name,product_id,qty_per_menu,unit,base_qty_per_menu,active,products(code,name,base_unit)'
        )
        .eq('store_id', storeId)
        .order('menu_code'),
    ]);

    const error =
      menusResult.error ||
      productsResult.error ||
      recipesResult.error;

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    }

    setMenus(
      menusResult.data || []
    );

    setProducts(
      productsResult.data || []
    );

    setRecipes(
      recipesResult.data || []
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  const selectedProduct =
    products.find(
      (p) =>
        p.id === productId
    );

  useEffect(() => {
    if (selectedProduct) {
      setUnit(
        baseUnit(
          selectedProduct
        )
      );
    }
  }, [productId]);

  function selectMenu(code) {
    const menu =
      menus.find(
        (m) =>
          m.menu_code === code
      );

    setMenuCode(code);

    if (menu) {
      setMenuName(
        menu.menu_name || ''
      );
    }
  }

  async function saveRecipe(e) {
    e.preventDefault();

    if (
      !storeId ||
      !menuCode ||
      !productId ||
      Number(qty) <= 0
    ) {
      setMsg({
        ok: false,
        text:
          'Menu, produk dan qty recipe wajib diisi.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    const { error } =
      await supabase.rpc(
        'rcm_save_recipe',
        {
          p_store_id: storeId,
          p_menu_code:
            menuCode.trim(),
          p_menu_name:
            menuName.trim() ||
            menuCode.trim(),
          p_product_id: productId,
          p_qty_per_menu:
            Number(qty),
          p_unit:
            unit ||
            baseUnit(
              selectedProduct
            ),
          p_active: active,
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
          'Recipe berhasil disimpan.',
      });

      setQty('');

      await load();
    }

    setBusy(false);
  }

  async function toggleRecipe(
    recipe
  ) {
    const { error } =
      await supabase.rpc(
        'rcm_save_recipe',
        {
          p_store_id: storeId,
          p_menu_code:
            recipe.menu_code,
          p_menu_name:
            recipe.menu_name,
          p_product_id:
            recipe.product_id,
          p_qty_per_menu:
            Number(
              recipe.qty_per_menu
            ),
          p_unit: recipe.unit,
          p_active:
            !recipe.active,
        }
      );

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
      return;
    }

    setMsg({
      ok: true,
      text:
        'Status recipe berhasil diubah.',
    });

    await load();
  }

  return (
    <Page
      title="Master Recipe"
      subtitle="Hubungkan menu POS dengan bahan produk"
    >
      {loading && (
        <Notice>
          Memuat master recipe…
        </Notice>
      )}

      <form
        className="card form"
        onSubmit={saveRecipe}
      >
        <h3>
          Tambah / Update Recipe
        </h3>

        <label>
          Menu POS

          <select
            value={menuCode}
            onChange={(e) =>
              selectMenu(
                e.target.value
              )
            }
            required
          >
            <option value="">
              Pilih menu
            </option>

            {menus.map((menu) => (
              <option
                key={menu.id}
                value={
                  menu.menu_code
                }
              >
                {menu.menu_code} -{' '}
                {menu.menu_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nama Menu

          <input
            value={menuName}
            onChange={(e) =>
              setMenuName(
                e.target.value
              )
            }
            placeholder="Nama menu"
          />
        </label>

        <label>
          Produk / Bahan

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

            {products.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="two">
          <label>
            Qty per Menu

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
              p={selectedProduct}
              value={
                unit ||
                baseUnit(
                  selectedProduct
                )
              }
              onChange={setUnit}
            />
          </label>
        </div>

        {selectedProduct && (
          <Notice>
            Base Unit:{' '}
            <b>
              {baseUnit(
                selectedProduct
              )}
            </b>

            <br />

            Qty Base per Menu:{' '}
            <b>
              {fmt(
                toBase(
                  qty,
                  unit ||
                    baseUnit(
                      selectedProduct
                    ),
                  selectedProduct
                )
              )}
            </b>
          </Notice>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) =>
              setActive(
                e.target.checked
              )
            }
          />

          Recipe aktif
        </label>

        <button disabled={busy}>
          {busy
            ? 'Menyimpan…'
            : 'Simpan Recipe'}
        </button>

        <Message msg={msg} />
      </form>

      <div className="card">
        <h3>
          Recipe Aktif / Nonaktif
        </h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Menu</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Base Qty</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {recipes.map(
                (recipe) => (
                  <tr
                    key={recipe.id}
                  >
                    <td>
                      <b>
                        {
                          recipe.menu_code
                        }
                      </b>

                      <small>
                        {
                          recipe.menu_name
                        }
                      </small>
                    </td>

                    <td>
                      {recipe.products
                        ?.name ||
                        '-'}
                    </td>

                    <td>
                      {fmt(
                        recipe.qty_per_menu
                      )}{' '}
                      {recipe.unit}
                    </td>

                    <td>
                      {fmt(
                        recipe.base_qty_per_menu
                      )}
                    </td>

                    <td>
                      {recipe.active
                        ? 'Aktif'
                        : 'Nonaktif'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          toggleRecipe(
                            recipe
                          )
                        }
                      >
                        {recipe.active
                          ? 'Nonaktifkan'
                          : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                )
              )}

              {!recipes.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="empty"
                  >
                    Belum ada recipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
        }
function Revision({
  storeId,
}) {
  const {
    items,
    pics,
    loading,
    error,
  } = useData(storeId);

  const [kind, setKind] =
    useState('opening');

  const [productId, setProductId] =
    useState('');

  const [picId, setPicId] =
    useState('');

  const [newQty, setNewQty] =
    useState('');

  const [unit, setUnit] =
    useState('');

  const [note, setNote] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

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
          'Store, produk dan PIC wajib dipilih.',
      });
      return;
    }

    if (Number(newQty) < 0) {
      setMsg({
        ok: false,
        text:
          'Nilai stok tidak boleh negatif.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      /*
       * Penting:
       * RPC revisi bekerja menggunakan Base Unit.
       * Jadi apabila user memilih gr/kg/pcs/pack,
       * qty dikonversi terlebih dahulu.
       */
      const baseQty = toBase(
        newQty,
        unit ||
          baseUnit(product),
        product
      );

      const { error } =
        await supabase.rpc(
          'rcm_revision',
          {
            p_store_id: storeId,
            p_product_id: productId,
            p_pic_id: picId,
            p_kind: kind,
            p_new_qty: baseQty,
            p_unit: baseUnit(product),
            p_note: note || null,
          }
        );

      if (error) {
        throw error;
      }

      setMsg({
        ok: true,
        text:
          'Revisi stok berhasil disimpan.',
      });

      setNewQty('');
      setNote('');
    } catch (error) {
      setMsg({
        ok: false,
        text:
          error.message ||
          'Revisi gagal.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title="Revisi Stok"
      subtitle="Koreksi stok awal atau stok berjalan"
    >
      {loading && (
        <Notice>
          Memuat data stok…
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
          Jenis Revisi

          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value)
            }
          >
            <option value="opening">
              Stok Awal
            </option>

            <option value="warehouse">
              Stok Gudang
            </option>

            <option value="operational">
              Stok Operasional
            </option>
          </select>
        </label>

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

        {product && (
          <Notice>
            <b>
              Stok saat ini
            </b>

            <br />

            Gudang:{' '}
            {fmt(
              product.warehouse_qty
            )}{' '}
            {baseUnit(product)}

            <br />

            Operasional:{' '}
            {fmt(
              product.operational_qty
            )}{' '}
            {baseUnit(product)}

            <br />

            Total:{' '}
            {fmt(
              product.ending_qty
            )}{' '}
            {baseUnit(product)}
          </Notice>
        )}

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
            Nilai Baru

            <input
              type="number"
              min="0"
              step="any"
              value={newQty}
              onChange={(e) =>
                setNewQty(
                  e.target.value
                )
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
            Nilai yang dikirim ke sistem:{' '}
            <b>
              {fmt(
                toBase(
                  newQty,
                  unit ||
                    baseUnit(product),
                  product
                )
              )}{' '}
              {baseUnit(product)}
            </b>
          </Notice>
        )}

        <label>
          Catatan

          <textarea
            rows={3}
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            placeholder="Alasan revisi"
          />
        </label>

        <button disabled={busy}>
          {busy
            ? 'Menyimpan…'
            : 'Simpan Revisi'}
        </button>

        <Message msg={msg} />
      </form>
    </Page>
  );
}

function Products() {
  const empty = {
    id: '',
    code: '',
    name: '',
    category: '',
    unit: 'pcs',
    base_unit: 'pcs',
    unit_1: '',
    unit_1_per_base: '',
    unit_2: '',
    unit_2_per_base: '',
    unit_3: '',
    unit_3_per_base: '',
    min_stock: '',
    max_stock: '',
    active: true,
  };

  const [form, setForm] =
    useState(empty);

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

  async function load() {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function edit(row) {
    setForm({
      id: row.id || '',
      code: row.code || '',
      name: row.name || '',
      category:
        row.category || '',
      unit:
        row.unit || 'pcs',
      base_unit:
        row.base_unit ||
        row.unit ||
        'pcs',
      unit_1:
        row.unit_1 || '',
      unit_1_per_base:
        row.unit_1_per_base ??
        '',
      unit_2:
        row.unit_2 || '',
      unit_2_per_base:
        row.unit_2_per_base ??
        '',
      unit_3:
        row.unit_3 || '',
      unit_3_per_base:
        row.unit_3_per_base ??
        '',
      min_stock:
        row.min_stock ?? '',
      max_stock:
        row.max_stock ?? '',
      active:
        row.active !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function save(e) {
    e.preventDefault();

    if (
      !form.code.trim() ||
      !form.name.trim()
    ) {
      setMsg({
        ok: false,
        text:
          'Kode dan nama produk wajib diisi.',
      });
      return;
    }

    setBusy(true);
    setMsg(null);

    const payload = {
      p_id:
        form.id || null,

      p_code:
        form.code.trim(),

      p_name:
        form.name.trim(),

      p_category:
        form.category || null,

      p_unit:
        form.unit || 'pcs',

      p_base_unit:
        form.base_unit ||
        form.unit ||
        'pcs',

      p_unit_1:
        form.unit_1 || null,

      p_unit_1_per_base:
        form.unit_1_per_base
          ? Number(
              form.unit_1_per_base
            )
          : null,

      p_unit_2:
        form.unit_2 || null,

      p_unit_2_per_base:
        form.unit_2_per_base
          ? Number(
              form.unit_2_per_base
            )
          : null,

      p_unit_3:
        form.unit_3 || null,

      p_unit_3_per_base:
        form.unit_3_per_base
          ? Number(
              form.unit_3_per_base
            )
          : null,

      p_min_stock:
        Number(
          form.min_stock || 0
        ),

      p_max_stock:
        Number(
          form.max_stock || 0
        ),

      p_active:
        form.active,
    };

    const { error } =
      await supabase.rpc(
        'rcm_save_product',
        payload
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
          'Produk berhasil disimpan.',
      });

      setForm(empty);
      await load();
    }

    setBusy(false);
  }

  return (
    <Page
      title="Master Produk"
      subtitle="Kelola produk dan konversi satuan"
    >
      <form
        className="card form"
        onSubmit={save}
      >
        <h3>
          {form.id
            ? 'Edit Produk'
            : 'Tambah Produk'}
        </h3>

        <div className="two">
          <label>
            Kode

            <input
              value={form.code}
              onChange={(e) =>
                update(
                  'code',
                  e.target.value
                )
              }
              required
            />
          </label>

          <label>
            Nama

            <input
              value={form.name}
              onChange={(e) =>
                update(
                  'name',
                  e.target.value
                )
              }
              required
            />
          </label>
        </div>

        <div className="two">
          <label>
            Kategori

            <input
              value={form.category}
              onChange={(e) =>
                update(
                  'category',
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Base Unit

            <select
              value={
                form.base_unit
              }
              onChange={(e) =>
                update(
                  'base_unit',
                  e.target.value
                )
              }
            >
              {UNITS.map(
                (unit) => (
                  <option
                    key={unit}
                    value={unit}
                  >
                    {unit}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <h4>
          Konversi Unit
        </h4>

        {[1, 2, 3].map(
          (number) => {
            const unitKey =
              `unit_${number}`;

            const factorKey =
              `unit_${number}_per_base`;

            return (
              <div
                className="two"
                key={number}
              >
                <label>
                  Unit {number}

                  <select
                    value={
                      form[
                        unitKey
                      ]
                    }
                    onChange={(e) =>
                      update(
                        unitKey,
                        e.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      -
                    </option>

                    {UNITS.map(
                      (unit) => (
                        <option
                          key={unit}
                          value={
                            unit
                          }
                        >
                          {unit}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  {form[unitKey]
                    ? `1 ${form[unitKey]} = berapa ${form.base_unit}?`
                    : `Konversi Unit ${number}`}

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      form[
                        factorKey
                      ]
                    }
                    onChange={(e) =>
                      update(
                        factorKey,
                        e.target
                          .value
                      )
                    }
                  />
                </label>
              </div>
            );
          }
        )}

        <div className="two">
          <label>
            Minimum Stock

            <input
              type="number"
              min="0"
              step="any"
              value={
                form.min_stock
              }
              onChange={(e) =>
                update(
                  'min_stock',
                  e.target.value
                )
              }
            />
          </label>

          <label>
            Maximum Stock

            <input
              type="number"
              min="0"
              step="any"
              value={
                form.max_stock
              }
              onChange={(e) =>
                update(
                  'max_stock',
                  e.target.value
                )
              }
            />
          </label>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              update(
                'active',
                e.target.checked
              )
            }
          />

          Produk aktif
        </label>

        <div className="actions">
          <button
            disabled={busy}
          >
            {busy
              ? 'Menyimpan…'
              : 'Simpan'}
          </button>

          {form.id && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setForm(empty)
              }
            >
              Batal Edit
            </button>
          )}
        </div>

        <Message msg={msg} />
      </form>

      <div className="card">
        <h3>
          Daftar Produk
        </h3>

        {loading ? (
          <Notice>
            Memuat produk…
          </Notice>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Base</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={row.id}
                    >
                      <td>
                        {row.code}
                      </td>

                      <td>
                        {row.name}
                      </td>

                      <td>
                        {row.category ||
                          '-'}
                      </td>

                      <td>
                        {baseUnit(
                          row
                        )}
                      </td>

                      <td>
                        {fmt(
                          row.min_stock
                        )}
                      </td>

                      <td>
                        {fmt(
                          row.max_stock
                        )}
                      </td>

                      <td>
                        {row.active
                          ? 'Aktif'
                          : 'Nonaktif'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            edit(
                              row
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}

function Pics({
  storeId,
}) {
  const [rows, setRows] =
    useState([]);

  const [name, setName] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [msg, setMsg] =
    useState(null);

  async function load() {
    if (!storeId) return;

    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('master_pics')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function add(e) {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setBusy(true);
    setMsg(null);

    const { error } =
      await supabase
        .from('master_pics')
        .insert({
          store_id: storeId,
          name: name.trim(),
          active: true,
        });

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      setMsg({
        ok: true,
        text:
          'PIC berhasil ditambahkan.',
      });

      setName('');
      await load();
    }

    setBusy(false);
  }

  async function toggle(row) {
    const { error } =
      await supabase
        .from('master_pics')
        .update({
          active:
            !row.active,
        })
        .eq('id', row.id)
        .eq(
          'store_id',
          storeId
        );

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
    } else {
      await load();
    }
  }

  return (
    <Page
      title="Master PIC"
      subtitle="Kelola PIC berdasarkan store"
    >
      <form
        className="card form"
        onSubmit={add}
      >
        <label>
          Nama PIC

          <input
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            placeholder="Nama PIC"
            required
          />
        </label>

        <button disabled={busy}>
          {busy
            ? 'Menyimpan…'
            : 'Tambah PIC'}
        </button>

        <Message msg={msg} />
      </form>

      <div className="card">
        <h3>
          Daftar PIC
        </h3>

        {loading ? (
          <Notice>
            Memuat PIC…
          </Notice>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={row.id}
                    >
                      <td>
                        {row.name}
                      </td>

                      <td>
                        {row.active
                          ? 'Aktif'
                          : 'Nonaktif'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            toggle(
                              row
                            )
                          }
                        >
                          {row.active
                            ? 'Nonaktifkan'
                            : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}

function Users() {
  const [rows, setRows] =
    useState([]);

  const [stores, setStores] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [msg, setMsg] =
    useState(null);

  async function load() {
    setLoading(true);

    const [
      profilesResult,
      storesResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id,full_name,role,store_id,active,stores(name,code)'
        )
        .order('full_name'),

      supabase
        .from('stores')
        .select(
          'id,name,code'
        )
        .eq('active', true)
        .order('name'),
    ]);

    if (
      profilesResult.error ||
      storesResult.error
    ) {
      const error =
        profilesResult.error ||
        storesResult.error;

      setMsg({
        ok: false,
        text: error.message,
      });
    }

    setRows(
      profilesResult.data || []
    );

    setStores(
      storesResult.data || []
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(
    row,
    field,
    value
  ) {
    const { error } =
      await supabase
        .from('profiles')
        .update({
          [field]: value,
        })
        .eq('id', row.id);

    if (error) {
      setMsg({
        ok: false,
        text: error.message,
      });
      return;
    }

    setMsg({
      ok: true,
      text:
        'User berhasil diperbarui.',
    });

    await load();
  }

  return (
    <Page
      title="User / Role"
      subtitle="Pengaturan role dan store user"
    >
      {loading ? (
        <Notice>
          Memuat user…
        </Notice>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={row.id}
                    >
                      <td>
                        {row.full_name ||
                          '-'}
                      </td>

                      <td>
                        <select
                          value={
                            row.role ||
                            'crew'
                          }
                          onChange={(e) =>
                            updateUser(
                              row,
                              'role',
                              e.target
                                .value
                            )
                          }
                        >
                          {Object.entries(
                            ROLES
                          ).map(
                            ([
                              key,
                              label,
                            ]) => (
                              <option
                                key={
                                  key
                                }
                                value={
                                  key
                                }
                              >
                                {
                                  label
                                }
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td>
                        <select
                          value={
                            row.store_id ||
                            ''
                          }
                          onChange={(e) =>
                            updateUser(
                              row,
                              'store_id',
                              e.target
                                .value ||
                                null
                            )
                          }
                        >
                          <option value="">
                            Semua / tanpa
                            store
                          </option>

                          {stores.map(
                            (
                              store
                            ) => (
                              <option
                                key={
                                  store.id
                                }
                                value={
                                  store.id
                                }
                              >
                                {
                                  store.name
                                }{' '}
                                (
                                {
                                  store.code
                                }
                                )
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={
                              row.active !==
                              false
                            }
                            onChange={(
                              e
                            ) =>
                              updateUser(
                                row,
                                'active',
                                e
                                  .target
                                  .checked
                              )
                            }
                          />

                          Aktif
                        </label>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <Message msg={msg} />
        </div>
      )}
    </Page>
  );
                          }
function GlobalStyles(){
  useEffect(()=>{
    const id='rcm-management-stock-style';

    if(document.getElementById(id)) return;

    const style=document.createElement('style');

    style.id=id;

    style.textContent=`
      *{
        box-sizing:border-box;
      }

      html,body{
        margin:0;
        padding:0;
        font-family:Arial,Helvetica,sans-serif;
        background:#f5f7fb;
        color:#172033;
      }

      body{
        min-height:100vh;
      }

      button,
      input,
      select,
      textarea{
        font:inherit;
      }

      button{
        cursor:pointer;
      }

      .app{
        min-height:100vh;
        background:#f5f7fb;
      }

      .sidebar{
        position:fixed;
        left:0;
        top:0;
        bottom:0;
        width:250px;
        background:#fff;
        border-right:1px solid #e5e7eb;
        z-index:20;
        overflow-y:auto;
      }

      .brand{
        padding:22px 20px;
        border-bottom:1px solid #edf0f4;
      }

      .brand-title{
        font-size:22px;
        font-weight:800;
        color:#2563eb;
      }

      .brand-subtitle{
        font-size:12px;
        color:#6b7280;
        margin-top:4px;
      }

      .menu{
        padding:14px 10px;
      }

      .menu button{
        width:100%;
        border:0;
        background:transparent;
        color:#4b5563;
        text-align:left;
        padding:11px 13px;
        border-radius:9px;
        margin-bottom:4px;
      }

      .menu button:hover{
        background:#f1f5f9;
        color:#1d4ed8;
      }

      .menu button.active{
        background:#eff6ff;
        color:#1d4ed8;
        font-weight:700;
      }

      .content{
        margin-left:250px;
        min-height:100vh;
      }

      .topbar{
        position:sticky;
        top:0;
        z-index:10;
        background:rgba(255,255,255,.96);
        border-bottom:1px solid #e5e7eb;
        padding:14px 24px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:15px;
      }

      .topbar-title{
        font-size:20px;
        font-weight:800;
      }

      .page{
        padding:24px;
        max-width:1600px;
        margin:auto;
      }

      .card{
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        margin-bottom:18px;
        box-shadow:0 2px 8px rgba(15,23,42,.03);
      }

      .card-title{
        font-size:17px;
        font-weight:800;
        margin-bottom:14px;
      }

      .grid{
        display:grid;
        gap:14px;
      }

      .grid-2{
        grid-template-columns:repeat(2,minmax(0,1fr));
      }

      .grid-3{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }

      .grid-4{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }

      label{
        display:block;
        font-size:13px;
        font-weight:700;
        color:#374151;
        margin-bottom:6px;
      }

      input,
      select,
      textarea{
        width:100%;
        border:1px solid #d1d5db;
        border-radius:9px;
        background:#fff;
        color:#111827;
        padding:10px 11px;
        outline:none;
      }

      input:focus,
      select:focus,
      textarea:focus{
        border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.10);
      }

      textarea{
        min-height:90px;
        resize:vertical;
      }

      .btn{
        border:0;
        border-radius:9px;
        padding:10px 15px;
        font-weight:700;
      }

      .btn-primary{
        background:#2563eb;
        color:#fff;
      }

      .btn-success{
        background:#16a34a;
        color:#fff;
      }

      .btn-danger{
        background:#dc2626;
        color:#fff;
      }

      .btn-warning{
        background:#f59e0b;
        color:#fff;
      }

      .btn-secondary{
        background:#e5e7eb;
        color:#374151;
      }

      .actions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
      }

      .notice{
        padding:12px 14px;
        border-radius:10px;
        margin-bottom:15px;
        font-size:14px;
      }

      .notice-success{
        background:#ecfdf5;
        color:#166534;
        border:1px solid #bbf7d0;
      }

      .notice-error{
        background:#fef2f2;
        color:#991b1b;
        border:1px solid #fecaca;
      }

      .notice-info{
        background:#eff6ff;
        color:#1e40af;
        border:1px solid #bfdbfe;
      }

      .table-wrap{
        width:100%;
        overflow-x:auto;
        border:1px solid #e5e7eb;
        border-radius:10px;
      }

      table{
        width:100%;
        border-collapse:collapse;
        min-width:700px;
      }

      th{
        background:#f8fafc;
        color:#374151;
        font-size:12px;
        font-weight:800;
        text-align:left;
        padding:11px 12px;
        border-bottom:1px solid #e5e7eb;
        white-space:nowrap;
      }

      td{
        padding:11px 12px;
        border-bottom:1px solid #eef0f3;
        font-size:13px;
      }

      tbody tr:hover{
        background:#fafcff;
      }

      .badge{
        display:inline-flex;
        align-items:center;
        border-radius:999px;
        padding:4px 9px;
        font-size:11px;
        font-weight:800;
      }

      .badge-green{
        background:#dcfce7;
        color:#166534;
      }

      .badge-red{
        background:#fee2e2;
        color:#991b1b;
      }

      .badge-yellow{
        background:#fef3c7;
        color:#92400e;
      }

      .badge-blue{
        background:#dbeafe;
        color:#1e40af;
      }

      .stat-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:14px;
        margin-bottom:18px;
      }

      .stat-card{
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
      }

      .stat-label{
        font-size:12px;
        color:#6b7280;
        font-weight:700;
      }

      .stat-value{
        margin-top:7px;
        font-size:25px;
        font-weight:800;
      }

      .empty,
      .loading{
        text-align:center;
        padding:30px 15px;
        color:#6b7280;
      }

      .file-box{
        border:2px dashed #cbd5e1;
        border-radius:12px;
        padding:24px;
        text-align:center;
        background:#f8fafc;
      }

      .file-box:hover{
        border-color:#2563eb;
        background:#eff6ff;
      }

      .text-danger{
        color:#dc2626;
      }

      .text-success{
        color:#16a34a;
      }

      .text-warning{
        color:#d97706;
      }

      .text-muted{
        color:#6b7280;
      }

      .text-right{
        text-align:right;
      }

      .text-center{
        text-align:center;
      }

      .login-page{
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:#f5f7fb;
      }

      .login-card{
        width:100%;
        max-width:420px;
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:28px;
        box-shadow:0 10px 35px rgba(15,23,42,.08);
      }

      .login-logo{
        text-align:center;
        margin-bottom:25px;
      }

      .login-logo-title{
        font-size:30px;
        font-weight:900;
        color:#2563eb;
      }

      .login-logo-subtitle{
        color:#6b7280;
        font-size:13px;
      }

      @media(max-width:800px){
        .sidebar{
          width:220px;
        }

        .content{
          margin-left:220px;
        }

        .grid-2,
        .grid-3,
        .grid-4,
        .stat-grid{
          grid-template-columns:1fr;
        }

        .page{
          padding:15px;
        }
      }

      @media(max-width:600px){
        .sidebar{
          position:relative;
          width:100%;
          height:auto;
          border-right:0;
          border-bottom:1px solid #e5e7eb;
        }

        .content{
          margin-left:0;
        }

        .menu{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:5px;
          padding:8px;
        }

        .menu button{
          margin:0;
          font-size:12px;
          padding:9px;
        }

        .topbar{
          position:relative;
          flex-direction:column;
          align-items:stretch;
        }

        .page{
          padding:12px;
        }

        .card{
          padding:14px;
        }
      }
    `;

    document.head.appendChild(style);

    return ()=>{
      const existing=document.getElementById(id);

      if(existing){
        existing.remove();
      }
    };
  },[]);

  return null;
}
export default Home;
