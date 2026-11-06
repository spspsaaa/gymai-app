/* ---------- v0.4 auth: account, session, contacts ---------- */
const USERS_KEY='gymai_users',SESSION_KEY='gymai_session';
/* The account list and the tariff live on the SERVER now. The browser keeps
   only a cached copy of the signed-in profile, so a reinstall or a redeploy
   cannot lose the name, the phone binding or the Pro tariff. */
let SRV_PROFILE=null;                 /* the server profile of the signed-in user */
function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||'{}')}catch(e){return {}}}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u))}
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function setSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
function currentUser(){
  let s=getSession(); if(!s)return null;
  if(SRV_PROFILE&&SRV_PROFILE.email)return SRV_PROFILE;
  let u=getUsers()[s.email];
  if(!u){setSession(null);return null}
  return u;
}
function isAuthed(){return !!currentUser()}
/* Pull the profile from the server and mirror it into the local cache. */
async function refreshServerProfile(){
  try{
    let h=acctHeaders();
    let r=await srvFetch(API_BASE+'/api/account/profile',{method:'GET',headers:h});
    if(!r.ok)return null;
    let d=await r.json();
    SRV_PROFILE=d.profile||null;
    if(SRV_PROFILE){
      let users=getUsers(); let prev=users[SRV_PROFILE.email]||{};
      users[SRV_PROFILE.email]=Object.assign({},prev,SRV_PROFILE);
      saveUsers(users);
      try{localStorage.setItem('gymai_plan',SRV_PROFILE.plan==='pro'?'pro':'free')}catch(e){}
    }
    return SRV_PROFILE;
  }catch(e){return null}
}
/* The profile name is shown in the header and in the chat, so it has to be
   the same on every device: it is stored on the server account, not only in
   localStorage. */
async function saveProfileName(){
  try{
    let h=acctHeaders();
    if(!h.Authorization)return;
    let r=await srvFetch(API_BASE+'/api/account/profile',{method:'PUT',headers:h,body:JSON.stringify({name:userName})});
    if(!r.ok)return;
    let d=await r.json();
    if(d&&d.profile){
      SRV_PROFILE=d.profile;
      let users=getUsers();let u=currentUser();
      if(u){users[u.email]=Object.assign({},users[u.email]||{},d.profile);saveUsers(users);}
    }
  }catch(e){}
}
function acctHeaders(){
  let h={'Content-Type':'application/json'};
  try{let t=acctToken(); if(t)h['Authorization']='Bearer '+t;}catch(e){}
  return h;
}
function hashPw(p){let h=0;for(let i=0;i<p.length;i++){h=(h*31+p.charCodeAt(i))|0}return 'h'+h}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||'').trim())}
function validPhone(p){return /^\+?[0-9\s\-()]{7,20}$/.test(String(p||'').trim())}
function showAuthError(msg){let e=$('authError');if(e){e.textContent=msg||''}}
function switchAuthTab(mode){
  let reg=mode==='register';
  $('tabLogin').classList.toggle('active',!reg);
  $('tabRegister').classList.toggle('active',reg);
  $('regFields').style.display=reg?'':'none';
  $('regPass2Wrap').style.display=reg?'':'none';
  $('authSubmit').textContent=reg?t('registerBtn'):t('loginBtn');
  showAuthError('');
}
$('tabLogin').onclick=()=>switchAuthTab('login');
$('tabRegister').onclick=()=>switchAuthTab('register');
$('goLogin').onclick=()=>nav('auth');

/* Server-backed account auth.
   The password is verified by the backend (scrypt + salt); the browser only
   ever holds the returned token. The account row is mirrored locally so the
   existing UI keeps working, but the server is the source of truth — that is
   what makes the data survive a device change. */
