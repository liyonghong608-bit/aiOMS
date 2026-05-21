/* aiOMS shared client helpers — Singularity build */
const SU='https://mqzrbekmtguhigtvqzay.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xenJiZWttdGd1aGlndHZxemF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjY4NTIsImV4cCI6MjA5NDc0Mjg1Mn0.jDnU5ntMvx6fufcfpDW-IpcFJnQqN6LTqvMQcrHfz7o';
const db=supabase.createClient(SU,SK);

function fmtNum(n){return Number(n||0).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){return new Date(d).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});}
function initials(name){return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}

function toast(msg,type='s'){
  const w=document.getElementById('toasts'); const t=document.createElement('div');
  t.className=`toast toast-${type}`; t.textContent=msg; w.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3000);
}
async function doLogout(){ await db.auth.signOut(); location.href='index.html'; }

/* ---- v2 completion timer ----
   Renders a live countdown chip. Pass the order_item row.
   Color shifts fresh → soon (<25% left) → overdue. */
function timerHtml(item){
  if(item.status==='fulfilled'){
    return `<span class="timer done"><span class="timer-dot"></span>Delivered</span>`;
  }
  if(item.status!=='accepted'||!item.deadline_at){
    return `<span style="color:var(--fg-faint);font-size:12px">—</span>`;
  }
  return `<span class="timer" data-deadline="${item.deadline_at}" data-accepted="${item.accepted_at||''}"><span class="timer-dot"></span><span class="timer-txt">…</span></span>`;
}
function fmtRemaining(ms){
  const past=ms<0; ms=Math.abs(ms);
  const d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
  let t; if(d>0)t=`${d}d ${h}h ${m}m`; else if(h>0)t=`${h}h ${m}m ${s}s`; else t=`${m}m ${s}s`;
  return (past?'+':'')+t;
}
function tickTimers(){
  document.querySelectorAll('.timer[data-deadline]').forEach(el=>{
    const deadline=new Date(el.dataset.deadline).getTime();
    const accepted=el.dataset.accepted?new Date(el.dataset.accepted).getTime():deadline-86400000;
    const now=Date.now(), rem=deadline-now, total=Math.max(deadline-accepted,1);
    const frac=rem/total;
    el.classList.remove('fresh','soon','overdue');
    let label;
    if(rem<0){ el.classList.add('overdue'); label='Overdue '+fmtRemaining(rem); }
    else if(frac<=0.25){ el.classList.add('soon'); label=fmtRemaining(rem)+' left'; }
    else { el.classList.add('fresh'); label=fmtRemaining(rem)+' left'; }
    const txt=el.querySelector('.timer-txt'); if(txt)txt.textContent=label;
  });
}
setInterval(tickTimers,1000);
document.addEventListener('DOMContentLoaded',tickTimers);

function statusBadge(s){
  // Type-piece glyph + label, in the 活字 movable-type language
  const map={
    draft:['tp-muted','稿','Draft'], submitted:['tp-warn','送','Submitted'], processing:['tp-plasma','理','Processing'],
    completed:['tp-success','成','Completed'], cancelled:['tp-danger','废','Cancelled'],
    pending:['tp-warn','待','Pending'], accepted:['tp-plasma','纳','Accepted'], rejected:['tp-danger','拒','Rejected'], fulfilled:['tp-success','达','Fulfilled'],
  };
  const [cls,glyph,label]=map[s]||['tp-muted','·',s];
  return `<span style="display:inline-flex;align-items:center;gap:7px"><span class="tp ${cls}">${glyph}</span><span style="font-size:12px;color:var(--fg-muted)">${label}</span></span>`;
}
function roleBadge(r){
  const map={admin:['badge-warn','⚡ Admin'],supplier:['badge-info','Supplier'],buyer:['badge-success','Buyer']};
  const [cls,label]=map[r]||['badge-muted',r];
  return `<span class="badge ${cls}">${label}</span>`;
}
