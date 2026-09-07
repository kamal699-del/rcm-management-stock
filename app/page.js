'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';

const baseMenu=[['dashboard','Dashboard'],['stockin','Input Stok Gudang'],['warehouse','Stok Gudang'],['transfer','Transfer'],['opname','Input Sisa'],['history','Riwayat'],['products','Master Produk'],['users','User / Role']];
const canRevise=(role)=>['admin','store_leader','team_leader'].includes(role);
const fmt=(n)=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:3});
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const unitCfg=(p,area)=>({unit:area==='kasir'?(p?.kasir_unit||p?.base_unit||p?.unit):(p?.kitchen_unit||p?.base_unit||p?.unit),perBase:Math.max(num(area==='kasir'?p?.kasir_per_base:p?.kitchen_per_base,1),0.000001)});
const toBase=(qty,p,area)=>num(qty)*unitCfg(p,area).perBase;
const fromBase=(qty,p,area)=>num(qty)/unitCfg(p,area).perBase;

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
 const [rows,setRows]=useState([]),[products,setProducts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){if(!storeId)return;setLoading(true);const [{data:b,error:be},{data:p,error:pe}]=await Promise.all([supabase.from('stock_balances').select('*').eq('store_id',storeId),supabase.from('products').select('id,code,name,category,unit,base_unit,kasir_unit,kasir_per_base,kitchen_unit,kitchen_per_base,min_stock,max_stock').eq('active',true).order('name')]);if(be||pe)setError((be||pe).message);setRows(b||[]);setProducts(p||[]);setLoading(false)}
 useEffect(()=>{load()},[storeId]);
 useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-stock-'+storeId).on('postgres_changes',{event:'*',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);
 const merged=useMemo(()=>products.map(p=>{const b=rows.find(x=>x.product_id===p.id)||{};return {...p,gudang_qty:Number(b.gudang_qty||0),operasional_qty:Number(b.operasional_qty||0)}}),[products,rows]);
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
    {low.length===0?<div className="empty">Tidak ada produk kritis. 👍</div>:<div className="critical-list">{low.slice(0,6).map(x=><div className="critical-row" key={x.id}><div><b>{x.name}</b><small>{x.code} · Min {fmt(x.min_stock)} {x.unit}</small></div><strong>{fmt(x.operasional_qty)} {x.base_unit||x.unit}</strong></div>)}</div>}
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

function StockIn({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);async function submit(e){e.preventDefault();setSaving(true);setMsg('');const amount=Number(qty);if(!Number.isFinite(amount)||amount<=0){setMsg('Jumlah stok harus lebih dari 0.');setSaving(false);return}const {error}=await supabase.rpc('record_stock_in',{p_store_id:storeId,p_product_id:productId,p_qty:amount,p_note:note||null});if(error)setMsg(error.message);else{setMsg('Stok gudang berhasil ditambahkan.');setQty('');setNote('');await reload()}setSaving(false)}return <Page title="Input Stok Gudang" subtitle="Tambah stok masuk ke gudang"><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — gudang {fmt(x.gudang_qty)} {x.base_unit||x.unit}</option>)}</select></label>{selected&&<div className="hint">Stok gudang saat ini: <b>{fmt(selected.gudang_qty)} {selected.unit}</b></div>}<label>Jumlah stok masuk<input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required placeholder="Contoh: 10"/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Penerimaan supplier"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'＋ Tambah Stok Gudang'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

function Warehouse({storeId,role}){const {items,loading,error}=useStock(storeId);return <Page title="Stok Gudang" subtitle="Saldo stok terkini"><div className="table-wrap">{loading?<p>Memuat stok…</p>:error?<div className="error">{error}</div>:<table><thead><tr><th>Produk</th><th>Satuan</th><th>Gudang</th><th>Total Operasional</th><th>Status</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><b>{x.name}</b><small>{x.code}</small></td><td>{x.unit}</td><td>{fmt(x.gudang_qty)}</td><td>{fmt(x.operasional_qty)}</td><td><Status item={x}/></td></tr>)}</tbody></table>}</div>{role&&<div className="notice">Role aktif: {role}</div>}</Page>}
function Status({item}){if(item.operasional_qty<=Number(item.min_stock||0))return <span className="badge danger">Menipis</span>;if(item.max_stock&&item.operasional_qty>=Number(item.max_stock))return <span className="badge warn">Penuh</span>;return <span className="badge ok">Normal</span>}

