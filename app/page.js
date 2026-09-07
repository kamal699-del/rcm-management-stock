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
 const leaderMenu=[...baseMenu.slice(0,3),...(canRevise(profile?.role)?[['revise','Revisi Stok Gudang'],['revise-operational','Revisi Stok Operasional']]:[]),...baseMenu.slice(3)];
 return <div className={'shell '+(isCrew?'crew-shell':'')}><aside><div className="sidebrand"><b>RCM</b><span>Management Stock</span></div><nav>{(isCrew?crewMenu:leaderMenu).map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav><button className="logout" onClick={logout}>Keluar</button></aside><main className="content"><header><div><small>STORE</small><h2>{profile?.stores?.name||'LC Rancamanyar'}</h2></div><div className="user">{profile?.full_name||session.user.email}<small>{profile?.role||'crew'}</small></div></header>{msg&&<div className="error top-error">{msg}</div>}<section>
 {isCrew&&tab==='crew-stock'&&<CrewStock storeId={storeId}/>} 
 {isCrew&&tab==='transfer'&&<Transfer storeId={storeId}/>} 
 {isCrew&&tab==='crew-opname'&&<CrewOpname storeId={storeId}/>} 
 {isCrew&&tab==='crew-history'&&<MyHistory storeId={storeId}/>} 
 {!isCrew&&tab==='dashboard'&&<Dashboard storeId={storeId} setTab={setTab}/>} 
 {!isCrew&&tab==='stockin'&&<StockIn storeId={storeId}/>} 
 {!isCrew&&tab==='warehouse'&&<Warehouse storeId={storeId} role={profile?.role}/>} 
 {!isCrew&&tab==='revise'&&canRevise(profile?.role)&&<ReviseWarehouseStock storeId={storeId}/>}
 {!isCrew&&tab==='revise-operational'&&canRevise(profile?.role)&&<ReviseOperationalStock storeId={storeId}/>} 
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
 const low=items.filter(x=>x.ending_qty<=Number(x.min_stock||0));
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
    {low.length===0?<div className="empty">Tidak ada produk kritis. 👍</div>:<div className="critical-list">{low.slice(0,6).map(x=><div className="critical-row" key={x.id}><div><b>{x.name}</b><small>{x.code} · Min {fmt(x.min_stock)} {baseUnit(x)}</small></div><strong>{fmt(x.ending_qty)} {baseUnit(x)}</strong></div>)}</div>}
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

function StockIn({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);async function submit(e){e.preventDefault();setSaving(true);setMsg('');try{const amount=Number(qty);if(!Number.isFinite(amount)||amount<=0)throw new Error('Jumlah stok harus lebih dari 0.');const {error}=await supabase.rpc('record_stock_in',{p_store_id:storeId,p_product_id:productId,p_qty:amount,p_note:note||null});if(error)throw error;setMsg('Stok gudang berhasil ditambahkan.');setQty('');setNote('');await reload()}catch(err){setMsg(err?.message||'Gagal menambahkan stok gudang.')}finally{setSaving(false)}}return <Page title="Input Stok Gudang" subtitle="Tambah stok masuk ke gudang"><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — gudang {fmt(x.gudang_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Stok gudang saat ini: <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b></div>}<label>Jumlah stok masuk<input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required placeholder="Contoh: 10"/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Penerimaan supplier"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'＋ Tambah Stok Gudang'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

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

function ReviseWarehouseStock({storeId}){const {items,loading,reload}=useStock(storeId);const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[unit,setUnit]=useState('pcs'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');const selected=items.find(x=>x.id===productId);useEffect(()=>{if(selected){setQty(String(selected.gudang_qty||0));setUnit(baseUnit(selected)||'pcs');}},[productId]);async function submit(e){e.preventDefault();setSaving(true);setMsg('');try{const amount=Number(qty);if(!Number.isFinite(amount)||amount<0)throw new Error('Stok baru harus 0 atau lebih.');if(!selected)throw new Error('Pilih produk terlebih dahulu.');if(Math.abs(amount-Number(selected.gudang_qty||0))<0.0000001&&unit===baseUnit(selected))throw new Error('Tidak ada perubahan stok atau satuan.');if(!note.trim())throw new Error('Catatan revisi wajib diisi agar perubahan dapat ditelusuri.');const {error}=await supabase.rpc('record_warehouse_stock_revision',{p_store_id:storeId,p_product_id:productId,p_new_qty:amount,p_note:note.trim(),p_unit:unit});if(error)throw error;setMsg('Revisi stok gudang dan satuan berhasil disimpan.');setNote('');await reload()}catch(err){setMsg(err?.message||'Gagal menyimpan revisi stok gudang.')}finally{setSaving(false)}}return <Page title="Revisi Stok Gudang" subtitle="Rubah stok gudang dengan catatan audit"><div className="notice">Menu ini hanya dapat diakses Admin, Store Leader, dan Team Leader. Setiap perubahan otomatis tercatat sebagai adjustment di Riwayat.</div><form className="card form" onSubmit={submit}><label>Produk<select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — stok gudang {fmt(x.gudang_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Stok saat ini: <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b></div>}<label>Satuan<select value={unit} onChange={e=>setUnit(e.target.value)} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><label>Stok gudang setelah revisi<input type="number" min="0" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label><label>Alasan / Catatan Revisi<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Koreksi hasil pengecekan fisik" required/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Revisi Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}</form></Page>}

function Transfer({storeId}){
 const {items,loading,reload}=useStock(storeId);
 const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 const selected=items.find(x=>x.id===productId); const amount=Number(qty||0);
 const cfg=areaConfig(selected,operationalArea); const areaQty=selected?amount*Number(cfg.perBase||1):0;
 const invalid=!!selected&&(amount<=0||amount>Number(selected.gudang_qty||0));
 async function submit(e){e.preventDefault();setMsg('');if(!selected)return setMsg('Pilih produk terlebih dahulu.');if(!Number.isFinite(amount)||amount<=0)return setMsg('Jumlah transfer harus lebih dari 0.');if(amount>Number(selected.gudang_qty||0)+1e-9)return setMsg('Jumlah transfer melebihi stok gudang.');setSaving(true);try{const {error}=await supabase.rpc('record_stock_transfer_v2',{p_store_id:storeId,p_product_id:productId,p_area_qty:areaQty,p_note:note.trim()||null,p_operational_area:operationalArea});if(error)throw error;setMsg('Transfer berhasil. Stok gudang dan operasional sudah diperbarui.');setQty('');setNote('');await reload()}catch(err){setMsg(err?.message||'Terjadi kesalahan saat transfer.')}finally{setSaving(false)}}
 return <Page title="Transfer Stok" subtitle="Gudang → Operasional"><div className="notice">Jumlah yang diinput selalu menggunakan <b>satuan Base</b>. Tujuan Kasir/Kitchen hanya menentukan area penyimpanan; sistem otomatis mengonversi Base ke satuan area sesuai Master Produk.</div><form className="card form">
  <label>Tujuan Operasional<select value={operationalArea} onChange={e=>{setOperationalArea(e.target.value);setQty('');setMsg('')}} required><option value="kasir">Kasir</option><option value="kitchen">Kitchen</option></select></label>
  <label>Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setQty('');setMsg('')}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — gudang {fmt(x.gudang_qty)} {baseUnit(x)}</option>)}</select></label>
  {selected&&<div className="stock-preview"><div><small>STOK GUDANG</small><b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b></div><div>→</div><div><small>TOTAL OPERASIONAL</small><b>{fmt(selected.operasional_qty)} {baseUnit(selected)}</b><small>Tujuan: {operationalArea==='kasir'?'Kasir':'Kitchen'} · {cfg.unit}</small></div></div>}
  <label>Jumlah Transfer ({selected?baseUnit(selected):'Base'})<input type="number" min="0.001" max={selected?.gudang_qty||undefined} step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label>
  {selected&&<div className={invalid?'error':'hint'}>{invalid?'Jumlah tidak boleh melebihi stok gudang.':<>Maksimal transfer: <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b>{cfg.unit!==baseUnit(selected)&&<> · Sistem menyimpan ke area sebagai <b>{fmt(areaQty)} {cfg.unit}</b></>}</>}</div>}
  <label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Pengambilan stok untuk operasional"/></label>
  <button type="button" disabled={saving||loading||invalid}>{saving?'Menyimpan…':'Transfer Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}
 </form></Page>
}

function ReviseOperationalStock({storeId}){
 const {items,loading,reload}=useStock(storeId);
 const [productId,setProductId]=useState(''),[revisionType,setRevisionType]=useState('operational'),[qty,setQty]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 const [transfers,setTransfers]=useState([]),[transferId,setTransferId]=useState('');
 const selected=items.find(x=>x.id===productId);
 const today=new Date().toISOString().slice(0,10);
 useEffect(()=>{if(revisionType!=='transfer'||!storeId)return;let live=true;(async()=>{const {data,error}=await supabase.from('stock_transactions').select('id,transaction_no,product_id,qty,area,created_at,products(name,unit)').eq('store_id',storeId).in('transaction_type',['transfer_out','transfer_in']).order('created_at',{ascending:false}).limit(50);if(live){if(error)setMsg(error.message);setTransfers(data||[])}})();return()=>{live=false}},[revisionType,storeId]);
 useEffect(()=>{if(selected&&revisionType==='operational'){setQty(String(selected.operasional_qty||0));}else if(selected&&revisionType==='ending'){setQty(String(selected.ending_qty||0));}else if(selected&&revisionType==='opening'){setQty(String(selected.opening_qty||0));}},[selected,revisionType]);
 async function submit(e){e.preventDefault();setMsg('');setSaving(true);try{
   const amount=Number(qty); if(!Number.isFinite(amount)||amount<0)throw new Error('Jumlah revisi harus 0 atau lebih.'); if(!note.trim())throw new Error('Catatan revisi wajib diisi.');
   if(revisionType==='transfer'){
     if(!transferId)throw new Error('Pilih transaksi transfer terlebih dahulu.');
     const {error}=await supabase.rpc('record_stock_transfer_revision',{p_store_id:storeId,p_reference_id:transferId,p_new_qty:amount,p_note:note.trim()}); if(error)throw error;
   } else if(!selected)throw new Error('Pilih produk terlebih dahulu.');
   else if(revisionType==='operational'){
     const {error}=await supabase.rpc('revise_operational_stock',{p_store_id:storeId,p_product_id:productId,p_revision_type:'ending',p_new_qty:amount,p_note:note.trim()}); if(error)throw error;
   } else if(revisionType==='opening'){
     const {error}=await supabase.rpc('revise_stock_opening',{p_store_id:storeId,p_product_id:productId,p_opening_qty:amount,p_snapshot_date:today,p_note:note.trim()}); if(error)throw error;
   } else if(revisionType==='ending'){
     const {error}=await supabase.rpc('revise_stock_ending',{p_store_id:storeId,p_product_id:productId,p_ending_qty:amount,p_snapshot_date:today,p_note:note.trim()}); if(error)throw error;
   }
   setMsg('Revisi stok berhasil disimpan dan tercatat.');setNote('');await reload();
 }catch(err){setMsg(err?.message||'Gagal menyimpan revisi.')}finally{setSaving(false)}}
 return <Page title="Revisi Stok Operasional" subtitle="Koreksi stok operasional, stok awal, stok akhir, atau transaksi transfer">
  <div className="notice">Gunakan menu ini hanya untuk koreksi. Setiap perubahan wajib diberi catatan agar mudah diaudit. Satuan input mengikuti <b>Base</b>.</div>
  <form className="card form" onSubmit={submit}>
   <label>Jenis Revisi<select value={revisionType} onChange={e=>{setRevisionType(e.target.value);setQty('');setMsg('')}} required><option value="operational">Stok Operasional</option><option value="opening">Stok Awal</option><option value="ending">Stok Akhir</option><option value="transfer">Input Transfer</option></select></label>
   {revisionType==='transfer'?<label>Transaksi Transfer<select value={transferId} onChange={e=>setTransferId(e.target.value)} required><option value="">Pilih transaksi</option>{transfers.map(t=><option key={t.id} value={t.id}>{t.transaction_no||t.id.slice(0,8)} · {t.products?.name||'Produk'} · {fmt(t.qty)} {t.products?.unit||''} · {new Date(t.created_at).toLocaleString('id-ID')}</option>)}</select></label>:<>
    <label>Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setMsg('')}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — Base {baseUnit(x)}</option>)}</select></label>
    {selected&&<div className="hint">Saat ini: Operasional {fmt(selected.operasional_qty)} {baseUnit(selected)} · Awal {fmt(selected.opening_qty)} · Akhir {fmt(selected.ending_qty)}</div>}
   </>}
   <label>Nilai Revisi ({revisionType==='transfer'?'Base / satuan transaksi':selected?baseUnit(selected):'Base'})<input type="number" min="0" step="0.001" value={qty} onChange={e=>setQty(e.target.value)} required/></label>
   <label>Alasan / Catatan Revisi<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Contoh: Koreksi hasil pengecekan fisik" required/></label>
   <button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Revisi'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}
  </form>
 </Page>
}

