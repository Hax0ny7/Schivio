/* v1.0.34: Entgeltgruppe und Stufe als Auswahllisten passend zum Tarif (Mehr + Einrichtung) */
(function(){
 const fmt=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 function toSelect(id){const old=document.getElementById(id);if(!old||old.tagName==='SELECT')return old;const sel=document.createElement('select');sel.id=id;sel.className=old.className;old.replaceWith(sel);return sel}
 function field(el){return el?.closest('.field')||null}
 function wire(o){
  const t=document.getElementById(o.tariff),g=toSelect(o.group),l=toSelect(o.level);if(!t||!g||!l)return null;
  const gl=document.querySelector('label[for="'+o.group+'"]'),ll=document.querySelector('label[for="'+o.level+'"]'),ft=document.getElementById(o.fulltime);
  function fill(wantG,wantL){
   const st=(document.getElementById(o.state)||{}).value||data.profile?.state||'NW';const cat=SchivioPay.catalog(t.value,st);const ind=!!SchivioPay.TARIFFS[SchivioPay.normalizeTariff(t.value)]?.individual;
   [g,l,gl,ll].forEach(e=>{if(e)e.hidden=ind});[field(g),field(l)].forEach(e=>{if(e)e.hidden=ind});
   const T=SchivioPay.TARIFFS[SchivioPay.normalizeTariff(t.value)];
   if(gl)gl.textContent='Entgeltgruppe'+(T?.groupHint?' ('+T.groupHint+')':'');if(ll)ll.textContent=T?.levels?'Stufe':'Erfahrungsstufe';
   if(ft){const hosp=(data.setupOptions||{}).workplace==='hospital';const d=cat?(hosp&&cat.fulltimeHospital?cat.fulltimeHospital:cat.fulltime):null;ft.placeholder=d?'leer = Tarifwert ('+String(d).replace('.',',')+' Std.)':'z. B. 39'}
   const gWant=SchivioPay.normalizeGroup(wantG??g.value,SchivioPay.normalizeTariff(t.value)),lWant=String(wantL??l.value);
   g.replaceChildren(new Option(cat?'Bitte auswählen':(T?.pending?'Tarif folgt noch':'Erst Tarif wählen'),''));l.replaceChildren(new Option('Bitte auswählen',''));
   if(!cat)return;for(const x of cat.groups)g.append(new Option(x.label,x.key));
   g.value=cat.groups.some(x=>x.key===gWant)?gWant:'';
   const grp=cat.groups.find(x=>x.key===g.value);if(grp)for(const v of grp.levels)l.append(new Option(v.label+' · '+fmt(v.amount),String(v.n)));
   l.value=grp&&grp.levels.some(v=>String(v.n)===lWant)?lWant:'';
  }
  t.addEventListener('change',()=>fill());g.addEventListener('change',()=>fill(g.value));const se=document.getElementById(o.state);if(se)se.addEventListener('change',()=>fill());
  return fill;
 }
 const mehr=wire({tariff:'tariff',group:'group',level:'level',fulltime:'fulltime',state:'state'});
 const wiz=wire({tariff:'setupTariff',group:'setupGroup',level:'setupLevel',fulltime:'setupFulltime',state:'setupRegion'});
 if(mehr){const op=populateProfile;populateProfile=function(){op();mehr(data.profile?.group||'',data.profile?.level||'')};mehr(data.profile?.group||'',data.profile?.level||'')}
 if(wiz){window.__wizFill=()=>wiz(data.profile?.group||data.setupOptions?.group||'',data.profile?.level||data.setupOptions?.level||'');window.__wizFill()}
})();
