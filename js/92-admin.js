/* ---------- server-backed admin panel ----------
   The admin secret is exchanged for a short-lived token on the server
   (POST /api/admin/login). The secret itself is never stored in the app. */
const ADMIN_SECRET_KEY='gymai_admin_token';
function adminToken(){try{return localStorage.getItem(ADMIN_SECRET_KEY)||''}catch(e){return ''}}
function adminSetToken(v){try{if(v)localStorage.setItem(ADMIN_SECRET_KEY,v);else localStorage.removeItem(ADMIN_SECRET_KEY)}catch(e){}}
function adminHeaders(){
  let h={'Content-Type':'application/json'};
  let t=adminToken();
  if(t)h['Authorization']='Bearer '+t;
  return h;
}
let ADMIN_ACCOUNTS=[];
function adminLoggedIn(){return !!adminToken()}
function adminEsc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];})}
function adminShow(view){
  let lv=$('adminLoginView'),pv=$('adminPanelView');
  if(lv)lv.style.display=(view==='login')?'':'none';
  if(pv)pv.style.display=(view==='panel')?'':'none';
}
function adminOpen(){
  document.body.classList.add('admin-mode');
  nav('admin');
  if(adminLoggedIn()){adminShow('panel');adminUserList();}
  else{adminShow('login');}
}
async function adminDoLogin(){
  let n=(($('adminLoginName')||{}).value||'').trim();
  let p=(($('adminLoginPass')||{}).value||'');
  let err=$('adminLoginErr');
  let secret=p||n;
  if(!secret){if(err)err.textContent='Введите секрет администратора';return}
  try{
    let r=await srvFetch(API_BASE+'/api/admin/login',{method:'POST',
      headers:{'Content-Type':'application/json','x-admin-secret':secret},
      body:JSON.stringify({})});
    let d={}; try{d=await r.json()}catch(e){}
    if(!r.ok){if(err)err.textContent=(r.status===403)?'Неверный секрет':'Ошибка входа';return}
    adminSetToken(d.token||'');
    if(err)err.textContent='';
    try{($('adminLoginPass')).value='';}catch(e){}
    adminShow('panel');
    await adminUserList();
    showToast('Вход в админку выполнен');
  }catch(e){
    if(err)err.textContent='Сеть недоступна';
  }
}
async function adminLogout(){
  try{await srvFetch(API_BASE+'/api/admin/logout',{method:'POST',headers:adminHeaders(),body:'{}'});}catch(e){}
  adminSetToken('');adminShow('login');
  try{($('adminLoginName')).value='';($('adminLoginPass')).value='';}catch(e){}
  showToast('Вы вышли из админки');
}
async function adminUserList(){
  let box=$('adminUserList');
  try{
    let r=await srvFetch(API_BASE+'/api/admin/accounts',{method:'GET',headers:adminHeaders()});
    if(r.status===401){adminSetToken('');adminShow('login');return}
    if(!r.ok)throw new Error('http '+r.status);
    let d=await r.json();
    ADMIN_ACCOUNTS=Array.isArray(d.accounts)?d.accounts:[];
  }catch(e){
    if(box)box.innerHTML='<div class="admin-err">Не удалось загрузить список аккаунтов</div>';
    return;
  }
  let q=(($('adminSearch')||{}).value||'').toLowerCase();
  let list=ADMIN_ACCOUNTS.filter(function(a){
    if(!q)return true;
    return String(a.email||'').toLowerCase().indexOf(q)>=0||String(a.name||'').toLowerCase().indexOf(q)>=0;
  });
  let pro=ADMIN_ACCOUNTS.filter(function(a){return a.plan==='pro'}).length;
  let su=$('admStatUsers'),sp=$('admStatPro'),sf=$('admStatFree');
  if(su)su.textContent=ADMIN_ACCOUNTS.length;
  if(sp)sp.textContent=pro;
  if(sf)sf.textContent=ADMIN_ACCOUNTS.length-pro;
  if(!box)return;
  if(!list.length){box.innerHTML='<div class="admin-empty">Аккаунтов не найдено</div>';return}
  box.innerHTML=list.map(function(a){
    let isPro=a.plan==='pro';
    let badge=isPro?'<span class="badge-ok">PRO</span>':'<span class="badge-off">FREE</span>';
    let when=a.created?new Date(a.created).toLocaleString('ru-RU'):'—';
    return '<div class="admin-row">'
      +'<div class="admin-row-main">'
      +'<div class="admin-row-email">'+adminEsc(a.email)+'</div>'
      +'<div class="admin-row-sub">'+adminEsc(a.name||'—')+(a.telegramId?' · TG '+adminEsc(a.telegramId):'')+' · '+adminEsc(when)+'</div>'
      +'</div>'
      +'<div class="admin-row-side">'+badge
      +'<button class="admin-mini" data-plan="'+(isPro?'free':'pro')+'" data-email="'+adminEsc(a.email)+'">'+(isPro?'Снять Pro':'Выдать Pro')+'</button>'
      +'<button class="admin-mini danger" data-del="'+adminEsc(a.email)+'">Удалить</button>'
      +'</div></div>';
  }).join('');
  box.querySelectorAll('button[data-plan]').forEach(function(b){
    b.onclick=async function(){
      let email=b.dataset.email,plan=b.dataset.plan;
      b.disabled=true;
      try{
        let r=await srvFetch(API_BASE+'/api/admin/plan',{method:'POST',headers:adminHeaders(),
          body:JSON.stringify({email:email,plan:plan})});
        let d={};try{d=await r.json()}catch(e){}
        if(!r.ok){showToast('Ошибка: '+(d.error||r.status));return}
        showToast((plan==='pro'?'Pro выдан: ':'Pro снят: ')+email);
        await adminUserList();
      }catch(e){showToast('Сеть недоступна')}
      finally{b.disabled=false}
    };
  });
  box.querySelectorAll('button[data-del]').forEach(function(b){
    b.onclick=async function(){
      let email=b.dataset.del;
      if(!confirm('Удалить аккаунт '+email+' вместе с его данными?'))return;
      b.disabled=true;
      try{
        let r=await srvFetch(API_BASE+'/api/admin/delete-account',{method:'POST',headers:adminHeaders(),
          body:JSON.stringify({email:email})});
        let d={};try{d=await r.json()}catch(e){}
        if(!r.ok){showToast('Ошибка: '+(d.error||r.status));return}
        showToast('Аккаунт удалён: '+email);
        await adminUserList();
      }catch(e){showToast('Сеть недоступна')}
      finally{b.disabled=false}
    };
  });
}
function adminWire(){
  let lb=$('adminLoginBtn'); if(lb)lb.onclick=adminDoLogin;
  let lp=$('adminLoginPass'); if(lp)lp.onkeydown=function(e){if(e.key==='Enter')adminDoLogin()};
  let ln=$('adminLoginName'); if(ln)ln.onkeydown=function(e){if(e.key==='Enter'){($('adminLoginPass')||{}).focus()}};
  let s=$('adminSearch'); if(s)s.oninput=adminUserList;
  let lo=$('adminLogout'); if(lo)lo.onclick=adminLogout;
  let ba=$('adminBack'); if(ba)ba.onclick=function(){document.body.classList.remove('admin-mode');nav('profile')};
  let ex=$('adminExport');
  if(ex)ex.onclick=function(){
    let data=JSON.stringify(ADMIN_ACCOUNTS,null,2);
    try{
      let blob=new Blob([data],{type:'application/json'});
      let a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='gymai-accounts.json';
      document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
    }catch(e){}
  };
  let ra=$('adminResetAll');
  if(ra)ra.onclick=async function(){
    if(!confirm('Снять Pro у всех аккаунтов?'))return;
    ra.disabled=true;
    try{
      for(let i=0;i<ADMIN_ACCOUNTS.length;i++){
        let a=ADMIN_ACCOUNTS[i];
        if(a.plan!=='pro')continue;
        await srvFetch(API_BASE+'/api/admin/plan',{method:'POST',headers:adminHeaders(),
          body:JSON.stringify({email:a.email,plan:'free'})});
      }
      showToast('Pro снят у всех');
      await adminUserList();
    }catch(e){showToast('Сеть недоступна')}
    finally{ra.disabled=false}
  };
  let ga=$('adminGrantAll');
  if(ga)ga.onclick=async function(){
    if(!confirm('Выдать Pro всем аккаунтам?'))return;
    ga.disabled=true;
    try{
      let r=await srvFetch(API_BASE+'/api/admin/grant-all',{method:'POST',headers:adminHeaders(),body:'{}'});
      let d={};try{d=await r.json()}catch(e){}
      showToast('Pro выдан: '+(d.granted||0));
      await adminUserList();
    }catch(e){showToast('Сеть недоступна')}
    finally{ga.disabled=false}
  };
}
try{adminWire();}catch(e){console.warn('[admin] wire failed',e);}
/* The admin panel is not in the navigation. It opens only from the #admin
   hash, so no ordinary user ever sees a link to it. */
(function(){
  function check(){
    if(String(location.hash||'').toLowerCase()==='#admin'){
      try{document.body.classList.add('admin-mode');}catch(e){}
      adminOpen();
    }
  }
  try{window.addEventListener('hashchange',check);}catch(e){}
  try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check);else check();}catch(e){}
})();

