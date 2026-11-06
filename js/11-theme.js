/* ---------- Theme (v0.12): dark (original) / light. Telegram theme is NOT applied. ---------- */
const THEME_KEY='gymai_theme';
function themeGet(){
  try{const v=localStorage.getItem(THEME_KEY);if(v==='dark'||v==='light')return v;}catch(e){}
  return 'dark';
}
function themeApply(mode){
  mode=(mode==='light')?'light':'dark';
  try{localStorage.setItem(THEME_KEY,mode);}catch(e){}
  try{document.documentElement.classList.toggle('light-theme',mode==='light');}catch(e){}
  try{document.documentElement.setAttribute('data-theme',mode);}catch(e){}
  return mode;
}
function themeInit(){return themeApply(themeGet());}
function themeSet(mode){themeApply(mode);try{renderThemeUI();}catch(e){}}
function renderThemeUI(){
  const sel=document.getElementById('themeSelect');
  if(sel)sel.value=themeGet();
  const btn=document.getElementById('themeToggle');
  if(btn){
    const dark=themeGet()==='dark';
    btn.textContent=dark?'☾':'◐';
    btn.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');
    btn.setAttribute('title',dark?'Светлая тема':'Тёмная тема');
  }
}
function themeWire(){
  const btn=document.getElementById('themeToggle');
  if(btn&&!btn.__wired){btn.__wired=true;btn.addEventListener('click',function(){themeSet(themeGet()==='dark'?'light':'dark');});}
  renderThemeUI();
}


/* ---------- v0.16: no zoom, true fullscreen ---------- */
(function(){
  /* iOS Safari / Telegram webview: kill pinch + double-tap zoom */
  ['gesturestart','gesturechange','gestureend'].forEach(function(ev){
    document.addEventListener(ev,function(e){e.preventDefault();},{passive:false});
  });
  let lastTouch=0;
  document.addEventListener('touchend',function(e){
    const now=Date.now();
    if(now-lastTouch<=320){e.preventDefault();}
    lastTouch=now;
  },{passive:false});
  document.addEventListener('dblclick',function(e){e.preventDefault();},{passive:false});
  /* block ctrl+wheel zoom on desktop */
  document.addEventListener('wheel',function(e){if(e.ctrlKey)e.preventDefault();},{passive:false});
})();
function tgFullscreen(){
  try{
    if(!TG)return;
    /* Bot API 8.0+: real fullscreen. Older clients just stay expanded. */
    if(TG.requestFullscreen){
      try{TG.requestFullscreen();}catch(e){}
      try{TG.onEvent&&TG.onEvent('fullscreenChanged',function(ev){
      try{tgIsFullscreen=!!(ev&&ev.fullscreen);}catch(e){}
      tgReserveBottom();
    });}catch(e){}
      try{TG.onEvent&&TG.onEvent('fullscreenFailed',function(){try{TG.expand();}catch(e){}});}catch(e){}
    }
    if(TG.disableVerticalSwipes){try{TG.disableVerticalSwipes();}catch(e){}}
  }catch(e){}
}
window.addEventListener('resize',tgReserveBottom);
window.addEventListener('orientationchange',function(){setTimeout(tgReserveBottom,180);});
try{themeInit();}catch(e){}
if(TG){tgBoot();}