const ACCT_TOKEN_KEY='gymai_acct_token';
function acctToken(){try{return localStorage.getItem(ACCT_TOKEN_KEY)||''}catch(e){return ''}}
function setAcctToken(v){try{if(v)localStorage.setItem(ACCT_TOKEN_KEY,v);else localStorage.removeItem(ACCT_TOKEN_KEY)}catch(e){}}
function acctError(code){
  if(code==='email_taken')return t('emailTaken');
  if(code==='bad_credentials')return t('wrongPassword');
  if(code==='no_such_user')return t('noSuchUser');
  if(code==='bad_email')return t('invalidEmail');
  if(code==='weak_password')return t('shortPassword');
  if(code==='network')return t('networkError');
  return t('authFailed');
}
async function doAuth(){
  let email=($('authEmail').value||'').trim().toLowerCase();
  let pw=$('authPassword').value||'';
  let reg=$('tabRegister').classList.contains('active');
  showAuthError('');
  if(!validEmail(email)){showAuthError(t('invalidEmail'));return false}
  if(pw.length<6){showAuthError(t('shortPassword'));return false}
  if(reg&&$('regPass2Wrap').style.display!=='none'&&pw!==($('authPassword2').value||'')){
    showAuthError(t('passwordMismatch'));return false;
  }
  let btn=$('authSubmit'); if(btn)btn.disabled=true;
  try{
    let initData='';
    try{initData=(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp.initData:''}catch(e){}
    let path=reg?'/api/account/register':'/api/account/login';
    let r=await srvFetch(API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email,password:pw,initData:initData})});
    let d={};
    try{d=await r.json()}catch(e){}
    if(!r.ok){showAuthError(acctError(d.error||('http_'+r.status)));return false}
    setAcctToken(d.token||'');
    /* The account token IS the server credential for email/password users,
       so server sync must be switched on for them too. */
    try{SRV.enabled=true;}catch(e){}
    /* The server owns the profile and the tariff - read them right away. */
    try{await refreshServerProfile();}catch(e){}
    /* mirror the account locally for the existing UI (no password hash here) */
    let users=getUsers();
    let prev=users[email]||{};
    let name=(reg?($('regName').value||'').trim():'')||(prev.name)||email.split('@')[0];
    users[email]=Object.assign({},prev,{email:email,name:name,phone:prev.phone||'',
      phoneVerified:!!prev.phoneVerified,altEmail:prev.altEmail||'',altEmailVerified:!!prev.altEmailVerified,
      plan:prev.plan||'free',created:prev.created||new Date().toISOString()});
    saveUsers(users);
    setSession({email:email,at:new Date().toISOString()});
    /* The name typed at registration belongs to the ACCOUNT, not to this
       browser: it has to be on the server, otherwise the next device shows the
       e-mail prefix instead of the real name. */
    if(reg&&($('regName').value||'').trim()){
      try{userName=name;}catch(e){}
      try{localStorage.setItem('gymai_name',name);}catch(e){}
      try{
        let r=await srvFetch(API_BASE+'/api/account/profile',{method:'PUT',headers:acctHeaders(),
          body:JSON.stringify({name:name})});
        if(r&&r.ok){let d=await r.json();if(d&&d.profile){SRV_PROFILE=d.profile;
          let us=getUsers();us[email]=Object.assign({},us[email]||{},d.profile);saveUsers(us);}}
      }catch(e){}
    }
    $('authPassword').value='';$('authPassword2').value='';
    showToast(t('authOk'));
    renderAccount();
    /* Drop whatever the previous account left on this device FIRST, then pull
       the new account's data down. The other order would wipe the data that
       syncAll had just downloaded. */
    try{clearDeviceData()}catch(e){}
    try{reloadLocalState()}catch(e){}
    /* Enter the app immediately — the server round-trip must never hold
       the user on the login screen. Sync continues in the background. */
    nav('workout');
    try{SRV.syncAll().then(function(){try{reloadLocalState();}catch(e){}
      try{return refreshServerProfile();}catch(e){}
    }).then(function(){try{return loadChatHistory();}catch(e){}})
      .then(function(){try{
        ['renderCalendar','renderPlan','renderProgress','renderAccount','renderDays',
        'renderExercises','renderHistory','renderPresets'].forEach(function(fn){
        try{if(typeof window[fn]==='function')window[fn]()}catch(e){}});}catch(e){}})
      .catch(function(){});}catch(e){}
    return true;
  }catch(e){
    showAuthError(acctError('network'));
    return false;
  }finally{
    if(btn)btn.disabled=false;
  }
}
$('authSubmit').onclick=function(){doAuth()};
$('logoutBtn').onclick=function(){
  let tk=acctToken();
  if(tk){
    try{srvFetch(API_BASE+'/api/account/logout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk}}).catch(function(){});}catch(e){}
  }
  setAcctToken('');
  setSession(null);
  try{clearDeviceData()}catch(e){}
  try{reloadLocalState()}catch(e){}
  renderAccount();
  showToast(t('logout'));
  nav('auth');
};
let pendingContact=null,pendingCode=null,pendingValue=null;
function startLink(kind){
  if(!isAuthed()){showToast(t('loginRequired'));nav('auth');return}
  let val=prompt(t(kind==='phone'?'phone':'email')+':');
  if(val==null)return;
  val=val.trim();
  if(kind==='phone'&&!validPhone(val)){showToast(t('invalidPhone'));return}
  if(kind==='email'&&!validEmail(val)){showToast(t('invalidEmail'));return}
  pendingContact=kind;pendingValue=val;pendingCode=String(Math.floor(100000+Math.random()*900000));
  /* The confirmation-code block is not part of the static markup, so every
     lookup here has to be guarded — otherwise linking a phone throws a
     TypeError and the screen silently does nothing. */
  let _cb=$('codeBox'),_ci=$('codeInput'),_ce=$('codeError'),_ch=$('codeHint');
  if(_cb)_cb.style.display='';
  if(_ci)_ci.value='';
  if(_ce)_ce.textContent='';
  if(_ch)_ch.textContent=t('codeSent')+' — '+pendingCode;
}
/* Wipe the account-bound data from this device. Called on login and logout so
   the next account never sees the previous one's workouts on screen. */
function clearDeviceData(){
  try{
    ['gymai_workouts','gymai_custom_plan','gymai_schedule','gymai_custom_exercises',
     'gymai_presets','gymai_plan_prefs','gymai_draft','gymai_name','gymai_experience',
     'gymai_reminders','gymai_coach_usage','gymai_applied_preset']
      .forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});
  }catch(e){}
}