function Opname({storeId}){
 const {items,loading,reload}=useStock(storeId); const [productId,setProductId]=useState(''),[physical,setPhysical]=useState(''),[waste,setWaste]=useState('0'),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[result,setResult]=useState(null),[msg,setMsg]=useState('');
 const selected=items.find(x=>x.id===productId);
 async function submit(e){e.preventDefault();setMsg('');setResult(null);if(!selected)return setMsg('Pilih produk terlebih dahulu.');const qty=Number(physical),w=Number(waste||0);if(!Number.isFinite(qty)||qty<0)return setMsg('Sisa stok tidak boleh kurang dari 0.');if(!Number.isFinite(w)||w<0)return setMsg('Waste tidak boleh kurang dari 0.');setSaving(true);try{const {data,error}=await supabase.rpc('record_operational_stock_snapshot',{p_store_id:storeId,p_product_id:productId,p_physical_qty:qty,p_waste_qty:w,p_note:note.trim()||null});if(error)setMsg(error.message);else{setResult(data);setMsg('Sisa stok operasional berhasil disimpan.');setPhysical('');setWaste('0');setNote('');await reload()}}catch(err){setMsg(err?.message||'Terjadi kesalahan saat menyimpan.')}finally{setSaving(false)}}
 return <Page title="Input Sisa" subtitle="Input sisa operasional gabungan Kasir + Kitchen"><form className="card form" onSubmit={submit}><div className="notice">Sisa yang dimasukkan adalah total fisik gabungan Kasir + Kitchen. Sistem otomatis mengganti saldo operasional dengan sisa terbaru dan menghitung Stok Akhir = Gudang + Operasional.</div><label>Produk<select value={productId} onChange={e=>{setProductId(e.target.value);setMsg('');setResult(null)}} required><option value="">Pilih produk</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — operasional {fmt(x.operasional_qty)} {baseUnit(x)}</option>)}</select></label>{selected&&<div className="hint">Sebelum input: Gudang <b>{fmt(selected.gudang_qty)} {baseUnit(selected)}</b> · Operasional <b>{fmt(selected.operasional_qty)} {baseUnit(selected)}</b> · Stok Akhir <b>{fmt(selected.ending_qty)} {baseUnit(selected)}</b></div>}<label>Sisa fisik operasional (Kasir + Kitchen)<input type="number" min="0" step="0.001" value={physical} onChange={e=>setPhysical(e.target.value)} required placeholder="Masukkan total sisa fisik"/></label><label>Waste<input type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></label><label>Catatan<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Opsional"/></label><button disabled={saving||loading}>{saving?'Menyimpan…':'✓ Simpan Sisa Stok'}</button>{msg&&<div className={msg.includes('berhasil')?'success':'error'}>{msg}</div>}{result&&<div className="result"><b>Snapshot stok tersimpan</b><div>Stok Awal: {fmt(result.opening_qty)}</div><div>Pemakaian: {fmt(result.usage_qty)}</div><div>Stok Akhir: {fmt(result.ending_qty)}</div><div>Operasional terbaru: {fmt(result.operational_after)}</div></div>}</form></Page>
}

