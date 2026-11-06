/* ---------- v0.4 session screen: + sets, draft persistence, no timer ---------- */
const DRAFT_KEY='gymai_draft';
function loadDraft(){try{let d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(d&&d.sets&&typeof d.sets==='object')return d}catch(e){}return null}
function saveDraft(){if(draft)localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));else localStorage.removeItem(DRAFT_KEY)}
function sessionPlan(){return (plans&&plans.length)?plans:(BASE_PLANS||[])}
function updateStartButton(){let b=$('startWorkout');if(!b)return;b.textContent=draft?t('continueWorkout'):(lang==='ru'?'Начать тренировку':'Start workout');try{tgUpdateMain()}catch(e){}}
/* ---------- v0.16: session empty state + start from a program ---------- */
function startFromPlan(idx){
  var items;
  if(idx==null||idx<0||!plans[idx]){
    items=[];
  }else{
    items=(plans[idx].items||[]).map(function(x){return [x[0],x[1],x[2],x[3],x[4],x[5],!!x[6]]});
  }
  selectedDay=(idx==null?-1:idx);
  draft={day:(idx==null?-1:idx),startedAt:new Date().toISOString(),sets:{},items:items,
         started:true,free:(idx==null||idx<0||!plans[idx])};
  saveDraft();renderSession();nav('session');haptic('success');
}
/* A workout is "started" as soon as the user picks a program - including a
   free workout, which legitimately has no exercises yet. Before this existed
   the free workout bounced straight back to the start screen, because the
   screen was hidden while the exercise list was empty. */
