/* ---------- Telegram Mini App integration (local mode, no backend) ---------- */
const TG = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
const TG_USER_KEY='gymai_tg_user';
function tgInitData(){try{return new URLSearchParams(window.location.search).get('initData')||''}catch(e){return ''}}
function tgParseUser(raw){
  try{
    const p=new URLSearchParams(raw||'');
    const u=JSON.parse(p.get('user')||'null');
    if(!u||!u.id)return null;
    return {id:String(u.id),first_name:u.first_name||'',last_name:u.last_name||'',username:u.username||'',
      language_code:u.language_code||'',photo_url:u.photo_url||'',is_premium:!!u.is_premium};
  }catch(e){return null}
}
function tgUser(){try{return JSON.parse(localStorage.getItem(TG_USER_KEY)||'null')}catch(e){return null}}
function tgSetUser(u){try{if(u)localStorage.setItem(TG_USER_KEY,JSON.stringify(u));else localStorage.removeItem(TG_USER_KEY)}catch(e){}}
function tgIsPremium(){let u=tgUser();return !!(u&&u.is_premium)}
function tgDisplayName(){let u=tgUser();if(!u)return '';return [u.first_name,u.last_name].filter(Boolean).join(' ')||(u.username?'@'+u.username:'')}

/* Auto-login from Telegram identity. Signature is NOT verified (no backend):
   local demo — the account lives in this device's localStorage only. */

/* ============================================================
   v0.21 · СЕРВЕРНЫЙ СЛОЙ
   Работает и без сервера: если /api/auth недоступен, приложение
   продолжает жить на localStorage (режим standalone).
   ============================================================ */
const SRV={
  token:localStorage.getItem('gymai_session_token')||'',
  enabled:false,
  user:null,
  pending:{},

  async auth(){
    try{
      const initData=(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp.initData:'';
      if(!initData)return false;
      const r=await srvFetch(API_BASE+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({initData:initData})});
      if(!r.ok){try{const t=await r.text();console.warn('[SRV.auth] HTTP '+r.status+' :: '+t.slice(0,200));}catch(e){}return false;}
      if(!d||!d.token){console.warn('[SRV.auth] no token in response');}
      const d=await r.json();
      this.token=d.token;this.user=d.user;this.enabled=true;
      localStorage.setItem('gymai_session_token',d.token);
      localStorage.setItem('gymai_user',JSON.stringify(d.user||{}));
      return true;
    }catch(e){return false;}
  },
  /* Sync works with EITHER a Telegram session token or a signed-in account
     token. Before v0.29 the guards below only accepted the Telegram token,
     so an email/password account never pushed or pulled anything. */
  hasAuth(){return !!(this.enabled&&this.token)||!!acctToken();},
  headers(){return {'Content-Type':'application/json','Authorization':'Bearer '+this.token}},
  /* The account token identifies the OWNER of the data and is what makes the
     state follow the user to another device. Without a signed-in account we
     fall back to the Telegram session token. */
  dataHeaders(){
    let at='';
    try{at=localStorage.getItem(ACCT_TOKEN_KEY)||''}catch(e){}
    return {'Content-Type':'application/json','Authorization':'Bearer '+(at||this.token)};
  },

  async pull(){
    if(!this.hasAuth())return null;
    try{
      const r=await srvFetch(API_BASE+'/api/state',{headers:this.dataHeaders()});
      if(!r.ok)return null;
      const d=await r.json();
      return d&&d.state?d.state:null;
    }catch(e){return null;}
  },
  async push(keys){
    if(!this.hasAuth())return;
    const patch={};
    let any=false;
    for(const k of (keys||[])){
      /* only known data keys leave the device — never tokens, never chat history */
      if(!srvIsDataKey(k))continue;
      const raw=localStorage.getItem(k);
      if(raw===null)continue;
      /* Most values are stored as JSON, but a few (name, experience, reminders,
         theme) are stored as plain strings. JSON.parse throws on those and the
         key was silently dropped, so the value never reached the server and was
         lost on reinstall. Plain strings are wrapped in a marker instead. */
      try{patch[k]=JSON.parse(raw);any=true;}
      catch(e){patch[k]={__raw:raw};any=true;}
    }
    if(!any)return;
    try{
      await srvFetch(API_BASE+'/api/state',{method:'PUT',headers:this.dataHeaders(),body:JSON.stringify({state:patch})});
    }catch(e){}
  },
  async syncAll(){
    if(!this.hasAuth())return;
    const remote=await this.pull();
    if(remote){
      const local=[];
      try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k)local.push(k);}}catch(e){}
      for(const k in remote){
        if(!srvIsDataKey(k))continue;
        const v=remote[k];
        if(v===null||v===undefined)continue;
        try{localStorage.setItem(k,srvDecode(v));}catch(e){}
      }
      /* The server is the source of truth: a key the account does NOT have
         must not survive from the previous owner on this device. */
      for(const k of local){
        if(!srvIsDataKey(k))continue;
        if(remote[k]===null||remote[k]===undefined){
          try{localStorage.removeItem(k);}catch(e){}
        }
      }
    }
    await this.push(srvDataKeys());
  }
};
/* Keys the account state is made of. The AUTH keys (gymai_session, gymai_users,
   gymai_acct_token) are deliberately NOT here: the server does not store the
   browser session, and syncAll() removes every listed key the server does not
   have. With gymai_session in this list the background sync wiped the local
   session right after a successful login, so isAuthed() became false and the
   app bounced back to the login screen mid-session. */