function CrewOpname({storeId}){return <Opname storeId={storeId}/>;}

function History({storeId}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){if(!storeId)return;setLoading(true);setError('');try{const {data,error}=await supabase.from('stock_transactions').select('id,transaction_no,product_id,area,transaction_type,qty,note,created_at,products(name,unit)').eq('store_id',storeId).order('created_at',{ascending:false}).limit(50);if(error)throw error;setRows(data||[])}catch(err){setError(err?.message||'Gagal memuat riwayat transaksi.')}finally{setLoading(false)}}
 useEffect(()=>{load()},[storeId]);
 useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-history-'+storeId).on('postgres_changes',{event:'*',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);
 return <Page title="Riwayat" subtitle="50 transaksi terbaru"><div className="history">{loading?<p>Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p>Belum ada transaksi.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{r.transaction_no||'Tanpa nomor'} · {friendlyType(r.transaction_type)} · {r.area||'-'}{r.note?' · '+r.note:''}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID')}</time></div>)}</div></Page>
}

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

function MyHistory({storeId}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');async function load(){if(!storeId)return;setLoading(true);const {data:user}=await supabase.auth.getUser();if(!user?.user){setLoading(false);return}const {data,error}=await supabase.from('stock_transactions').select('id,transaction_no,area,transaction_type,qty,note,created_at,products(name,unit)').eq('store_id',storeId).eq('created_by',user.user.id).order('created_at',{ascending:false}).limit(50);if(error)setError(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[storeId]);useEffect(()=>{if(!storeId)return;const channel=supabase.channel('rcm-my-history-'+storeId).on('postgres_changes',{event:'INSERT',schema:'public',table:'stock_transactions',filter:'store_id=eq.'+storeId},load).subscribe();return()=>supabase.removeChannel(channel)},[storeId]);return <Page title="Riwayat Saya" subtitle="Aktivitas stok yang kamu input"><div className="history">{loading?<p className="empty">Memuat riwayat…</p>:error?<div className="error">{error}</div>:rows.length===0?<p className="empty">Belum ada aktivitas stok dari akun ini.</p>:rows.map(r=><div className="history-row" key={r.id}><div><b>{r.products?.name||'Produk'}</b><small>{r.transaction_no||'Tanpa nomor'} · {friendlyType(r.transaction_type)} · {r.area==='operasional'?'Operasional':'Gudang'}</small></div><strong className={Number(r.qty)<0?'negative':'positive'}>{Number(r.qty)>0?'+':''}{fmt(r.qty)} {r.products?.unit||''}</strong><time>{new Date(r.created_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>)}</div></Page>}
function friendlyType(t){return ({stock_in:'Stok masuk',transfer_in:'Stok masuk operasional',transfer_out:'Transfer keluar',adjustment:'Penyesuaian',waste:'Waste'})[t]||t.replaceAll('_',' ')}

function Page({title,subtitle,children}){return <div className="page"><div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</div>}

function Products(){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const blank={id:null,code:'',name:'',category:'',unit:'pcs',base_unit:'pcs',kasir_unit:'pcs',kasir_per_base:1,kitchen_unit:'pcs',kitchen_per_base:1,min_stock:0,max_stock:0,active:true};
 const [form,setForm]=useState(blank);
 async function load(){setLoading(true);const {data,error}=await supabase.from('products').select('*').order('name');if(error)setError(error.message);setRows(data||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 function edit(r){setForm({...r})}
 function reset(){setForm(blank)}
 async function save(e){e.preventDefault();setSaving(true);setError('');try{if(!form.code.trim()||!form.name.trim())throw new Error('Kode dan nama produk wajib diisi.');const min=Number(form.min_stock||0),max=Number(form.max_stock||0);if(!Number.isFinite(min)||min<0)throw new Error('Min Stock tidak boleh negatif.');if(!Number.isFinite(max)||max<0)throw new Error('Max Stock tidak boleh negatif.');if(max>0&&max<min)throw new Error('Max Stock tidak boleh lebih kecil dari Min Stock.');const payload={p_product_id:form.id,p_code:form.code.trim(),p_name:form.name.trim(),p_category:form.category?.trim()||null,p_unit:form.base_unit||form.unit||'pcs',p_min_stock:min,p_max_stock:max,p_active:!!form.active,p_base_unit:form.base_unit||form.unit||'pcs',p_kasir_unit:form.kasir_unit||form.base_unit||form.unit||'pcs',p_kasir_per_base:Number(form.kasir_per_base||1),p_kitchen_unit:form.kitchen_unit||form.base_unit||form.unit||'pcs',p_kitchen_per_base:Number(form.kitchen_per_base||1)};let result;if(form.id){result=await supabase.rpc('update_product_master',payload)}else{result=await supabase.from('products').insert({code:payload.p_code,name:payload.p_name,category:payload.p_category,unit:payload.p_unit,min_stock:payload.p_min_stock,max_stock:payload.p_max_stock,active:payload.p_active,base_unit:payload.p_base_unit,kasir_unit:payload.p_kasir_unit,kasir_per_base:payload.p_kasir_per_base,kitchen_unit:payload.p_kitchen_unit,kitchen_per_base:payload.p_kitchen_per_base})}if(result.error)throw result.error;reset();await load()}catch(err){setError(err?.message||'Gagal menyimpan produk.')}finally{setSaving(false)}}
 async function toggle(r){setSaving(true);setError('');try{const {error}=await supabase.rpc('set_product_active',{p_product_id:r.id,p_active:!r.active});if(error)throw error;await load()}catch(err){setError(err?.message||'Gagal mengubah status produk.')}finally{setSaving(false)}}
 return <Page title="Master Produk" subtitle="Kelola produk, satuan dan batas stok"><div className="split"><form className="card form" onSubmit={save}><h3>{form.id?'Edit Produk':'Tambah Produk'}</h3><label>Kode Produk<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/></label><label>Nama Produk<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Kategori<input value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Satuan Base<select value={form.base_unit||form.unit||'pcs'} onChange={e=>setForm({...form,base_unit:e.target.value,unit:e.target.value})} required><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><div className="two"><label>Satuan Kasir<select value={form.kasir_unit||form.base_unit||form.unit||'pcs'} onChange={e=>setForm({...form,kasir_unit:e.target.value})}><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><label>Rasio Kasir per Base<input type="number" min="0.000001" step="0.000001" value={form.kasir_per_base??1} onChange={e=>setForm({...form,kasir_per_base:e.target.value})}/></label></div><div className="two"><label>Satuan Kitchen<select value={form.kitchen_unit||form.base_unit||form.unit||'pcs'} onChange={e=>setForm({...form,kitchen_unit:e.target.value})}><option value="gr">gr</option><option value="kg">kg</option><option value="pcs">pcs</option></select></label><label>Rasio Kitchen per Base<input type="number" min="0.000001" step="0.000001" value={form.kitchen_per_base??1} onChange={e=>setForm({...form,kitchen_per_base:e.target.value})}/></label></div><div className="two"><label>Min Stock<input type="number" min="0" step="0.001" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})}/></label><label>Max Stock<input type="number" min="0" step="0.001" value={form.max_stock} onChange={e=>setForm({...form,max_stock:e.target.value})}/></label></div><label className="check"><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Produk aktif</label><div className="actions"><button disabled={saving}>{saving?'Menyimpan…':form.id?'Simpan Perubahan':'Tambah Produk'}</button>{form.id&&<button type="button" className="secondary" onClick={reset}>Batal</button>}</div>{error&&<div className="error">{error}</div>}</form><div className="table-wrap">{loading?<p>Memuat produk…</p>:rows.length===0?<p>Belum ada produk. Tambahkan produk pertama.</p>:<table><thead><tr><th>Produk</th><th>Kategori</th><th>Satuan</th><th>Min/Max</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.code}</small></td><td>{r.category||'-'}</td><td>{r.unit}</td><td>{fmt(r.min_stock)} / {fmt(r.max_stock)}</td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" onClick={()=>edit(r)}>Edit</button><button className="smallbtn" onClick={()=>toggle(r)}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}</div></div></Page>
}

