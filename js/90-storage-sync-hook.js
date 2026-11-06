/* Любое сохранение в localStorage отражается на сервер (с задержкой). */
(function(){
  if(typeof SRV==='undefined')return;
  let timer=null;
  const orig=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    try{orig.call(this,k,v);}catch(e){}
    try{
      if(typeof srvIsDataKey==='function'&&srvIsDataKey(k)){
        clearTimeout(timer);
        timer=setTimeout(function(){SRV.push([k]);},600);
      }
    }catch(e){}
  };
})();
