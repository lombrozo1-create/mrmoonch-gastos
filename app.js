
// Simple PWA app logic: store entries in localStorage as array under key 'mr_moonch_entries'
const STORAGE_KEY = 'mr_moonch_entries_v1';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function loadEntries(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){return [];} }
function saveEntries(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

function formatCurrency(n){ return Number(n).toLocaleString('es-MX', {style:'currency', currency:'MXN'}); }

function addEntry(entry){
  const arr = loadEntries();
  arr.push(entry);
  saveEntries(arr);
  renderAll();
}

function deleteEntry(id){
  let arr = loadEntries().filter(e => e.id !== id);
  saveEntries(arr);
  renderAll();
}

function clearAll(){ if(!confirm('Borrar todos los registros?')) return; localStorage.removeItem(STORAGE_KEY); renderAll(); }

function getRangeDates(range){
  const now = new Date();
  let start = new Date(0), end = new Date(8640000000000000);
  if(range==='day'){ start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end = new Date(start); end.setDate(start.getDate()+1); }
  else if(range==='week'){ const d = new Date(now); const day = d.getDay(); const diff = d.getDate() - day + (day===0?-6:1); start = new Date(d.setDate(diff)); start.setHours(0,0,0,0); end = new Date(); end.setHours(23,59,59,999); }
  else if(range==='month'){ start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 1); }
  else { start = new Date(0); end = new Date(8640000000000000); }
  return {start, end};
}

function filterByRange(entries, range){
  const {start, end} = getRangeDates(range);
  return entries.filter(e => { const d = new Date(e.date+'T00:00:00'); return d >= start && d < end; });
}

function calculateTotals(entries){
  let totals = {income:0, expense:0, byCategory:{}};
  entries.forEach(e=>{
    const amt = Number(e.amount) || 0;
    if(e.type==='income') totals.income += amt; else totals.expense += amt;
    totals.byCategory[e.category] = (totals.byCategory[e.category] || 0) + (e.type==='expense' ? amt : 0);
  });
  return totals;
}

function renderAll(){
  const all = loadEntries().sort((a,b)=> new Date(b.date) - new Date(a.date));
  const range = document.getElementById('range').value;
  const filtered = filterByRange(all, range);
  // totals
  const t = calculateTotals(filtered);
  document.getElementById('totals').innerHTML = `
    <div><strong>Ingresos:</strong> ${formatCurrency(t.income)}</div>
    <div><strong>Gastos:</strong> ${formatCurrency(t.expense)}</div>
    <div><strong>Ganancia:</strong> ${formatCurrency(t.income - t.expense)}</div>
    <div style="margin-top:6px;"><strong>Por categoría (gastos):</strong></div>
    ${Object.keys(t.byCategory).map(c=>`<div class="cat">${c}: ${formatCurrency(t.byCategory[c])}</div>`).join('')}
  `;
  // list
  const list = document.getElementById('list');
  list.innerHTML = all.map(e=>`<div class="list-item">
    <div>
      <div style="font-weight:600">${e.type==='expense' ? 'Gasto' : 'Ingreso'} • ${e.category} • <span class="cat">${e.date}</span></div>
      <div class="cat">${e.description || ''}</div>
    </div>
    <div>
      <div class="amount ${e.type}">${formatCurrency(e.amount)}</div>
      <div style="text-align:right;margin-top:6px;"><button onclick="deleteEntry('${e.id}')" class="btn">Eliminar</button></div>
    </div>
  </div>`).join('');
  // chart - simple category bar using canvas
  renderChart(t.byCategory);
}

function renderChart(byCategory){
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width, canvas.height);
  const keys = Object.keys(byCategory);
  if(keys.length===0){ ctx.fillStyle='#666'; ctx.fillText('No hay datos para graficar', 10, 20); return; }
  const vals = keys.map(k=>byCategory[k]);
  const max = Math.max(...vals);
  const barW = Math.floor(canvas.width / keys.length) - 10;
  keys.forEach((k,i)=>{
    const h = (vals[i]/max) * (canvas.height - 30);
    const x = i*(barW+10)+10;
    const y = canvas.height - h - 10;
    ctx.fillStyle = '#f3b429';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#aaa';
    ctx.fillText(k, x, canvas.height - 2);
  });
}

// events
document.addEventListener('DOMContentLoaded', ()=>{
  // set default date to today
  document.getElementById('date').value = new Date().toISOString().slice(0,10);
  renderAll();

  document.getElementById('entryForm').addEventListener('submit', e=>{
    e.preventDefault();
    const entry = {
      id: uid(),
      type: document.getElementById('type').value,
      category: document.getElementById('category').value,
      amount: Number(document.getElementById('amount').value).toFixed(2),
      date: document.getElementById('date').value,
      description: document.getElementById('description').value || ''
    };
    addEntry(entry);
    e.target.reset();
    document.getElementById('date').value = new Date().toISOString().slice(0,10);
  });

  document.getElementById('clearAll').addEventListener('click', ()=> clearAll());

  document.getElementById('range').addEventListener('change', ()=> renderAll());

  document.getElementById('exportCsv').addEventListener('click', ()=>{
    const arr = loadEntries();
    if(arr.length===0){ alert('No hay registros para exportar'); return; }
    const header = ['id','type','category','amount','date','description'];
    const csv = [header.join(',')].concat(arr.map(r=> header.map(h=>`"${String(r[h]||'').replace(/"/g,"''")}"`).join(','))).join('\\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mr_moonch_gastos.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', ()=>{
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', async (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const text = await f.text();
    const lines = text.split('\\n').map(l=>l.trim()).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.replace(/"/g,'').trim());
    const arr = loadEntries();
    lines.forEach(line=>{
      const cols = line.split('","').map(c=>c.replace(/(^")|("$)/g,''));
      const obj = {};
      header.forEach((h,i)=> obj[h]= cols[i] || '');
      obj.id = obj.id || uid();
      arr.push(obj);
    });
    saveEntries(arr);
    renderAll();
    alert('Importado OK');
  });
});
