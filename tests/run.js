
/* ============================================================================
   GYM AI — offline test harness
   Runs the real client from index.html inside a minimal DOM shim.
   Usage:  node tests/run.js [feature|regression|all]
   Requires: node only (no npm packages).
   ========================================================================== */
const fs=require('fs'),vm=require('vm'),path=require('path');

/* ---------- 1. the DOM shim ---------- */

/* ================= minimal DOM shim for Node ================= */
class ClassList{
  constructor(el){this.el=el;this.s=new Set();}
  add(...c){c.forEach(x=>this.s.add(x));}
  remove(...c){c.forEach(x=>this.s.delete(x));}
  toggle(c,f){const on=(f===undefined)?!this.s.has(c):!!f;if(on)this.s.add(c);else this.s.delete(c);return on;}
  contains(c){return this.s.has(c);}
  get value(){return [...this.s].join(' ');}
}
class El{
  constructor(tag,attrs={}){
    this.tagName=(tag||'div').toUpperCase();this.attrs={};this.children=[];this.parentNode=null;
    this._text='';this._html='';this.dataset={};this.style={};this.classList=new ClassList(this);
    this.listeners={};this.onclick=null;this.value='';this.disabled=false;
    if(attrs.class)String(attrs.class).split(/\s+/).filter(Boolean).forEach(c=>this.classList.add(c));
    if(attrs.id)this.id=attrs.id;
  }
  get textContent(){return this._text;}
  set textContent(v){this._text=String(v);}
  get innerHTML(){return this._html;}
  set innerHTML(v){
    this._html=String(v);
    this.children=[];this._text='';
    if(typeof v==='string'&&v.trim())parseInto(this,v);
  }
  appendChild(c){this.children.push(c);c.parentNode=this;return c;}
  removeChild(c){this.children=this.children.filter(x=>x!==c);}
  remove(){if(this.parentNode)this.parentNode.removeChild(this);}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  addEventListener(t,f){(this.listeners[t]=this.listeners[t]||[]).push(f);}
  removeEventListener(t,f){this.listeners[t]=(this.listeners[t]||[]).filter(x=>x!==f);}
  dispatch(t,ev){(this.listeners[t]||[]).forEach(f=>f(ev||{}));}
  click(){
    const ev={target:this,currentTarget:this,preventDefault(){},stopPropagation(){},
      getAttribute:k=>this.attrs[k],dataset:this.dataset};
    if(this.onclick)this.onclick(ev);
    (this.listeners['click']||[]).forEach(f=>f(ev));
  }
  focus(){}
  querySelector(sel){const a=this.querySelectorAll(sel);return a[0]||null;}
  querySelectorAll(sel){return [];}
  get className(){return this.classList.value;}
  set className(v){this.classList=new ClassList(this);String(v).split(/\s+/).filter(Boolean).forEach(c=>this.classList.add(c));}
}
function walk(el,fn){for(const c of el.children||[]){fn(c);walk(c,fn);}}
const VOID=['br','img','input','hr','meta','link','source','area','base','col','embed','param','track','wbr'];
function parseInto(root,html){
  const stack=[root];
  const re=/<\/?([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while((m=re.exec(html))!==null){
    if(m[4]!==undefined){const t=m[4];if(t.trim())stack[stack.length-1]._text+=t;continue;}
    const tag=(m[1]||'').toLowerCase();
    const attrStr=m[2]||'';
    if(m[0][1]==='/'){for(let i=stack.length-1;i>0;i--){if(stack[i].tagName===tag.toUpperCase()){stack.length=i;break;}}continue;}
    const el=new El(tag);
    const ar=/([a-zA-Z0-9_:.-]+)\s*=\s*"([^"]*)"/g;let a;
    while((a=ar.exec(attrStr))!==null){
      el.attrs[a[1]]=a[2];
      if(a[1].startsWith('data-'))el.dataset[a[1].slice(5).replace(/-([a-z])/g,(mm,g)=>g.toUpperCase())]=a[2];
    }
    if(el.attrs.class)el.className=el.attrs.class;
    if(el.attrs.id)el.id=el.attrs.id;
    if(el.attrs.value!==undefined)el.value=el.attrs.value;
    stack[stack.length-1].appendChild(el);
    if(!VOID.includes(tag)&&!m[3])stack.push(el);
  }
  return root;
}
El.prototype.querySelectorAll=function(sel){
  const out=[];
  const attrMatch=sel.match(/^\[([a-zA-Z-]+)\]$/);
  const clsMatch=sel.match(/^\.([A-Za-z0-9_-]+)$/);
  walk(this,el=>{
    if(attrMatch){if(attrMatch[1] in el.attrs)out.push(el);}
    else if(clsMatch){if(el.classList.contains(clsMatch[1]))out.push(el);}
    else if(el.tagName===sel.toUpperCase())out.push(el);
  });
  return out;
};
class Storage{
  constructor(){this._d={};}
  getItem(k){return (k in this._d)?this._d[k]:null;}
  setItem(k,v){this._d[k]=String(v);}
  removeItem(k){delete this._d[k];}
  clear(){this._d={};}
  key(i){return Object.keys(this._d)[i];}
  get length(){return Object.keys(this._d).length;}
}
const docEl=new El('html');
const body=new El('body');
const document={
  documentElement:docEl,body:body,readyState:'complete',
  createElement:t=>new El(t),
  getElementById:id=>{let f=null;walk(body,el=>{if(!f&&el.id===id)f=el;});return f;},
  querySelector:s=>body.querySelector(s),
  querySelectorAll:s=>body.querySelectorAll(s),
  addEventListener:()=>{},removeEventListener:()=>{},
};
const localStorage=new Storage();
const sessionStorage=new Storage();
const navigator={userAgent:'node',vibrate:()=>{},clipboard:{writeText:async()=>{}},serviceWorker:{register:async()=>{}}};
const location={href:'https://x/',search:'',hash:'',reload:()=>{}};
const window={
  localStorage,sessionStorage,navigator,location,document,
  addEventListener:()=>{},removeEventListener:()=>{},
  Telegram:null,matchMedia:()=>({matches:false,addListener(){},addEventListener(){}}),
  scrollTo:()=>{},open:()=>{},alert:()=>{},confirm:()=>true,prompt:()=>'Тест',
  setTimeout:setTimeout,clearTimeout:clearTimeout,setInterval:setInterval,clearInterval:clearInterval,
  requestAnimationFrame:f=>setTimeout(f,0),innerWidth:390,innerHeight:844,
};
window.window=window;
globalThis.localStorage=localStorage;globalThis.sessionStorage=sessionStorage;
globalThis.document=document;globalThis.navigator=navigator;globalThis.location=location;
globalThis.window=window;
globalThis.fetch=async()=>({ok:false,status:0,text:async()=>'',json:async()=>({})});
globalThis.requestAnimationFrame=window.requestAnimationFrame;


