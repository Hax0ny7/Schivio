/* Themes: Neon, Notizbuch, Klar, Pastell, Nachtschicht
   - Jedes Theme setzt body[data-skin] und wählt die passende Grundhelligkeit (data-theme) des Basis-Designs.
   - Neon behält die bisherigen Akzentfarben (Türkis = Standard, oder eine der Farbpaletten).
   - Beim ersten Start wird das Theme abgefragt (ersetzt die alte Farbauswahl). */
(function(){
 const SKINS=[
  {id:'neon',name:'Neon',sub:'Dunkel mit Leuchtakzent',base:'dark',meta:'#1b1c1e'},
  {id:'notiz',name:'Notizbuch',sub:'Papier & Handschrift',base:'light',meta:'#f7f1e3'},
  {id:'klar',name:'Klar',sub:'Hell & minimalistisch',base:'light',meta:'#ffffff'},
  {id:'pastell',name:'Pastell',sub:'Weich & verspielt',base:'light',meta:'#fdeef4'},
  {id:'nacht',name:'Nachtschicht',sub:'Schwarz & augenschonend',base:'dark',meta:'#000000'}];
 const NEON=[['anthracite','Türkis','#3ee6da'],['emerald','Smaragd','#16924c'],['blue','Blau','#1977b9'],['violet','Violett','#8654ba'],['amber','Gold','#ba8731'],['teal','Petrol','#148f8c'],['rose','Rosé','#b45d79']];
 const byId=id=>SKINS.find(s=>s.id===id)||SKINS[0];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

 function current(){if(data.skin&&SKINS.some(s=>s.id===data.skin))return data.skin;return data.palette==='light'?'klar':'neon'}
 function neonPalette(){const p=data.neonPalette||(data.palette&&data.palette!=='light'?data.palette:'anthracite');return NEON.some(n=>n[0]===p)?p:'anthracite'}
 function apply(id){const s=byId(id);document.body.dataset.skin=s.id;const pal=s.id==='neon'?neonPalette():(s.base==='light'?'light':'anthracite');
  if(typeof applyPalette==='function')applyPalette(pal);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',s.id==='neon'&&pal!=='anthracite'?getComputedStyle(document.body).getPropertyValue('--surface-deep').trim()||s.meta:s.meta)}
 function set(id,pal){const s=byId(id);if(pal&&NEON.some(n=>n[0]===pal))data.neonPalette=pal;data.skin=s.id;data.palette=s.id==='neon'?neonPalette():(s.base==='light'?'light':'anthracite');
  apply(s.id);persist();try{render()}catch(e){}try{renderStatsOnly()}catch(e){}}

 /* Kleine Vorschau eines Themes (wird im Start-Assistenten und unter „Mehr“ genutzt) */
 function preview(id){return '<span class="skp" data-p="'+id+'" aria-hidden="true"><span class="skp-h">Nov</span><span class="skp-g">'+
  '<i class="b f" style="--x:0;--w:2"></i><i class="b s" style="--x:2;--w:2"></i><i class="b n" style="--x:4;--w:3"></i>'+
  '<i class="b e" style="--x:1;--w:3;--y:1"></i><i class="b u" style="--x:4;--w:2;--y:1"></i></span><span class="skp-fab"></span></span>'}
 function pickerHTML(opts={}){const cur=opts.cur||current(),pal=opts.pal||neonPalette();
  return '<div class="skn" role="radiogroup" aria-label="Theme">'+SKINS.map(s=>'<button type="button" role="radio" data-m="skin" data-v="'+s.id+'" class="'+(s.id===cur?'on':'')+'" aria-checked="'+(s.id===cur)+'">'+preview(s.id)+'<b>'+esc(s.name)+'</b><small>'+esc(s.sub)+'</small></button>').join('')+'</div>'+
   (cur==='neon'?'<div class="skc" role="radiogroup" aria-label="Akzentfarbe">'+NEON.map(([k,n,c])=>'<button type="button" role="radio" data-m="neonpal" data-v="'+k+'" class="'+(k===pal?'on':'')+'" aria-checked="'+(k===pal)+'" aria-label="'+n+'" style="--c:'+c+'"></button>').join('')+'</div>':'')}

 /* Auswahl beim ersten Start */
 function onboarding(){const old=document.getElementById('themeOnboarding');if(old)old.classList.add('hidden');
  let cur=current(),pal=neonPalette();
  const ov=document.createElement('div');ov.className='skin-ob';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','skinObTitle');
  const draw=()=>{ov.innerHTML='<div class="skin-ob-in"><div class="skin-ob-logo" aria-hidden="true">S</div><h1 id="skinObTitle">Willkommen bei Schivio</h1><p>Wähle deinen Look. Du kannst ihn jederzeit unter „Mehr“ ändern.</p>'+pickerHTML({cur,pal})+'<button type="button" class="skin-ob-go" data-go>Weiter</button></div>'};
  draw();document.body.append(ov);document.body.classList.add('modal-open');requestAnimationFrame(()=>ov.classList.add('on'));
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-m],[data-go]');if(!b)return;try{navigator.vibrate&&navigator.vibrate(7)}catch(_){}
   if(b.dataset.m==='skin'){cur=b.dataset.v;apply(cur);draw()}
   else if(b.dataset.m==='neonpal'){pal=b.dataset.v;data.neonPalette=pal;apply('neon');draw()}
   else if(b.dataset.go!==undefined){data.themeOnboardingDone=true;set(cur,cur==='neon'?pal:null);ov.classList.remove('on');document.body.classList.remove('modal-open');setTimeout(()=>{ov.remove();if(!data.setupWizardDone&&window.SchivioFlow)window.SchivioFlow.open()},reduce?0:350)}})}

 window.SchivioThemes={SKINS,current,apply,set,pickerHTML};
 apply(current());try{render()}catch(e){}
 if(!data.themeOnboardingDone)onboarding();
})();
