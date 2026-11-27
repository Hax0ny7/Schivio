/* Themes: Neon, Notizbuch, Klar, Pastell, Nachtschicht (kostenlos) · Dämmerung, Polarlicht, Blaupause, Wald (Pro)
   - Jedes Theme setzt body[data-skin] und wählt die passende Grundhelligkeit (data-theme) des Basis-Designs.
   - Neon behält die bisherigen Akzentfarben (Türkis = Standard, oder eine der Farbpaletten).
   - Beim ersten Start wird das Theme abgefragt (ersetzt die alte Farbauswahl). */
(function(){
 const SKINS=[
  {id:'neon',name:'Neon',sub:'Dunkel mit Leuchtakzent',base:'dark',meta:'#1b1c1e'},
  {id:'notiz',name:'Notizbuch',sub:'Papier & Handschrift',base:'light',meta:'#f7f1e3'},
  {id:'klar',name:'Klar',sub:'Hell & minimalistisch',base:'light',meta:'#ffffff'},
  {id:'pastell',name:'Pastell',sub:'Weich & verspielt',base:'light',meta:'#fdeef4'},
  {id:'nacht',name:'Nachtschicht',sub:'Schwarz & augenschonend',base:'dark',meta:'#000000'},
  /* Exklusiv für Schivio Pro */
  {id:'daemmerung',name:'Dämmerung',sub:'Indigo & warmes Abendlicht',base:'dark',meta:'#1b1830',pro:true},
  {id:'polar',name:'Polarlicht',sub:'Leuchtendes Türkis & Violett',base:'dark',meta:'#0a1315',pro:true},
  {id:'blau',name:'Blaupause',sub:'Bauplan mit feinem Raster',base:'dark',meta:'#0f2a4a',pro:true},
  {id:'wald',name:'Wald',sub:'Ruhiges Grün mit Baum',base:'dark',meta:'#141d17',pro:true}];
 const NEON=[['anthracite','Türkis','#3ee6da'],['emerald','Smaragd','#16924c'],['blue','Blau','#1977b9'],['violet','Violett','#8654ba'],['amber','Gold','#ba8731'],['teal','Petrol','#148f8c'],['rose','Rosé','#b45d79']];
 const byId=id=>SKINS.find(s=>s.id===id)||SKINS[0];
 const esc=SU.esc;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

 function current(){if(data.skin&&SKINS.some(s=>s.id===data.skin))return data.skin;return data.palette==='light'?'klar':'neon'}
 function neonPalette(){const p=data.neonPalette||(data.palette&&data.palette!=='light'?data.palette:'anthracite');return NEON.some(n=>n[0]===p)?p:'anthracite'}
 /* Wald: Baum mit fliegenden Blättern, ganz dezent unten rechts im Kalender */
 const TREE='<svg class="tr" viewBox="0 0 240 260" aria-hidden="true"><path d="M118 258c4-38 3-70-3-96-5-20-17-34-30-46m35 70c10-22 28-36 50-44m-48 6c-14-6-30-6-46 2m60-48c2-16 10-30 22-40" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M110 258h18" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>'+
  [[72,70,46],[120,48,54],[170,72,46],[96,112,44],[150,112,46],[52,118,34],[194,120,32],[122,86,40]].map(([x,y,r],i)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" class="c'+(i%3)+'"/>').join('')+'</svg>';
 const LEAF='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17C3 8 9 3 17 3c0 8-5 14-14 14z"/><path d="M3 17l9-9" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/></svg>';
 function forest(on){const shell=document.querySelector('.calendar-shell');if(!shell)return;let t=shell.querySelector('.sx-tree');
  if(!on){t?.remove();return}if(t)return;t=document.createElement('div');t.className='sx-tree';t.setAttribute('aria-hidden','true');
  t.innerHTML=TREE+(reduce?'':Array.from({length:7},(_,i)=>'<i class="lf l'+(i%3)+'" style="--d:'+(i*1.9).toFixed(1)+'s;--x:'+(-120-(i*37)%110)+'px;--y:'+(-60-(i*53)%140)+'px;--r:'+(160+i*70)+'deg;--s:'+(0.75+(i%3)*0.2)+';--top:'+(40+(i*29)%80)+'px;--left:'+(60+(i*41)%120)+'px">'+LEAF+'</i>').join(''));
  shell.append(t)}
 function apply(id){const s=byId(id);document.body.dataset.skin=s.id;try{forest(s.id==='wald')}catch(e){}const pal=s.id==='neon'?neonPalette():(s.base==='light'?'light':'anthracite');
  if(typeof applyPalette==='function')applyPalette(pal);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',s.id==='neon'&&pal!=='anthracite'?getComputedStyle(document.body).getPropertyValue('--surface-deep').trim()||s.meta:s.meta)}
 function set(id,pal){const s=byId(id);if(pal&&NEON.some(n=>n[0]===pal))data.neonPalette=pal;data.skin=s.id;data.palette=s.id==='neon'?neonPalette():(s.base==='light'?'light':'anthracite');
  apply(s.id);persist();try{render()}catch(e){}try{renderStatsOnly()}catch(e){}}

 /* Kleine Vorschau eines Themes (wird im Start-Assistenten und unter „Mehr“ genutzt) */
 function preview(id){return '<span class="skp" data-p="'+id+'" aria-hidden="true"><span class="skp-h">Nov</span><span class="skp-g">'+
  '<i class="b f" style="--x:0;--w:2"></i><i class="b s" style="--x:2;--w:2"></i><i class="b n" style="--x:4;--w:3"></i>'+
  '<i class="b e" style="--x:1;--w:3;--y:1"></i><i class="b u" style="--x:4;--w:2;--y:1"></i></span><span class="skp-fab"></span></span>'}
 function pickerHTML(opts={}){const cur=opts.cur||current(),pal=opts.pal||neonPalette();
  const list=opts.pro?SKINS:SKINS.filter(s=>!s.pro||s.id===cur);
  return '<div class="skn" role="radiogroup" aria-label="Theme">'+list.map(s=>'<button type="button" role="radio" data-m="skin" data-v="'+s.id+'" class="'+(s.id===cur?'on':'')+'" aria-checked="'+(s.id===cur)+'">'+preview(s.id)+'<b>'+esc(s.name)+(opts.pro&&s.pro?' <span class="bdg pro">Pro</span>':'')+'</b><small>'+esc(s.sub)+'</small></button>').join('')+'</div>'+
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
