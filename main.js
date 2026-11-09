import { createClient } from '@supabase/supabase-js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

const services = [
  ['grocery', 'Spesa a domicilio', 'Grocery shopping'],
  ['pharmacy', 'Farmacia', 'Pharmacy'],
  ['errands', 'Consegne e commissioni', 'Deliveries & errands'],
  ['senior_help', 'Aiuto agli anziani', 'Help for seniors'],
  ['transport', 'Trasporto e accompagnamento', 'Transport & accompaniment'],
  ['other', 'Altri servizi', 'Other services']
];
let lang = 'it';
let currentUser = null;
let profile = null;
let orders = [];
const t = (it, en) => lang === 'it' ? it : en;
const app = document.querySelector('#app');

function shell(content) {
  app.innerHTML = `<header><div class="brand-mark">♥</div><div><strong>ProntoPerTe</strong><small>Servizi locali · Local services</small></div><button id="language" class="ghost">${lang.toUpperCase()} / ${lang === 'it' ? 'EN' : 'IT'}</button></header><main>${content}</main><footer>Pitigliano · Toscana</footer>`;
  document.querySelector('#language').onclick = () => { lang = lang === 'it' ? 'en' : 'it'; render(); };
}
function authView() {
  shell(`<section class="hero"><span class="eyebrow">PITIGLIANO, ITALIA</span><h1>${t('Un aiuto, vicino a te.','A helping hand, close to you.')}</h1><p>${t('Servizi quotidiani, con persone di fiducia.','Everyday services, with people you can trust.')}</p></section>
  <section class="panel"><h2>${t('Accedi o crea un account','Sign in or create an account')}</h2>
  <form id="auth"><label>Email<input name="email" type="email" required autocomplete="email"></label><label>${t('Password','Password')}<input name="password" type="password" required minlength="8" autocomplete="current-password"></label>
  <label>${t('Tipo di account','Account type')}<select name="role"><option value="customer">${t('Cliente','Customer')}</option><option value="provider">${t('Prestatore','Provider')}</option></select></label>
  <div class="actions"><button>${t('Accedi','Sign in')}</button><button type="button" class="secondary" id="signup">${t('Registrati','Sign up')}</button></div></form><p class="hint">${t('La registrazione richiede conferma email, se attivata nel progetto.','Sign-up may require email confirmation, depending on project settings.')}</p></section>`);
  const form = document.querySelector('#auth');
  form.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(form)); const {data,error}=await supabase.auth.signInWithPassword({email:d.email,password:d.password}); if(error) return alert(error.message); await loadProfile(); };
  document.querySelector('#signup').onclick = async () => { const d=Object.fromEntries(new FormData(form)); const {error}=await supabase.auth.signUp({email:d.email,password:d.password,options:{data:{role:d.role}}}); alert(error ? error.message : t('Controlla la tua email per confermare la registrazione.','Check your email to confirm your registration.')); };
}
async function loadProfile() {
  const {data,error}=await supabase.from('profiles').select('*').eq('id',currentUser.id).single();
  if(error) { alert(error.message); return; } profile=data; await render();
}
async function renderCustomer() {
  const cards=services.map(([id,it,en])=>`<option value="${id}">${t(it,en)}</option>`).join('');
  shell(`<section class="hero compact"><span class="eyebrow">PRONTOPERTE</span><h1>${t('Di cosa hai bisogno?','What do you need?')}</h1><p>${t('Servizi locali a Pitigliano','Local services in Pitigliano')}</p></section>
  <section class="panel"><h2>${t('Nuova richiesta','New request')}</h2><form id="order"><label>${t('Servizio','Service')}<select name="service" required>${cards}</select></label><label>${t('Indirizzo a Pitigliano','Address in Pitigliano')}<input name="address" required maxlength="250"></label><label>${t('Quando?','When?')}<input name="requested_for" type="datetime-local"></label><label>${t('Dettagli','Details')}<textarea name="details" rows="3" maxlength="1500"></textarea></label><button>${t('Invia richiesta','Submit request')}</button></form></section>
  <section class="panel"><h2>${t('Le mie richieste','My requests')}</h2><div id="myorders">${orderCards(orders)}</div></section><button class="secondary" id="logout">${t('Esci','Sign out')}</button>`);
  document.querySelector('#order').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const {error}=await supabase.from('orders').insert({customer_id:currentUser.id,...d});if(error)return alert(error.message);await refreshOrders();};
  document.querySelector('#logout').onclick=logout;
}
function orderCards(list) {
  if(!list.length) return `<p class="hint">${t('Nessuna richiesta al momento.','No requests yet.')}</p>`;
  return list.map(o=>`<article class="order"><div><strong>${(services.find(s=>s[0]===o.service)||['','Servizio','Service'])[lang==='it'?1:2]}</strong><small>${o.address}</small></div><span class="status">${o.status}</span></article>`).join('');
}
async function renderProvider() {
  shell(`<section class="hero compact"><span class="eyebrow">AREA PRESTATORE · PROVIDER AREA</span><h1>${t('Richieste disponibili','Available requests')}</h1><p>${t('Accetta gli incarichi che puoi svolgere.','Accept jobs you can complete.')}</p></section><section class="panel"><div id="available">${orderCards(orders)}</div></section><button class="secondary" id="logout">${t('Esci','Sign out')}</button>`);
  document.querySelector('#logout').onclick=logout;
  const {data}=await supabase.from('orders').select('*').in('status',['new','accepted','in_progress']).order('created_at',{ascending:false});
  const target=document.querySelector('#available');
  if(target) target.innerHTML=(data||[]).map(o=>`<article class="order"><div><strong>${(services.find(s=>s[0]===o.service)||['','Servizio','Service'])[lang==='it'?1:2]}</strong><small>${o.address}<br>${o.details||''}</small></div><button data-id="${o.id}" class="small">${o.status==='new'?t('Accetta','Accept'):t('Avvia','Start')}</button></article>`).join('')||`<p class="hint">${t('Nessuna richiesta disponibile.','No requests available.')}</p>`;
  target?.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{const row=data.find(x=>x.id===b.dataset.id);const next=row.status==='new'?'accepted':'in_progress';const {error}=await supabase.from('orders').update({status:next,provider_id:currentUser.id}).eq('id',row.id);if(error)alert(error.message);else renderProvider();});
}
async function renderAdmin() {
  const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});
  shell(`<section class="hero compact"><span class="eyebrow">ADMIN</span><h1>ProntoPerTe</h1><p>${t('Gestione richieste','Order management')}</p></section><section class="panel"><h2>${t('Tutte le richieste','All requests')}</h2>${error?`<p>${error.message}</p>`:orderCards(data||[])}</section><button class="secondary" id="logout">${t('Esci','Sign out')}</button>`);
  document.querySelector('#logout').onclick=logout;
}
async function refreshOrders(){const {data}=await supabase.from('orders').select('*').eq('customer_id',currentUser.id).order('created_at',{ascending:false});orders=data||[];renderCustomer();}
async function logout(){await supabase.auth.signOut();currentUser=null;profile=null;authView();}
async function render(){
  if(!supabase){shell(`<section class="hero"><span class="eyebrow">PITIGLIANO · TOSCANA</span><h1>ProntoPerTe</h1><p>${t('La tua app di servizi locali.','Your local services app.')}</p></section><section class="panel"><h2>${t('Configurazione necessaria','Setup required')}</h2><p>${t('Collega il progetto Supabase inserendo URL e chiave anonima nel file .env. Segui README.md.','Connect Supabase by adding your project URL and anon key to .env. Follow README.md.')}</p></section>`);return;}
  const {data:{user}}=await supabase.auth.getUser();currentUser=user;
  if(!user){authView();return;}
  await loadProfileRoute();
}
async function loadProfileRoute(){
  const {data}=await supabase.from('profiles').select('*').eq('id',currentUser.id).single();profile=data;
  if(!profile){shell('<p>Profile not found. Contact administrator.</p>');return;}
  if(profile.role==='admin') return renderAdmin();
  if(profile.role==='provider') return renderProvider();
  const {data:mine}=await supabase.from('orders').select('*').eq('customer_id',currentUser.id).order('created_at',{ascending:false});orders=mine||[];renderCustomer();
}
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
render();