function ReviseWarehouseStock({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[unit,setUnit]=useState('pcs'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);useEffect(()=>{if(selected){setQty(String(selected.gudang_qty||0));setUnit(selected.unit||'pcs');}},[productId]);async function submit(e){e.preventDefault();setSaving(true);setMsg('');const amount=Number(qty);if(!Number.isFinite(amount)||amount<0){setMsg('Stok baru harus 0 atau lebih.');setSaving(false);return}if(!selected){setMsg('Pilih produk terlebih dahulu.');setSaving(false);return}if(Math.abs(amount-Number(selected.gudang_qty||0))<0.0000001 && unit===selected.unit){setMsg('Tidak ada perubahan stok atau satuan.');setSaving(false);return}if(!note.trim()){setMsg('Catatan revisi wajib diisi agar perubahan dapat ditelusuri.');setSaving(false);return}const {error}=await supabase.rpc('record_warehouse_stock_revision',{p_store_id:storeId,p_product_id:productId,p_new_qty:amount,p_note:note.trim(),p_unit:unit});if(error)setMsg(error.message);else{setMsg('Revisi stok gudang dan satuan berhasil disimpan.');setNote('');await reload()}setSaving(false)}return <Page title="Revisi Stok Gudang" subtitle="Rubah stok gudang dengan catatan audit"><div className="notice">Menu ini hanya dapat diakses Admin, Store Leader, dan Team Leader. Setiap perubahan otomatis tercatat sebagai adjustment di Riwayat.</div><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — stok gudang {fmt(x.gudang_qty)} {x.base_unit||x.unit}</option>)}</select></label>{selected&&<div className="hint">Stok saat ini: <b>{fmt(selected.gudang_qty)} {selected.unit}</b></div>}<label>Satuan<select value={unit} onChange={e=>setUnit(e.target.value)} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><label>Stok gudang setelah revisi<input type="number" min="0" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label><label>Alasan / Catatan Revisi<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Koreksi hasil pengecekan fisik" required/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Revisi Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

function Transfer({storeId}){
 const {items,loading,reload}=useStock(storeId);
 const [productId,setProductId]=useState(''),[operationalArea,setOperationalArea]=useState('kitchen'),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 const selected=items.find(x=>x.id===productId); const amount=Number(qty||0); const invalid=!!selected&&(amount<=0||amount>selected.gudang_qty);
 async function submit(e){e.preventDefault();setMsg('');if(!selected)return setMsg('Pilih produk terlebih dahulu.');if(amount<=0)return setMsg('Jumlah transfer harus lebih dari 0.');if(amount>selected.gudang_qty)return setMsg('Jumlah melebihi stok gudang yang tersedia.');setSaving(true);const {error}=await supabase.rpc('record_stock_transfer',{p_store_id:storeId,p_product_id:productId,p_qty:amount,p_note:note.trim()||null,p_operational_area:operationalArea});if(error)setMsg(error.message);else{setMsg('Transfer berhasil. Stok gudang dan total operasional sudah diperbarui.');setQty('');setNote('');await reload()}setSaving(false)}
 return <Page title="Transfer Stok" subtitle="Gudang → Operasional"><div className="notice">Pilih tujuan Kasir atau Kitchen. Saldo operasional di aplikasi tetap dihitung sebagai satu total gabungan Kasir + Kitchen.</div><form className="card form" onSubmit={submit}>
  <label>Tujuan Operasional<select value={operationalArea} onChange={e=>setOperationalArea(e.target.value)} required><option value="kasir">Kasir</option><option value="kitchen">Kitchen</option></select></label>
  <label>Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setQty('');setMsg('')}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — gudang {fmt(x.gudang_qty)} {x.base_unit||x.unit}</option>)}</select></label>
  {selected&&<div className="stock-preview"><div><small>STOK GUDANG</small><b>{fmt(selected.gudang_qty)} {selected.unit}</b></div><div>→</div><div><small>TOTAL OPERASIONAL</small><b>{fmt(selected.operasional_qty)} {selected.unit}</b><small>Tujuan: {operationalArea==='kasir'?'Kasir':'Kitchen'}</small></div></div>}
  <label>Jumlah Transfer<input type="number" min="0.001" max={selected?.gudang_qty||undefined} step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label>
  {selected&&<div className={invalid?'error':'hint'}>{invalid?'Jumlah tidak boleh melebihi stok gudang.':<>Maksimal transfer: <b>{fmt(selected.gudang_qty)} {selected.unit}</b></>}</div>}
  <label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Pengambilan stok untuk operasional"/></label>
  <button disabled={saving||loading||invalid}>{saving?'Menyimpan…':'Transfer Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}
 </form></Page>
}

