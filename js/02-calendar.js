function pad2(n){return n<10?'0'+n:''+n}
function dkey(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function parseDkey(k){let p=k.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function startOfWeek(d){let x=new Date(d);let wd=(x.getDay()+6)%7;x.setDate(x.getDate()-wd);x.setHours(0,0,0,0);return x}
function sameDate(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
let schedule=(()=>{try{return JSON.parse(localStorage.getItem('gymai_schedule')||'{}')}catch(e){return {}}})();
function saveSchedule(){localStorage.setItem('gymai_schedule',JSON.stringify(schedule))}
function planIndexForDate(d){
  let k=dkey(d);
  let se=schedEntry(k);
  if(se&&se.p!=null&&plans[se.p])return se.p;
  return null;
}
function currentPlan(){return (selectedDay!=null&&selectedDay>=0&&plans[selectedDay])?plans[selectedDay]:null}
function draftBaseItems(){let d=(draft&&draft.day!=null&&draft.day>=0)?draft.day:selectedDay;return (d!=null&&d>=0&&plans[d])?(plans[d].items||[]):[]}
let calExpanded=false,calRefDate=new Date(),selectedCalKey=dkey(new Date());
let calPlanOpen=false,calPendingKey=null,calPendingPlan=null;
const RU_MON=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const EN_MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function schedEntry(k){
  let v=schedule[k];
  if(v==null)return null;
  if(typeof v==='object')return (v.p==null?{p:null}:{p:v.p});
  return {p:v};
}
function calWeekLabel(start){
  let today=new Date();today.setHours(0,0,0,0);
  let thisStart=startOfWeek(today);
  let end=new Date(start);end.setDate(start.getDate()+6);
  if(start.getTime()===thisStart.getTime())return t('calThisWeek');
  let nextStart=new Date(thisStart);nextStart.setDate(thisStart.getDate()+7);
  if(start.getTime()===nextStart.getTime())return t('calNextWeek');
  let mon=lang==='ru'?RU_MON:EN_MON;
  let a=start.getDate(),b=end.getDate();
  let am=mon[start.getMonth()],bm=mon[end.getMonth()];
  let ay=start.getFullYear(),by=end.getFullYear();
  if(ay===by&&start.getMonth()===end.getMonth())return a+' – '+b+' '+am;
  if(ay===by)return a+' '+am+' – '+b+' '+bm;
  return a+' '+am+' '+ay+' – '+b+' '+bm+' '+by;
}
function toggleCalExpand(){calExpanded=!calExpanded;renderCalendar()}
function calNav(dir){let d=new Date(calRefDate);if(calExpanded)d.setMonth(d.getMonth()+dir);else d.setDate(d.getDate()+dir*7);calRefDate=d;renderCalendar()}
function selectCalDay(k){selectedCalKey=k;calPlanOpen=false;calPendingKey=null;calPendingPlan=null;let _pi=planIndexForDate(parseDkey(k));selectedDay=(_pi==null?-1:_pi);renderCalendar();renderDayTitle();renderExercises()}
function renderDayTitle(){let p=currentPlan();$('dayTitle').textContent=p?(lang==='ru'?p.name:p.en):t('dayNoPlan');}
function renderCalendar(){
  let today=new Date();today.setHours(0,0,0,0);
  let grid=$('calGrid');
  const wdLabels=lang==='ru'?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['M','T','W','T','F','S','S'];
  let cells=[];
  if(!calExpanded){let start=startOfWeek(calRefDate);for(let i=0;i<7;i++){let d=new Date(start);d.setDate(start.getDate()+i);cells.push(d)}}
  else{let first=new Date(calRefDate.getFullYear(),calRefDate.getMonth(),1);let start=startOfWeek(first);for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);cells.push(d)}}
  let nav='<div class="cal-nav"><button class="cal-arrow" id="calPrev" aria-label="Prev">‹</button><span class="cal-label">'+(calExpanded?calRefDate.toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{month:'long',year:'numeric'}):calWeekLabel(startOfWeek(calRefDate)))+'</span><button class="cal-arrow" id="calNext" aria-label="Next">›</button></div>';
  let head='<div class="cal-weekdays">'+wdLabels.map(w=>'<span>'+w+'</span>').join('')+'</div>';
  let body=cells.map(d=>{
    let k=dkey(d);
    let inMonth=!calExpanded||d.getMonth()===calRefDate.getMonth();
    let isToday=sameDate(d,today);
    let isSel=k===selectedCalKey;
    let hasPlan=schedEntry(k)!=null;
    let cls=['cal-day'];
    if(isToday)cls.push('today');
    if(isSel)cls.push('selected');
    if(!inMonth)cls.push('dim');
    if(hasPlan)cls.push('has-plan');
    let mon=(lang==='ru'?RU_MON:EN_MON)[d.getMonth()];
    return '<button class="'+cls.join(' ')+'" data-cal="'+k+'"><span class="cal-dnum">'+d.getDate()+'</span><span class="cal-dmon">'+mon+'</span>'+(hasPlan?'<span class="cal-dot"></span>':'')+'</button>';
  }).join('');
  grid.innerHTML=nav+head+'<div class="'+(calExpanded?'cal-month-grid':'cal-week-grid')+'">'+body+'</div>';
  document.querySelectorAll('[data-cal]').forEach(b=>b.onclick=()=>selectCalDay(b.dataset.cal));
  $('calPrev').onclick=()=>calNav(-1);
  $('calNext').onclick=()=>calNav(1);
  $('expandCal').textContent=calExpanded?t('calCollapse'):t('calExpand');
  renderCalPlanRow();
}
function renderCalPlanRow(){
  let row=$('calPlanRow');
  let d=parseDkey(selectedCalKey);
  let dateLabel=d.toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long'});
  let se=schedEntry(selectedCalKey);
  let assigned=(se&&se.p!=null&&plans[se.p])?plans[se.p]:null;
  let assignedName=assigned?(lang==='ru'?assigned.name:assigned.en):null;
  let booked=!!se;
  let head='<div class="cal-plan-date">'+t('planFor')+' '+dateLabel+'</div>';
  let html=head;
  if(assigned){
    html+='<div class="cal-sched"><span class="cal-sched-txt">'+assignedName+'</span>'+
      '<button class="cal-mini" data-planedit="1">'+t('planChange')+'</button>'+
      '<button class="cal-mini danger" data-plandelete="1">'+t('planDelete')+'</button></div>';
    var _td=new Date();_td.setHours(0,0,0,0);
    if(sameDate(d,_td)){
      html+='<button class="primary wide" data-startsched="1" style="margin-top:10px">'+t('seStartPlanned')+'</button>';
    }
  }else if(booked){
    // Запись есть, но программа не назначена — тренировка всё равно запланирована.
    html+='<div class="cal-sched"><span class="cal-sched-txt">'+t('planBookedNoPlan')+'</span>'+
      '<button class="cal-mini" data-planedit="1">'+t('planChange')+'</button>'+
      '<button class="cal-mini danger" data-plandelete="1">'+t('planDelete')+'</button></div>';
    html+='<button class="primary wide" data-startsched="1" style="margin-top:10px">'+t('seStartPlanned')+'</button>';
  }else{
    html+='<button class="primary wide" data-planopen="1">'+t('planSchedule')+'</button>';
  }
  if(calPlanOpen){
    let cur=(calPendingKey===selectedCalKey)?calPendingPlan:undefined;
    let chipNone='<button class="plan-chip '+((cur===null)?'active':'')+'" data-pickplan="none">'+t('planNoPlan')+'</button>';
    let chips=plans.map((p,i)=>'<button class="plan-chip '+((cur===i)?'active':'')+'" data-pickplan="'+i+'">'+(lang==='ru'?p.name:p.en)+'</button>').join('');
    html+='<div class="cal-panel">'+
      '<div class="cal-panel-h">'+t('planPick')+'</div>'+
      '<div class="plan-chips">'+chipNone+chips+'</div>'+
      '<button class="primary wide" data-plansave="1">'+t('planSave')+'</button>'+
      '</div>';
  }
  row.innerHTML=html;
  let schedStart=row.querySelector('[data-startsched]');
  if(schedStart)schedStart.onclick=function(){
    var _se=schedEntry(selectedCalKey);
    if(_se&&_se.p!=null)startFromPlan(_se.p);
    else startFromPlan(null); // запланировано без программы -> свободная тренировка
  };
  let openBtn=row.querySelector('[data-planopen]');
  if(openBtn)openBtn.onclick=()=>{calPlanOpen=true;calPendingKey=selectedCalKey;calPendingPlan=(schedEntry(selectedCalKey)&&schedEntry(selectedCalKey).p!=null)?schedEntry(selectedCalKey).p:null;renderCalPlanRow();haptic()};
  let editBtn=row.querySelector('[data-planedit]');
  if(editBtn)editBtn.onclick=()=>{calPlanOpen=true;calPendingKey=selectedCalKey;calPendingPlan=assigned?calPendingPlanOf(assigned):null;renderCalPlanRow();haptic()};
  let delBtn=row.querySelector('[data-plandelete]');
  if(delBtn)delBtn.onclick=()=>{delete schedule[selectedCalKey];saveSchedule();calPlanOpen=false;renderCalendar();renderCalPlanRow();showToast(t('planRemoved'));haptic()};
  row.querySelectorAll('[data-pickplan]').forEach(b=>b.onclick=()=>{
    calPendingKey=selectedCalKey;
    calPendingPlan=(b.dataset.pickplan==='none')?null:+b.dataset.pickplan;
    renderCalPlanRow();
  });
  let saveBtn=row.querySelector('[data-plansave]');
  if(saveBtn)saveBtn.onclick=()=>{
    let p=(calPendingKey===selectedCalKey)?calPendingPlan:null;
    schedule[selectedCalKey]=(p==null)?{p:null}:{p:p};
    saveSchedule();calPlanOpen=false;calPendingKey=null;calPendingPlan=null;
    let _pi=planIndexForDate(parseDkey(selectedCalKey));selectedDay=(_pi==null?-1:_pi);
    renderCalendar();renderDayTitle();renderExercises();showToast(t('planSaved'));haptic();
  };
}
function calPendingPlanOf(p){
  for(let i=0;i<plans.length;i++)if(plans[i]===p)return i;
  return null;
}
function renderDays(){renderCalendar();renderDayTitle();renderWorkoutProgramList()}
function savePlansNow(){try{localStorage.setItem('gymai_custom_plan',JSON.stringify(plans))}catch(e){}}