const SRV_KEYS=['gymai_workouts','gymai_custom_plan','gymai_schedule','gymai_custom_exercises',
  'gymai_presets','gymai_plan_prefs','gymai_reminders','gymai_experience','gymai_name',
  'gymai_draft','gymai_theme','gymai_coach_usage','gymai_applied_preset'];
/* Never touched by the server sync, in either direction. */
const SRV_LOCAL_ONLY=['gymai_session','gymai_users','gymai_acct_token','gymai_session_token','gymai_admin_token','gymai_tg_user','gymai_user','gymai_plan'];
/* The workout setup is stored under a per-day key (gymai_setup_0, gymai_setup_1...),
   so the list of keys is dynamic and cannot be a constant. */
const SRV_KEY_PREFIXES=['gymai_setup_'];
function srvIsDataKey(k){
  if(!k)return false;
  if(SRV_LOCAL_ONLY.indexOf(k)>=0)return false;
  if(SRV_KEYS.indexOf(k)>=0)return true;
  for(const p of SRV_KEY_PREFIXES){if(String(k).indexOf(p)===0)return true;}
  return false;
}
/* All data keys currently present in localStorage. */
function srvDataKeys(){
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(srvIsDataKey(k))out.push(k);
    }
  }catch(e){}
  return out;
}
/* A plain string was wrapped in a marker on the way up, so it can be restored
   exactly as it was. */
function srvDecode(v){
  /* A plain string that travelled up is wrapped in a marker. Older state may
     hold a bare string instead, so a bare string is treated as raw text too. */
  if(typeof v==='string')return v;
  if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.__raw==='string')return v.__raw;
  return JSON.stringify(v);
}


