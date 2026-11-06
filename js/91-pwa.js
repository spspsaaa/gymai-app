/* PWA: service worker registration (install button uses Telegram deep link) */
(function(){
  try{
    if('serviceWorker' in navigator){
      window.addEventListener('load', function(){
        navigator.serviceWorker.register('sw.js').catch(function(){});
      });
    }
  }catch(e){}

  /* Открыть ссылку установки во внешнем браузере (Safari), а не внутри Telegram */
  var INSTALL_URL='https://t.me/GymAi_robot/?startapp&addToHomeScreen';
  var FALLBACK_URL='https://gym-ai-3f0d63ky.agent.mira.tg/install.html';
  var ib=document.getElementById('installBtn');
  if(ib){
    ib.addEventListener('click',function(){
      var tg=(window.Telegram&&window.Telegram.WebApp)||null;
      if(tg&&typeof tg.openLink==='function'){
        try{ tg.openLink(INSTALL_URL); return; }catch(e){}
      }
      try{ window.open(FALLBACK_URL,'_blank','noopener'); }catch(e){}
      setTimeout(function(){ try{ location.href=FALLBACK_URL; }catch(e){} },700);
    });
  }
})();