function Opname({storeId}){
 const {items,loading,reload}=useStock(storeId); const [productId,setProductId]=useState(''),[operationalArea,setOperationalArea]=useState('kitchen'),[areaSystem,setAreaSystem]=useState(null),[physical,setPhysical]=useState(''),[waste,setWaste]=useState('0'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[result,setResult]=useState(null),[msg,setMsg]=useState('');
 const selected=items.find(x=>x.id===productId);
 useEffect(()=>{let live=true;async function loadArea(){if(!storeId||!productId){setAreaSystem(null);return}const {data,error}=await supabase.from('operational_area_balances').select('qty').eq('store_id',storeId).eq('product_id',productId).eq('operational_area',operationalArea).maybeSingle();if(live)setAreaSystem(error?null:Number(data?.qty||0))}loadArea();return()=>{live=false}},[storeId,productId,operationalArea]);
 async function submit(e){e.preventDefault();setSaving(true);setMsg('');setResult(null);const {data,error}=await supabase.rpc('record_operational_opname',{p_store_id:storeId,p_product_id:productId,p_physical_stock:Number(physical),p_waste_qty:Number(waste||0),p_note:note||null,p_operational_area:operationalArea});if(error)setMsg(error.message);else{setResult(data);setPhysical('');setWaste('0');setNote('');await reload()}setSaving(false)}
 return <Page title="Input Sisa" subtitle="Opname stok operasional"><form className="card form" onSubmit={submit}><label>Area Operasional<select value={operationalArea} onChange={e=>setOperationalArea(e.target.value)} required><option value="kasir">Kasir</option><option value="kitchen">Kitchen</option></select></label><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — total operasional {fmt(x.operasional_qty)} {x.base_unit||x.unit}</option>)}</select></label>{selected&&<div className="hint">Sistem {operationalArea==='kasir'?'Kasir':'Kitchen'}: <b>{fmt(areaSystem)} {selected.unit}</b> · Total operasional: <b>{fmt(selected.operasional_qty)} {selected.unit}</b></div>}<label>Sisa fisik<input type="number" min="0" step="0.001" value={physical} onChange={e=>setPhysical(e.target.value)} required/></label><label>Waste<input type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Opsional"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'Simpan Opname'}</button>{msg&&<div className="error">{msg}</div>}{result&&<div className="result"><b>Opname tersimpan</b><div>Area: {result.operational_area==='kasir'?'Kasir':'Kitchen'}</div><div>Pemakaian: {fmt(result.usage_qty)}</div><div>Waste: {fmt(result.waste_qty)}</div><div>Surplus: {fmt(result.surplus_qty)}</div></div>}</form></Page>}

