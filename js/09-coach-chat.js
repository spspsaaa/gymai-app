function finishWorkoutNow(){
  let exArr=[],volume=0,setsCount=0;
  Object.keys(draft.sets).forEach(function(k){
    let _items=(draft.items&&draft.items.length)?draft.items:((plans[draft.day]||BASE_PLANS[0]).items||[]);
    let x=_items[+k];
    draft.sets[k].forEach(function(s){
      let w=+s.weight||0,r=+s.reps||0;
      if(r<=0)return;
      exArr.push({name:x[1],weight:w,reps:r});volume+=w*r;setsCount++;
    });
  });
  if(!setsCount){showToast(t('addSetFirst'));return}
  workouts.push({date:new Date().toISOString(),title:lang==='ru'?((draft.items&&draft.items.length)?(plans[draft.day]||BASE_PLANS[0]).name:(plans[draft.day]||BASE_PLANS[0]).name):(plans[draft.day]||BASE_PLANS[0]).en,sets:setsCount,volume:volume,ex:exArr});
  save();draft=null;saveDraft();updateStartButton();renderProgress();nav('progress');showToast(t('finished'));

}
function showLastTime(name){
  var info=lastExerciseInfo(name);
  if(!info){showToast(lang==='ru'?'Нет данных о прошлых тренировках':'No history yet');return}
  var d=new Date(info.date);
  var dateStr=d.toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long',year:'numeric'});
  var timeStr=d.toLocaleTimeString(lang==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit'});
  $('lastTimeTitle').textContent=name;
  $('lastTimeEyebrow').textContent=(lang==='ru'?'ПРОШЛЫЙ РАЗ':'LAST TIME');
  var setsHtml=info.sets.map(function(s,i){
    var w=s.weight;
    var wtxt=(w==='body'||w==='BW'||w===''||w==null||w===undefined)?'BW':(w+' '+t('kg'));
    return '<div class="lasttime-set"><span>'+t('sets')+' '+(i+1)+'</span><span>'+wtxt+' × '+s.reps+'</span></div>';
  }).join('');
  $('lastTimeBody').innerHTML=
    '<div class="card" style="margin-top:12px">'+
      '<div style="font-size:13px;font-weight:800">'+dateStr+' · '+timeStr+'</div>'+
      (info.workoutTitle?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+escAttr(info.workoutTitle)+'</div>':'')+
      '<div style="font-size:12px;color:var(--muted);margin-top:8px">'+
        (lang==='ru'?'Подходов: ':'Sets: ')+info.sets.length+
        ' · '+(lang==='ru'?'объём: ':'volume: ')+info.volume+' '+t('kg')+'</div>'+
      '<div class="lasttime-sets">'+setsHtml+'</div>'+
    '</div>';
  $('lastTimeModal').classList.add('open');
}
document.addEventListener('click',function(e){
  var t=e.target;
  if(t&&t.dataset&&t.dataset.lasttime!==undefined){showLastTime(t.dataset.lasttime);return}
});
$('finishWorkout').onclick=finishWorkoutNow;
$('planDays').innerHTML=plans.map((p,i)=>`<div class="card"><b>${lang==='ru'?p.name:p.en}</b>${p.items.map((x,j)=>`<div class="workout-row"><div class="exercise-icon">${x[6]?PE_CUSTOM_ICON:x[0]}</div><div class="exercise-info"><b>${lang==='ru'?x[1]:x[2]}</b></div><button class="ex-del-btn" data-planexdel="${i}-${j}" aria-label="Remove">×</button></div>`).join('')}</div>`).join('');
document.querySelectorAll('[data-planexdel]').forEach(function(b){b.onclick=function(){
  let parts=b.dataset.planexdel.split('-');let pi=+parts[0],xi=+parts[1];
  let pr=plans[pi];if(!pr||!pr.items[xi])return;
  let nm=lang==='ru'?pr.items[xi][1]:pr.items[xi][2];
  askConfirm(t('confirmDelEx'),t('confirmDelExText').replace('%s',nm),function(){
    pr.items.splice(xi,1);savePlansNow();syncPlans();renderPlan();showToast(t('exDeleted'));haptic();
  });
}});$('editPlan').onclick=()=>{peOpen()};
$('planEditBack').onclick=()=>nav('workout');
$('planAddExBtn').onclick=()=>{peCatalogSearch('');$('planExModal').classList.add('open')};
$('peNewExSave').onclick=function(){
  let name=($('peNewExName').value||'').trim();
  if(!name){showToast(t('peNameRequired'));return}
  let sets=+$('peNewExSets').value||3,reps=+$('peNewExReps').value||10;
  let w=($('peNewExWeight').value||'').trim();
  let weight=(w===''||w==='body')?'body':(+w||0);
  let x=[PE_CUSTOM_ICON,name,name,sets,reps,weight,1];
  saveCustomExercise(x);
  peDays[peDay].items.push([x[0],x[1],x[2],x[3],x[4],x[5],1]);
  $('planExModal').classList.remove('open');
  $('peNewExName').value='';$('peNewExSets').value='';$('peNewExReps').value='';$('peNewExWeight').value='';
  peSave();peRenderEx();showToast(t('exCreated'));haptic('success');
};
$('closePlanEx').onclick=()=>$('planExModal').classList.remove('open');
$('planExSearch').oninput=function(){peCatalogSearch(this.value)};
$('planSaveBtn').onclick=peApply;
$('planRenameDay').onclick=function(){
  let n=$('planDayName').value.trim();
  if(!n){showToast(t('peNameRequired'));return}
  peDays[peDay].name=n;peDays[peDay].en=n;peSave();peRender();
};
$('planAddProgram').onclick=function(){
  peDays.push({name:t('peNewProgram'),en:t('peNewProgram'),items:[]});peDay=peDays.length-1;peSave();peRender();haptic();
};
$('planDelDay').onclick=function(){
  if(peDays.length<=1){showToast(t('peNeedOne'));return}
  let nm=peDays[peDay]?peDays[peDay].name:'';
  askConfirm(t('confirmDelProgram'),t('confirmDelProgramText').replace('%s',nm),function(){
    peDays.splice(peDay,1);peDay=0;peSave();peRender();haptic();
  });
};
$('expandCal').onclick=()=>{calExpanded=!calExpanded;renderCalendar()};$('closePlan').onclick=()=>$('planModal').classList.remove('open');
function haptic(kind){try{const tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.HapticFeedback){if(kind==='success')tg.HapticFeedback.notificationOccurred('success');else tg.HapticFeedback.impactOccurred('light')}}catch(e){}}
function beep(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=new AC(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(.3,c.currentTime+.05);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.45);o.start();o.stop(c.currentTime+.5)}catch(e){}}
let confirmCb=null;
function askConfirm(title,text,cb){
  $('confirmTitle').textContent=title;
  $('confirmText').textContent=text;
  confirmCb=cb;
  $('confirmModal').classList.add('open');
}
function closeConfirm(){confirmCb=null;$('confirmModal').classList.remove('open')}
$('confirmClose').onclick=closeConfirm;
$('confirmNo').onclick=closeConfirm;
$('confirmYes').onclick=function(){let cb=confirmCb;closeConfirm();if(cb)cb()};
function showToast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2100)}
function addMessage(text,me=false){let d=document.createElement('div');d.className='chat-bubble'+(me?' me':'');d.textContent=text;$('messages').appendChild(d);$('messages').scrollTop=$('messages').scrollHeight;return d}
function localCoachReply(msg){let s=msg.toLowerCase(),reply=s.includes('план')||s.includes('plan')?t('aiPlanReply'):s.includes('дн')||s.includes('split')?t('aiSplitReply'):s.includes('отдых')||s.includes('rest')?t('aiRestReply'):t('aiDefault');return reply}
const API_BASE='https://gymai-backend-ev1z.onrender.com';
const AI_ENDPOINT=API_BASE+'/api/coach';
/* Every server call gets a timeout: on a cold backend (the free Render
   instance sleeps) a fetch can hang for a minute, and a login that awaits it
   leaves the user staring at a toast with no screen change. */
