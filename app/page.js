'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';

const UNIT_OPTIONS=['gr','kg','pcs'];
const baseUnit=(p)=>p?.base_unit||p?.unit||'pcs';
const areaConfig=(p,area)=>{
  if(!p) return {unit:baseUnit(p),perBase:1};
  return area==='kasir'
    ? {unit:p.kasir_unit||baseUnit(p),perBase:Number(p.kasir_per_base||1)}
    : {unit:p.kitchen_unit||baseUnit(p),perBase:Number(p.kitchen_per_base||1)};
};
const areaToBase=(qty,p,area)=>Number(qty||0)/Number(areaConfig(p,area).perBase||1);
const baseToArea=(qty,p,area)=>Number(qty||0)*Number(areaConfig(p,area).perBase||1);

const baseMenu=[['dashboard','Dashboard'],['stockin','Input Stok Gudang'],['warehouse','Stok Gudang'],['transfer','Transfer'],['opname','Input Sisa'],['history','Riwayat'],['products','Master Produk'],['users','User / Role']];
const canRevise=(role)=>['admin','store_leader','team_leader'].includes(role);
const fmt=(n)=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:3});

export default function Home(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[tab,setTab]=useState('dashboard'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{let mounted=true; supabase.auth.getSession().then(({data})=>mounted&&setSession(data.session)); const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return()=>{mounted=false;data.subscription.unsubscribe()};},[]);
 useEffect(()=>{if(!session){setProfile(null);return} loadProfile();},[session]);
 async function loadProfile(){const {data,error}=await supabase.from('profiles').select('full_name,role,store_id,stores(name,code)').eq('id',session.user.id).single(); if(error)setMsg(error.message); else {setProfile(data);setTab(data.role==='crew'?'crew-stock':'dashboard')}}
 async function login(e){e.preventDefault();setBusy(true);setMsg('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setMsg(error.message);setBusy(false)}
 async function logout(){await supabase.auth.signOut();setTab('dashboard')}
 if(!session)return <Login email={email} password={password} setEmail={setEmail} setPassword={setPassword} login={login} busy={busy} msg={msg}/>;
 const storeId=profile?.store_id;
 const isCrew=profile?.role==='crew';
 const crewMenu=[['crew-stock','Stok'],['transfer','Transfer'],['crew-opname','Input Sisa'],['crew-history','Riwayat Saya']];
 const leaderMenu=[...baseMenu.slice(0,3),...(canRevise(profile?.role)?[['revise','Revisi Stok Gudang']]:[]),...baseMenu.slice(3)];
 return <div className={'shell '+(isCrew?'crew-shell':'')}><aside><div className="sidebrand"><b>RCM</b><span>Management Stock</span></div><nav>{(isCrew?crewMenu:leaderMenu).map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav><button className="logout" onClick={logout}>Keluar</button></aside><main className="content"><header><div><small>STORE</small><h2>{profile?.stores?.name||'LC Rancamanyar'}</h2></div><div className="user">{profile?.full_name||session.user.email}<small>{profile?.role||'crew'}</small></div></header>{msg&&<div className="error top-error">{msg}</div>}<section>
 {isCrew&&tab==='crew-stock'&&<CrewStock storeId={storeId}/>} 
 {isCrew&&tab==='transfer'&&<Transfer storeId={storeId}/>} 
 {isCrew&&tab==='crew-opname'&&<CrewOpname storeId={storeId}/>} 
 {isCrew&&tab==='crew-history'&&<MyHistory storeId={storeId}/>} 
 {!isCrew&&tab==='dashboard'&&<Dashboard storeId={storeId} setTab={setTab}/>} 
 {!isCrew&&tab==='stockin'&&<StockIn storeId={storeId}/>} 
 {!isCrew&&tab==='warehouse'&&<Warehouse storeId={storeId} role={profile?.role}/>} 
 {!isCrew&&tab==='revise'&&canRevise(profile?.role)&&<ReviseWarehouseStock storeId={storeId}/>} 
 {!isCrew&&tab==='transfer'&&<Transfer storeId={storeId}/>} 
 {!isCrew&&tab==='opname'&&<Opname storeId={storeId}/>} 
 {!isCrew&&tab==='history'&&<History storeId={storeId}/>}
 {!isCrew&&tab==='products'&&profile?.role==='admin'&&<Products/>}
 {!isCrew&&tab==='users'&&profile?.role==='admin'&&<Users/>}
 </section></main></div>
}
function Login({email,password,setEmail,setPassword,login,busy,msg}){return <main className="login"><div className="brand"><div className="logo">RCM</div><h1>Management Stock</h1><p>LC Rancamanyar</p><form onSubmit={login} className="card"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>{busy?'Memproses…':'Masuk'}</button>{msg&&<div className="error">{msg}</div>}</form></div></main>}

function useStock(storeId){
 const [rows,setRows]=useState([]),[products,setProducts]=useState([]),[snapshots,setSnapshots]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){
  if(!storeId)return;
  setLoading(true);setError('');
  const [{data:b,error:be},{data:p,error:pe},{data:ss,error:se}]=await Promise.all([
   supabase.from('stock_balances').select('*').eq('store_id',storeId),
   supabase.from('products').select('id,code,name,category,unit,min_stock,max_stock,base_unit,kasir_unit,kasir_per_base,kitchen_unit,kitchen_per_base').eq('active',true).order('name'),
   supabase.from('stock_daily_snapshots').select('id,product_id,snapshot_date,opening_qty,usage_qty,ending_qty,updated_at').eq('store_id',storeId).order('snapshot_date',{ascending:false}).order('updated_at',{ascending:false})
  ]);
  if(be||pe||se){setError((be||pe||se).message);}
  setRows(b||[]);setProducts(p||[]);setSnapshots(ss||[]);setLoading(false)
 }
 useEffect(()=>{load()},[storeId]);
 useEffect(()=>{
  if(!storeId)return;
  const channel=supabase.channel('rcm-stock-'+storeId)
   .on('postgres_changes',{event:'*',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load)
   .on('postgres_changes',{event:'*',schema:'public',table:'stock_daily_snapshots',filter:'store_id=eq.'+storeId},load)
   .subscribe();
  return()=>supabase.removeChannel(channel)
 },[storeId]);
 const latestSnapshots=useMemo(()=>{
  const map={};
  for(const s of snapshots){if(!map[s.product_id])map[s.product_id]=s;}
  return map;
 },[snapshots]);
 const merged=useMemo(()=>products.map(p=>{
  const b=rows.find(x=>x.product_id===p.id)||{};
  const gudang=Number(b.gudang_qty||0);
  const operasional=Number(b.operasional_qty||0);
  const snap=latestSnapshots[p.id];
  const ending=Number(snap?.ending_qty ?? (gudang+operasional));
  return {...p,gudang_qty:gudang,operasional_qty:operasional,opening_qty:Number(snap?.opening_qty ?? ending),usage_qty:Number(snap?.usage_qty ?? 0),ending_qty:ending};
 }),[products,rows,latestSnapshots]);
 return {items:merged,loading,error,reload:load};
}

function Dashboard({storeId,setTab}){
 const {items,loading,error}=useStock(storeId);
 const [summary,setSummary]=useState({transfer_transactions:0,waste_transactions:0,waste_qty:0,adjustment_qty:0});
 const [recent,setRecent]=useState([]);
 useEffect(()=>{if(!storeId)return; let live=true;
  async function load(){
   const [{data:s},{data:t}]=await Promise.all([
    supabase.from('leader_transfer_summary').select('*').eq('store_id',storeId).maybeSingle(),
    supabase.from('stock_transactions').select('id,transaction_type,qty,note,created_at,products(name,unit)').eq('store_id',storeId).order('created_at',{ascending:false}).limit(6)
   ]);
   if(live){setSummary(s||{});setRecent(t||[])}
  }
  load();
  const ch=supabase.channel('rcm-dashboard-'+storeId).on('postgres_changes',{event:'*',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();
  return()=>{live=false;supabase.removeChannel(ch)};
 },[storeId]);
 const low=items.filter(x=>x.operasional_qty<=Number(x.min_stock||0));
 const totalG=items.reduce((s,x)=>s+x.gudang_qty,0); const totalO=items.reduce((s,x)=>s+x.operasional_qty,0);
 const totalItems=items.length;
 return <div className="leader-dashboard">
  <div className="dash-head"><div><span className="eyebrow">DASHBOARD LEADER</span><h1>Kontrol operasional hari ini</h1><p>Ringkasan stok LC Rancamanyar dalam satu layar.</p></div><button className="refresh" onClick={()=>location.reload()}>↻ Refresh</button></div>
  {error&&<div className="error">{error}</div>}
  <div className="kpi-grid">
   <Kpi icon="▣" label="Stok Gudang" value={loading?'…':fmt(totalG)} meta="Total saldo gudang"/>
   <Kpi icon="▤" label="Stok Operasional" value={loading?'…':fmt(totalO)} meta="Total saldo operasional"/>
   <Kpi icon="!" label="Stok Menipis" value={loading?'…':low.length} meta={low.length?'Perlu segera dicek':'Semua aman' } danger={low.length>0}/>
   <Kpi icon="↗" label="Transfer" value={fmt(summary.transfer_transactions)} meta="Transaksi transfer"/>
  </div>
  <div className="dash-grid">
   <div className="panel critical"><div className="panel-head"><div><h3>⚠ Produk perlu perhatian</h3><span>{low.length} produk di bawah / sama dengan minimum</span></div><button className="linkbtn" onClick={()=>setTab('warehouse')}>Lihat semua</button></div>
    {low.length===0?<div className="empty">Tidak ada produk kritis. 👍</div>:<div className="critical-list">{low.slice(0,6).map(x=><div className="critical-row" key={x.id}><div><b>{x.name}</b><small>{x.code} · Min {fmt(x.min_stock)} {baseUnit(x)}</small></div><strong>{fmt(x.operasional_qty)} {baseUnit(x)}</strong></div>)}</div>}
   </div>
   <div className="panel"><div className="panel-head"><div><h3>Ringkasan aktivitas</h3><span>Pergerakan stok tercatat</span></div></div><div className="activity-stats"><div><span>Waste</span><b>{fmt(summary.waste_qty)}</b><small>{fmt(summary.waste_transactions)} transaksi</small></div><div><span>Adjustment</span><b>{fmt(summary.adjustment_qty)}</b><small>Selisih stok</small></div><div><span>Produk Aktif</span><b>{totalItems}</b><small>Master produk</small></div></div></div>
  </div>
  <div className="panel recent"><div className="panel-head"><div><h3>Aktivitas terbaru</h3><span>Transaksi terakhir yang masuk</span></div><button className="linkbtn" onClick={()=>setTab('history')}>Riwayat →</button></div>
   {recent.length===0?<div className="empty">Belum ada transaksi.</div>:<div className="recent-list">{recent.map(r=><div className="recent-row" key={r.id}><div className={'activity-icon '+(Number(r.qty)>=0?'in':'out')}>{Number(r.qty)>=0?'↑':'↓'}</div><div><b>{r.products?.name||'Produk'}</b><small>{r.transaction_type.replaceAll('_',' ')} · {r.note||'Tanpa catatan'}</small></div><strong className={Number(r.qty)>=0?'positive':'negative'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)}</strong><time>{new Date(r.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>}
  </div>
  <div className="quick-actions"><button onClick={()=>setTab('stockin')}>＋ Input Stok Gudang</button><button onClick={()=>setTab('transfer')}>＋ Transfer Stok</button><button onClick={()=>setTab('opname')} className="secondary">＋ Input Sisa</button><button onClick={()=>setTab('warehouse')} className="secondary">▣ Cek Stok</button></div>
 </div>
}
function Kpi({icon,label,value,meta,danger}){return <div className={'kpi '+(danger?'danger':'')}><div className="kpi-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{meta}</small></div></div>}
function Stat({title,value}){return <div className="stat"><span>{title}</span><b>{value}</b></div>}
function Action({title,text,onClick}){return <button className="tile action" onClick={onClick}><b>{title}</b><span>{text}</span><em>Buka →</em></button>}

function StockIn({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);async function submit(e){e.preventDefault();setSaving(true);setMsg('');const amount=Number(qty);if(!Number.isFinite(amount)||amount<=0){setMsg('Jumlah stok harus lebih dari 0.');setSaving(false);return}const {error}=await supabase.rpc('record_stock_in',{p_store_id:storeId,p_product_id:productId,p_qty:amount,p_note:note||null});if(error)setMsg(error.message);else{setMsg('Stok gudang berhasil ditambahkan.');setQty('');setNote('');await reload()}setSaving(false)}return <Page title="Input Stok Gudang" subtitle="Tambah stok masuk ke gudang"><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — gudang {fmt(x.gudang_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Stok gudang saat ini: <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b></div>}<label>Jumlah stok masuk<input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required placeholder="Contoh: 10"/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Penerimaan supplier"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'＋ Tambah Stok Gudang'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

function Warehouse({storeId,role}){
 const {items,loading,error}=useStock(storeId);
 return <Page title="Stok Gudang" subtitle="Stok awal, pemakaian, dan stok akhir">
  <div className="table-wrap">{loading?<p>Memuat stok…</p>:error?<div className="error">{error}</div>:
   <table><thead><tr><th>Produk</th><th>Satuan</th><th>Stok Awal</th><th>Pemakaian</th><th>Stok Akhir</th><th>Status</th></tr></thead>
   <tbody>{items.map(x=><tr key={x.id}>
    <td><b>{x.name}</b><small>{x.code}</small></td>
    <td>{baseUnit(x)}</td>
    <td>{fmt(x.opening_qty)} {baseUnit(x)}</td>
    <td>{fmt(x.usage_qty)} {baseUnit(x)}</td>
    <td><b>{fmt(x.ending_qty)} {baseUnit(x)}</b><small>Gudang {fmt(x.gudang_qty)} + Operasional {fmt(x.operasional_qty)}</small></td>
    <td><Status item={{...x,operasional_qty:x.ending_qty}}/></td>
   </tr>)}</tbody></table>}
  </div>{role&&<div className="notice">Stok Akhir = Gudang + Sisa Operasional (gabungan Kasir + Kitchen).</div>}
 </Page>
}

function Status({item}){if(item.operasional_qty<=Number(item.min_stock||0))return <span className="badge danger">Menipis</span>;if(item.max_stock&&item.operasional_qty>=Number(item.max_stock))return <span className="badge warn">Penuh</span>;return <span className="badge ok">Normal</span>}

function ReviseWarehouseStock({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[unit,setUnit]=useState('pcs'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);useEffect(()=>{if(selected){setQty(String(selected.gudang_qty||0));setUnit(baseUnit(selected)||'pcs');}},[productId]);async function submit(e){e.preventDefault();setSaving(true);setMsg('');const amount=Number(qty);if(!Number.isFinite(amount)||amount<0){setMsg('Stok baru harus 0 atau lebih.');setSaving(false);return}if(!selected){setMsg('Pilih produk terlebih dahulu.');setSaving(false);return}if(Math.abs(amount-Number(selected.gudang_qty||0))<0.0000001 && unit===selected.unit){setMsg('Tidak ada perubahan stok atau satuan.');setSaving(false);return}if(!note.trim()){setMsg('Catatan revisi wajib diisi agar perubahan dapat ditelusuri.');setSaving(false);return}const {error}=await supabase.rpc('record_warehouse_stock_revision',{p_store_id:storeId,p_product_id:productId,p_new_qty:amount,p_note:note.trim(),p_unit:unit});if(error)setMsg(error.message);else{setMsg('Revisi stok gudang dan satuan berhasil disimpan.');setNote('');await reload()}setSaving(false)}return <Page title="Revisi Stok Gudang" subtitle="Rubah stok gudang dengan catatan audit"><div className="notice">Menu ini hanya dapat diakses Admin, Store Leader, dan Team Leader. Setiap perubahan otomatis tercatat sebagai adjustment di Riwayat.</div><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — stok gudang {fmt(x.gudang_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Stok saat ini: <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b></div>}<label>Satuan<select value={unit} onChange={e=>setUnit(e.target.value)} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><label>Stok gudang setelah revisi<input type="number" min="0" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label><label>Alasan / Catatan Revisi<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Koreksi hasil pengecekan fisik" required/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Revisi Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

function Transfer({storeId}){
  const {items,loading,reload}=useStock(storeId);

  const [productId,setProductId]=useState('');
  const [operationalArea,setOperationalArea]=useState('kitchen');
  const [qty,setQty]=useState('');
  const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [config,setConfig]=useState(null);
  const [configLoading,setConfigLoading]=useState(false);

  const selected=items.find(x=>x.id===productId);

  /*
   * Konfigurasi satuan:
   *
   * Base      : satuan utama stok gudang
   * Kasir     : satuan yang dipakai kasir
   * Kitchen   : satuan yang dipakai kitchen
   *
   * Contoh:
   * Base = kg
   * Kasir = pcs
   * 1 kg = 12 pcs
   *
   * Maka:
   * 12 pcs = 1 kg
   */

  useEffect(()=>{
    let live=true;

    async function loadProductConfig(){
      if(!productId){
        setConfig(null);
        return;
      }

      setConfigLoading(true);

      const {data,error}=await supabase
        .from('products')
        .select(`
          id,
          unit,
          base_unit,
          kasir_unit,
          kasir_per_base,
          kitchen_unit,
          kitchen_per_base
        `)
        .eq('id',productId)
        .maybeSingle();

      if(live){
        if(error){
          /*
           * Fallback untuk produk lama yang belum memiliki
           * konfigurasi satuan area.
           */
          setConfig({
            base_unit:selected?.unit||'pcs',
            kasir_unit:selected?.unit||'pcs',
            kasir_per_base:1,
            kitchen_unit:selected?.unit||'pcs',
            kitchen_per_base:1
          });
        }else{
          setConfig(data||{
            base_unit:selected?.unit||'pcs',
            kasir_unit:selected?.unit||'pcs',
            kasir_per_base:1,
            kitchen_unit:selected?.unit||'pcs',
            kitchen_per_base:1
          });
        }

        setConfigLoading(false);
      }
    }

    loadProductConfig();

    return()=>{
      live=false;
    };
  },[productId,selected?.unit]);

  /*
   * Ambil konfigurasi area yang dipilih.
   */
  const areaCfg=useMemo(()=>{
    const base=config?.base_unit||selected?.unit||'pcs';

    if(operationalArea==='kasir'){
      return {
        unit:config?.kasir_unit||base,
        perBase:Number(config?.kasir_per_base||1)
      };
    }

    return {
      unit:config?.kitchen_unit||base,
      perBase:Number(config?.kitchen_per_base||1)
    };
  },[config,selected,operationalArea]);

  /*
   * Jumlah yang diinput user menggunakan satuan area.
   */
  const amount=Number(qty||0);

  /*
   * Konversi jumlah area → Base.
   *
   * Contoh:
   * 12 pcs Kasir
   * perBase = 12
   *
   * 12 / 12 = 1 kg
   */
  const baseEquivalent=useMemo(()=>{
    if(!amount)return 0;

    const perBase=Number(areaCfg.perBase||1);

    return amount/perBase;
  },[amount,areaCfg]);

  /*
   * Stok gudang disimpan dalam satuan Base.
   */
  const gudangBase=Number(selected?.gudang_qty||0);

  /*
   * Maksimal transfer dalam satuan area.
   *
   * Contoh:
   * Gudang = 6 kg
   * Kasir = 12 pcs / kg
   *
   * Maksimal:
   * 6 × 12 = 72 pcs
   */
  const maxAreaQty=useMemo(()=>{
    return gudangBase*Number(areaCfg.perBase||1);
  },[gudangBase,areaCfg]);

  /*
   * Stok operasional gabungan.
   *
   * Nilai operasional pada stock_balances adalah Base.
   * Kita tampilkan juga ekuivalen satuan area.
   */
  const operationalBase=Number(selected?.operasional_qty||0);

  const operationalAreaQty=useMemo(()=>{
    return operationalBase*Number(areaCfg.perBase||1);
  },[operationalBase,areaCfg]);

  /*
   * Validasi transfer.
   */
  const invalid=
    !!selected &&
    (
      amount<=0 ||
      baseEquivalent>gudangBase+0.0000001
    );

  /*
   * Submit transfer.
   */
  async function submit(e){
    e.preventDefault();

    setMsg('');

    if(saving)return;

    if(!selected){
      setMsg('Pilih produk terlebih dahulu.');
      return;
    }

    if(!Number.isFinite(amount)||amount<=0){
      setMsg('Jumlah transfer harus lebih dari 0.');
      return;
    }

    if(!Number.isFinite(baseEquivalent)){
      setMsg('Jumlah transfer tidak valid.');
      return;
    }

    if(baseEquivalent>gudangBase+0.0000001){
      setMsg(
        `Jumlah transfer melebihi stok gudang. Maksimal ${fmt(maxAreaQty)} ${areaCfg.unit}.`
      );
      return;
    }

    setSaving(true);

    try{

      const {error}=await supabase.rpc(
        'record_stock_transfer_v2',
        {
          p_store_id:storeId,
          p_product_id:productId,

          /*
           * PENTING:
           * Function V17 menggunakan p_area_qty,
           * bukan p_qty.
           */
          p_area_qty:amount,

          p_note:note.trim()||null,
          p_operational_area:operationalArea
        }
      );

      if(error){
        throw error;
      }

      setMsg(
        `Transfer berhasil: ${fmt(amount)} ${areaCfg.unit} (${fmt(baseEquivalent)} ${config?.base_unit||selected.unit}).`
      );

      setQty('');
      setNote('');

      await reload();

    }catch(error){

      console.error('Transfer stok error:',error);

      setMsg(
        error?.message ||
        'Transfer gagal. Silakan coba lagi.'
      );

    }finally{

      /*
       * WAJIB:
       * Tombol selalu kembali normal walaupun Supabase error.
       */
      setSaving(false);
    }
  }

  return(
    <Page
      title="Transfer Stok"
      subtitle="Gudang → Operasional"
    >

      <div className="notice">
        Pilih tujuan Kasir atau Kitchen.
        Stok operasional tetap dihitung sebagai
        satu total gabungan Kasir + Kitchen.
        Satuan transfer otomatis mengikuti satuan area.
      </div>

      <form
        className="card form"
        onSubmit={submit}
      >

        {/* TUJUAN OPERASIONAL */}

        <label>
          Tujuan Operasional

          <select
            value={operationalArea}
            onChange={e=>{
              setOperationalArea(e.target.value);
              setQty('');
              setMsg('');
            }}
            required
          >
            <option value="kasir">
              Kasir
            </option>

            <option value="kitchen">
              Kitchen
            </option>
          </select>
        </label>


        {/* PRODUK */}

        <label>
          Produk

          <select
            value={productId}
            onChange={e=>{
              setProductId(e.target.value);
              setQty('');
              setMsg('');
            }}
            required
          >
            <option value="">
              Pilih produk
            </option>

            {items.map(x=>(
              <option
                key={x.id}
                value={x.id}
              >
                {x.name} — gudang {fmt(x.gudang_qty)} {x.unit}
              </option>
            ))}
          </select>
        </label>


        {/* INFORMASI PRODUK */}

        {selected&&(

          <>

            <div className="stock-preview">

              <div>
                <small>
                  STOK GUDANG
                </small>

                <b>
                  {fmt(gudangBase)} {config?.base_unit||selected.unit}
                </b>
              </div>

              <div>
                →
              </div>

              <div>
                <small>
                  TOTAL OPERASIONAL
                </small>

                <b>
                  {fmt(operationalBase)} {config?.base_unit||selected.unit}
                </b>

                <small>
                  Kasir + Kitchen
                </small>
              </div>

            </div>


            {/* KONVERSI */}

            <div className="hint">

              <b>
                Konversi {operationalArea==='kasir'?'Kasir':'Kitchen'}
              </b>

              <br/>

              1 {config?.base_unit||selected.unit}
              {' = '}
              {fmt(areaCfg.perBase)}
              {' '}
              {areaCfg.unit}

            </div>


            {/* STOK AREA */}

            <div className="hint">

              Stok operasional ekuivalen untuk
              {' '}
              <b>
                {operationalArea==='kasir'
                  ?'Kasir'
                  :'Kitchen'}
              </b>

              :

              {' '}

              <b>
                {fmt(operationalAreaQty)}
                {' '}
                {areaCfg.unit}
              </b>

            </div>

          </>

        )}


        {/* JUMLAH TRANSFER */}

        <label>
          Jumlah Transfer
          {' '}
          {selected&&(
            <span>
              ({areaCfg.unit})
            </span>
          )}

          <input
            type="number"
            min="0.001"
            max={
              selected
                ? maxAreaQty
                : undefined
            }
            step="0.001"
            value={qty}
            onChange={e=>{
              setQty(e.target.value);
              setMsg('');
            }}
            disabled={loading||configLoading}
            required
          />
        </label>


        {/* VALIDASI / INFO MAKSIMAL */}

        {selected&&(

          <div
            className={
              invalid
                ?'error'
                :'hint'
            }
          >

            {invalid ? (

              <>
                Jumlah transfer melebihi
                stok gudang.

                <br/>

                Maksimal:
                {' '}

                <b>
                  {fmt(maxAreaQty)}
                  {' '}
                  {areaCfg.unit}
                </b>
              </>

            ) : (

              <>
                Maksimal transfer:
                {' '}

                <b>
                  {fmt(maxAreaQty)}
                  {' '}
                  {areaCfg.unit}
                </b>

                {amount>0&&(
                  <>
                    {' '}
                    (
                    {fmt(baseEquivalent)}
                    {' '}
                    {config?.base_unit||selected.unit}
                    )
                  </>
                )}

              </>

            )}

          </div>

        )}


        {/* CATATAN */}

        <label>
          Catatan

          <input
            value={note}
            onChange={e=>setNote(e.target.value)}
            placeholder="Contoh: Pengambilan stok untuk operasional"
          />
        </label>


        {/* BUTTON */}

        <button
          type="submit"
          disabled={
            saving||
            loading||
            configLoading||
            !selected||
            invalid
          }
        >
          {saving
            ?'Menyimpan…'
            :'Transfer Stok'}
        </button>


        {/* MESSAGE */}

        {msg&&(

          <div
            className={
              msg.toLowerCase().includes('berhasil')
                ?'success'
                :'error'
            }
          >
            {msg}
          </div>

        )}

      </form>

    </Page>
  );
}

function Opname({storeId}){
 const {items,loading,reload}=useStock(storeId); const [productId,setProductId]=useState(''),[physical,setPhysical]=useState(''),[waste,setWaste]=useState('0'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[result,setResult]=useState(null),[msg,setMsg]=useState('');
 const selected=items.find(x=>x.id===productId);
 async function submit(e){e.preventDefault();setMsg('');setResult(null);if(!selected)return setMsg('Pilih produk terlebih dahulu.');const qty=Number(physical),w=Number(waste||0);if(!Number.isFinite(qty)||qty<0)return setMsg('Sisa stok tidak boleh kurang dari 0.');if(!Number.isFinite(w)||w<0)return setMsg('Waste tidak boleh kurang dari 0.');setSaving(true);try{const {data,error}=await supabase.rpc('record_operational_stock_snapshot',{p_store_id:storeId,p_product_id:productId,p_physical_qty:qty,p_waste_qty:w,p_note:note.trim()||null});if(error)setMsg(error.message);else{setResult(data);setMsg('Sisa stok operasional berhasil disimpan.');setPhysical('');setWaste('0');setNote('');await reload()}}catch(err){setMsg(err?.message||'Terjadi kesalahan saat menyimpan.')}finally{setSaving(false)}}
 return <Page title="Input Sisa" subtitle="Input sisa operasional gabungan Kasir + Kitchen"><form className="card form" onSubmit={submit}><div className="notice">Sisa yang dimasukkan adalah total fisik gabungan Kasir + Kitchen. Sistem otomatis mengganti saldo operasional dengan sisa terbaru dan menghitung Stok Akhir = Gudang + Operasional.</div><label>Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setMsg('');setResult(null)}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — operasional {fmt(x.operasional_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Sebelum input: Gudang <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b> · Operasional <b>{fmt(selected.operasional_qty)} {baseUnit(selected)}</b> · Stok Akhir <b>{fmt(selected.ending_qty)} {baseUnit(selected)}</b></div>}<label>Sisa fisik operasional (Kasir + Kitchen)<input type="number" min="0" step="0.001" value={physical} onChange={e=>setPhysical(e.target.value)} required placeholder="Masukkan total sisa fisik"/></label><label>Waste<input type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Opsional"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Sisa Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}{result&&<div className="result"><b>Snapshot stok tersimpan</b><div>Stok Awal: {fmt(result.opening_qty)}</div><div>Pemakaian: {fmt(result.usage_qty)}</div><div>Stok Akhir: {fmt(result.ending_qty)}</div><div>Operasional terbaru: {fmt(result.operational_after)}</div></div>}</form></Page>
}

function History({storeId}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');async function load(){if(!storeId)return;setLoading(true);const {data,error}=await supabase.from('stock_transactions').select('id,product_id,area,transaction_type,qty,note,created_at,products(name,unit),profiles(full_name)').eq('store_id',storeId).order('created_at',{ascending:false}).limit(50);if(error)setError(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[storeId]);useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-history-'+storeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);return <Page title="Riwayat" subtitle="50 transaksi terbaru"><div className="history">{loading?<p>Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p>Belum ada transaksi.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{r.transaction_type} · {r.area}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID')}</time></div>)}</div></Page>}
function CrewStock({storeId}){
 const {items,loading,error}=useStock(storeId);
 const low=items.filter(x=>x.ending_qty<=Number(x.min_stock||0));
 return <Page title="Stok" subtitle="Tampilan stok sama seperti Stok Gudang Leader">
  {error&&<div className="error">{error}</div>}
  <div className="crew-summary"><div><span>Produk Menipis</span><b>{loading?'…':low.length}</b></div><div><span>Produk Aktif</span><b>{loading?'…':items.length}</b></div></div>
  <div className="table-wrap">{loading?<div className="empty">Memuat stok…</div>:items.length===0?<div className="empty">Belum ada produk aktif.</div>:
   <table><thead><tr><th>Produk</th><th>Satuan</th><th>Stok Awal</th><th>Pemakaian</th><th>Stok Akhir</th><th>Status</th></tr></thead>
   <tbody>{items.map(x=><tr key={x.id}>
    <td><b>{x.name}</b><small>{x.code}</small></td>
    <td>{baseUnit(x)}</td>
    <td>{fmt(x.opening_qty)} {baseUnit(x)}</td>
    <td>{fmt(x.usage_qty)} {baseUnit(x)}</td>
    <td><b>{fmt(x.ending_qty)} {baseUnit(x)}</b><small>Gudang {fmt(x.gudang_qty)} + Operasional {fmt(x.operasional_qty)}</small></td>
    <td><Status item={{...x,operasional_qty:x.ending_qty}}/></td>
   </tr>)}</tbody></table>}
  </div>
 </Page>
}

function MyHistory({storeId}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');async function load(){if(!storeId)return;setLoading(true);const {data:user}=await supabase.auth.getUser();if(!user?.user){setLoading(false);return}const {data,error}=await supabase.from('stock_transactions').select('id,area,transaction_type,qty,note,created_at,products(name,unit)').eq('store_id',storeId).eq('created_by',user.user.id).order('created_at',{ascending:false}).limit(50);if(error)setError(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[storeId]);useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-my-history-'+storeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);return <Page title="Riwayat Saya" subtitle="Aktivitas stok yang kamu input"><div className="history">{loading?<p className="empty">Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p className="empty">Belum ada aktivitas stok dari akun ini.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{friendlyType(r.transaction_type)} · {r.area==='operasional'?'Operasional':'Gudang'}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>)}</div></Page>}
function friendlyType(t){return ({stock_in:'Stok masuk',transfer_in:'Stok masuk operasional',transfer_out:'Transfer keluar',adjustment:'Penyesuaian',waste:'Waste'})[t]||t.replaceAll('_',' ')}

function Page({title,subtitle,children}){return <div className="page"><div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</div>}

function Products(){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const blank={id:null,code:'',name:'',category:'',unit:'pcs',min_stock:0,max_stock:0,active:true};
 const [form,setForm]=useState(blank);
 async function load(){setLoading(true);const {data,error}=await supabase.from('products').select('*').order('name');if(error)setError(error.message);setRows(data||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 function edit(r){setForm({...r})}
 function reset(){setForm(blank)}
 async function save(e){e.preventDefault();setSaving(true);setError('');const payload={p_product_id:form.id,p_code:form.code.trim(),p_name:form.name.trim(),p_category:form.category?.trim()||null,p_unit:form.unit||'pcs',p_min_stock:Number(form.min_stock||0),p_max_stock:Number(form.max_stock||0),p_active:!!form.active};let result;if(form.id){result=await supabase.rpc('update_product_master',payload)}else{result=await supabase.from('products').insert({code:payload.p_code,name:payload.p_name,category:payload.p_category,unit:payload.p_unit,min_stock:payload.p_min_stock,max_stock:payload.p_max_stock,active:payload.p_active})}const {error}=result;if(error)setError(error.message);else{reset();await load()}setSaving(false)}
 async function toggle(r){setSaving(true);setError('');const {error}=await supabase.rpc('set_product_active',{p_product_id:r.id,p_active:!r.active});if(error)setError(error.message);else await load();setSaving(false)}
 return <Page title="Master Produk" subtitle="Kelola produk, satuan dan batas stok"><div className="split"><form className="card form" onSubmit={save}><h3>{form.id?'Edit Produk':'Tambah Produk'}</h3><label>Kode Produk<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/></label><label>Nama Produk<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Kategori<input value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Satuan<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><div className="two"><label>Min Stock<input type="number" min="0" step="0.001" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})}/></label><label>Max Stock<input type="number" min="0" step="0.001" value={form.max_stock} onChange={e=>setForm({...form,max_stock:e.target.value})}/></label></div><label className="check"><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Produk aktif</label><div className="actions"><button disabled={saving}>{saving?'Menyimpan…':form.id?'Simpan Perubahan':'Tambah Produk'}</button>{form.id&&<button type="button" className="secondary" onClick={reset}>Batal</button>}</div>{error&&<div className="error">{error}</div>}</form><div className="table-wrap">{loading?<p>Memuat produk…</p>:rows.length===0?<p>Belum ada produk. Tambahkan produk pertama.</p>:<table><thead><tr><th>Produk</th><th>Kategori</th><th>Satuan</th><th>Min/Max</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.code}</small></td><td>{r.category||'-'}</td><td>{r.unit}</td><td>{fmt(r.min_stock)} / {fmt(r.max_stock)}</td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" onClick={()=>edit(r)}>Edit</button><button className="smallbtn" onClick={()=>toggle(r)}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}</div></div></Page>
}

function Users(){
 const [rows,setRows]=useState([]),[stores,setStores]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 async function load(){setLoading(true);const [{data:u,error:ue},{data:s,error:se}]=await Promise.all([supabase.from('profiles').select('id,full_name,role,store_id,active,created_at,stores(name,code)').order('full_name'),supabase.from('stores').select('id,name,code').eq('active',true).order('name')]);if(ue||se)setError((ue||se).message);setRows(u||[]);setStores(s||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function update(id,patch){setSaving(true);setError('');const {error}=await supabase.from('profiles').update(patch).eq('id',id);if(error)setError(error.message);else await load();setSaving(false)}
 return <Page title="User / Role" subtitle="Kelola role, store dan status pengguna"><div className="notice">Akun login dibuat melalui Supabase Auth. Di sini Admin mengatur profil, role, store dan status aktif pengguna.</div><div className="table-wrap">{loading?<p>Memuat pengguna…</p>:rows.length===0?<p>Belum ada profil pengguna.</p>:<table><thead><tr><th>Pengguna</th><th>Role</th><th>Store</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.full_name||'Tanpa Nama'}</b><small>{r.id.slice(0,8)}…</small></td><td><select value={r.role} disabled={saving} onChange={e=>update(r.id,{role:e.target.value})}><option value="admin">Admin</option><option value="store_leader">Store Leader</option><option value="team_leader">Team Leader</option><option value="crew">Crew</option></select></td><td><select value={r.store_id||''} disabled={saving} onChange={e=>update(r.id,{store_id:e.target.value||null})}><option value="">-</option>{stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" disabled={saving} onClick={()=>update(r.id,{active:!r.active})}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}{error&&<div className="error">{error}</div>}</div></Page>
}
