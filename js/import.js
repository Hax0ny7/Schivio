/* Dienstplan-Import · Teil 4: Oberfläche und Ablauf
   Start → (Kalender-/Excel-Datei: siehe import-file.js | PDF: Zeile antippen | Foto: Tageszahlen + eigene Zeile antippen) → Kürzel zuordnen → Vorschau → übernehmen
   Datenschutz:
   - Foto/PDF wird nur hier im Arbeitsspeicher ausgewertet und beim Schließen sofort verworfen (nicht gespeichert, nicht im Backup).
   - Es wird nur die eigene Zeile ausgelesen. Daten von Kollegen werden nie gespeichert.
   - Gespeichert werden nur: die übernommenen Dienste, die Kürzel-Zuordnung (z. B. „F = Früh“),
     das Namens-Stichwort zum Wiederfinden der eigenen Zeile und die Werte für „Rückgängig“.
   Die Erkennung selbst steckt in import-ocr.js (Text lesen), import-image.js (Bild) und import-grid.js (Tabelle). */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{}),Lib=window.SchivioImportLib;if(!DS||!Lib||!Lib.grid)return;
 const OCR=Lib.ocr,G=Lib.grid;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const pct=(v,t)=>(Math.max(0,v)/t*100).toFixed(3)+'%';
 const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const IC={
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>'
 };

 /* ---------- Zustand ---------- */
 const cfg=()=>{if(!data.importCfg||typeof data.importCfg!=='object')data.importCfg={};const c=data.importCfg;if(!c.map||typeof c.map!=='object')c.map={};c.name=c.name||'';return c};
 let st=null,zoom=0;
 /* Vorauswahl: ab dem 16. der nächste Monat (der Plan wird meist vorher ausgehängt) */
 function fresh(){const n=new Date();let y=n.getFullYear(),m=n.getMonth();if(n.getDate()>15){m++;if(m>11){m=0;y++}}st={y,m}}
 function discard(){if(st){st.src=null;st.lines=null;st.tokens=null}OCR.end()}
 function shiftMonth(d){st.m+=d;if(st.m<0){st.m=11;st.y--}if(st.m>11){st.m=0;st.y++}}
 const monthBar=()=>'<div class="ip-mon"><button type="button" class="ib" data-x="mp" aria-label="Vorheriger Monat">'+IC.prev+'</button><b>'+MON[st.m]+' '+st.y+'</b><button type="button" class="ib" data-x="mn" aria-label="Nächster Monat">'+IC.next+'</button></div>';
 const refresh=()=>{try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}};

 /* Fortschritt: Text im „Einen Moment …“-Fenster; Prozent der Texterkennung hängt am letzten Text */
 let label='';
 const prog=t=>{const p=DS.view()?.querySelector('[data-prog]');if(p)p.textContent=t};
 const report=t=>{label=t.replace(/ ….*$/,'');prog(t)};
 OCR.onProgress=p=>prog(label+' … '+p+' %');
 function busy(t){label=t.replace(/ ….*$/,'');return el('<div>'+DS.head('Dienstplan-Import','Einen Moment …')+'<div class="ip-busy"><i></i><span data-prog>'+esc(t)+'</span></div></div>')}
 function fail(x,back){console.warn(x);DS.swap(back(),-1);setTimeout(()=>{const er=DS.view()?.querySelector('[data-err]');if(er)er.innerHTML=IC.warn+'<span>'+esc(x&&x.message||'Das hat leider nicht geklappt.')+'</span>'},60)}

 /* ---------- 1. Start ---------- */
 function start(){const u=data.importUndo;
  const node=el('<div>'+DS.head('Tools','Dienstplan-Import')+
   '<div class="ip-note">'+IC.lock+'<span><b>Alles bleibt auf deinem Handy.</b> Foto oder PDF werden nur hier ausgewertet und danach sofort verworfen. Schivio liest nur deine Zeile – Daten von Kollegen werden nicht gespeichert. Bitte prüfe, ob dein Arbeitgeber das Fotografieren des Dienstplans erlaubt.</span></div>'+
   monthBar()+'<p class="ip-p">Für welchen Monat ist der Dienstplan? Steht der Monat im Plan, erkennt Schivio ihn automatisch.</p>'+
   '<div class="ip-pick">'+
    '<label class="ip-src"><span class="ii">'+IC.file+'</span><span class="tt"><b>Kalender- oder Excel-Datei</b><small>.ics, .xlsx oder .csv aus dem Mitarbeiterportal – am genauesten</small></span><input type="file" accept=".ics,.ical,.icalendar,text/calendar,.csv,text/csv,.txt,.xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden data-f="file"></label>'+
    '<label class="ip-src"><span class="ii">'+IC.pdf+'</span><span class="tt"><b>PDF wählen</b><small>z. B. ausgedruckter Plan als PDF – sehr zuverlässig</small></span><input type="file" accept="application/pdf,.pdf" hidden data-f="pdf"></label>'+
    '<label class="ip-src"><span class="ii">'+IC.cam+'</span><span class="tt"><b>Foto wählen</b><small>Möglichst gerade von vorne, gut beleuchtet, ohne Schatten</small></span><input type="file" accept="image/*" hidden data-f="img"></label>'+
   '</div>'+
   '<p class="ip-hint">Tipp für Fotos: Es reicht, wenn die Zeile mit den Tageszahlen und deine Zeile gut lesbar im Bild sind – lieber näher ran als den ganzen Plan. Beim ersten Foto wird die Texterkennung geladen (ca. 5 MB). Dein Foto wird dabei nicht verschickt.</p>'+
   (window.SchivioPattern?'<button type="button" class="ip-undo" data-x="pattern">Kein Plan zur Hand?<small>Wiederkehrenden Rhythmus als Schichtmuster eintragen</small></button>':'')+
   (u?'<button type="button" class="ip-undo" data-x="undo">Letzten Import rückgängig machen<small>'+u.n+' Dienste · '+esc(u.label||MON[u.m]+' '+u.y)+'</small></button>':'')+
   '<div class="ip-err" data-err role="alert"></div></div>');
  DS.wire(node,{mp:()=>{shiftMonth(-1);DS.swap(start(),-1)},mn:()=>{shiftMonth(1);DS.swap(start(),1)},undo:undoLast,pattern:()=>{discard();st=null;window.SchivioPattern.open()}});
  node.querySelector('[data-f="file"]').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f&&window.SchivioImportFile)window.SchivioImportFile.load(f,()=>{fresh();return start()})});
  node.querySelector('[data-f="pdf"]').addEventListener('change',e=>load(e,'pdf'));
  node.querySelector('[data-f="img"]').addEventListener('change',e=>load(e,'img'));
  return node}

 function undoLast(){const u=data.importUndo;if(!u)return;
  if(!confirm('Die '+u.n+' importierten Dienste ('+(u.label||MON[u.m]+' '+u.y)+') wieder auf den vorherigen Stand setzen?'))return;
  for(const [k,v] of Object.entries(u.prev||{})){if(v)data.shifts[k]=v;else delete data.shifts[k]}
  delete data.importUndo;refresh();toast('Import rückgängig gemacht');DS.swap(start(),0)}

 /* Datei laden und grob auswerten */
 async function load(e,kind){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  DS.swap(busy(kind==='pdf'?'PDF wird gelesen …':'Bild wird vorbereitet …'),1);
  try{let src;
   if(kind==='pdf'){src=await OCR.readPdf(f);if(src.scanned){report('Gescanntes PDF – Texterkennung läuft …');src=await G.photoPrep(src.canvas,report)}}
   else src=await G.photoPrep(await OCR.loadImage(f),report);
   if(!src.words.length&&src.kind==='pdf')throw new Error('Im Dokument wurde kein Text gefunden.');
   st.src=src;G.analyse(st);
   const dm=G.detectMonth(st);if(dm){st.y=dm[0];st.m=dm[1];st.monthAuto=true}
   const own=G.findNameLine(st,cfg().name);
   if(src.kind==='pdf'){st.row=own>=0?own:null;DS.swap(rowView(),1)}
   else{st.hY=st.hIdx>=0?st.lines[st.hIdx].cy:null;st.rY=own>=0?st.lines[own].cy:null;st.step=st.hY!=null?'r':'h';DS.swap(photoView(),1)}}
  catch(x){fail(x,start)}}

 /* ---------- Plan-Ansicht mit Zoom (für beide Wege) ---------- */
 function imgBox(inner){const s=st.src;if(!zoom)zoom=s.w>s.h*1.15?2.5:1.5;
  return '<div class="ip-zoom"><button type="button" class="ch2" data-x="zo" aria-label="Verkleinern">−</button><span>'+Math.round(zoom*100)+' %</span><button type="button" class="ch2" data-x="zi" aria-label="Vergrößern">+</button></div>'+
   '<div class="ip-scroll"><div class="ip-img" style="width:'+(zoom*100)+'%;aspect-ratio:'+s.w+' / '+s.h+'"><img alt="Dein Dienstplan" src="'+s.img+'">'+inner+'</div></div>'}
 function scrollTo(node,y){setTimeout(()=>{const sc=node.querySelector('.ip-scroll'),im=node.querySelector('.ip-img');if(!sc||!im||y==null)return;sc.scrollTop=Math.max(0,y/st.src.h*im.offsetHeight-sc.clientHeight/2);sc.scrollLeft=0},80)}
 const zoomBy=(d,view)=>{zoom=Math.max(1,Math.min(5,zoom+d));DS.swap(view(),0)};
 const backToStart=()=>{discard();zoom=0;DS.swap(start(),-1)};

 /* ---------- 2a. PDF: eigene Zeile antippen ---------- */
 function rowView(){const s=st.src,sel=st.row;
  const lines=st.lines.map((l,i)=>i===st.hIdx?'':'<button type="button" class="ip-ln'+(sel===i?' on':'')+'" data-x="row" data-i="'+i+'" style="left:'+pct(l.x0-4,s.w)+';top:'+pct(l.y0-4,s.h)+';width:'+pct(l.x1-l.x0+8,s.w)+';height:'+pct(l.y1-l.y0+8,s.h)+'" aria-label="Zeile '+(i+1)+': '+esc(l.text.slice(0,60))+'"></button>').join('');
  const node=el('<div>'+DS.head('Dienstplan-Import','Deine Zeile antippen',{back:true})+
   '<p class="ip-p">Tippe auf die Zeile mit deinem Namen. Nur diese Zeile wird ausgelesen.</p>'+imgBox(lines)+
   '<div class="ip-sel" data-sel>'+selText()+'</div>'+
   (st.header?'':'<p class="ip-warn">'+IC.warn+'<span>Keine Zeile mit Tageszahlen (1, 2, 3 …) gefunden. Die Einträge werden der Reihe nach ab dem 1. zugeordnet – bitte in der Vorschau prüfen.</span></p>')+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(sel==null?' disabled':'')+'>Weiter</button></div></div>');
  DS.wire(node,{back:backToStart,zi:()=>zoomBy(.5,rowView),zo:()=>zoomBy(-.5,rowView),
   row:b=>{st.row=Number(b.dataset.i);node.querySelectorAll('.ip-ln').forEach(x=>x.classList.toggle('on',x===b));node.querySelector('[data-sel]').innerHTML=selText();node.querySelector('[data-x="next"]').disabled=false},
   next:()=>{if(st.row==null)return;st.nameLine=st.lines[st.row];st.tokens=G.rowTokens(st,st.nameLine);if(!st.tokens.length){toast('In dieser Zeile wurden keine Dienste gefunden.');return}DS.swap(mapView(),1)}});
  if(sel!=null)scrollTo(node,st.lines[sel].cy);
  return node}
 function selText(){if(st.row==null)return '<small>Noch keine Zeile gewählt</small>';const t=st.lines[st.row].text;return '<small>Ausgewählt</small><b>'+esc(t.length>90?t.slice(0,90)+' …':t)+'</b>'}

 /* ---------- 2b. Foto: Tageszahlen-Zeile und eigene Zeile antippen ---------- */
 function bandStyle(y){const h=st.pitch*1.1;return 'top:'+pct(y-h/2,st.src.h)+';height:'+pct(h,st.src.h)}
 function photoView(){const s=st.src,ready=st.hY!=null&&st.rY!=null;
  const bands=(st.hY!=null?'<i class="ip-band h" style="'+bandStyle(st.hY)+'"><b>Tageszahlen</b></i>':'')+(st.rY!=null?'<i class="ip-band r" style="'+bandStyle(st.rY)+'"><b>Deine Zeile</b></i>':'');
  const tab=(x,step,n,txt,done)=>'<button type="button" data-x="'+x+'" class="'+(st.step===step?'on':'')+(done?' ok':'')+'" aria-pressed="'+(st.step===step)+'"><i>'+n+'</i>'+txt+'</button>';
  const node=el('<div>'+DS.head('Dienstplan-Import','Zeilen antippen',{back:true})+
   '<div class="ip-steps" role="group" aria-label="Schritt">'+tab('sh','h',1,'Tageszahlen',st.hY!=null)+tab('sr','r',2,'Deine Zeile',st.rY!=null)+'</div>'+
   '<p class="ip-p">'+(st.step==='h'?'Tippe auf die Zeile mit den Tageszahlen (1, 2, 3 …).':'Tippe jetzt auf deine Zeile – irgendwo auf Höhe deines Namens oder deiner Dienste.')+'</p>'+
   imgBox(bands)+'<div class="ip-err" data-err role="alert"></div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="read"'+(ready?'':' disabled')+'>Zeile auslesen</button></div></div>');
  const im=node.querySelector('.ip-img');
  im.addEventListener('click',e=>{const r=im.getBoundingClientRect();const y=G.snap(st,(e.clientY-r.top)/r.height*s.h);try{navigator.vibrate&&navigator.vibrate(7)}catch(_){}
   if(st.step==='h'){st.hY=y;st.step='r'}else st.rY=y;
   const sc=node.querySelector('.ip-scroll'),keep=sc?[sc.scrollTop,sc.scrollLeft]:null;const n2=photoView();DS.swap(n2,0);
   if(keep)requestAnimationFrame(()=>{const s2=n2.querySelector('.ip-scroll');if(s2){s2.scrollTop=keep[0];s2.scrollLeft=keep[1]}})});
  DS.wire(node,{back:backToStart,zi:()=>zoomBy(.5,photoView),zo:()=>zoomBy(-.5,photoView),
   sh:()=>{st.step='h';DS.swap(photoView(),0)},sr:()=>{st.step='r';DS.swap(photoView(),0)},
   read:async()=>{if(!ready)return;DS.swap(busy('Tabelle wird erkannt …'),1);
    try{st.tokens=await G.readRow(st,report);DS.swap(mapView(),1)}catch(x){fail(x,photoView)}}});
  return node}

 /* ---------- 3. Kürzel zuordnen ---------- */
 const codes=()=>typeof orderedPlannerCodes==='function'?orderedPlannerCodes():['F','S','N','X','U','T','A'];
 const shiftOptions=(c,none)=>'<option value=""'+(c===''?' selected':'')+'>'+none+'</option>'+codes().map(x=>'<option value="'+esc(x)+'"'+(x===c?' selected':'')+'>'+esc(shiftTitle(x))+'</option>').join('');
 /* Vorschlag für ein Kürzel: gemerkte Zuordnung → Name einer Dienstart → typische Abkürzungen */
 function guess(t){const g=guessRaw(t);return g===''||codes().includes(g)?g:''}
 function guessRaw(t){const k=t.toUpperCase(),m=cfg().map;if(Object.prototype.hasOwnProperty.call(m,k))return m[k];
  for(const c of codes())if(k===shiftTitle(c).toUpperCase())return c;
  const rules=[[/^(X|FREI|FR|-|–|—|\/|\.|0|AZ|ZA|WF|RT)$/,''],[/^(FB|FORTB|FORTBILDUNG|SCHUL|SEM)/,'T'],[/^(U|UR|URL|URLAUB)$/,'U'],[/^(K|KR|KRANK|AU)$/,'K'],
   [/^(N|ND|NA|NACHT)/,'N'],[/^(S|SD|SP|SPÄT|SPAET)/,'S'],[/^(F|FD|FRÜH|FRUEH|E|ED)/,'F']];
  for(const [re,c] of rules)if(re.test(k))return c;
  return ''}
 function mapView(){const uniq={};st.tokens.forEach(o=>{const k=o.t.toUpperCase();(uniq[k]=uniq[k]||{t:o.t,n:0}).n++});
  st.map=st.map||{};for(const k of Object.keys(uniq))if(!(k in st.map))st.map[k]=guess(uniq[k].t);
  const node=el('<div>'+DS.head('Dienstplan-Import','Kürzel zuordnen',{back:true})+
   '<p class="ip-p">Welcher Dienst steckt hinter welchem Kürzel? Schivio merkt sich die Zuordnung für den nächsten Import.</p>'+
   '<div class="ls ip-map">'+Object.keys(uniq).sort().map(k=>'<label class="r"><span class="ip-k">'+esc(uniq[k].t)+'</span><small>'+uniq[k].n+'×</small><select data-k="'+esc(k)+'" aria-label="Dienst für '+esc(uniq[k].t)+'">'+shiftOptions(st.map[k],'— frei / ignorieren —')+'</select></label>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next">Vorschau</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(s=>s.addEventListener('change',()=>{st.map[s.dataset.k]=s.value}));
  DS.wire(node,{back:()=>DS.swap(st.src.kind==='img'?photoView():rowView(),-1),next:()=>DS.swap(preview(),1)});
  return node}

 /* ---------- 4. Vorschau & übernehmen ---------- */
 function plan(){st.ov=st.ov||{};return st.tokens.map(o=>{const k=st.y+'-'+pad2(st.m+1)+'-'+pad2(o.day);const auto=st.map[o.t.toUpperCase()]||'';return {k,day:o.day,t:o.t,c:k in st.ov?st.ov[k]:auto,old:data.shifts[k]||''}})}
 function summary(){const use=plan().filter(x=>x.c),ch=use.filter(x=>x.old&&x.old!==x.c).length;
  return {use,txt:use.length+(use.length===1?' Dienst wird':' Dienste werden')+' eingetragen'+(ch?', davon '+ch+' ersetzt':'')+'. Falls etwas falsch erkannt wurde, kannst du jeden Tag hier direkt ändern.'}}
 function preview(){const rows=plan(),missing=G.daysIn(st)-rows.length,S0=summary();
  const row=r=>{const d=new Date(r.k+'T12:00:00');return '<div class="r'+(r.c?'':' off')+'"><span class="dd"><b>'+pad2(r.day)+'.</b><small>'+WD[d.getDay()]+'</small></span><span class="ip-k">'+esc(r.t)+'</span>'+
   '<span class="to"><span class="nm"><i style="--c:'+esc(r.c?shiftColor(r.c):'transparent')+'"></i><select data-k="'+r.k+'" aria-label="Dienst am '+r.day+'.">'+shiftOptions(r.c,'nicht übernehmen')+'</select></span>'+(r.old&&r.old!==r.c&&r.c?'<small>ersetzt '+esc(shiftTitle(r.old))+'</small>':'')+'</span></div>'};
  const node=el('<div>'+DS.head('Dienstplan-Import','Vorschau',{back:true})+monthBar()+
   '<p class="ip-p">'+(st.monthAuto?'Monat aus dem Dienstplan erkannt.':'Bitte prüfen: Ist das der richtige Monat?')+'</p>'+
   '<p class="ip-p" data-sum>'+esc(S0.txt)+'</p>'+
   (missing>3&&st.src.kind==='img'?'<p class="ip-warn">'+IC.warn+'<span>Für '+missing+' Tage wurde nichts erkannt. Das kann an freien Tagen liegen – oder das Foto war an dieser Stelle unscharf. Bitte kurz vergleichen.</span></p>':'')+
   '<div class="ls ip-pv">'+rows.map(row).join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="apply"'+(S0.use.length?'':' disabled')+'>'+S0.use.length+' Dienste übernehmen</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(sel=>sel.addEventListener('change',()=>{st.ov[sel.dataset.k]=sel.value;const r=sel.closest('.r');r.classList.toggle('off',!sel.value);r.querySelector('i').style.setProperty('--c',sel.value?shiftColor(sel.value):'transparent');
   const S=summary(),b=node.querySelector('[data-x="apply"]');node.querySelector('[data-sum]').textContent=S.txt;b.textContent=S.use.length+' Dienste übernehmen';b.disabled=!S.use.length}));
  const moveMonth=d=>{shiftMonth(d);st.monthAuto=false;st.ov={};DS.swap(preview(),0)};
  DS.wire(node,{back:()=>DS.swap(mapView(),-1),mp:()=>moveMonth(-1),mn:()=>moveMonth(1),apply});
  return node}
 function apply(){const use=summary().use,y=st.y,m=st.m;
  /* für „Rückgängig“ die alten Werte merken */
  data.importUndo={at:new Date().toISOString(),y,m,n:use.length,prev:Object.fromEntries(use.map(r=>[r.k,data.shifts[r.k]||null]))};
  const c=cfg();Object.assign(c.map,st.map);const nm=G.nameWord(st.nameLine);if(nm)c.name=nm;
  use.forEach(r=>{data.shifts[r.k]=r.c});refresh();
  discard();st=null;DS.close();toast(use.length+' Dienste im '+MON[m]+' eingetragen');try{window.SchivioMore?.render?.()}catch(e){}
  /* direkt zum importierten Monat springen */
  setTimeout(()=>{try{document.getElementById('tabPlan')?.click()}catch(e){}try{shown=new Date(y,m,1);render()}catch(e){}},350)}

 function open(){fresh();zoom=0;DS.node(start);DS.onClose?.(()=>{discard();st=null})}
 window.SchivioImport={open,lib:{guess,cfg,shiftOptions}};
 /* Nur für Tests: mit localStorage „schivio-debug“ = 1 ist der Zustand von außen lesbar */
 try{if(localStorage.getItem('schivio-debug')==='1')window.SchivioImport.debug=()=>st}catch(e){}
})();
