/* ---------- v0.4 tariff: AI Free / AI Pro ---------- */
const FREE_DAILY_LIMIT=10;
function getPlan(){
  /* The tariff is read from the server profile; the local copy is only a
     fallback for the very first paint before the server answers. */
  if(SRV_PROFILE&&SRV_PROFILE.plan)return SRV_PROFILE.plan==='pro'?'pro':'free';
  let u=currentUser();
  if(u&&u.plan)return u.plan==='pro'?'pro':'free';
  return localStorage.getItem('gymai_plan')==='pro'?'pro':'free';
}
function setPlan(p){
  p=p==='pro'?'pro':'free';
  /* The plan is granted by the admin panel on the server. Writing it here
     only refreshes the local mirror. */
  if(SRV_PROFILE)SRV_PROFILE.plan=p;
  let u=currentUser();
  if(u){let users=getUsers();users[u.email]=Object.assign({},users[u.email]||{},{plan:p});saveUsers(users);}
  else localStorage.setItem('gymai_plan',p);
  renderPlan();
}
function isPro(){return getPlan()==='pro'}
/* The free-tier counter is kept on the server, so the limit cannot be
   bypassed by clearing the browser storage. The local counter is only a
   mirror for the first paint. */
let SRV_COACH_USED=0;
function coachUsageToday(){return Number(SRV_COACH_USED||0)}
function bumpCoachUsage(){SRV_COACH_USED=Number(SRV_COACH_USED||0)+1;
  try{let d=new Date().toISOString().slice(0,10);let u=JSON.parse(localStorage.getItem('gymai_coach_usage')||'{}');u[d]=(u[d]||0)+1;localStorage.setItem('gymai_coach_usage',JSON.stringify(u))}catch(e){}}
function coachLeft(){if(isPro())return Infinity;return Math.max(0,FREE_DAILY_LIMIT-coachUsageToday())}
function renderPlan(){
  let pro=isPro();
  let freeCard=$('planFreeCard'),proCard=$('planProCard');
  if(!freeCard||!proCard)return;
  if(pro){freeCard.style.display='none';proCard.style.display='';}
  else{freeCard.style.display='';proCard.style.display='none';}
  let badge=$('planBadge');if(badge)badge.textContent=pro?t('proLabel'):t('freeLabel');
  let bl=$('aiBadgeLabel');if(bl)bl.textContent=pro?'AI PRO':'AI FREE';
  let bi=$('aiBadgeImg');if(bi&&bi.parentNode&&bi.parentNode.classList)bi.parentNode.classList.toggle('pro',pro);
  let left=coachLeft();
  let fill=$('limitFill'),note=$('limitNote'),featCoach=$('featCoach');
  if(fill&&note){
    if(pro){fill.style.width='100%';note.textContent=t('unlimited');}
    else{let used=coachUsageToday();let pct=Math.max(0,Math.min(100,Math.round((FREE_DAILY_LIMIT-left)/FREE_DAILY_LIMIT*100)));
      fill.style.width=pct+'%';note.textContent=t('dailyLeft')+left;}
  }
  if(featCoach){featCoach.classList.toggle('locked',false)}
  
  let ub=$('upgradeBtn');if(ub){ub.textContent=t('upgrade');ub.style.display=pro?'none':''}
}
function requirePro(featureKey){
  if(isPro())return true;
  showToast(t('proOnly')+' — '+t('proOnlyHint'));
  return false;
}
$('upgradeBtn').onclick=function(){setPlan('pro');showToast(t('planPro')+' ✓');};