/* ---------- 2. load the real app ---------- */
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

/* body markup */
const bodyMatch=html.match(/<body[^>]*>([\s\S]*)<\/body>/);
if(!bodyMatch){console.error('Не найден <body> в index.html');process.exit(1);}
parseInto(document.body, bodyMatch[1]);

/* the main inline script = the longest one */
const scripts=[...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(!scripts.length){console.error('Не найден inline-скрипт');process.exit(1);}
const main=scripts.reduce((a,b)=>b.length>a.length?b:a,'');

/* expose internals for the tests */
const probe=`
;global.__probe={
  get draft(){return draft}, set draft(v){draft=v},
  get workouts(){return workouts},
  get userName(){return userName},
  get lang(){return lang},
  get schedule(){return schedule},
  get selectedDay(){return selectedDay}, set selectedDay(v){selectedDay=v},
  get plans(){return plans}, set plans(v){plans=v},
  get BASE_PLANS(){return BASE_PLANS},
  get DRAFT_KEY(){return DRAFT_KEY}
};
global.__api={themeGet,themeSet,themeApply,renderThemeUI,renderSession,saveDraft,
  startFromPlan,loadDraft,reloadLocalState,clearDeviceData,renderCalendar,
  histRender,renderAccount};
global.__srv=SRV;
global.__keys={srvIsDataKey,srvDataKeys,srvDecode};
global.SRV_KEYS=SRV_KEYS;
global.SRV_LOCAL_ONLY=SRV_LOCAL_ONLY;
`;
const ctx=global; vm.createContext(ctx);
try{ vm.runInContext(main+probe,ctx,{filename:'index.html'}); }
catch(e){ console.error('Клиент не загрузился:',e.message); process.exit(1); }

const P=ctx.__probe,A=ctx.__api,K=ctx.__keys;
const out=[];
function chk(name,cond,extra){
  out.push([name,cond]);
  console.log((cond?'✅':'❌'),name,extra===undefined?'':('| '+extra));
}

/* ---------- 3. the suites ---------- */
const SUITES={};

SUITES.feature=function(){
console.log('\n--- ТЕМА: светлая ---');
chk('themeGet по умолчанию тёмная', A.themeGet()==='dark', A.themeGet());
A.themeSet('light');
chk('тема сохранена в localStorage', localStorage.getItem('gymai_theme')==='light', localStorage.getItem('gymai_theme'));
chk('класс light-theme на documentElement', ctx.document.documentElement.classList.contains('light-theme'));
chk('data-theme=light', ctx.document.documentElement.getAttribute('data-theme')==='light', ctx.document.documentElement.getAttribute('data-theme'));
chk('кнопка переключателя отрисована', !!ctx.document.getElementById('themeToggle'));
const btn=ctx.document.getElementById('themeToggle');
chk('aria-label переключателя обновлён', (btn.getAttribute('aria-label')||'').indexOf('тёмную')>-1 || (btn.getAttribute('aria-label')||'').indexOf('светлую')>-1, btn.getAttribute('aria-label'));
chk('эмодзи кнопки = ◐ в светлой теме', btn.textContent==='◐', btn.textContent);

console.log('\n--- ТЕМА: клик по кнопке переключает ---');
btn.click();
chk('после клика тема тёмная', A.themeGet()==='dark', A.themeGet());
chk('light-theme снят', !ctx.document.documentElement.classList.contains('light-theme'));
chk('эмодзи = ☾ в тёмной теме', btn.textContent==='☾', btn.textContent);
btn.click();
chk('после второго клика светлая', A.themeGet()==='light');

console.log('\n--- ТЕМА: перезагрузка страницы ---');
chk('тема переживает перезапуск (читается из localStorage)', (function(){localStorage.setItem('gymai_theme','light');return A.themeGet()==='light';})());

console.log('\n--- УДАЛЕНИЕ УПРАЖНЕНИЯ ---');
/* build a draft with 3 exercises */
const DRAFT_KEY=P.DRAFT_KEY;
localStorage.setItem(DRAFT_KEY,JSON.stringify({day:0,items:['Жим','Присед','Тяга'],sets:{'0':[{weight:60,reps:10}],'1':[{weight:80,reps:5}],'2':[{weight:100,reps:3}]},startedAt:Date.now()}));
P.draft = A.loadDraft();
console.log('  draft loaded items:', P.draft?P.draft.items.length:'null');
chk('черновик загрузился', P.draft && P.draft.items.length===3);
A.renderSession();
const html=ctx.document.getElementById('sessionExercises').innerHTML;
chk('кнопки удаления отрисованы', html.indexOf('data-delex')>-1);
chk('три кнопки удаления', (html.match(/data-delex=/g)||[]).length===3, (html.match(/data-delex=/g)||[]).length);
/* click the delete button of exercise index 1 */
const dels=ctx.document.getElementById('sessionExercises').querySelectorAll('[data-delex]');
console.log('  найдено кнопок в DOM:',dels.length, dels.map(d=>d.dataset.delex).join(','));
dels[1].click();
chk('упражнение удалено из items', P.draft.items.length===2, JSON.stringify(P.draft.items));
chk('удалено именно второе упражнение', P.draft.items[0]==='Жим'&&P.draft.items[1]==='Тяга', JSON.stringify(P.draft.items));
chk('подходы переиндексированы', JSON.stringify(P.draft.sets)==='{"0":[{"weight":60,"reps":10}],"1":[{"weight":100,"reps":3}]}', JSON.stringify(P.draft.sets));
const saved=JSON.parse(localStorage.getItem(DRAFT_KEY));
chk('изменение сохранено в localStorage', saved.items.length===2, JSON.stringify(saved.items));
chk('в сохранённом черновике подходы тоже переиндексированы', JSON.stringify(saved.sets)==='{"0":[{"weight":60,"reps":10}],"1":[{"weight":100,"reps":3}]}', JSON.stringify(saved.sets));

console.log('\n--- УДАЛЕНИЕ ПОСЛЕДНЕГО УПРАЖНЕНИЯ ---');
localStorage.setItem(DRAFT_KEY,JSON.stringify({day:0,items:['Жим'],sets:{'0':[{weight:60,reps:10}]}}));
P.draft = A.loadDraft(); A.renderSession();
const dels2=ctx.document.getElementById('sessionExercises').querySelectorAll('[data-delex]');
dels2[0].click();
chk('после удаления последнего items пуст', P.draft.items.length===0, JSON.stringify(P.draft.items));
chk('sets пуст', JSON.stringify(P.draft.sets)==='{}', JSON.stringify(P.draft.sets));

console.log('\n=== ИТОГ:',out.filter(x=>x[1]).length,'/',out.length,'пройдено ===');
out.filter(x=>!x[1]).forEach(x=>console.log('  ПРОВАЛ:',x[0]));

};

SUITES.regression=function(){
console.log('--- РЕГРЕССИЯ v0.36 ---');
/* 1. account switch must not leak data */
localStorage.setItem('gymai_workouts',JSON.stringify([{date:'2026-01-01',title:'A'}]));
localStorage.setItem('gymai_name','UserA');
A.reloadLocalState();
chk('workouts читаются при reload', P.workouts.length===1, P.workouts.length);
chk('имя читается при reload', P.userName==='UserA', P.userName);
localStorage.setItem('gymai_workouts',JSON.stringify([{date:'2026-02-02',title:'B'}]));
localStorage.setItem('gymai_name','UserB');
A.reloadLocalState();
chk('данные аккаунта заменяются', P.workouts.length===1&&P.workouts[0].title==='B', P.workouts[0]&&P.workouts[0].title);
chk('имя заменяется', P.userName==='UserB', P.userName);

/* 2. clearDeviceData */
localStorage.setItem('gymai_workouts',JSON.stringify([{title:'A'}]));
localStorage.setItem('gymai_name','UserA');
localStorage.setItem('gymai_draft',JSON.stringify({day:0,sets:{}}));
localStorage.setItem('gymai_acct_token','tok123');
A.clearDeviceData();
const left=['gymai_workouts','gymai_name','gymai_draft'].filter(k=>localStorage.getItem(k)!==null);
chk('clearDeviceData вычищает данные аккаунта', left.length===0, JSON.stringify(left));
chk('токен переживает clearDeviceData', localStorage.getItem('gymai_acct_token')==='tok123');

/* 3. server-sync key rules */
chk('токены не синхронизируются', K.srvIsDataKey('gymai_acct_token')===false);
chk('сессия не синхронизируется', K.srvIsDataKey('gymai_session')===false);
chk('кэш пользователей не синхронизируется', K.srvIsDataKey('gymai_users')===false);
chk('данные синхронизируются', K.srvIsDataKey('gymai_workouts')===true);
chk('динамический ключ дня синхронизируется', K.srvIsDataKey('gymai_setup_3')===true);
chk('тема синхронизируется', K.srvIsDataKey('gymai_theme')===true);
chk('имя синхронизируется', K.srvIsDataKey('gymai_name')===true);

/* 4. srvDataKeys only returns data keys */
localStorage.clear();
['gymai_workouts','gymai_theme','gymai_setup_0','gymai_acct_token','gymai_users','gymai_session'].forEach(k=>localStorage.setItem(k,'{}'));
const dk=K.srvDataKeys();
chk('srvDataKeys отбирает только ключи данных', dk.includes('gymai_workouts')&&dk.includes('gymai_setup_0')&&!dk.includes('gymai_acct_token')&&!dk.includes('gymai_users'), JSON.stringify(dk));

/* 5. srvDecode */
chk('decode маркера', K.srvDecode({__raw:'Тест'})==='Тест');
chk('decode голой строки', K.srvDecode('строка')==='строка');
chk('decode JSON', K.srvDecode([{a:1}])==='[{"a":1}]');

/* 6. theme persists */
localStorage.setItem('gymai_theme','light');
chk('тема читается из хранилища', A.themeGet()==='light');

/* 7. render functions must not throw */
let errs=[];
for(const fn of ['renderSession','renderCalendar','histRender','renderAccount']){
  try{ A[fn](); }catch(e){ errs.push(fn+': '+e.message); }
}
chk('функции отрисовки не падают', errs.length===0, errs.join('; '));

/* 8. startFromPlan + draft round trip */
A.startFromPlan(0);
chk('startFromPlan создаёт черновик', P.draft && Array.isArray(P.draft.items), P.draft?P.draft.items.length:'null');
if(P.draft){ P.draft.sets={'0':[{weight:50,reps:5}]}; A.saveDraft();
  const back=A.loadDraft();
  chk('черновик сохраняется и читается', back && back.sets['0'][0].weight===50, JSON.stringify(back&&back.sets)); }

console.log('\n=== ИТОГ:',out.filter(x=>x[1]).length,'/',out.length,'пройдено ===');
out.filter(x=>!x[1]).forEach(x=>console.log('  ПРОВАЛ:',x[0]));

};


SUITES.sync=async function(){
  console.log('--- СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ---');
  const S=ctx.__srv;
  /* the client intercepts localStorage.setItem — the harness must not, so the
     remote values have to be applied through the raw storage object */
  const rawSet=localStorage.setItem.bind(localStorage);

  /* a fake network layer */
  let pushed=null;
  S.pull=async function(){return this._remote||null;};
  S.push=async function(keys){pushed=keys;};
  S.hasAuth=function(){return true;};

  localStorage.clear();
  rawSet('gymai_workouts',JSON.stringify([{old:1}]));
  rawSet('gymai_name','Локальное');
  S._remote={gymai_workouts:[{new:2}],gymai_name:{__raw:'Из Сервера'}};
  await S.syncAll();
  chk('удалённое значение применяется', JSON.parse(rawSet.length?localStorage.getItem('gymai_workouts'):'[]')[0].new===2, localStorage.getItem('gymai_workouts'));
  chk('строка с маркером разворачивается', localStorage.getItem('gymai_name')==='Из Сервера', localStorage.getItem('gymai_name'));

  localStorage.clear();
  rawSet('gymai_workouts',JSON.stringify([{old:1}]));
  rawSet('gymai_presets',JSON.stringify(['x']));
  rawSet('gymai_session_token','keepme');
  rawSet('gymai_acct_token','secret-token');
  rawSet('gymai_users',JSON.stringify({a:1}));
  rawSet('gymai_setup_1',JSON.stringify({items:['a']}));
  S._remote={gymai_workouts:[{new:2}]};
  await S.syncAll();
  chk('устаревший ключ удаляется', localStorage.getItem('gymai_presets')===null, localStorage.getItem('gymai_presets'));
  chk('токен сессии не трогается', localStorage.getItem('gymai_session_token')==='keepme');
  chk('устаревший динамический ключ удаляется', localStorage.getItem('gymai_setup_1')===null, localStorage.getItem('gymai_setup_1'));
  chk('push отправляет только ключи данных', Array.isArray(pushed)&&pushed.indexOf('gymai_workouts')>-1&&pushed.indexOf('gymai_session_token')===-1, JSON.stringify(pushed));
  chk('токен аккаунта не уходит в push', pushed.indexOf('gymai_acct_token')===-1, JSON.stringify(pushed));
  chk('кэш пользователей не уходит в push', pushed.indexOf('gymai_users')===-1, JSON.stringify(pushed));
  chk('токен аккаунта остался на месте', localStorage.getItem('gymai_acct_token')==='secret-token');
  chk('кэш пользователей остался на месте', localStorage.getItem('gymai_users')!==null);

  /* the token filter itself */
  chk('токены не считаются данными', K.srvIsDataKey('gymai_acct_token')===false&&K.srvIsDataKey('gymai_session_token')===false&&K.srvIsDataKey('gymai_users')===false);
  chk('случайный чужой ключ не считается данными', K.srvIsDataKey('some_random_key')===false);
  chk('известный ключ данных считается данными', K.srvIsDataKey('gymai_workouts')===true);
  chk('динамический ключ дня считается данными', K.srvIsDataKey('gymai_setup_0')===true);
  chk('ключ аккаунта отсекается даже при попадании в SRV_KEYS', (function(){
    /* The guard is doubled: SRV_LOCAL_ONLY is checked before SRV_KEYS, so a
       token that also sits in SRV_KEYS is still not treated as data. A single
       removal of either list therefore changes nothing — only breaking both
       leaks the token. The test below reproduces that combined break. */
    return K.srvIsDataKey('gymai_acct_token')===false;})());
  chk('токен не попадает в данные и при двойной поломке (SRV_KEYS + LOCAL_ONLY)', (function(){
    const savedKeys=ctx.SRV_KEYS.slice(),savedLocal=ctx.SRV_LOCAL_ONLY.slice();
    try{
      ctx.SRV_KEYS.push('gymai_acct_token');
      ctx.SRV_LOCAL_ONLY.length=0;
      const leaked=K.srvIsDataKey('gymai_acct_token')===true;
      ctx.SRV_KEYS.length=0;ctx.SRV_KEYS.push.apply(ctx.SRV_KEYS,savedKeys);
      ctx.SRV_LOCAL_ONLY.length=0;ctx.SRV_LOCAL_ONLY.push.apply(ctx.SRV_LOCAL_ONLY,savedLocal);
      /* the double break MUST leak — otherwise the guard is not real */
      return leaked===true && K.srvIsDataKey('gymai_acct_token')===false;
    }catch(e){ return false; }
  })());
  chk('srvDataKeys не отдаёт токены', (function(){localStorage.clear();['gymai_workouts','gymai_acct_token','gymai_users','gymai_setup_2'].forEach(function(k){rawSet(k,'{}');});const d=K.srvDataKeys();return d.indexOf('gymai_workouts')>-1&&d.indexOf('gymai_setup_2')>-1&&d.indexOf('gymai_acct_token')===-1&&d.indexOf('gymai_users')===-1;})());
};

/* ---------- 4. run ---------- */
(async function main(){
const which=process.argv[2]||'all';
const names=which==='all'?Object.keys(SUITES):[which];
let bad=0;
for(const n of names){
  console.log('\n===== '+n+' =====');
  const before=out.length;
  try{ await SUITES[n](); }
  catch(e){ console.log('❌ набор упал:',e.message); bad++; }
  const mine=out.slice(before);
  const passed=mine.filter(x=>x[1]).length;
  console.log('--- '+n+': '+passed+'/'+mine.length+' пройдено ---');
  mine.filter(x=>!x[1]).forEach(x=>console.log('  ПРОВАЛ:',x[0]));
  bad+=mine.length-passed;
}
console.log('\n'+(bad===0?'✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ':'❌ провалов: '+bad));
process.exit(bad===0?0:1);
})();