function History({storeId}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');async function load(){if(!storeId)return;setLoading(true);const {data,error}=await supabase.from('stock_transactions').select('id,product_id,area,transaction_type,qty,note,created_at,products(name,unit),profiles(full_name)').eq('store_id',storeId).order('created_at',{ascending:false}).limit(50);if(error)setError(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[storeId]);useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-history-'+storeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);return <Page title="Riwayat" subtitle="50 transaksi terbaru"><div className="history">{loading?<p>Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p>Belum ada transaksi.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{r.transaction_type} · {r.area}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID')}</time></div>)}</div></Page>}
function CrewStock({storeId}){
 const {items,loading,error}=useStock(storeId);
 const low=items.filter(x=>x.operasional_qty<=Number(x.min_stock||0));
 return <Page title="Stok" subtitle="Cek stok dengan cepat">
  {error&&<div className="error">{error}</div>}
  <div className="crew-summary"><div><span>Produk Menipis</span><b>{loading?'…':low.length}</b></div><div><span>Produk Aktif</span><b>{loading?'…':items.length}</b></div></div>
  <div className="crew-stock-list">{loading?<div className="empty">Memuat stok…</div>:items.length===0?<div className="empty">Belum ada produk aktif.</div>:items.map(x=>{
   const isLow=x.operasional_qty<=Number(x.min_stock||0);
   return <div className={'crew-stock-card '+(isLow?'is-low':'')} key={x.id}><div className="crew-product"><b>{x.name}</b><small>{x.code} · {x.base_unit||x.unit}</small></div><div className="crew-stock-values"><div><span>Gudang</span><strong>{fmt(x.gudang_qty)}</strong></div><div><span>Total Operasional</span><strong>{fmt(x.operasional_qty)}</strong></div></div><span className={'badge '+(isLow?'danger':'ok')}>{isLow?'Menipis':'Normal'}</span></div>})}</div>
 </Page>
}

function CrewOpname({storeId}){
 const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[operationalArea,setOperationalArea]=useState('kitchen'),[areaSystem,setAreaSystem]=useState(null),[physical,setPhysical]=useState(''),[waste,setWaste]=useState('0'),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);const cfg=selected?unitCfg(selected,operationalArea):{unit:'-',perBase:1};
 useEffect(()=>{let live=true;async function loadArea(){if(!storeId||!productId){setAreaSystem(null);return}try{const {data}=await supabase.from('operational_area_balances').select('qty').eq('store_id',storeId).eq('product_id',productId).eq('operational_area',operationalArea).maybeSingle();if(live)setAreaSystem(num(data?.qty))}catch{if(live)setAreaSystem(null)}}loadArea();return()=>{live=false}},[storeId,productId,operationalArea]);
 async function submit(e){e.preventDefault();setMsg('');if(!selected)return setMsg('Pilih produk terlebih dahulu.');const q=num(physical,-1),w=num(waste,0);if(q<0)return setMsg('Sisa fisik tidak boleh kurang dari 0.');if(w<0)return setMsg('Waste tidak boleh kurang dari 0.');setSaving(true);try{const basePhysical=toBase(q,selected,operationalArea),baseWaste=toBase(w,selected,operationalArea);const {error}=await supabase.rpc('record_operational_opname',{p_store_id:storeId,p_product_id:productId,p_physical_stock:basePhysical,p_waste_qty:baseWaste,p_note:null,p_operational_area:operationalArea});if(error)throw error;setMsg(`Sisa ${selected.name} berhasil disimpan. ${q} ${cfg.unit} = ${fmt(basePhysical)} ${selected.base_unit||selected.unit}.`);setPhysical('');setWaste('0');await reload()}catch(e){setMsg(e?.message||'Gagal menyimpan sisa stok.')}finally{setSaving(false)}}
 return <Page title="Input Sisa" subtitle="Masukkan sisa stok sesuai satuan area"><div className="crew-tip">💡 Sisa Kasir dan Kitchen dikonversi otomatis ke <b>satuan dasar</b>, lalu digabung menjadi Stok Operasional.</div><form className="card form crew-form" onSubmit={submit}><label>1. Pilih Area<select value={operationalArea} onChange={e=>setOperationalArea(e.target.value)} required><option value="kasir">Kasir</option><option value="kitchen">Kitchen</option></select></label><label>2. Pilih Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setMsg('')}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — {x.base_unit||x.unit}</option>)}</select></label>{selected&&<div className="crew-current"><span>Sistem {operationalArea==='kasir'?'Kasir':'Kitchen'} · Satuan input</span><b>{fmt(areaSystem)} {selected.base_unit||selected.unit} base · {cfg.unit}</b><small>1 {selected.base_unit||selected.unit} = {fmt(cfg.perBase)} {cfg.unit}</small></div>}<label>3. Sisa Fisik ({cfg.unit})<input className="crew-big-input" type="number" min="0" step="0.001" value={physical} onChange={e=>setPhysical(e.target.value)} required placeholder={`Contoh: 12 ${cfg.unit}`}/></label><div className="hint">Konversi otomatis: <b>{physical||0} {cfg.unit} = {fmt(toBase(num(physical),selected,operationalArea))} {selected?.base_unit||selected?.unit||''}</b></div><details className="crew-optional"><summary>Tambah waste (opsional)</summary><label>Waste ({cfg.unit})<input type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></label></details><button className="crew-save" disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Sisa Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>
}
function MyHistory({storeId}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');async function load(){if(!storeId)return;setLoading(true);const {data:user}=await supabase.auth.getUser();if(!user?.user){setLoading(false);return}const {data,error}=await supabase.from('stock_transactions').select('id,area,transaction_type,qty,note,created_at,products(name,unit)').eq('store_id',storeId).eq('created_by',user.user.id).order('created_at',{ascending:false}).limit(50);if(error)setError(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[storeId]);useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-my-history-'+storeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);return <Page title="Riwayat Saya" subtitle="Aktivitas stok yang kamu input"><div className="history">{loading?<p className="empty">Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p className="empty">Belum ada aktivitas stok dari akun ini.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{friendlyType(r.transaction_type)} · {r.area==='operasional'?'Operasional':'Gudang'}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>)}</div></Page>}
function friendlyType(t){return ({stock_in:'Stok masuk',transfer_in:'Stok masuk operasional',transfer_out:'Transfer keluar',adjustment:'Penyesuaian',waste:'Waste'})[t]||t.replaceAll('_',' ')}

