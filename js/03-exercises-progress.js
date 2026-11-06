function renderExercises(){let p=currentPlan();
  if(!p){$('exerciseList').innerHTML='<div class="empty">'+t('dayNoPlan')+'</div>';return;}
  $('exerciseList').innerHTML=p.items.map((x,i)=>`<div class="workout-row" data-exercise="${i}" data-exopen="${i}"><div class="exercise-icon">${x[6]?PE_CUSTOM_ICON:x[0]}</div><div class="exercise-info"><b>${lang==='ru'?x[1]:x[2]}</b></div><button class="ex-del-btn" data-exdel="${i}" aria-label="Remove">×</button></div>`).join('');
  document.querySelectorAll('[data-exopen]').forEach(function(el){el.onclick=function(e){if(e&&e.target&&e.target.dataset&&e.target.dataset.exdel!==undefined)return;showExerciseDetail(+el.dataset.exopen)}});
  document.querySelectorAll('[data-exdel]').forEach(function(b){b.onclick=function(e){if(e&&e.stopPropagation)e.stopPropagation();
    let i=+b.dataset.exdel;let it=p.items[i];if(!it)return;
    askConfirm(t('confirmDelEx'),t('confirmDelExText').replace('%s',lang==='ru'?it[1]:it[2]),function(){
      p.items.splice(i,1);savePlansNow();syncPlans();renderExercises();renderDayTitle();showToast(t('exDeleted'));haptic();
    });
  }});
}
const exerciseGuides={
'Жим в тренажёре':['Грудь · тренажёр','🏋️','Сядь так, чтобы рукояти находились примерно на уровне середины груди. Плавно выжми рукояти вперёд и контролируемо верни их обратно.','Не блокируй локти резко. Подбери комфортную амплитуду и начни с лёгкого веса.'],
'Тяга верхнего блока':['Спина · тренажёр','↗','Зафиксируй бёдра под валиками. Потяни рукоять к верхней части груди, сводя лопатки, затем медленно выпрями руки.','Не раскачивай корпус и не тяни рукоять за голову.'],
'Жим гантелей сидя':['Плечи · гантели','◉','Сядь с устойчивой опорой. Подними гантели от уровня плеч вверх, затем опусти их подконтрольно.','Не прогибай поясницу чрезмерно. Выбери вес, позволяющий сохранять контроль.'],
'Тяга горизонтального блока':['Спина · тренажёр','⌁','Сохраняя нейтральное положение корпуса, потяни рукоять к поясу и плавно вернись в исходное положение.','Избегай рывков и округления спины.'],
'Жим ногами':['Ноги · тренажёр','▥','Поставь стопы устойчиво на платформу. Опускай платформу в комфортной амплитуде и выжимай её без резкого выпрямления коленей.','Не допускай отрыва таза от спинки и не работай через боль.'],
'Сгибание ног':['Задняя поверхность бедра · тренажёр','◒','Настрой валик над пятками. Согни ноги, задержись на мгновение и медленно вернись.','Не используй инерцию; настрой тренажёр под свой рост.'],
'Ягодичный мост':['Ягодичные мышцы · собственный вес','⌁','Поставь стопы на пол, подними таз до комфортного положения и плавно опусти.','Не переразгибай поясницу в верхней точке.'],
'Подъёмы на икры':['Икры · собственный вес','↟','Поднимись на носки, ненадолго задержись и опускай пятки подконтрольно.','Используй опору для равновесия и не пружинь резко.'],
'Гоблет-приседание':['Ноги · гантель','🏋️','Держи гантель у груди. Отведи таз назад и согни колени, затем вернись в положение стоя.','Сохраняй устойчивую опору стоп и комфортную глубину.'],
'Жим от груди':['Грудь · тренажёр','🏋️','Установи сиденье так, чтобы рукояти были на уровне груди. Выжимай вперёд плавно и без рывков.','Плечи держи опущенными, не работай через дискомфорт.'],
'Планка':['Кор · собственный вес','⌁','Обопрись на предплечья и носки. Удерживай тело в ровном положении, спокойно дыша.','Начни с короткого комфортного интервала; прекрати при боли или потере контроля.']};
function showExerciseDetail(i){let _p=currentPlan();if(!_p)return;let x=_p.items[i];if(!x)return;g=exerciseGuides[x[1]]||['Тренажёрный зал','🏋️','Выполняй движение плавно, сохраняя контроль над положением тела.','Начинай с комфортной нагрузки и не продолжай при боли.'];$('exerciseDetailTitle').textContent=lang==='ru'?x[1]:x[2];$('exerciseVisual').textContent=g[1];$('exerciseGroupLabel').textContent=lang==='ru'?g[0]:'GYM EXERCISE';$('exerciseTechnique').textContent=lang==='ru'?g[2]:'Use a controlled range of motion and keep the movement smooth. Set up the equipment before starting.';$('exerciseTips').textContent=lang==='ru'?g[3]:'Start with a comfortable load. Stop if you feel pain or cannot maintain control.';$('exerciseTags').innerHTML=`<span class="meta-chip">${x[3]} × ${x[4]} ${t('reps')}</span><span class="meta-chip">${x[5]==='body'?'BW':x[5]+' '+t('kg')}</span><span class="meta-chip">${lang==='ru'?'Тренажёрный зал':'Gym'}</span>`;$('techniqueHeading').textContent=lang==='ru'?'Техника выполнения':'How to perform';$('safetyHeading').textContent=lang==='ru'?'Подсказки по безопасности':'Safety cues';$('exerciseDone').textContent=lang==='ru'?'Понятно':'Got it';$('exerciseModal').classList.add('open')}

/* A workout record may come from the server without the sets/volume fields
   (older format). Both the stats row and the history header need them, so
   they are derived from the exercise list in one place. */
function workoutTotals(w){
  w=w||{};
  var sets=+w.sets||0, vol=+w.volume||0;
  if(!sets||!vol){
    var ds=0,dv=0;
    (w.ex||[]).forEach(function(e){ds++;dv+=(+e.weight||0)*(+e.reps||0);});
    if(!sets)sets=ds;
    if(!vol)vol=dv;
  }
  return {sets:sets,volume:vol};
}
function renderProgress(){let pd=periodDays(),cut=Date.now()-pd*864e5;let inP=workouts.filter(w=>new Date(w.date).getTime()>=cut);let sets=inP.reduce((a,w)=>a+workoutTotals(w).sets,0),vol=inP.reduce((a,w)=>a+workoutTotals(w).volume,0);$('totalSessions').textContent=workouts.length;$('totalSets').textContent=sets;$('totalVolume').textContent=vol;let labels=lang==='ru'?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['M','T','W','T','F','S','S'];let counts=Array(7).fill(0),now=new Date();workouts.forEach(w=>{let d=new Date(w.date),diff=Math.floor((new Date(now.toDateString())-new Date(d.toDateString()))/864e5);if(diff>=0&&diff<7)counts[(d.getDay()+6)%7]++});$('chart').innerHTML=counts.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(5,v*45)}px;opacity:${v?1:.35}"></div><small>${labels[i]}</small></div>`).join('');histRender();}

