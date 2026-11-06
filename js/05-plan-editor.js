/* ---------- v0.6 plan editor ---------- */
const EX_CATALOG=(window.EX_CATALOG||[]);
const PE_CUSTOM_ICON='✚';
let peDays=null,peDay=0,peQuery='',peCatList=[];
function peLoad(){
  try{let c=JSON.parse(localStorage.getItem('gymai_custom_plan')||'null');peDays=(c&&c.length)?c:plans.map(p=>({name:p.name,en:p.en,items:(p.items||[]).map(x=>x.slice())}))}catch(e){peDays=[]}
  if(!peDays.length)peDays=plans.map(p=>({name:p.name,en:p.en,items:(p.items||[]).map(x=>x.slice())}));
  try{localStorage.removeItem('gymai_presets')}catch(e){}
  try{localStorage.removeItem('gymai_applied_preset')}catch(e){}
  peDay=0;
}
function peSave(){
  try{localStorage.setItem('gymai_custom_plan',JSON.stringify(peDays))}catch(e){}
}
function peRender(){
  $('planDayTabs').innerHTML=peDays.map(function(d,i){
    return '<button class="plan-day-chip '+(i===peDay?'active':'')+'" data-peday="'+i+'">'+(lang==='ru'?d.name:d.en)+'</button>';
  }).join('');
  document.querySelectorAll('[data-peday]').forEach(function(b){b.onclick=function(){peDay=+b.dataset.peday;peRender()}});
  let d=peDays[peDay];
  $('planDayName').value=d?d.name:'';
  peRenderEx();
}
function peRenderEx(){
  let d=peDays[peDay];
  let list=(d&&d.items)||[];
  let rows=list.map(function(x,i){
    let icon=(x[6]?PE_CUSTOM_ICON:(x[0]||''));
    return '<div class="plan-ex" data-pex="'+i+'">'+
      '<div class="plan-ex-head"><div class="exercise-icon">'+icon+'</div>'+
      '<input class="plan-ex-name" data-pname="'+i+'" value="'+(lang==='ru'?x[1]:x[2]).replace(/"/g,'&quot;')+'"/>'+
      '<button class="plan-ex-del" data-pdel="'+i+'">×</button></div>'+
      '<div class="plan-ex-nums">'+
      '<input type="number" min="1" step="1" inputmode="numeric" data-psets="'+i+'" value="'+x[3]+'"/>'+
      '<input type="number" min="1" step="1" inputmode="numeric" data-preps="'+i+'" value="'+x[4]+'"/>'+
      '<input type="number" min="0" step="0.5" inputmode="decimal" data-pweight="'+i+'" value="'+x[5]+'"/>'+
      '</div>'+
      '</div>';
  }).join('');
  if(!rows)rows='<div class="empty">'+t('peNoEx')+'</div>';
  $('planExList').innerHTML=rows;
  let d0=peDays[peDay];
  document.querySelectorAll('[data-pname]').forEach(function(el){el.onchange=function(){
    let i=+el.dataset.pname;let v=el.value.trim();if(!v)return;d0.items[i][1]=v;d0.items[i][2]=v;peSave();peRenderEx()}});
  document.querySelectorAll('[data-psets]').forEach(function(el){el.onchange=function(){
    let i=+el.dataset.psets;d0.items[i][3]=Math.max(1,+el.value||1);peSave()}});
  document.querySelectorAll('[data-preps]').forEach(function(el){el.onchange=function(){
    let i=+el.dataset.preps;d0.items[i][4]=Math.max(1,+el.value||1);peSave()}});
  document.querySelectorAll('[data-pweight]').forEach(function(el){el.onchange=function(){
    let i=+el.dataset.pweight;d0.items[i][5]=(el.value===''?'body':el.value);peSave()}});
  document.querySelectorAll('[data-pdel]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.pdel;d0.items.splice(i,1);peSave();peRenderEx();haptic()}});
}
function peOpen(){
  peLoad();peRender();
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='planedit'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',false));
  window.scrollTo({top:0,behavior:'smooth'});
}
function peApply(){
  syncPlans();selectedDay=0;
  renderDays();renderExercises();
  nav('workout');showToast(t('saved'));haptic('success');
}
function peCatalogSearch(q){
  peQuery=(q||'').toLowerCase();
  let all=[];
  try{let c=JSON.parse(localStorage.getItem('gymai_custom_exercises')||'[]');if(Array.isArray(c))c.forEach(function(x){all.push(x)})}catch(e){}
  peDays.forEach(function(d){(d.items||[]).forEach(function(x){all.push(x)})});
  let uniq=[];let seen={};
  all.forEach(function(x){if(!seen[x[1]]){seen[x[1]]=1;uniq.push(x)}});
  peCatList=uniq.filter(function(x){
    return !peQuery||(x[1]||'').toLowerCase().indexOf(peQuery)>=0||(x[2]||'').toLowerCase().indexOf(peQuery)>=0;
  });
  $('planExCatList').innerHTML=peCatList.map(function(x,i){
    return '<button class="exercise-row-btn" data-cat="'+i+'"><div class="workout-row"><div class="exercise-icon">'+x[0]+'</div><div class="exercise-info"><b>'+(lang==='ru'?x[1]:x[2])+'</b><span>'+x[3]+' × '+x[4]+'</span></div><span class="dots">+</span></div></button>';
  }).join('');
  document.querySelectorAll('[data-cat]').forEach(function(b){b.onclick=function(){
    let x=peCatList[+b.dataset.cat];if(!x)return;
    peDays[peDay].items.push([x[0],x[1],x[2],x[3],x[4],x[5]]);
    $('planExModal').classList.remove('open');peSave();peRenderEx();haptic();
  }});
}

/* ---------- v0.9 add exercise dropdown in session ---------- */
function exCatalogAll(){
  let all=[];
  try{let c=JSON.parse(localStorage.getItem('gymai_custom_exercises')||'null');if(c&&c.length)all=all.concat(c)}catch(e){}
  let base=[];
  BASE_PLANS.forEach(function(p){(p.items||[]).forEach(function(x){base.push(x)})});
  try{let c=JSON.parse(localStorage.getItem('gymai_custom_plan')||'null');if(c&&c.length)c.forEach(function(p){(p.items||[]).forEach(function(x){base.push(x)})})}catch(e){}
  base.forEach(function(x){all.push(x)});
  let uniq=[],seen={};
  all.forEach(function(x){if(!seen[x[1]]){seen[x[1]]=1;uniq.push(x)}});
  return uniq;
}
function sessAddList(q){
  q=(q||'').toLowerCase();
  let list=exCatalogAll().filter(function(x){
    return !q||(x[1]||'').toLowerCase().indexOf(q)>=0||(x[2]||'').toLowerCase().indexOf(q)>=0;
  });
  $('sessionExList').innerHTML=list.map(function(x,i){
    return '<button class="add-ex-row" data-sadd="'+i+'"><span class="exercise-icon">'+x[0]+'</span><span>'+(lang==='ru'?x[1]:x[2])+'</span></button>';
  }).join('')||'<div class="empty" style="padding:8px 0">'+t('sessionExNone')+'</div>';
  document.querySelectorAll('[data-sadd]').forEach(function(b){b.onclick=function(){
    let x=list[+b.dataset.sadd];if(!x)return;
    let items=((draft&&draft.items&&draft.items.length)?draft.items:(draftBaseItems())).slice();
    items.push([x[0],x[1],x[2],x[3],x[4],x[5],x[6]?1:0]);
    if(!draft)draft={day:selectedDay,startedAt:new Date().toISOString(),sets:{}};
    draft.items=items;
    if(!draft.sets)draft.sets={};
    saveDraft();renderSession();
    $('sessionExPanel').classList.remove('open');
    showToast(t('exAdded'));haptic();
  }});
}
function saveCustomExercise(x){
  let arr=[];
  try{arr=JSON.parse(localStorage.getItem('gymai_custom_exercises')||'[]')}catch(e){}
  if(!Array.isArray(arr))arr=[];
  arr=arr.filter(function(a){return a&&a[1]!==x[1]});
  arr.push(x);
  try{localStorage.setItem('gymai_custom_exercises',JSON.stringify(arr))}catch(e){}
}
$('sessionAddEx').onclick=function(){
  let open=$('sessionExPanel').classList.contains('open');
  $('sessionExPanel').classList.toggle('open',!open);
  if(!open){$('sessionExSearch').value='';sessAddList('')}
};
$('sessionExSearch').oninput=function(){sessAddList(this.value)};
$('newExSave').onclick=function(){
  let name=($('newExName').value||'').trim();
  if(!name){showToast(t('peNameRequired'));return}
  let sets=+$('newExSets').value||3, reps=+$('newExReps').value||10;
  let w=($('newExWeight').value||'').trim();
  let weight=(w===''||w==='body')?'body':(+w||0);
  let x=[PE_CUSTOM_ICON,name,name,sets,reps,weight,1];
  saveCustomExercise(x);
  let items=((draft&&draft.items&&draft.items.length)?draft.items:(draftBaseItems())).slice();
  items.push(x);
  if(!draft)draft={day:selectedDay,startedAt:new Date().toISOString(),sets:{}};
  draft.items=items;
  if(!draft.sets)draft.sets={};
  saveDraft();renderSession();
  $('newExName').value='';$('newExSets').value='';$('newExReps').value='';$('newExWeight').value='';
  $('sessionExPanel').classList.remove('open');
  showToast(t('exCreated'));haptic('success');
};