function Users(){
 const [rows,setRows]=useState([]),[stores,setStores]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 async function load(){setLoading(true);const [{data:u,error:ue},{data:s,error:se}]=await Promise.all([supabase.from('profiles').select('id,full_name,role,store_id,active,created_at,stores(name,code)').order('full_name'),supabase.from('stores').select('id,name,code').eq('active',true).order('name')]);if(ue||se)setError((ue||se).message);setRows(u||[]);setStores(s||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function update(id,patch){setSaving(true);setError('');const {error}=await supabase.from('profiles').update(patch).eq('id',id);if(error)setError(error.message);else await load();setSaving(false)}
 return <Page title="User / Role" subtitle="Kelola role, store dan status pengguna"><div className="notice">Akun login dibuat melalui Supabase Auth. Di sini Admin mengatur profil, role, store dan status aktif pengguna.</div><div className="table-wrap">{loading?<p>Memuat pengguna…</p>:rows.length===0?<p>Belum ada profil pengguna.</p>:<table><thead><tr><th>Pengguna</th><th>Role</th><th>Store</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.full_name||'Tanpa Nama'}</b><small>{r.id.slice(0,8)}…</small></td><td><select value={r.role} disabled={saving} onChange={e=>update(r.id,{role:e.target.value})}><option value="admin">Admin</option><option value="store_leader">Store Leader</option><option value="team_leader">Team Leader</option><option value="crew">Crew</option></select></td><td><select value={r.store_id||''} disabled={saving} onChange={e=>update(r.id,{store_id:e.target.value||null})}><option value="">-</option>{stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></td><td>{r.active?<span className="badge ok">Aktif</span>:<span className="badge danger">Nonaktif</span>}</td><td><button className="smallbtn" disabled={saving} onClick={()=>update(r.id,{active:!r.active})}>{r.active?'Nonaktifkan':'Aktifkan'}</button></td></tr>)}</tbody></table>}{error&&<div className="error">{error}</div>}</div></Page>
}
