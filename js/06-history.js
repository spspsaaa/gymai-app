/* ---------- v0.7 workout history with expandable sets ---------- */
let histOpen={};
function histGroup(w){
  let order=[],map={};
  (w.ex||[]).forEach(function(s){
    let n=s.name||'';
    if(!map[n]){map[n]={name:n,sets:[]};order.push(n)}
    map[n].sets.push({weight:s.weight,reps:s.reps});
  });
  return order.map(function(n){return map[n]});
}
function histRender(){
  let box=$('historyList');
  if(!box)return;
  let list=workouts.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date)});
  $('historyCount').textContent=list.length?String(list.length):'';
  if(!list.length){box.innerHTML='<div class="empty">'+t('histEmpty')+'</div>';return}
  box.innerHTML=list.map(function(w,i){
    let groups=histGroup(w);
    /* Records that came from the server (or from an older version) may not
       carry sets/volume. Derive them from the exercise list so the history
       never renders "undefined подхода". */
    let tot=workoutTotals(w);
    let histSets=tot.sets,histVol=tot.volume;
    let d=new Date(w.date);
    let dateStr=d.toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short'});
    let timeStr=d.toLocaleTimeString(lang==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit'});
    let open=histOpen[i]?'open':'';
    let body=groups.map(function(g){
      let sets=g.sets.map(function(s,n){
        let wtxt=(+s.weight>0)?(+s.weight)+' '+t('kg'):t('histNoWeight');
        return '<div class="hist-set"><span class="hs-n">'+(n+1)+'</span><span class="hs-v">'+s.reps+' '+t('reps')+' · '+wtxt+'</span></div>';
      }).join('');
      return '<div class="hist-ex"><div class="hist-ex-name">'+g.name+'</div>'+sets+'</div>';
    }).join('');
    return '<div class="hist-item '+open+'" data-hist="'+i+'">'+
      '<button class="hist-head" data-histhead="'+i+'"><span class="hist-icon">✦</span>'+
      '<span class="hist-main"><b>'+(w.title||'')+'</b><span>'+dateStr+' · '+timeStr+' · '+histSets+' '+t('sets')+' · '+histVol+' '+t('kg')+'</span></span>'+
      '<span class="hist-chev">›</span></button>'+
      '<div class="hist-body">'+body+'</div></div>';
  }).join('');
  document.querySelectorAll('[data-histhead]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.histhead;
    histOpen[i]=!histOpen[i];
    let item=document.querySelector('[data-hist="'+i+'"]');
    if(item&&item.classList)item.classList.toggle('open',!!histOpen[i]);
  }});
}

function renderSession(){renderSessionMode();
  let dp=draft||{day:selectedDay,sets:{}};
  let list=sessionPlan();
  let plan=(dp.day==null||dp.day<0)?{name:'',en:'',items:[]}:(list[dp.day]||list[0]||{name:'',en:'',items:[]});
  let items=(dp.items&&dp.items.length)?dp.items:(plan.items||[]);
  var isFree=(dp.day==null||dp.day<0);
  $('sessionTitle').textContent=isFree?t('seFree'):((lang==='ru'?plan.name:plan.en)||t('session'));
  $('sessionExercises').innerHTML=items.map(function(x,i){
    let sets=(dp.sets[i]||[]);
    let lw=lastWeight(x[1]);
    var hint='';
    if(lw!=null){
      var _last=lastExerciseInfo(x[1]);
      hint='<button class="hint lasttime-btn" data-lasttime="'+escAttr(x[1])+'">'+
        t('lastTime')+' '+(lw==='body'?'BW':lw+' '+t('kg'))+
        ' → '+(typeof lw==='number'?(lw+2.5)+' '+t('kg'):'')+
        '<span class="lasttime-hint">'+(lang==='ru'?'нажми, чтобы увидеть подробнее':'tap to see details')+'</span></button>';
    }
    let rows=sets.map(function(s,j){
      return '<div class="sess-set"><span class="sess-num">'+(j+1)+'</span>'+
        '<input type="number" min="0" step="0.5" inputmode="decimal" placeholder="'+t('weight')+'" value="'+(s.weight==null?'':s.weight)+'" data-sweight="'+i+'-'+j+'">'+
        '<input type="number" min="1" step="1" inputmode="numeric" placeholder="'+t('repsLabel')+'" value="'+(s.reps==null?'':s.reps)+'" data-sreps="'+i+'-'+j+'">'+
        '<button class="set-remove" data-remove="'+i+'-'+j+'" aria-label="Remove">&times;</button></div>';
    }).join('');
    if(!sets.length) rows='<div class="empty" style="padding:8px 0">'+t('addSetHint')+'</div>';
    var delBtn=(dp.items&&dp.items.length)?'<button class="ex-del-btn sess-del" data-delex="'+i+'" aria-label="Remove exercise">&times;</button>':'';
    return '<div class="card sess-card"><div class="workout-row"><div class="exercise-icon">'+x[0]+'</div><div class="exercise-info"><b>'+(lang==='ru'?x[1]:x[2])+'</b><span>'+x[3]+' × '+x[4]+' '+t('reps')+' · '+(x[5]==='body'?'BW':x[5]+' '+t('kg'))+'</span></div>'+delBtn+
      '<button class="add-set-btn" data-add="'+i+'" aria-label="Add set">+</button></div>'+hint+'<div class="sess-sets">'+rows+'</div></div>';
  }).join('');
  let _ss=$('sessionSummary');if(_ss)_ss.innerHTML='';
  document.querySelectorAll('[data-add]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.add;if(!draft)return;if(!draft.sets[i])draft.sets[i]=[];
    let src=items[i]||[];let isBody=src[5]==='body';
    draft.sets[i].push({weight:isBody?0:(+src[5]||0),reps:+src[4]||0});
    saveDraft();renderSession();haptic('light')}});
  /* Remove an exercise from the workout that is in progress. The set list is
     keyed by exercise index, so it has to be re-indexed after the removal. */
  document.querySelectorAll('[data-delex]').forEach(function(b){b.onclick=function(){
    let i=+b.dataset.delex;
    if(!draft||!draft.items||i<0||i>=draft.items.length)return;
    draft.items.splice(i,1);
    let ns={};
    Object.keys(draft.sets||{}).forEach(function(k){
      let n=+k;
      if(n<i)ns[n]=draft.sets[k];
      else if(n>i)ns[n-1]=draft.sets[k];
    });
    draft.sets=ns;
    saveDraft();renderSession();haptic('light');
  }});
  document.querySelectorAll('[data-remove]').forEach(function(b){b.onclick=function(){
    let p=b.dataset.remove.split('-');if(!draft||!draft.sets[p[0]])return;
    draft.sets[p[0]].splice(+p[1],1);if(!draft.sets[p[0]].length)delete draft.sets[p[0]];
    saveDraft();renderSession()}});
  document.querySelectorAll('[data-sweight]').forEach(function(inp){inp.oninput=function(){
    let p=inp.dataset.sweight.split('-');if(!draft||!draft.sets[p[0]])return;
    draft.sets[p[0]][+p[1]].weight=inp.value;saveDraft()}});
  document.querySelectorAll('[data-sreps]').forEach(function(inp){inp.oninput=function(){
    let p=inp.dataset.sreps.split('-');if(!draft||!draft.sets[p[0]])return;
    draft.sets[p[0]][+p[1]].reps=inp.value;saveDraft()}});
}