function sessionStarted(){return !!(draft&&(draft.started===true||(draft.items&&draft.items.length)))}
function renderWorkoutProgramList(){
  var box=$('workoutProgramList');
  if(!box)return;
  var list=sessionPlan();
  var html=list.map(function(p,i){
    var nm=(lang==='ru'?p.name:p.en);
    var cnt=(p.items||[]).length;
    var cur=(draft&&draft.day===i)?' active':'';
    return '<button class="secondary wide workout-plan-btn'+cur+'" data-wplan="'+i+'" style="text-align:left;margin-bottom:8px">'+
      '<b>'+nm+'</b><br><small style="opacity:.7">'+cnt+' '+(lang==='ru'?'упр.':'ex.')+'</small></button>';
  }).join('');
  html+='<button class="secondary wide workout-plan-btn'+(draft&&draft.day==null?' active':'')+'" data-wplan="free" style="text-align:left">'+
    '<b>'+t('seFree')+'</b><br><small style="opacity:.7">'+t('seFreeSub')+'</small></button>';
  box.innerHTML=html;
  box.querySelectorAll('[data-wplan]').forEach(function(b){
    b.onclick=function(){
      var v=b.dataset.wplan;
      startFromPlan(v==='free'?null:+v);
    };
  });
}
function renderSessionStartList(){
  var box=$('sessionStartList');
  if(!box)return;
  var html='<button class="secondary wide" data-startplan="free" style="text-align:left">'+
    '<b>'+t('seFree')+'</b><br><small style="opacity:.7">'+t('seFreeSub')+'</small></button>';
  html+=plans.map(function(p,i){
    var nm=(lang==='ru'?p.name:p.en);
    var cnt=(p.items||[]).length;
    return '<button class="secondary wide" data-startplan="'+i+'" style="text-align:left;margin-top:8px">'+
      '<b>'+nm+'</b><br><small style="opacity:.7">'+cnt+' '+(lang==='ru'?'упр.':'ex.')+'</small></button>';
  }).join('');
  box.innerHTML=html;
  box.querySelectorAll('[data-startplan]').forEach(function(b){
    b.onclick=function(){
      var v=b.dataset.startplan;
      startFromPlan(v==='free'?null:+v);
    };
  });
}
function renderSessionMode(){
  var live=$('sessionLive'),empty=$('sessionEmpty'),fin=$('finishWorkout');
  var has=sessionStarted();
  var hasItems=!!(draft&&draft.items&&draft.items.length);
  if(live)live.style.display=has?'':'none';
  if(fin)fin.style.display=(has&&hasItems)?'':'none';
  if(empty)empty.style.display=has?'none':'';
  if(!has)renderSessionStartList();
}
function startSession(){
  // Открываем раздел с упражнениями. Если черновика нет — показываем выбор программы.
  renderWorkoutProgramList();
  if(sessionStarted()){saveDraft();renderSession();nav('session');return}
  nav('session');renderSession();
}
/* ---------- v0.5 workout setup: choose exercises before session ---------- */
function setupKey(){return 'gymai_setup_'+((selectedDay==null||selectedDay<0)?'none':selectedDay)}
function loadSetup(){
  try{let s=JSON.parse(localStorage.getItem(setupKey())||'null');
    if(s&&s.items&&s.items.length)return {items:s.items.map(function(a){return {icon:a[0],ru:a[1],en:a[2],sets:a[3],reps:a[4],weight:a[5],custom:!!a[6],on:a[7]!==0}})}
  }catch(e){}
  let d=draft;
  if(d&&d.items){return {items:d.items.map(x=>({icon:x[0],ru:x[1],en:x[2],sets:x[3],reps:x[4],weight:x[5],custom:!!x[6],on:true}))}}
  let plan=currentPlan();
  if(!plan)return {items:[]};
  return {items:(plan.items||[]).map(x=>({icon:x[0],ru:x[1],en:x[2],sets:x[3],reps:x[4],weight:x[5],custom:false}))};
}
function saveSetup(items){
  let arr=items.map(x=>[x.icon,x.ru,x.en,x.sets,x.reps,x.weight,x.custom?1:0,x.on===false?0:1]);
  try{localStorage.setItem(setupKey(),JSON.stringify({items:arr,at:new Date().toISOString()}))}catch(e){}
}
let setupItems=null,setupDay=null;
function renderSetup(force){
  if(force||setupItems===null||setupDay!==selectedDay){
    let st=loadSetup();setupItems=st.items||[];setupDay=selectedDay;
  }
  let plan=currentPlan();
  $('setupTitle').textContent=plan?(lang==='ru'?plan.name:plan.en):t('dayNoPlan');
  let rows=setupItems.map(function(x,i){
    let on=x.on!==false;
    return '<div class="setup-row" data-setup="'+i+'">'+
      '<button class="setup-check '+(on?'on':'')+'" data-toggle="'+i+'" aria-label="Toggle">✓</button>'+
      '<div class="setup-row-main"><b>'+(lang==='ru'?x.ru:x.en)+'</b><span>'+x.sets+' × '+x.reps+' '+(x.reps===30?(lang==='ru'?'сек':'sec'):t('reps'))+' · '+(x.weight==='body'?'BW':x.weight+' '+t('kg'))+'</span></div>'+
      (x.custom?'<span class="setup-tag">'+(lang==='ru'?t('setupCustom'):t('setupCustom'))+'</span>':'')+
      (x.custom?'<button class="setup-del" data-del="'+i+'" aria-label="Delete">×</button>':'')+
      '</div>';
  }).join('');
  if(!rows)rows='<div class="empty">'+t('setupEmpty')+'</div>';
  $('setupList').innerHTML=rows;
  document.querySelectorAll('[data-toggle]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.toggle;setupItems[i].on=setupItems[i].on===false;saveSetup(setupItems);renderSetup();
  }});
  document.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.del;setupItems.splice(i,1);saveSetup(setupItems);renderSetup();haptic();
  }});
}
function addCustomExercise(){
  let name=($('setupNewName').value||'').trim();
  if(!name){showToast(t('setupNamePh'));return}
  let sets=+$('setupNewSets').value||3, reps=+$('setupNewReps').value||10, w=$('setupNewWeight').value;
  setupItems=setupItems||[];
  setupItems.push({icon:'✚',ru:name,en:name,sets:sets,reps:reps,weight:w===''?0:(+w||0),custom:true,on:true});
  $('setupNewName').value='';$('setupNewSets').value='';$('setupNewReps').value='';$('setupNewWeight').value='';
  saveSetup(setupItems);renderSetup();showToast(t('saved'));haptic();
}
function applySetupToDraft(){
  let items=(setupItems||[]).filter(function(x){return x.on!==false});
  if(!items.length)return false;
  if(!draft){draft={day:selectedDay,startedAt:new Date().toISOString(),sets:{}}}
  draft.day=selectedDay;
  draft.items=items.map(function(x){return [x.icon,x.ru,x.en,x.sets,x.reps,x.weight,x.custom?1:0]});
  if(!draft.sets)draft.sets={};
  saveDraft();
  return true;
}
function openSetup(){
  renderSetup(true);
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='setup'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab==='setup'));
  window.scrollTo({top:0,behavior:'smooth'});
}