const SRV_TIMEOUT=8000;
function srvFetch(url,opts){
  opts=opts||{};
  let ctl=null,tid=null;
  try{
    if(typeof AbortController!=='undefined'){ctl=new AbortController();tid=setTimeout(function(){try{ctl.abort()}catch(e){}},SRV_TIMEOUT);}
    opts.signal=ctl?ctl.signal:opts.signal;
  }catch(e){}
  return fetch(url,opts).then(function(r){if(tid)clearTimeout(tid);return r;},
    function(err){if(tid)clearTimeout(tid);throw err;});
}
function coachHeaders(){
  try{if(typeof SRV!=='undefined'&&SRV.token)return {'Content-Type':'application/json','Authorization':'Bearer '+SRV.token};}catch(e){}
  return {'Content-Type':'application/json'};
}
function coachReply(msg){let think=addMessage(lang==='ru'?'Печатаю…':'Typing…');let drop=function(){if(think&&think.remove)think.remove();};
  let dbg=function(txt){try{console.log('[gymai]',txt);}catch(e){}};
  dbg('URL='+AI_ENDPOINT);
  try{
    let _id=(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp.initData:'';
  }catch(e){dbg('initData read err '+e);}
  fetch(AI_ENDPOINT,{method:'POST',headers:coachHeaders(),body:JSON.stringify({message:msg,lang:lang,history:chatHistory.slice(-6),initData:(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp.initData:''})})
   .then(function(r){
     dbg('HTTP '+r.status+' '+r.statusText);
     if(r.status===401){
       dbg('401 -> re-auth and retry');
       return (SRV&&SRV.auth?SRV.auth():Promise.resolve(false)).then(function(ok){
         dbg('re-auth '+(ok?'ok':'failed')+'; retry');
         return fetch(AI_ENDPOINT,{method:'POST',headers:coachHeaders(),body:JSON.stringify({message:msg,lang:lang,history:chatHistory.slice(-6),initData:(window.Telegram&&window.Telegram.WebApp)?window.Telegram.WebApp.initData:''})});
       }).then(function(r2){
         dbg('HTTP2 '+r2.status+' '+r2.statusText);
         if(!r2.ok)return r2.text().then(function(t){throw new Error('HTTP '+r2.status+' :: '+t.slice(0,300))});
         return r2.json();
       });
     }
     if(!r.ok)return r.text().then(function(t){throw new Error('HTTP '+r.status+' :: '+t.slice(0,300))});
     return r.json();
   })
   .then(function(d){drop();dbg('reply='+JSON.stringify(d).slice(0,200));
     let reply=(d&&d.reply)||localCoachReply(msg);
     /* the user turn was already pushed by the submit handler */
     chatHistory.push({role:'assistant',content:reply});
     if(chatHistory.length>200)chatHistory=chatHistory.slice(-200);
     addMessage(reply);
     /* the server counted this request - read the real number back */
     try{refreshServerProfile().then(function(){renderPlan()})}catch(e){}
   })
   .catch(function(e){drop();dbg('ERR '+(e&&e.message?e.message:String(e)));addMessage(localCoachReply(msg))})}
/* The conversation is stored on the server, so it survives a reinstall and
   follows the user to another device. */
let chatHistory=[];
function renderChatHistory(){
  let box=$('messages'); if(!box)return;
  box.innerHTML='';
  chatHistory.slice(-60).forEach(function(m){
    if(!m||!m.content)return;
    let d=document.createElement('div');
    d.className='chat-bubble'+(m.role==='user'?' me':'');
    d.textContent=m.content;
    box.appendChild(d);
  });
  box.scrollTop=box.scrollHeight;
}
async function loadChatHistory(){
  try{
    let r=await srvFetch(API_BASE+'/api/chat/history',{method:'GET',headers:acctHeaders()});
    if(!r.ok)return;
    let d=await r.json();
    if(Array.isArray(d.history)){chatHistory=d.history;renderChatHistory();}
  }catch(e){}
}
$('chatForm').onsubmit=e=>{e.preventDefault();let v=$('chatInput').value.trim();if(!v)return;if(coachLeft()<=0){addMessage(v,true);chatHistory.push({role:'user',content:v});$('chatInput').value='';showToast(t('limitReached')+' — '+t('limitHint'));renderPlan();return}addMessage(v,true);chatHistory.push({role:'user',content:v});$('chatInput').value='';bumpCoachUsage();renderPlan();coachReply(v)};document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{let k=b.dataset.prompt,v=k==='plan'?t('promptPlan'):k==='split'?t('promptSplit'):t('promptRest');addMessage(v,true);chatHistory.push({role:'user',content:v});coachReply(v)});$('modePlan').onclick=()=>{if(!isPro()){showToast(t('proOnly')+' — '+t('proOnlyHint'));return}openGenerator()};$('modeChat').onclick=()=>$('chatInput').focus();
themeWire();langWire();$('experience').onchange=e=>localStorage.setItem('gymai_experience',e.target.value);$('experience').value=localStorage.getItem('gymai_experience')||'beginner';$('reminderSwitch').onclick=()=>{$('reminderSwitch').classList.toggle('on');localStorage.setItem('gymai_reminders',$('reminderSwitch').classList.contains('on'))};if(localStorage.getItem('gymai_reminders')==='false')$('reminderSwitch').classList.remove('on');$('editName').onclick=()=>{let n=prompt(t('askName'),userName);if(n&&n.trim()){userName=n.trim().slice(0,32);localStorage.setItem('gymai_name',userName);$('profileName').textContent=(currentUser()&&currentUser().name)||userName;$('avatarLetter').textContent=userName[0].toUpperCase();saveProfileName();showToast(t('saved'))}};
$('period').onchange=()=>renderProgress();
function periodDays(){return $('period').value==='month'?30:7}
renderAccount();
if(!isAuthed()){nav('auth');}
draft=loadDraft();
if(draft&&draft.day!=null){selectedDay=draft.day}
$('profileName').textContent=(currentUser()&&currentUser().name)||userName;$('avatarLetter').textContent=userName[0].toUpperCase();renderDays();renderExercises();renderProgress();updateStartButton();renderPlan();

function buildDaysFromNames(names,level){let tp=['upper','lower','full'];let repsAdj=level==='beginner'?2:level==='advanced'?3:null;let out=names.map(function(n,i){let key=n.toLowerCase();let k=key.indexOf('ниж')>=0||key.indexOf('leg')>=0?'lower':(key.indexOf('верх')>=0||key.indexOf('upper')>=0||key.indexOf('спина')>=0||key.indexOf('back')>=0)?'upper':(key.indexOf('всё')>=0||key.indexOf('full')>=0||key.indexOf('light')>=0)?'full':tp[i%3];let src=BASE_PLANS.find(function(b){return b.name.toLowerCase().indexOf(k)===0});if(!src){src=BASE_PLANS[{upper:0,lower:1,full:2}[k]]}return{name:n,en:n,items:src.items.map(function(it){return[it[0],it[1],it[2],repsAdj||it[3],it[4],it[5]]})}});return out}
function openGenerator(){$('generatedPreview').innerHTML='';$('generatorModal').classList.add('open');$('generatorTitle').textContent=lang==='ru'?'Создать программу':'Build a program';$('generatorIntro').textContent=lang==='ru'?'Выбери цель, количество дней и опыт. Получишь предварительную структуру тренировочной недели.':'Choose a goal, weekly frequency and experience to preview a training split.';$('goalLabel').textContent=lang==='ru'?'Цель':'Goal';$('daysLabel').textContent=lang==='ru'?'Дней в неделю':'Days per week';$('levelLabel').textContent=lang==='ru'?'Опыт':'Experience';$('goalSelect').options[0].text=lang==='ru'?'Сила':'Strength';$('goalSelect').options[1].text=lang==='ru'?'Общая форма':'General fitness';$('goalSelect').options[2].text=lang==='ru'?'Развитие силы и мышц':'Strength & muscle development';$('levelSelect').options[0].text=lang==='ru'?'Начальный':'Beginner';$('levelSelect').options[1].text=lang==='ru'?'Средний':'Intermediate';$('levelSelect').options[2].text=lang==='ru'?'Продвинутый':'Advanced';$('generateLabel').textContent=lang==='ru'?'Собрать черновик':'Generate draft';$('generatorDisclaimer').textContent=lang==='ru'?'Это демонстрационный конструктор, не подключённый к ИИ. Перед началом адаптируй нагрузку под свой опыт и самочувствие.':'This is a sample plan builder, not a live AI connection. Adjust training to your experience and how you feel.';}
function buildPlanDraft(){let days=+$('daysSelect').value,goal=$('goalSelect').value,level=$('levelSelect').value;let names=days===2?(lang==='ru'?['Всё тело A','Всё тело B']:['Full body A','Full body B']):days===3?(lang==='ru'?['Верх тела','Нижняя часть','Всё тело']:['Upper body','Lower body','Full body']):days===4?(lang==='ru'?['Верх тела A','Нижняя часть A','Верх тела B','Нижняя часть B']:['Upper A','Lower A','Upper B','Lower B']):(lang==='ru'?['Грудь и трицепс','Спина и бицепс','Ноги','Плечи и корпус','Лёгкая общая']:['Chest & triceps','Back & biceps','Legs','Shoulders & core','Light full body']);let exercises=lang==='ru'?['Жим в тренажёре · Тяга блока · Жим гантелей','Жим ногами · Сгибание ног · Подъёмы на икры','Тяга горизонтального блока · Жим от груди · Планка']:['Machine chest press · Lat pulldown · Dumbbell press','Leg press · Leg curl · Calf raises','Seated row · Chest press · Plank'];let goalText=goal==='strength'?(lang==='ru'?'Акцент на освоении базовых движений и постепенном росте нагрузки.':'Focus on mastering fundamental movements and gradual progression.'):goal==='muscle'?(lang==='ru'?'Умеренный объём и контролируемая техника.':'Moderate volume and controlled technique.'):(lang==='ru'?'Сбалансированная нагрузка на основные группы мышц.':'Balanced work across major muscle groups.');$('generatedPreview').innerHTML=`<div class="section-head"><h3>${lang==='ru'?'Предварительная программа':'Program preview'}</h3><span class="pill">${days} ${lang==='ru'?'дня':'days'}</span></div>${names.map((n,i)=>`<div class="preview-day"><b>${lang==='ru'?'ДЕНЬ':'DAY'} ${i+1} · ${n}</b><p>${exercises[i%exercises.length]}</p></div>`).join('')}<p class="sub">${goalText} ${lang==='ru'?'Уровень:':'Level:'} ${level==='beginner'?(lang==='ru'?'начальный':'beginner'):level==='intermediate'?(lang==='ru'?'средний':'intermediate'):(lang==='ru'?'продвинутый':'advanced')}.</p><button class="primary wide" id="saveDraftPlan">${lang==='ru'?'Сохранить настройки программы':'Save program preferences'}</button>`;$('saveDraftPlan').onclick=()=>{localStorage.setItem('gymai_plan_prefs',JSON.stringify({days,goal,level,split:names}));localStorage.setItem('gymai_custom_plan',JSON.stringify(buildDaysFromNames(names,level)));syncPlans();selectedDay=0;renderDays();renderExercises();$('generatorModal').classList.remove('open');showToast(lang==='ru'?'Программа применена к расписанию':'Program applied to your schedule');};}
$('generatePlan').onclick=buildPlanDraft;$('closeGenerator').onclick=()=>$('generatorModal').classList.remove('open');$('closeExercise').onclick=$('exerciseDone').onclick=()=>$('exerciseModal').classList.remove('open');
$('closeLastTime').onclick=function(){$('lastTimeModal').classList.remove('open')};