/* Синхронизация при старте */
(function(){
  const boot=async function(){
    const ok=await SRV.auth();
    if(!ok&&!acctToken())return;
    try{SRV.enabled=true;}catch(e){}
    try{await Promise.race([SRV.syncAll(),new Promise(function(r){setTimeout(r,6000)})]);}catch(e){}
    /* The profile, the tariff and the coach counter come from the server. */
    try{await refreshServerProfile();}catch(e){}
    try{await loadChatHistory();}catch(e){}
    try{
      const u=JSON.parse(localStorage.getItem('gymai_user')||'null');
      if(u&&u.plan){localStorage.setItem('gymai_plan',u.plan);}
      if(u&&u.name){localStorage.setItem('gymai_name',u.name);}
    }catch(e){}
    /* The screens were painted before the server answered, so restored data
       was invisible. Re-render everything now that sync finished. */
    try{
      ['renderCalendar','renderPlan','renderProgress','renderAccount','renderDays',
       'renderExercises','renderHistory','renderPresets'].forEach(function(fn){
        try{if(typeof window[fn]==='function')window[fn]();}catch(e){}
      });
    }catch(e){}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

/* План с сервера — авторитетный (реальная выдача Pro) */
function applyServerPlan(){
  try{
    const u=JSON.parse(localStorage.getItem('gymai_user')||'null');
    if(u&&u.plan){
      let users=getUsers();
      const sess=getSession();
      const key=(sess&&sess.email)||('tg:'+(TG&&TG.initDataUnsafe&&TG.initDataUnsafe.user?TG.initDataUnsafe.user.id:''));
      if(key&&users[key]){users[key].plan=u.plan;saveUsers(users);}
      else localStorage.setItem('gymai_plan',u.plan);
      try{renderPlan();}catch(e){}
    }
  }catch(e){}
}

function tgAutoLogin(){
  if(!TG)return false;
  const raw=tgInitData();
  const u=tgParseUser(raw);
  if(!u) return !!tgUser();
  tgSetUser(u);
  const key='tg:'+u.id;
  let users=getUsers();
  if(!users[key]){
    users[key]={email:key,name:((u.first_name||'Игрок')+' '+(u.last_name||'')).trim(),
      pw:'',phone:'',phoneVerified:false,altEmail:'',altEmailVerified:false,
      plan:tgIsPremium()?'pro':'free',tgId:u.id,tgUsername:u.username,created:new Date().toISOString()};
    saveUsers(users);
  }
  setSession({email:key,at:new Date().toISOString()});
  return true;
}

/* Telegram CloudStorage: sync progress between devices (1 MB per user) */
const tgCloud={keys:['gymai_cloud_workouts','gymai_cloud_plans','gymai_cloud_custom_plan','gymai_cloud_custom_exercises','gymai_cloud_setup'],
  put(k,v){try{if(!TG||!TG.CloudStorage)return;TG.CloudStorage.setItem(k,JSON.stringify(v),()=>{});}catch(e){}},
  get(k){try{if(!TG||!TG.CloudStorage)return null;let out=null;TG.CloudStorage.getItem(k,(v)=>{out=v;});return out;}catch(e){return null}},
  flush(){try{if(!TG||!TG.CloudStorage)return;TG.CloudStorage.getItems((items)=>{if(!items)return;try{for(const k in items){let v=items[k];if(v==null)continue;let p=JSON.parse(v);if(p&&typeof p==='object')localStorage.setItem(k,v);}}catch(e){}});}catch(e){}}
};

/* MainButton: primary action lives in Telegram's own button */
let tgMainHandler=null;
function tgSetMain(text,onClick){
  try{
    if(!TG||!TG.MainButton)return;
    const mb=TG.MainButton;
    if(!text){mb.hide();tgMainHandler=null;return;}
    mb.setText(text);
    try{mb.offClick&&mb.offClick(tgMainHandler||undefined);}catch(e){}
    tgMainHandler=onClick;
    if(onClick)mb.onClick(function(){try{onClick()}catch(e){}});
    mb.show();
  }catch(e){}
}
function tgUpdateMain(){
  /* v0.14: Telegram's native MainButton is NOT used.
     It is painted with the client's own accent colour (blue on some
     themes), which broke the app palette and duplicated the in-app
     primary buttons. The app renders its own .primary buttons. */
  try{ if(TG&&TG.MainButton)TG.MainButton.hide(); }catch(e){}
  try{ if(TG&&TG.BackButton)TG.BackButton.hide(); }catch(e){}
}
/* BackButton: Telegram's own back arrow for sub-screens */
let tgBackHandler=null;
function tgSetBack(onClick){
  try{
    if(!TG||!TG.BackButton)return;
    const bb=TG.BackButton;
    if(!onClick){bb.hide();tgBackHandler=null;return;}
    tgBackHandler=onClick;
    try{bb.offClick&&bb.offClick(tgBackHandler||undefined);}catch(e){}
    bb.onClick(function(){try{onClick()}catch(e){}});
    bb.show();
  }catch(e){}
}
function tgSyncBack(){
  if(!TG||!TG.BackButton)return;
  const active=document.querySelector('.screen.active');
  const id=active?active.id:'';
  if(id==='session'||id==='setup'||id==='planedit'||id==='coach'){tgSetBack(function(){nav('workout')});}
  else{tgSetBack(null);}
}
let tgIsFullscreen=false;
function tgNum(v){return (typeof v==='number'&&isFinite(v)&&v>0)?v:0;}
function tgReserveBottom(){
  try{
    if(!TG)return;
    /* Telegram WebApp SDK exposes viewportStableHeight / viewportHeight
       (NOT a `viewport` object - that was the bug: the function bailed out). */
    const vh=tgNum(TG.viewportStableHeight)||tgNum(TG.viewportHeight)||0;
    let full=tgIsFullscreen;
    try{if(typeof TG.isFullscreen==='boolean')full=TG.isFullscreen;}catch(e){}

    /* Bot API 8.0 reports exactly how much room Telegram's own overlays take.
       contentSafeAreaInset = the floating close / menu buttons. */
    let csa={top:0,bottom:0},sa={top:0,bottom:0};
    try{if(TG.contentSafeAreaInset)csa=TG.contentSafeAreaInset;}catch(e){}
    try{if(TG.safeAreaInset)sa=TG.safeAreaInset;}catch(e){}

    /* top = Telegram's OWN chrome only (contentSafeAreaInset.top).
       safeAreaInset.top is the DEVICE safe area (iOS status bar) and is already
       applied by CSS through env(safe-area-inset-top) - adding it here counted the
       status bar twice and pushed the app 54px too low.
       Measured on device: csa.top=46, sa.top=54, env(safe-area-inset-top)=54.
       Result: top reserve = 46px, .app padding-top = 54+46 = 100px, so the app
       starts immediately below Telegram's buttons with no extra gap. */
    let top=tgNum(csa.top);
    let bottom=tgNum(csa.bottom)+tgNum(sa.bottom);
    if(!full)bottom=bottom>0?bottom+8:0;

    const R=document.documentElement.style;
    R.setProperty('--tg-top-reserve',Math.round(top)+'px');
    R.setProperty('--tg-bottom-reserve',Math.round(bottom)+'px');
    document.body.classList.toggle('tg-fullscreen',!!full);
  }catch(e){}
}
function tgSyncViewport(){
  try{
    if(!TG)return;
    const h=tgNum(TG.viewportStableHeight)||tgNum(TG.viewportHeight)||0;
    if(h){
      document.documentElement.style.setProperty('--tg-vh',h+'px');
      document.documentElement.classList.add('tg-viewport');
    }
  }catch(e){}
  tgReserveBottom();
}
function tgApplyTheme(){
  /* v0.12: Telegram theme is NOT applied to the app palette.
     The user picks dark (original) or light; see themeSet(). */
  try{
    if(!TG)return;
    document.body.classList.add('tg-mode');
  }catch(e){}
}
function tgBoot(){
  if(!TG){return;}
  try{TG.ready();}catch(e){}
  try{TG.expand();}catch(e){}
  tgFullscreen();
  try{TG.enableClosingConfirmation&&TG.enableClosingConfirmation();}catch(e){}
  try{TG.setHeaderColor&&TG.setHeaderColor('secondary_bg_color');}catch(e){}
  try{TG.setBackgroundColor&&TG.setBackgroundColor('secondary_bg_color');}catch(e){}
  tgApplyTheme();
  tgSyncViewport();
  try{TG.onEvent&&TG.onEvent('viewportChanged',tgSyncViewport);}catch(e){}
  try{TG.onEvent&&TG.onEvent('safeAreaChanged',tgReserveBottom);}catch(e){}
  try{TG.onEvent&&TG.onEvent('contentSafeAreaChanged',tgReserveBottom);}catch(e){}
  try{setTimeout(tgReserveBottom,300);setTimeout(tgReserveBottom,1200);}catch(e){}
  try{TG.onEvent&&TG.onEvent('themeChanged',tgApplyTheme);}catch(e){}
  let ok=tgAutoLogin();
  tgCloud.flush();
  if(ok){try{setTimeout(function(){
      const a=document.querySelector('.screen.active');
      if(isAuthed()&&a&&a.id==='auth'){renderAccount();nav('workout');}
    },60);}catch(e){}}
}