function Page({title,subtitle,children}){return <div className="page"><div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</div>}

function Products(){
 const blank={id:null,code:'',name:'',category:'',unit:'pcs',base_unit:'pcs',kasir_unit:'pcs',kasir_per_base:1,kitchen_unit:'pcs',kitchen_per_base:1,min_stock:0,max_stock:0,active:true};
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState(blank);
 const set=(k,v)=>setForm(f=>({...f,[k]:v}));
 async function load(){setLoading(true);setError('');try{const {data,error}=await supabase.from('products').select('*').order('name');if(error)throw error;setRows(data||[])}catch(e){setError(e?.message||'Gagal memuat master produk.')}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 function edit(r){setNotice('');setError('');setForm({...blank,...r,base_unit:r.base_unit||r.unit||'pcs',kasir_unit:r.kasir_unit||r.base_unit||r.unit||'pcs',kasir_per_base:num(r.kasir_per_base,1),kitchen_unit:r.kitchen_unit||r.base_unit||r.unit||'pcs',kitchen_per_base:num(r.kitchen_per_base,1),min_stock:num(r.min_stock),max_stock:num(r.max_stock),active:r.active!==false})}
 function reset(){setForm(blank);setError('');setNotice('')}
 function validate(){
  const min=num(form.min_stock),max=num(form.max_stock); if(!form.code.trim()||!form.name.trim())return 'Kode dan nama produk wajib diisi.';
  if(min<0||max<0)return 'Min/Max Stock tidak boleh negatif.'; if(max>0&&max<min)return 'Max Stock tidak boleh lebih kecil dari Min Stock.';
  if(num(form.kasir_per_base)<=0||num(form.kitchen_per_base)<=0)return 'Nilai konversi Kasir dan Kitchen harus lebih dari 0.';
  return '';
 }
 async function save(e){e.preventDefault();setSaving(true);setError('');setNotice('');try{
   const v=validate();if(v){setError(v);return}
   const product={code:form.code.trim(),name:form.name.trim(),category:form.category?.trim()||null,unit:form.base_unit||'pcs',base_unit:form.base_unit||'pcs',kasir_unit:form.kasir_unit||form.base_unit||'pcs',kasir_per_base:num(form.kasir_per_base,1),kitchen_unit:form.kitchen_unit||form.base_unit||'pcs',kitchen_per_base:num(form.kitchen_per_base,1),min_stock:num(form.min_stock),max_stock:num(form.max_stock),active:!!form.active};
   let result;
   if(form.id) result=await supabase.from('products').update(product).eq('id',form.id);
   else result=await supabase.from('products').insert(product);
   if(result.error)throw result.error;
   setNotice(form.id?'Perubahan produk dan konversi berhasil disimpan.':'Produk dan konfigurasi konversi berhasil ditambahkan.');reset();await load();
  }catch(e){setError(e?.message||'Gagal menyimpan produk.')}finally{setSaving(false)}}
 async function toggle(r){setSaving(true);setError('');setNotice('');try{const {error}=await supabase.from('products').update({active:!r.active}).eq('id',r.id);if(error)throw error;await load()}catch(e){setError(e?.message||'Gagal mengubah status produk.')}finally{setSaving(false)}}
 return <Page title="Master Produk" subtitle="Kelola produk, satuan dasar, konversi Kasir/Kitchen dan batas stok">
  <div className="notice"><b>Konversi stok operasional:</b> semua saldo Kasir + Kitchen dihitung dalam <b>Satuan Dasar</b>. Contoh: 12 pcs Beras Kasir × 1 kg ÷ 12 pcs = 1 kg, lalu Kitchen 5 kg → total operasional 6 kg.</div>
  <div className="split"><form className="card form" onSubmit={save}>
   <h3>{form.id?'Edit Produk':'Tambah Produk'}</h3>
   <label>Kode Produk<input value={form.code} onChange={e=>set('code',e.target.value)} required/></label>
   <label>Nama Produk<input value={form.name} onChange={e=>set('name',e.target.value)} required/></label>
   <label>Kategori<input value={form.category||''} onChange={e=>set('category',e.target.value)}/></label>
   <div className="notice"><b>Satuan Dasar (Base Unit)</b><small>Semua stok gabungan dan Min/Max menggunakan satuan ini.</small><select value={form.base_unit} onChange={e=>set('base_unit',e.target.value)} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option><option value="liter">liter</option><option value="ml">ml</option><option value="box">box</option><option value="pack">pack</option></select></div>
   <div className="card" style={{padding:12,marginBottom:12}}><h4 style={{marginTop:0}}>Konversi Kasir → Satuan Dasar</h4><label>Satuan Kasir<select value={form.kasir_unit} onChange={e=>set('kasir_unit',e.target.value)} required><option value="pcs">pcs</option><option value="gr">gr</option><option value="kg">kg</option><option value="ml">ml</option><option value="liter">liter</option><option value="box">box</option><option value="pack">pack</option></select></label><label>Berapa {form.kasir_unit} = 1 {form.base_unit}<input type="number" min="0.000001" step="0.000001" value={form.kasir_per_base} onChange={e=>set('kasir_per_base',e.target.value)} required/></label><small>Contoh Beras: 12 pcs = 1 kg → isi 12.</small></div>
   <div className="card" style={{padding:12,marginBottom:12}}><h4 style={{marginTop:0}}>Konversi Kitchen → Satuan Dasar</h4><label>Satuan Kitchen<select value={form.kitchen_unit} onChange={e=>set('kitchen_unit',e.target.value)} required><option value="kg">kg</option><option value="gr">gr</option><option value="pcs">pcs</option><option value="ml">ml</option><option value="liter">liter</option><option value="box">box</option><option value="pack">pack</option></select></label><label>Berapa {form.kitchen_unit} = 1 {form.base_unit}<input type="number" min="0.000001" step="0.000001" value={form.kitchen_per_base} onChange={e=>set('kitchen_per_base',e.target.value)} required/></label><small>Jika sama dengan base, isi 1.</small></div>
   <div className="two"><label>Min Stock ({form.base_unit})<input type="number" min="0" step="0.001" value={form.min_stock} onChange={e=>set('min_stock',e.target.value)}/></label><label>Max Stock ({form.base_unit})<input type="number" min="0" step="0.001" value={form.max_stock} onChange={e=>set('max_stock',e.target.value)}/></label></div>
   <label className="check"><input type="checkbox" checked={!!form.active} onChange={e=>set('active',e.target.checked)}/> Produk aktif</label>
   <div className="actions"><button disabled={saving}>{saving?'Menyimpan…':form.id?'Simpan Perubahan':'Tambah Produk'}</button>{form.id&&<button type="button" className="secondary" disabled={saving} onClick={reset}>Batal</button>}</div>
   {notice&&<div className="success">{notice}</div>}{error&&<div className="error">{error}</div>}
  </form>
  <div className="table-wrap">{loading?<p>Memuat produk…</p>:rows.length===0?<p>Belum ada produk. Tambahkan produk pertama.</p>:<table><thead><tr><th>Produk</th><th>Base</th><th>Kasir</th><th>Kitchen</th><th>Min/Max</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.code}</small></td><td>{r.base_unit||r.unit||'-'}</td><td>{r.kasir_unit||r.base_unit||r.unit} = {fmt(r.kasir_per_base||1)} / base</td><td>{r.kitchen_unit||r.base_unit||r.unit} = {fmt(r.kitchen_per_base||1)} / base</td><td>{fmt(r.min_stock)} / {fmt(r.max_stock)}</td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" disabled={saving} onClick={()=>edit(r)}>Edit</button><button className="smallbtn" disabled={saving} onClick={()=>toggle(r)}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}</div></div></Page>
}
function Users(){
 const [rows,setRows]=useState([]),[stores,setStores]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 async function load(){setLoading(true);const [{data:u,error:ue},{data:s,error:se}]=await Promise.all([supabase.from('profiles').select('id,full_name,role,store_id,active,created_at,stores(name,code)').order('full_name'),supabase.from('stores').select('id,name,code').eq('active',true).order('name')]);if(ue||se)setError((ue||se).message);setRows(u||[]);setStores(s||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function update(id,patch){setSaving(true);setError('');const {error}=await supabase.from('profiles').update(patch).eq('id',id);if(error)setError(error.message);else await load();setSaving(false)}
 return <Page title="User / Role" subtitle="Kelola role, store dan status pengguna"><div className="notice">Akun login dibuat melalui Supabase Auth. Di sini Admin mengatur profil, role, store dan status aktif pengguna.</div><div className="table-wrap">{loading?<p>Memuat pengguna…</p>:rows.length===0?<p>Belum ada profil pengguna.</p>:<table><thead><tr><th>Pengguna</th><th>Role</th><th>Store</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.full_name||'Tanpa Nama'}</b><small>{r.id.slice(0,8)}…</small></td><td><select value={r.role} disabled={saving} onChange={e=>update(r.id,{role:e.target.value})}><option value="admin">Admin</option><option value="store_leader">Store Leader</option><option value="team_leader">Team Leader</option><option value="crew">Crew</option></select></td><td><select value={r.store_id||''} disabled={saving} onChange={e=>update(r.id,{store_id:e.target.value||null})}><option value="">-</option>{stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" disabled={saving} onClick={()=>update(r.id,{active:!r.active})}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}{error&&<div className="error">{error}</div>}</div></Page>
}