/* ---------- v0.28: re-read local state into the live variables ----------
   The state variables (workouts, plans, schedule, ...) are read from
   localStorage ONCE, when the page loads. After a login or a logout the
   server replaced the stored data, but the variables kept the old values,
   so the screens showed the previous user's statistics. reloadLocalState()
   re-reads everything and repaints. */
function reloadLocalState(){
  try{
    let w=null;try{w=JSON.parse(localStorage.getItem('gymai_workouts')||'null')}catch(e){}
    if(Array.isArray(w))workouts=w;
    try{schedule=JSON.parse(localStorage.getItem('gymai_schedule')||'{}')||{}}catch(e){schedule={}}
    syncPlans();
    userName=localStorage.getItem('gymai_name')||'Атлет';
    try{
      let ex=$('experience');if(ex)ex.value=localStorage.getItem('gymai_experience')||'beginner';
    }catch(e){}
    try{
      let rs=$('reminderSwitch');
      if(rs)rs.classList.toggle('on',localStorage.getItem('gymai_reminders')!=='false');
    }catch(e){}
  }catch(e){}
  try{
    ['renderCalendar','renderPlan','renderProgress','renderAccount','renderDays',
     'renderExercises','renderHistory','renderPresets','renderSession','renderWorkoutProgramList']
      .forEach(function(fn){try{if(typeof window[fn]==='function')window[fn]();}catch(e){}});
  }catch(e){}
}

function renderAccount(){
  let av=$('aboutVersion');if(av)av.textContent='Version '+APP_VERSION+' · Preview';
  let u=currentUser();
  let acc=$('accRow'),lr=$('loginRow');
  if(acc)acc.style.display=u?'':'none';
  if(lr)lr.style.display=u?'none':'';
  let em=$('accEmail');if(em)em.textContent=u?u.email:'';
  let pl=$('profileSubLine');
  if(pl)pl.textContent=u?u.email:t('telegramUser');
  let pv=$('phoneVal'),pb=$('phoneBadge');
  if(pv)pv.textContent=u&&u.phone?u.phone:'—';
  if(pb){pb.textContent=u&&u.phoneVerified?t('linked'):t('notLinked');pb.className=u&&u.phoneVerified?'badge-ok':'badge-off';}
  let ev=$('emailVal'),eb=$('emailBadge');
  if(ev)ev.textContent=u&&u.altEmail?u.altEmail:'—';
  if(eb){eb.textContent=u&&u.altEmailVerified?t('linked'):t('notLinked');eb.className=u&&u.altEmailVerified?'badge-ok':'badge-off';}
}




$('startWorkout').onclick=startSession;

$('setupAddBtn').onclick=addCustomExercise;
$('setupStartBtn').onclick=function(){
  if(!applySetupToDraft()){showToast(t('setupEmpty'));return}
  renderSession();nav('session');haptic();
};
