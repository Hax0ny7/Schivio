/* v1.0.70: Dienstplan-Import – Foto oder PDF, komplett auf dem Handy.
   Datenschutz:
   - Foto/PDF wird nur hier im Arbeitsspeicher ausgewertet und beim Schließen sofort verworfen (nicht gespeichert, nicht im Backup).
   - Es wird nur die eigene Zeile ausgelesen. Daten von Kollegen werden nie gespeichert.
   - Gespeichert werden nur: die übernommenen Dienste, die Kürzel-Zuordnung (z. B. „F = Früh“) und das Namens-Stichwort zum Wiederfinden der eigenen Zeile.
   PDF: pdf.js liegt in der App (vendor/pdfjs). Foto: Texterkennung (tesseract.js) wird beim ersten Mal geladen,
   das Foto selbst verlässt das Handy dabei nicht. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const pct=(v,t)=>(Math.max(0,v)/t*100).toFixed(3)+'%';
 const IC={
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'
 };
 const TESS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

 const cfg=()=>{if(!data.importCfg||typeof data.importCfg!=='object')data.importCfg={};const c=data.importCfg;if(!c.map||typeof c.map!=='object')c.map={};c.name=c.name||'';return c};
 let st=null;
 function fresh(){const n=new Date();let y=n.getFullYear(),m=n.getMonth();if(n.getDate()>15){m++;if(m>11){m=0;y++}}st={y,m}}
 function discard(){if(st){st.src=null;st.lines=null;st.tokens=null}}

 /* ---------- 1. Start ---------- */
 function start(){
  const node=el('<div>'+DS.head('Tools','Dienstplan-Import')+
   '<div class="ip-note">'+IC.lock+'<span><b>Alles bleibt auf deinem Handy.</b> Foto oder PDF werden nur hier ausgewertet und danach sofort verworfen. Schivio liest nur deine Zeile – Daten von Kollegen werden nicht gespeichert. Bitte prüfe, ob dein Arbeitgeber das Fotografieren des Dienstplans erlaubt.</span></div>'+
   '<div class="ip-mon"><button type="button" class="ib" data-x="mp" aria-label="Vorheriger Monat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button><b>'+MON[st.m]+' '+st.y+'</b><button type="button" class="ib" data-x="mn" aria-label="Nächster Monat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button></div>'+
   '<p class="ip-p">Für welchen Monat ist der Dienstplan?</p>'+
   '<div class="ip-pick">'+
    '<label class="ip-src"><span class="ii">'+IC.pdf+'</span><span class="tt"><b>PDF wählen</b><small>z. B. aus dem Mitarbeiterportal – am zuverlässigsten</small></span><input type="file" accept="application/pdf,.pdf" hidden data-f="pdf"></label>'+
    '<label class="ip-src"><span class="ii">'+IC.cam+'</span><span class="tt"><b>Foto wählen</b><small>Gerade von vorne, gut beleuchtet, ganzer Plan im Bild</small></span><input type="file" accept="image/*" hidden data-f="img"></label>'+
   '</div>'+
   '<p class="ip-hint">Beim ersten Foto wird die Texterkennung geladen (ca. 5 MB). Dein Foto wird dabei nicht verschickt.</p>'+
   '<div class="ip-err" data-err role="alert"></div></div>');
  DS.wire(node,{mp:()=>{st.m--;if(st.m<0){st.m=11;st.y--}DS.swap(start(),-1)},mn:()=>{st.m++;if(st.m>11){st.m=0;st.y++}DS.swap(start(),1)}});
  node.querySelector('[data-f="pdf"]').addEventListener('change',e=>run(e,'pdf'));
  node.querySelector('[data-f="img"]').addEventListener('change',e=>run(e,'img'));
  return node}

 function busy(t){return el('<div>'+DS.head('Dienstplan-Import','Einen Moment …')+'<div class="ip-busy"><i></i><span data-prog>'+esc(t)+'</span></div></div>')}
 const prog=t=>{const p=DS.view()?.querySelector('[data-prog]');if(p)p.textContent=t};

 async function run(e,kind){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  DS.swap(busy(kind==='pdf'?'PDF wird gelesen …':'Bild wird vorbereitet …'),1);
  try{const src=kind==='pdf'?await readPdf(f):await readImg(f);
   if(!src.words.length)throw new Error('Im Dokument wurde kein Text gefunden.');
   st.src=src;analyse();st.row=autoRow();DS.swap(rowView(),1)}
  catch(x){console.warn(x);DS.swap(start(),-1);setTimeout(()=>{const er=DS.view()?.querySelector('[data-err]');if(er)er.innerHTML=IC.warn+'<span>'+esc(x&&x.message||'Das hat leider nicht geklappt.')+'</span>'},60)}}

 /* ---------- PDF ---------- */
 let pdfjs=null;
 async function loadPdf(){if(pdfjs)return pdfjs;const base=new URL('vendor/pdfjs/',location.href).href;pdfjs=await import(base+'pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return pdfjs}
 async function readPdf(file){let lib;try{lib=await loadPdf()}catch(x){throw new Error('Der PDF-Leser konnte nicht geladen werden. Bitte die App einmal neu laden.')}
  const doc=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
  try{let best=null;for(let p=1;p<=Math.min(doc.numPages,4);p++){const page=await doc.getPage(p);const tc=await page.getTextContent();if(!best||tc.items.length>best.tc.items.length)best={page,tc}}
   const base=best.page.getViewport({scale:1}),scale=Math.min(3,Math.max(1.5,2200/Math.max(base.width,base.height)));const vp=best.page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);
   await best.page.render({canvasContext:g,canvas,viewport:vp}).promise;
   const words=[];
   for(const it of best.tc.items){const s=(it.str||'').trim();if(!s)continue;const m=lib.Util.transform(vp.transform,it.transform);const h=Math.hypot(m[2],m[3])||10;const x=m[4],y=m[5]-h;const w=(it.width||s.length*h*.5)*scale;
    const raw=it.str;const parts=[...raw.matchAll(/\S+/g)];for(const p of parts){words.push({t:p[0],x:x+w*p.index/raw.length,y,w:w*p[0].length/raw.length,h})}}
   if(words.length<8){prog('Gescanntes PDF – Texterkennung läuft …');return await ocr(canvas)}
   return {img:canvas.toDataURL('image/jpeg',.82),w:canvas.width,h:canvas.height,words}}
  finally{try{doc.destroy()}catch(x){}}}

 /* ---------- Foto ---------- */
 function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Das Bild konnte nicht geöffnet werden.'))};i.src=u})}
 async function readImg(file){const im=await loadImage(file);const k=Math.min(1,2400/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);return ocr(c)}
 let tessP=null;
 function loadTess(){return tessP||(tessP=new Promise((res,rej)=>{if(window.Tesseract)return res(window.Tesseract);const s=document.createElement('script');s.src=TESS;s.crossOrigin='anonymous';s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Texterkennung nicht verfügbar.'));s.onerror=()=>{tessP=null;s.remove();rej(new Error('Die Texterkennung konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.'))};document.head.append(s)}))}
 async function ocr(canvas){prog('Texterkennung wird geladen …');const T=await loadTess();
  const worker=await T.createWorker('deu',1,{logger:m=>{if(m&&m.status==='recognizing text')prog('Texterkennung läuft … '+Math.round((m.progress||0)*100)+' %');else if(m&&m.status)prog('Texterkennung wird vorbereitet …')}});
  try{try{await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'})}catch(x){}
   const {data:r}=await worker.recognize(canvas);
   const words=(r.words||[]).filter(w=>w.text&&w.text.trim()&&w.confidence>25).map(w=>({t:w.text.trim(),x:w.bbox.x0,y:w.bbox.y0,w:w.bbox.x1-w.bbox.x0,h:w.bbox.y1-w.bbox.y0}));
   return {img:canvas.toDataURL('image/jpeg',.82),w:canvas.width,h:canvas.height,words}}
  finally{try{await worker.terminate()}catch(x){}}}

 /* ---------- Auswertung: Zeilen, Kopfzeile mit Tageszahlen ---------- */
 const isDayNum=t=>/^\d{1,2}\.?$/.test(t);
 function analyse(){const ws=st.src.words.slice().sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2));const lines=[];
  for(const w of ws){const cy=w.y+w.h/2;let L=null;for(let i=lines.length-1;i>=0&&i>=lines.length-4;i--){const l=lines[i];if(Math.abs(l.cy-cy)<Math.min(l.h,w.h)*.6){L=l;break}}
   if(!L){L={cy,h:w.h,words:[]};lines.push(L)}L.words.push(w);L.cy=L.words.reduce((s,o)=>s+o.y+o.h/2,0)/L.words.length;L.h=Math.max(L.h,w.h)}
  for(const l of lines){l.words.sort((a,b)=>a.x-b.x);l.x0=Math.min(...l.words.map(w=>w.x));l.x1=Math.max(...l.words.map(w=>w.x+w.w));l.y0=Math.min(...l.words.map(w=>w.y));l.y1=Math.max(...l.words.map(w=>w.y+w.h));l.text=l.words.map(w=>w.t).join(' ')}
  st.lines=lines.sort((a,b)=>a.cy-b.cy);
  /* Kopfzeile: Zeile mit den meisten aufsteigenden Tageszahlen 1–31 */
  let best=null;
  st.lines.forEach((l,i)=>{const nums=l.words.filter(w=>isDayNum(w.t)).map(w=>({n:parseInt(w.t,10),cx:w.x+w.w/2})).filter(o=>o.n>=1&&o.n<=31);let seq=[],run=[];
   for(const o of nums){if(run.length&&o.n===run[run.length-1].n+1)run.push(o);else{if(run.length>seq.length)seq=run;run=[o]}}if(run.length>seq.length)seq=run;
   if(seq.length>=7&&(!best||seq.length>best.seq.length))best={i,seq}});
  if(best){st.hIdx=best.i;st.header=best.seq;const s=best.seq;st.sp=(s[s.length-1].cx-s[0].cx)/Math.max(1,s[s.length-1].n-s[0].n)}else{st.hIdx=-1;st.header=null;st.sp=0}}
 function autoRow(){const n=(cfg().name||'').toLowerCase();if(!n)return null;const i=st.lines.findIndex((l,j)=>j!==st.hIdx&&l.text.toLowerCase().includes(n));return i>=0?i:null}
 const nameWord=l=>{const w=l.words.find(o=>/^[A-ZÄÖÜ][a-zäöüß]{2,}[,.]?$/.test(o.t)&&!/^(frei|urlaub|krank|früh|spät|nacht|dienst)$/i.test(o.t.replace(/[,.]$/,'')));return w?w.t.replace(/[,.]$/,''):''};
 const clean=t=>{t=t.replace(/[|\[\](){}_;:"'„“”’`]/g,'').replace(/^[.,-]+|[.,]+$/g,'').trim();/* Texterkennung liest „S“ gern als „Ss“ */if(/^([a-zäöü])\1$/i.test(t)&&t[0]!==t[1])t=t[0].toUpperCase();return t};
 function rowTokens(L){const dim=new Date(st.y,st.m+1,0).getDate();const by={};
  if(st.header){const H=st.header;const firstX=H[0].cx-st.sp*.6;
   for(const w of L.words){const cx=w.x+w.w/2;if(cx<firstX)continue;/* Name und Vorspalten überspringen */
    const est=Math.round(H[0].n+(cx-H[0].cx)/st.sp);let day=null,bd=1e9;for(const o of H){const d=Math.abs(o.cx-cx);if(d<bd){bd=d;day=o.n}}
    if(bd>st.sp*.6)day=est;/* Spalte außerhalb der erkannten Kopfzeile: aus dem Abstand schätzen */
    const t=clean(w.t);if(!t||day<1||day>dim)continue;by[day]=by[day]?by[day]+' '+t:t}}
  else{let i=0,started=false;for(const w of L.words){const t=clean(w.t);if(!t)continue;if(!started&&/^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(t)&&!/^(frei|urlaub|krank)$/i.test(t))continue;started=true;i++;if(i<=dim)by[i]=t}}
  return Object.keys(by).map(Number).sort((a,b)=>a-b).map(d=>({day:d,t:by[d]}))}

 /* ---------- 2. Zeile wählen ---------- */
 let zoom=1;
 function rowView(){const s=st.src,sel=st.row;if(!zoom)zoom=s.w>s.h*1.15?2.5:1;
  const lines=st.lines.map((l,i)=>i===st.hIdx?'':'<button type="button" class="ip-ln'+(sel===i?' on':'')+'" data-x="row" data-i="'+i+'" style="left:'+pct(l.x0-4,s.w)+';top:'+pct(l.y0-4,s.h)+';width:'+pct(l.x1-l.x0+8,s.w)+';height:'+pct(l.y1-l.y0+8,s.h)+'" aria-label="Zeile '+(i+1)+': '+esc(l.text.slice(0,60))+'"></button>').join('');
  const node=el('<div>'+DS.head('Dienstplan-Import','Deine Zeile antippen',{back:true})+
   '<p class="ip-p">Tippe auf die Zeile mit deinem Namen. Nur diese Zeile wird ausgelesen.</p>'+
   '<div class="ip-zoom"><button type="button" class="ch2" data-x="zo" aria-label="Verkleinern">−</button><span>'+Math.round(zoom*100)+' %</span><button type="button" class="ch2" data-x="zi" aria-label="Vergrößern">+</button></div>'+
   '<div class="ip-scroll"><div class="ip-img" style="width:'+(zoom*100)+'%;aspect-ratio:'+s.w+' / '+s.h+'"><img alt="Dein Dienstplan" src="'+s.img+'">'+lines+'</div></div>'+
   '<div class="ip-sel" data-sel>'+selText()+'</div>'+
   (st.header?'':'<p class="ip-warn">'+IC.warn+'<span>Keine Zeile mit Tageszahlen (1, 2, 3 …) gefunden. Die Einträge werden der Reihe nach ab dem 1. zugeordnet – bitte in der Vorschau prüfen.</span></p>')+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(sel==null?' disabled':'')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>{discard();DS.swap(start(),-1)},
   zi:()=>{zoom=Math.min(4,zoom+.5);DS.swap(rowView(),0)},zo:()=>{zoom=Math.max(1,zoom-.5);DS.swap(rowView(),0)},
   row:b=>{st.row=Number(b.dataset.i);node.querySelectorAll('.ip-ln').forEach(x=>x.classList.toggle('on',x===b));node.querySelector('[data-sel]').innerHTML=selText();node.querySelector('[data-x="next"]').disabled=false},
   next:()=>{if(st.row==null)return;st.tokens=rowTokens(st.lines[st.row]);if(!st.tokens.length){toast('In dieser Zeile wurden keine Dienste gefunden.');return}DS.swap(mapView(),1)}});
  if(sel!=null)setTimeout(()=>{const sc=node.querySelector('.ip-scroll'),on=node.querySelector('.ip-ln.on');if(sc&&on){sc.scrollTop=Math.max(0,on.offsetTop-sc.clientHeight/2);sc.scrollLeft=Math.max(0,on.offsetLeft-8)}},80);
  return node}
 function selText(){if(st.row==null)return '<small>Noch keine Zeile gewählt</small>';const l=st.lines[st.row];return '<small>Ausgewählt</small><b>'+esc(l.text.length>90?l.text.slice(0,90)+' …':l.text)+'</b>'}

 /* ---------- 3. Kürzel zuordnen ---------- */
 const codes=()=>typeof orderedPlannerCodes==='function'?orderedPlannerCodes():['F','S','N','X','U','T','A'];
 function guess(t){const g=guess0(t);return g===''||codes().includes(g)?g:''}
 function guess0(t){const k=t.toUpperCase();const m=cfg().map;if(Object.prototype.hasOwnProperty.call(m,k))return m[k];
  for(const c of codes()){if(k===shiftTitle(c).toUpperCase())return c}
  if(/^(X|FREI|FR|-|–|—|\/|\.|0|AZ|ZA|WF|RT)$/.test(k))return '';
  if(/^(FB|FORTB|FORTBILDUNG|SCHUL|SEM)/.test(k))return 'T';
  if(/^(U|UR|URL|URLAUB)$/.test(k))return 'U';
  if(/^(K|KR|KRANK|AU)$/.test(k))return 'K';
  if(/^(N|ND|NA|NACHT)/.test(k))return 'N';
  if(/^(S|SD|SP|SPÄT|SPAET)/.test(k))return 'S';
  if(/^(F|FD|FRÜH|FRUEH|E|ED)/.test(k))return 'F';
  return ''}
 function mapView(){const uniq={};st.tokens.forEach(o=>{const k=o.t.toUpperCase();(uniq[k]=uniq[k]||{t:o.t,n:0}).n++});
  st.map=st.map||{};Object.keys(uniq).forEach(k=>{if(!(k in st.map))st.map[k]=guess(uniq[k].t)});
  const opts=c=>'<option value=""'+(c===''?' selected':'')+'>— frei / ignorieren —</option>'+codes().map(x=>'<option value="'+esc(x)+'"'+(x===c?' selected':'')+'>'+esc(shiftTitle(x))+'</option>').join('');
  const node=el('<div>'+DS.head('Dienstplan-Import','Kürzel zuordnen',{back:true})+
   '<p class="ip-p">Welcher Dienst steckt hinter welchem Kürzel? Schivio merkt sich die Zuordnung für den nächsten Import.</p>'+
   '<div class="ls ip-map">'+Object.keys(uniq).sort().map(k=>'<label class="r"><span class="ip-k">'+esc(uniq[k].t)+'</span><small>'+uniq[k].n+'×</small><select data-k="'+esc(k)+'" aria-label="Dienst für '+esc(uniq[k].t)+'">'+opts(st.map[k])+'</select></label>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next">Vorschau</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(s=>s.addEventListener('change',()=>{st.map[s.dataset.k]=s.value}));
  DS.wire(node,{back:()=>DS.swap(rowView(),-1),next:()=>DS.swap(preview(),1)});
  return node}

 /* ---------- 4. Vorschau & übernehmen ---------- */
 function plan(){return st.tokens.map(o=>{const k=st.y+'-'+pad2(st.m+1)+'-'+pad2(o.day);return {k,day:o.day,t:o.t,c:st.map[o.t.toUpperCase()]||'',old:data.shifts[k]||''}})}
 function preview(){const rows=plan(),use=rows.filter(r=>r.c);const changed=use.filter(r=>r.old&&r.old!==r.c).length;
  const node=el('<div>'+DS.head(MON[st.m]+' '+st.y,'Vorschau',{back:true})+
   '<p class="ip-p">'+use.length+(use.length===1?' Dienst wird':' Dienste werden')+' eingetragen'+(changed?', davon '+changed+' ersetzt':'')+'. Tage ohne Zuordnung bleiben unverändert.</p>'+
   '<div class="ls ip-pv">'+rows.map(r=>{const d=new Date(r.k+'T12:00:00');return '<div class="r'+(r.c?'':' off')+'"><span class="dd"><b>'+pad2(r.day)+'.</b><small>'+WD[d.getDay()]+'</small></span><span class="ip-k">'+esc(r.t)+'</span><span class="to">'+(r.c?'<span class="nm"><i style="--c:'+esc(shiftColor(r.c))+'"></i>'+esc(shiftTitle(r.c))+'</span>'+(r.old&&r.old!==r.c?'<small>ersetzt '+esc(shiftTitle(r.old))+'</small>':''):'<small>wird ignoriert</small>')+'</span></div>'}).join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="apply"'+(use.length?'':' disabled')+'>'+use.length+' Dienste übernehmen</button></div></div>');
  DS.wire(node,{back:()=>DS.swap(mapView(),-1),apply:()=>{const c=cfg();Object.assign(c.map,st.map);const nm=nameWord(st.lines[st.row]);if(nm)c.name=nm;
   use.forEach(r=>{data.shifts[r.k]=r.c});try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}
   const n=use.length;discard();st=null;DS.close();toast(n+' Dienste eingetragen');try{window.SchivioMore?.render?.()}catch(e){}}});
  return node}

 function open(){fresh();zoom=0;DS.node(start);DS.onClose?.(()=>{discard();st=null})}
 window.SchivioImport={open,_test:{analyse:()=>analyse(),state:()=>st,tokens:i=>rowTokens(st.lines[i])}};
})();
