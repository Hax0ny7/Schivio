/* v1.0.71: Dienstplan-Import – Foto oder PDF, komplett auf dem Handy.
   Datenschutz:
   - Foto/PDF wird nur hier im Arbeitsspeicher ausgewertet und beim Schließen sofort verworfen (nicht gespeichert, nicht im Backup).
   - Es wird nur die eigene Zeile ausgelesen. Daten von Kollegen werden nie gespeichert.
   - Gespeichert werden nur: die übernommenen Dienste, die Kürzel-Zuordnung (z. B. „F = Früh“) und das Namens-Stichwort zum Wiederfinden der eigenen Zeile.
   PDF mit Text: pdf.js liegt in der App (vendor/pdfjs), die Zeilen kommen direkt aus dem PDF.
   Foto (und gescannte PDFs): Texterkennung (tesseract.js) wird beim ersten Mal geladen, das Foto verlässt das Handy nicht.
   Ablauf Foto: 1) grobe Erkennung → Schräglage ausgleichen  2) Nutzer tippt Tageszahlen-Zeile und eigene Zeile an
                3) nur diese beiden Streifen werden vergrößert, entfärbt, von Gitterlinien befreit und genau gelesen. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const pct=(v,t)=>(Math.max(0,v)/t*100).toFixed(3)+'%';
 const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
 const IC={
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'
 };
 const TESS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
 const CODE_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789/-';
 const CELL_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789/';

 const cfg=()=>{if(!data.importCfg||typeof data.importCfg!=='object')data.importCfg={};const c=data.importCfg;if(!c.map||typeof c.map!=='object')c.map={};c.name=c.name||'';return c};
 let st=null;
 function fresh(){const n=new Date();let y=n.getFullYear(),m=n.getMonth();if(n.getDate()>15){m++;if(m>11){m=0;y++}}st={y,m}}
 function discard(){if(st){st.src=null;st.lines=null;st.tokens=null}endWorker()}

 /* ---------- 1. Start ---------- */
 function start(){
  const node=el('<div>'+DS.head('Tools','Dienstplan-Import')+
   '<div class="ip-note">'+IC.lock+'<span><b>Alles bleibt auf deinem Handy.</b> Foto oder PDF werden nur hier ausgewertet und danach sofort verworfen. Schivio liest nur deine Zeile – Daten von Kollegen werden nicht gespeichert. Bitte prüfe, ob dein Arbeitgeber das Fotografieren des Dienstplans erlaubt.</span></div>'+
   '<div class="ip-mon"><button type="button" class="ib" data-x="mp" aria-label="Vorheriger Monat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button><b>'+MON[st.m]+' '+st.y+'</b><button type="button" class="ib" data-x="mn" aria-label="Nächster Monat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button></div>'+
   '<p class="ip-p">Für welchen Monat ist der Dienstplan?</p>'+
   '<div class="ip-pick">'+
    '<label class="ip-src"><span class="ii">'+IC.pdf+'</span><span class="tt"><b>PDF wählen</b><small>z. B. aus dem Mitarbeiterportal – am zuverlässigsten</small></span><input type="file" accept="application/pdf,.pdf" hidden data-f="pdf"></label>'+
    '<label class="ip-src"><span class="ii">'+IC.cam+'</span><span class="tt"><b>Foto wählen</b><small>Möglichst gerade von vorne, gut beleuchtet, ohne Schatten</small></span><input type="file" accept="image/*" hidden data-f="img"></label>'+
   '</div>'+
   '<p class="ip-hint">Tipp für Fotos: Es reicht, wenn die Zeile mit den Tageszahlen und deine Zeile gut lesbar im Bild sind – lieber näher ran als den ganzen Plan. Beim ersten Foto wird die Texterkennung geladen (ca. 5 MB). Dein Foto wird dabei nicht verschickt.</p>'+
   '<div class="ip-err" data-err role="alert"></div></div>');
  DS.wire(node,{mp:()=>{st.m--;if(st.m<0){st.m=11;st.y--}DS.swap(start(),-1)},mn:()=>{st.m++;if(st.m>11){st.m=0;st.y++}DS.swap(start(),1)}});
  node.querySelector('[data-f="pdf"]').addEventListener('change',e=>run(e,'pdf'));
  node.querySelector('[data-f="img"]').addEventListener('change',e=>run(e,'img'));
  return node}

 function busy(t){return el('<div>'+DS.head('Dienstplan-Import','Einen Moment …')+'<div class="ip-busy"><i></i><span data-prog>'+esc(t)+'</span></div></div>')}
 const prog=t=>{const p=DS.view()?.querySelector('[data-prog]');if(p)p.textContent=t};
 function fail(x,back){console.warn(x);DS.swap(back(),-1);setTimeout(()=>{const er=DS.view()?.querySelector('[data-err]');if(er)er.innerHTML=IC.warn+'<span>'+esc(x&&x.message||'Das hat leider nicht geklappt.')+'</span>'},60)}

 async function run(e,kind){const f=e.target.files?.[0];e.target.value='';if(!f)return;
  DS.swap(busy(kind==='pdf'?'PDF wird gelesen …':'Bild wird vorbereitet …'),1);
  try{const src=kind==='pdf'?await readPdf(f):await readImg(f);
   if(!src.words.length&&src.kind==='pdf')throw new Error('Im Dokument wurde kein Text gefunden.');
   st.src=src;analyse();
   if(src.kind==='pdf'){st.row=autoRow();DS.swap(rowView(),1)}
   else{photoAuto();DS.swap(photoView(),1)}}
  catch(x){fail(x,start)}}

 /* ---------- PDF ---------- */
 let pdfjs=null;
 async function loadPdf(){if(pdfjs)return pdfjs;const base=new URL('vendor/pdfjs/',location.href).href;pdfjs=await import(base+'pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return pdfjs}
 async function readPdf(file){let lib;try{lib=await loadPdf()}catch(x){throw new Error('Der PDF-Leser konnte nicht geladen werden. Bitte die App einmal neu laden.')}
  const doc=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
  try{let best=null;for(let p=1;p<=Math.min(doc.numPages,4);p++){const page=await doc.getPage(p);const tc=await page.getTextContent();if(!best||tc.items.length>best.tc.items.length)best={page,tc}}
   const base=best.page.getViewport({scale:1}),scale=Math.min(4,Math.max(1.5,3000/Math.max(base.width,base.height)));const vp=best.page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);
   await best.page.render({canvasContext:g,canvas,viewport:vp}).promise;
   const words=[];
   for(const it of best.tc.items){const s=(it.str||'').trim();if(!s)continue;const m=lib.Util.transform(vp.transform,it.transform);const h=Math.hypot(m[2],m[3])||10;const x=m[4],y=m[5]-h;const w=(it.width||s.length*h*.5)*scale;
    const raw=it.str;const parts=[...raw.matchAll(/\S+/g)];for(const p of parts){words.push({t:p[0],x:x+w*p.index/raw.length,y,w:w*p[0].length/raw.length,h})}}
   if(words.length<8){prog('Gescanntes PDF – Texterkennung läuft …');return await photoPrep(canvas)}
   return {kind:'pdf',img:canvas.toDataURL('image/jpeg',.82),w:canvas.width,h:canvas.height,words}}
  finally{try{doc.destroy()}catch(x){}}}

 /* ---------- Foto: Laden ---------- */
 function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Das Bild konnte nicht geöffnet werden.'))};i.src=u})}
 async function readImg(file){const im=await loadImage(file);const k=Math.min(1,3600/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);return photoPrep(c)}

 /* ---------- Texterkennung ---------- */
 let tessP=null,worker=null,workerP=null;
 function loadTess(){return tessP||(tessP=new Promise((res,rej)=>{if(window.Tesseract)return res(window.Tesseract);const s=document.createElement('script');s.src=TESS;s.crossOrigin='anonymous';s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Texterkennung nicht verfügbar.'));s.onerror=()=>{tessP=null;s.remove();rej(new Error('Die Texterkennung konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.'))};document.head.append(s)}))}
 async function getWorker(){if(worker)return worker;if(workerP)return workerP;
  workerP=(async()=>{prog('Texterkennung wird geladen …');const T=await loadTess();
   const w=await T.createWorker('deu',1,{logger:m=>{if(m&&m.status==='recognizing text')prog((st&&st.progLabel||'Texterkennung läuft')+' … '+Math.round((m.progress||0)*100)+' %')}});worker=w;return w})();
  try{return await workerP}finally{workerP=null}}
 function endWorker(){const w=worker;worker=null;if(w)try{w.terminate()}catch(x){}}
 async function ocr(canvas,params){const w=await getWorker();try{const P=Object.assign({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1',tessedit_char_whitelist:''},params||{});delete P.minConf;await w.setParameters(P)}catch(x){}
  const {data:r}=await w.recognize(canvas);
  const mc=params&&params.minConf!=null?params.minConf:20;return (r.words||[]).filter(o=>o.text&&o.text.trim()&&o.confidence>mc).map(o=>({t:o.text.trim(),x:o.bbox.x0,y:o.bbox.y0,w:o.bbox.x1-o.bbox.x0,h:o.bbox.y1-o.bbox.y0,c:o.confidence}))}

 /* Bildaufbereitung: farbige Zellen entfärben (hellster Farbkanal), Kontrast strecken, Gitterlinien entfernen */
 function prep(src,sx,sy,sw,sh,scale,lines){sx=Math.max(0,Math.round(sx));sy=Math.max(0,Math.round(sy));sw=Math.min(src.width-sx,Math.round(sw));sh=Math.min(src.height-sy,Math.round(sh));
  const W=Math.max(1,Math.round(sw*scale)),H=Math.max(1,Math.round(sh*scale));const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
  g.imageSmoothingQuality='high';g.drawImage(src,sx,sy,sw,sh,0,0,W,H);const id=g.getImageData(0,0,W,H),d=id.data,n=W*H;const v=new Uint8ClampedArray(n);const hist=new Uint32Array(256);
  for(let i=0,j=0;i<n;i++,j+=4){const m=Math.max(d[j],d[j+1],d[j+2]);v[i]=m;hist[m]++}
  let lo=0,hi=255,acc=0;for(let i=0;i<256;i++){acc+=hist[i];if(acc>n*.02){lo=i;break}}acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>n*.35){hi=i;break}}if(hi-lo<30){lo=Math.max(0,hi-60)}
  const k=255/Math.max(1,hi-lo);for(let i=0;i<n;i++)v[i]=Math.max(0,Math.min(255,(v[i]-lo)*k));
  if(lines){const thr=110;/* senkrechte Linien */const col=new Uint32Array(W);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(v[y*W+x]<thr)col[x]++;
   for(let x=0;x<W;x++)if(col[x]>H*.62)for(let y=0;y<H;y++)v[y*W+x]=255;
   const row=new Uint32Array(H);for(let y=0;y<H;y++){let s=0;for(let x=0;x<W;x++)if(v[y*W+x]<thr)s++;row[y]=s}
   for(let y=0;y<H;y++)if(row[y]>W*.45)for(let x=0;x<W;x++)v[y*W+x]=255}
  for(let i=0,j=0;i<n;i++,j+=4){d[j]=d[j+1]=d[j+2]=v[i];d[j+3]=255}g.putImageData(id,0,0);return c}

 /* Schräglage aus den Wortpositionen schätzen (Projektionsprofil) */
 function skewOf(words){if(words.length<6)return 0;const hs=median(words.map(w=>w.h))||12;const bin=Math.max(2,hs*.45);let best=0,bs=-1;
  for(let a=-7;a<=7.001;a+=.25){const t=Math.tan(a*Math.PI/180);const m=new Map();for(const w of words){const cx=w.x+w.w/2,cy=w.y+w.h/2;const k=Math.round((cy-t*cx)/bin);m.set(k,(m.get(k)||0)+1)}let s=0;for(const v of m.values())s+=v*v;if(s>bs){bs=s;best=a}}
  return best}
 function rotate(src,deg){if(Math.abs(deg)<.15)return src;const r=deg*Math.PI/180;const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.translate(c.width/2,c.height/2);g.rotate(r);g.drawImage(src,-src.width/2,-src.height/2);return c}
 function rotWords(words,deg,W,H){if(Math.abs(deg)<.15)return words;const r=deg*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),cx=W/2,cy=H/2;
  return words.map(w=>{const x=w.x+w.w/2-cx,y=w.y+w.h/2-cy;const nx=x*cs-y*sn+cx,ny=x*sn+y*cs+cy;return {...w,x:nx-w.w/2,y:ny-w.h/2}})}

 async function photoPrep(full){
  /* 1. Grobe Erkennung auf verkleinertem, entfärbtem Bild */
  const k=Math.min(1,2000/Math.max(full.width,full.height));st.progLabel='Plan wird erkannt';
  const small=prep(full,0,0,full.width,full.height,k,false);
  let words=(await ocr(small,{tessedit_pageseg_mode:'11'})).map(w=>({...w,x:w.x/k,y:w.y/k,w:w.w/k,h:w.h/k}));
  /* 2. Schräglage ausgleichen */
  const ang=skewOf(words);const canvas=rotate(full,-ang);words=rotWords(words,-ang,full.width,full.height);
  const dk=Math.min(1,2000/Math.max(canvas.width,canvas.height));const disp=document.createElement('canvas');disp.width=Math.round(canvas.width*dk);disp.height=Math.round(canvas.height*dk);disp.getContext('2d').drawImage(canvas,0,0,disp.width,disp.height);
  return {kind:'img',canvas,angle:ang,img:disp.toDataURL('image/jpeg',.8),w:canvas.width,h:canvas.height,words}}

 /* ---------- Auswertung: Zeilen, Kopfzeile mit Tageszahlen ---------- */
 const isDayNum=t=>/^\d{1,2}\.?$/.test(t);
 function groupLines(ws0){const ws=ws0.slice().sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2));const lines=[];
  for(const w of ws){const cy=w.y+w.h/2;let L=null;for(let i=lines.length-1;i>=0&&i>=lines.length-4;i--){const l=lines[i];if(Math.abs(l.cy-cy)<Math.min(l.h,w.h)*.6){L=l;break}}
   if(!L){L={cy,h:w.h,words:[]};lines.push(L)}L.words.push(w);L.cy=L.words.reduce((s,o)=>s+o.y+o.h/2,0)/L.words.length;L.h=Math.max(L.h,w.h)}
  for(const l of lines){l.words.sort((a,b)=>a.x-b.x);l.x0=Math.min(...l.words.map(w=>w.x));l.x1=Math.max(...l.words.map(w=>w.x+w.w));l.y0=Math.min(...l.words.map(w=>w.y));l.y1=Math.max(...l.words.map(w=>w.y+w.h));l.text=l.words.map(w=>w.t).join(' ')}
  return lines.sort((a,b)=>a.cy-b.cy)}
 function headerOf(words){const nums=words.filter(w=>isDayNum(w.t)).map(w=>({n:parseInt(w.t,10),cx:w.x+w.w/2})).filter(o=>o.n>=1&&o.n<=31).sort((a,b)=>a.cx-b.cx);let seq=[],run=[];
  for(const o of nums){if(run.length&&o.n>run[run.length-1].n&&o.n<=run[run.length-1].n+3)run.push(o);else{if(run.length>seq.length)seq=run;run=[o]}}if(run.length>seq.length)seq=run;return seq}
 function setHeader(seq){if(seq&&seq.length>=5){st.header=seq;st.sp=(seq[seq.length-1].cx-seq[0].cx)/Math.max(1,seq[seq.length-1].n-seq[0].n)}else{st.header=null;st.sp=0}}
 function analyse(){st.lines=groupLines(st.src.words);let best=null;
  st.lines.forEach((l,i)=>{const seq=headerOf(l.words);if(seq.length>=7&&(!best||seq.length>best.seq.length))best={i,seq}});
  st.hIdx=best?best.i:-1;setHeader(best&&best.seq);
  const hs=st.src.words.map(w=>w.h);st.wh=median(hs)||14;const cys=st.lines.map(l=>l.cy);const d=[];for(let i=1;i<cys.length;i++){const x=cys[i]-cys[i-1];if(x>st.wh*.8)d.push(x)}st.pitch=Math.max(st.wh*1.4,Math.min(st.wh*4,median(d)||st.wh*2))}
 function autoRow(){const n=(cfg().name||'').toLowerCase();if(!n)return null;const i=st.lines.findIndex((l,j)=>j!==st.hIdx&&l.text.toLowerCase().includes(n));return i>=0?i:null}
 const nameWord=l=>{if(!l)return '';const w=l.words.find(o=>/^[A-ZÄÖÜ][a-zäöüß]{2,}[,.]?$/.test(o.t)&&!/^(frei|urlaub|krank|früh|spät|nacht|dienst|mehrarbeit|name)$/i.test(o.t.replace(/[,.]$/,'')));return w?w.t.replace(/[,.]$/,''):''};
 const clean=t=>{t=t.replace(/[|\[\](){}_;:"'„“”’`]/g,'').replace(/^[.,-]+|[.,]+$/g,'').trim();/* Texterkennung liest „S“ gern als „Ss“ */if(/^([a-zäöü])\1$/i.test(t)&&t[0]!==t[1])t=t[0].toUpperCase();return t};
 function rowTokens(L){const dim=new Date(st.y,st.m+1,0).getDate();const by={};
  if(st.header){const H=st.header,sp=st.sp;const firstX=H[0].cx-(H[0].n-1)*sp-sp*.6;
   const put=(t,cx)=>{const est=Math.round(H[0].n+(cx-H[0].cx)/sp);let day=null,bd=1e9;for(const o of H){const d=Math.abs(o.cx-cx);if(d<bd){bd=d;day=o.n}}if(bd>sp*.6)day=est;t=clean(t);if(!t||day<1||day>dim)return;by[day]=by[day]?by[day]+' '+t:t};
   for(const w of L.words){const cx=w.x+w.w/2;if(cx<firstX)continue;/* Name und Vorspalten überspringen */
    const span=Math.round(w.w/sp);const t=clean(w.t);
    /* Ein „Wort“ über mehrere Spalten (z. B. „FF“) auf die Spalten aufteilen */
    if(span>=2&&t.length>=span&&t.length%span===0&&!/\d/.test(t)){const L2=t.length/span;for(let i=0;i<span;i++)put(t.slice(i*L2,(i+1)*L2),w.x+sp*(i+.5))}
    else put(w.t,cx)}}
  else{let i=0,started=false;for(const w of L.words){const t=clean(w.t);if(!t)continue;if(!started&&/^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(t)&&!/^(frei|urlaub|krank)$/i.test(t))continue;started=true;i++;if(i<=dim)by[i]=t}}
  return Object.keys(by).map(Number).sort((a,b)=>a-b).map(d=>({day:d,t:by[d]}))}

 /* ---------- 2a. PDF: Zeile wählen ---------- */
 let zoom=0;
 const zoomFor=s=>s.w>s.h*1.15?2.5:1.5;
 function imgBox(inner){const s=st.src;if(!zoom)zoom=zoomFor(s);
  return '<div class="ip-zoom"><button type="button" class="ch2" data-x="zo" aria-label="Verkleinern">−</button><span>'+Math.round(zoom*100)+' %</span><button type="button" class="ch2" data-x="zi" aria-label="Vergrößern">+</button></div>'+
   '<div class="ip-scroll"><div class="ip-img" style="width:'+(zoom*100)+'%;aspect-ratio:'+s.w+' / '+s.h+'"><img alt="Dein Dienstplan" src="'+s.img+'">'+inner+'</div></div>'}
 function keepScroll(node,y){setTimeout(()=>{const sc=node.querySelector('.ip-scroll'),im=node.querySelector('.ip-img');if(!sc||!im||y==null)return;sc.scrollTop=Math.max(0,y/st.src.h*im.offsetHeight-sc.clientHeight/2);sc.scrollLeft=0},80)}
 function rowView(){const s=st.src,sel=st.row;
  const lines=st.lines.map((l,i)=>i===st.hIdx?'':'<button type="button" class="ip-ln'+(sel===i?' on':'')+'" data-x="row" data-i="'+i+'" style="left:'+pct(l.x0-4,s.w)+';top:'+pct(l.y0-4,s.h)+';width:'+pct(l.x1-l.x0+8,s.w)+';height:'+pct(l.y1-l.y0+8,s.h)+'" aria-label="Zeile '+(i+1)+': '+esc(l.text.slice(0,60))+'"></button>').join('');
  const node=el('<div>'+DS.head('Dienstplan-Import','Deine Zeile antippen',{back:true})+
   '<p class="ip-p">Tippe auf die Zeile mit deinem Namen. Nur diese Zeile wird ausgelesen.</p>'+imgBox(lines)+
   '<div class="ip-sel" data-sel>'+selText()+'</div>'+
   (st.header?'':'<p class="ip-warn">'+IC.warn+'<span>Keine Zeile mit Tageszahlen (1, 2, 3 …) gefunden. Die Einträge werden der Reihe nach ab dem 1. zugeordnet – bitte in der Vorschau prüfen.</span></p>')+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(sel==null?' disabled':'')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>{discard();zoom=0;DS.swap(start(),-1)},
   zi:()=>{zoom=Math.min(5,zoom+.5);DS.swap(rowView(),0)},zo:()=>{zoom=Math.max(1,zoom-.5);DS.swap(rowView(),0)},
   row:b=>{st.row=Number(b.dataset.i);node.querySelectorAll('.ip-ln').forEach(x=>x.classList.toggle('on',x===b));node.querySelector('[data-sel]').innerHTML=selText();node.querySelector('[data-x="next"]').disabled=false},
   next:()=>{if(st.row==null)return;st.tokens=rowTokens(st.lines[st.row]);st.nameLine=st.lines[st.row];if(!st.tokens.length){toast('In dieser Zeile wurden keine Dienste gefunden.');return}DS.swap(mapView(),1)}});
  if(sel!=null)keepScroll(node,st.lines[sel].cy);
  return node}
 function selText(){if(st.row==null)return '<small>Noch keine Zeile gewählt</small>';const l=st.lines[st.row];return '<small>Ausgewählt</small><b>'+esc(l.text.length>90?l.text.slice(0,90)+' …':l.text)+'</b>'}

 /* ---------- 2b. Foto: Tageszahlen-Zeile und eigene Zeile antippen ---------- */
 function photoAuto(){st.step='h';st.hY=st.hIdx>=0?st.lines[st.hIdx].cy:null;const r=autoRow();st.rY=r!=null?st.lines[r].cy:null;if(st.hY!=null)st.step='r'}
 function bandStyle(y){const s=st.src,h=st.pitch*1.1;return 'top:'+pct(y-h/2,s.h)+';height:'+pct(h,s.h)}
 function photoView(){const s=st.src;
  const bands=(st.hY!=null?'<i class="ip-band h" style="'+bandStyle(st.hY)+'"><b>Tageszahlen</b></i>':'')+(st.rY!=null?'<i class="ip-band r" style="'+bandStyle(st.rY)+'"><b>Deine Zeile</b></i>':'');
  const ready=st.hY!=null&&st.rY!=null;
  const node=el('<div>'+DS.head('Dienstplan-Import','Zeilen antippen',{back:true})+
   '<div class="ip-steps" role="group" aria-label="Schritt"><button type="button" data-x="sh" class="'+(st.step==='h'?'on':'')+(st.hY!=null?' ok':'')+'" aria-pressed="'+(st.step==='h')+'"><i>1</i>Tageszahlen</button><button type="button" data-x="sr" class="'+(st.step==='r'?'on':'')+(st.rY!=null?' ok':'')+'" aria-pressed="'+(st.step==='r')+'"><i>2</i>Deine Zeile</button></div>'+
   '<p class="ip-p" data-hint>'+(st.step==='h'?'Tippe auf die Zeile mit den Tageszahlen (1, 2, 3 …).':'Tippe jetzt auf deine Zeile – irgendwo auf Höhe deines Namens oder deiner Dienste.')+'</p>'+
   imgBox(bands)+
   '<div class="ip-err" data-err role="alert"></div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="read"'+(ready?'':' disabled')+'>Zeile auslesen</button></div></div>');
  const im=node.querySelector('.ip-img');
  im.addEventListener('click',e=>{const r=im.getBoundingClientRect();const y=(e.clientY-r.top)/r.height*s.h;try{navigator.vibrate&&navigator.vibrate(7)}catch(_){}
   if(st.step==='h'){st.hY=snap(y);st.step='r'}else st.rY=snap(y);const sc=node.querySelector('.ip-scroll');const keep=sc?[sc.scrollTop,sc.scrollLeft]:null;const n2=photoView();DS.swap(n2,0);
   if(keep)requestAnimationFrame(()=>{const s2=n2.querySelector('.ip-scroll');if(s2){s2.scrollTop=keep[0];s2.scrollLeft=keep[1]}})});
  DS.wire(node,{back:()=>{discard();zoom=0;DS.swap(start(),-1)},
   zi:()=>{zoom=Math.min(5,zoom+.5);DS.swap(photoView(),0)},zo:()=>{zoom=Math.max(1,zoom-.5);DS.swap(photoView(),0)},
   sh:()=>{st.step='h';DS.swap(photoView(),0)},sr:()=>{st.step='r';DS.swap(photoView(),0)},
   read:()=>{if(st.hY!=null&&st.rY!=null)refine()}});
  return node}
 /* Tipp auf die Mitte der nächstgelegenen erkannten Zeile ziehen */
 function snap(y){let best=y,bd=st.pitch*.5;for(const l of st.lines){const d=Math.abs(l.cy-y);if(d<bd){bd=d;best=l.cy}}return best}

 /* ---------- Gitter erkennen und Zellen einzeln lesen ---------- */
 function gray(src,x,y,w,h){x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
  const g=src.getContext('2d',{willReadFrequently:true});const d=g.getImageData(x,y,w,h).data;const v=new Uint8Array(w*h);for(let i=0,j=0;i<v.length;i++,j+=4)v[i]=Math.max(d[j],d[j+1],d[j+2]);return {x,y,W:w,H:h,v}}
 function medOf(v){const h=new Uint32Array(256);for(const a of v)h[a]++;let acc=0;for(let i=0;i<256;i++){acc+=h[i];if(acc>v.length/2)return i}return 200}
 /* Linien finden: Profil der Dunkelheit gegenüber dem Papier, minus gleitender Durchschnitt → schmale, durchgehende Spitzen */
 function linePeaks(prof){const n=prof.length,win=20,base=new Float32Array(n);
  const pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+prof[i];
  for(let i=0;i<n;i++){const a=Math.max(0,i-win),b=Math.min(n,i+win+1);base[i]=(pre[b]-pre[a])/(b-a)}
  const r=new Float32Array(n);for(let i=0;i<n;i++)r[i]=prof[i]-base[i];
  const sorted=Array.from(r).sort((a,b)=>a-b);const thr=Math.max(6,.3*sorted[Math.floor(n*.995)]);
  const out=[];let i=0;while(i<n){if(r[i]>thr){let j=i;while(j+1<n&&(r[j+1]>thr||(j+2<n&&r[j+2]>thr&&j+2-i<6)))j++;out.push((i+j)/2);i=j+1}else i++}return out}
 function fracPeaks(prof){const n=prof.length,win=20,pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+prof[i];
  const r=new Float32Array(n);for(let i=0;i<n;i++){const a=Math.max(0,i-win),b=Math.min(n,i+win+1);r[i]=prof[i]-(pre[b]-pre[a])/(b-a)}
  const out=[];let i=0;while(i<n){if(r[i]>.3){let j=i;while(j+1<n&&(r[j+1]>.3||(j+2<n&&r[j+2]>.3&&j+2-i<8)))j++;out.push((i+j)/2);i=j+1}else i++}return out}
 /* Senkrechte Linien → längste Folge ähnlich breiter Spalten = Tagesspalten */
 function dayColumns(y0,y1){const s=st.src;const G=gray(s.canvas,0,y0,s.w,y1-y0);const med=medOf(G.v);
  /* zwei Linien-Detektoren: (a) mittlere Dunkelheit, (b) Anteil dunkler Zeilen (Linien laufen durch, Schrift nicht) */
  const pa=new Float32Array(G.W),pb=new Float32Array(G.W);const thr=med-40;
  for(let y=0;y<G.H;y++){const o=y*G.W;let last=-9;for(let x=0;x<G.W;x++){const v=G.v[o+x],d=med-v;if(d>0)pa[x]+=d;if(v<thr){const a=Math.max(last+1,x-2),b=Math.min(G.W-1,x+2);for(let i=a;i<=b;i++)pb[i]++;last=b}}}
  for(let x=0;x<G.W;x++){pa[x]/=G.H;pb[x]/=G.H}
  const A=runOf(linePeaks(pa)),B=runOf(fracPeaks(pb));return colFit(A)>=colFit(B)?A:B}
 function colFit(c){const dim=new Date(st.y,st.m+1,0).getDate();return c?(c.length>=dim-2&&c.length<=dim+2?1000-Math.abs(c.length-dim):c.length):-1}
 function runOf(xs){if(xs.length<8)return null;const minG=Math.max(8,st.pitch*.5);let best=null;
  for(let i=0;i<xs.length-1;i++){const g0=xs[i+1]-xs[i];if(g0<minG)continue;let j=i+1;const gaps=[g0];const cols=[[xs[i],xs[i+1]]];
   while(j+1<xs.length){const g=xs[j+1]-xs[j];const m=median(gaps);
    if(g<m*.6&&j+2<xs.length&&Math.abs(xs[j+2]-xs[j]-m)<=m*.25){cols.push([xs[j],xs[j+2]]);gaps.push(xs[j+2]-xs[j]);j+=2;continue}
    const q=Math.round(g/m);if(q<1||q>2)break;
    if(Math.abs(g-q*m)<=m*.22*q){for(let r=0;r<q;r++)cols.push([xs[j]+g*r/q,xs[j]+g*(r+1)/q]);for(let r=0;r<q;r++)gaps.push(g/q);j++}else break}
   if(!best||colFit(cols)>colFit(best))best=cols}
  return best&&best.length>=8?best:null}
 /* Waagerechte Linien um eine Zeile → Ober- und Unterkante der Zellen */
 function rowBounds(cy,x0,x1){const s=st.src,p=st.pitch;const y0=Math.max(0,cy-p*1.6),G=gray(s.canvas,x0,y0,x1-x0,p*3.2);const med=medOf(G.v);const prof=new Float32Array(G.H);
  for(let y=0;y<G.H;y++){const o=y*G.W;let c=0;for(let x=0;x<G.W;x++){const d=med-G.v[o+x];if(d>0)c+=d}prof[y]=c/G.W}
  const ys=linePeaks(prof).map(y=>y+G.y);const above=ys.filter(y=>y<cy-p*.15),below=ys.filter(y=>y>cy+p*.15);
  let top=above.length?Math.max(...above):cy-p*.55,bot=below.length?Math.min(...below):cy+p*.55;
  if(bot-top>p*1.6||bot-top<p*.4){top=cy-p*.55;bot=cy+p*.55}return [top,bot]}
 /* Eine Zelle ausschneiden, Ränder weglassen, Farbe/Polarität ausgleichen, vergrößern */
 function cellCanvas(x0,x1,y0,y1){const s=st.src;const w=x1-x0,h=y1-y0;const ix=w*.08,iy=h*.1;
  const X=Math.max(0,Math.round(x0+ix)),Y=Math.max(0,Math.round(y0+iy)),CW=Math.max(1,Math.round(w-2*ix)),CH=Math.max(1,Math.round(h-2*iy));
  const d=s.canvas.getContext('2d',{willReadFrequently:true}).getImageData(X,Y,CW,CH).data;const n=CW*CH;
  /* Kanal mit dem stärksten Kontrast wählen: hellster Kanal (schwarze Schrift auf Farbe) oder dunkelster Kanal (weiße Schrift auf Farbe) */
  const vMax=new Uint8Array(n),vMin=new Uint8Array(n);for(let i=0,j=0;i<n;i++,j+=4){vMax[i]=Math.max(d[j],d[j+1],d[j+2]);vMin[i]=Math.min(d[j],d[j+1],d[j+2])}
  const stats=v=>{const h=new Uint32Array(256);for(const a of v)h[a]++;let acc=0,p5=-1,p50=-1,p95=255;for(let i=0;i<256;i++){acc+=h[i];if(p5<0&&acc>n*.01)p5=i;if(p50<0&&acc>n*.5)p50=i;if(acc>n*.99){p95=i;break}}p5=Math.max(0,p5);p50=Math.max(0,p50);return {p5,p50,p95,sp:p95-p5}};/* 1 %-Ränder: auch kleine Ziffern zählen */
  const sa=stats(vMax),sb=stats(vMin);/* dunkle, kräftige Zellfarbe (Blau, Rot) → weiße Schrift: dunkelsten Kanal nehmen; sonst hellsten */const useMin=sa.p50<215&&sb.p50<110;const v=useMin?vMin:vMax,S=useMin?sb:sa;
  if(S.sp<40)return null;/* leere Zelle */
  const lim=S.sp*.35;let dk=0,br=0;for(const a of v){if(a<S.p50-lim)dk++;else if(a>S.p50+lim)br++}
  const inv=br>dk;const ink=(inv?br:dk)/n;if(ink<.012)return null;
  const k=Math.max(1.5,Math.min(6,100/CH)),pad=40;const W=Math.round(CW*k)+pad*2,H=Math.round(CH*k)+pad*2;
  const t=document.createElement('canvas');t.width=CW;t.height=CH;const tg=t.getContext('2d');const id=tg.createImageData(CW,CH);
  const lo=inv?S.p50:S.p5,hi=inv?S.p95:S.p50;
  for(let i=0,j=0;i<n;i++,j+=4){let a=(v[i]-lo)/Math.max(1,hi-lo)*255;a=Math.max(0,Math.min(255,a));if(inv)a=255-a;a=a>140?255:0;/* klare Schwarz-Weiß-Schrift, danach weich vergrößert */id.data[j]=id.data[j+1]=id.data[j+2]=a;id.data[j+3]=255}
  clearBorder(id.data,CW,CH);tg.putImageData(id,0,0);const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,W,H);g.imageSmoothingQuality='high';g.drawImage(t,pad,pad,W-pad*2,H-pad*2);return c}
 /* Reste von Gitterlinien entfernen: alles Schwarze, das den Zellrand berührt */
 function clearBorder(px,W,H){const seen=new Uint8Array(W*H),q=[];const blk=i=>px[i*4]===0;
  const push=i=>{if(!seen[i]&&blk(i)){seen[i]=1;q.push(i)}};for(let x=0;x<W;x++){push(x);push((H-1)*W+x)}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1)}
  let total=0;for(let i=0;i<W*H;i++)if(blk(i))total++;
  const rm=[];while(q.length){const i=q.pop();rm.push(i);const x=i%W,y=(i/W)|0;if(x>0)push(i-1);if(x<W-1)push(i+1);if(y>0)push(i-W);if(y<H-1)push(i+W)}
  if(rm.length<total*.85)for(const i of rm){px[i*4]=px[i*4+1]=px[i*4+2]=255}}
 async function readCell(col,yb,wl,psm){const c=cellCanvas(col[0],col[1],yb[0],yb[1]);if(!c)return '';
  for(const m of [psm||'7','13','10']){const w=await ocr(c,{tessedit_pageseg_mode:m,tessedit_char_whitelist:wl,minConf:5});const t=w.map(o=>o.t).join('');if(t.replace(/[^0-9A-Za-zÄÖÜäöüß]/g,''))return t}return ''}
 /* Einer Zeile über alle Spalten folgen (Perspektive: Zeilen laufen leicht schräg) */
 /* Verlauf einer Zeile aus den erkannten Wörtern schätzen (Perspektive: Zeilen laufen leicht schräg) */
 function rowLine(cy){const P=st.pitch,W=st.src.w;let a=cy,b=0;
  for(let it=0;it<4;it++){const pts=st.src.words.map(w=>({x:w.x+w.w/2,y:w.y+w.h/2})).filter(p=>Math.abs(p.y-(a+b*p.x))<P*(it?0.35:0.45));
   if(pts.length<3)break;const xs=pts.map(p=>p.x);if(Math.max(...xs)-Math.min(...xs)<W*.25){a=pts.reduce((s,p)=>s+p.y,0)/pts.length-b*(xs.reduce((s,x)=>s+x,0)/pts.length);continue}
   const n=pts.length,mx=xs.reduce((s,x)=>s+x,0)/n,my=pts.reduce((s,p)=>s+p.y,0)/n;let sxy=0,sxx=0;for(const p of pts){sxy+=(p.x-mx)*(p.y-my);sxx+=(p.x-mx)**2}
   const nb=sxx?sxy/sxx:0;if(Math.abs(nb)>.08)break;b=nb;a=my-b*mx}
  /* angetippte Höhe bleibt an der Stelle des Namens maßgeblich */
  if(st.diag)st.diag.slope=b;
  /* Höhe bleibt an der angetippten Stelle verankert (beim Namen bzw. der erkannten Zeile) */
  let xr=0,bd=1e9;for(const l of st.lines){const d=Math.abs(l.cy-cy);if(d<bd){bd=d;xr=(l.x0+l.x1)/2}}if(bd>P*.5)xr=W*.2;st._xr=xr;const a2=cy-b*xr;return x=>a2+b*x}
 function trackRow(cols,cy){const f=rowLine(cy),P=st.pitch;return cols.map(c=>{const m=f((c[0]+c[1])/2);return [m-P*.5,m+P*.5]})}
 function rowBoundsAt(cy,x0,x1,reach){const s=st.src,p=st.pitch;const y0=Math.max(0,cy-reach),G=gray(s.canvas,x0,y0,x1-x0,reach*2);const med=medOf(G.v);const prof=new Float32Array(G.H);
  for(let y=0;y<G.H;y++){const o=y*G.W;let c=0;for(let x=0;x<G.W;x++){const d=med-G.v[o+x];if(d>0)c+=d}prof[y]=c/G.W}
  const ys=linePeaks(prof).map(y=>y+G.y);const above=ys.filter(y=>y<cy-p*.12),below=ys.filter(y=>y>cy+p*.12);
  let top=above.length?Math.max(...above):cy-p*.5,bot=below.length?Math.min(...below):cy+p*.5;
  if(bot-top>p*1.5||bot-top<p*.45){top=cy-p*.5;bot=cy+p*.5}return [top,bot]}
 /* Spaltenlinien von der Kopfzeile nach unten verfolgen (starke Perspektive / gewölbtes Papier) */
 function traceDown(bounds,y0,y1){const s=st.src,P=st.pitch;const h=P*.45;let xs=bounds.slice();
  const widths=xs.slice(1).map((x,i)=>x-xs[i]);const cw=median(widths)||P;const R=Math.max(3,cw*.3);
  const n=Math.max(1,Math.ceil(Math.abs(y1-y0)/h));
  for(let k=1;k<=n;k++){const yc=y0+(y1-y0)*k/n;
   const G=gray(s.canvas,0,yc-h/2,s.w,h);const med=medOf(G.v);const prof=new Float32Array(G.W);
   for(let yy=0;yy<G.H;yy++){const o=yy*G.W;for(let x=0;x<G.W;x++){const d=med-G.v[o+x];if(d>0)prof[x]+=d}}
   const found=xs.map(x=>{const a=Math.max(0,Math.floor(x-R)),b=Math.min(G.W-1,Math.ceil(x+R));let mx=-1,mi=x,mn=1e18;
    for(let i=a;i<=b;i++){if(prof[i]>mx){mx=prof[i];mi=i}if(prof[i]<mn)mn=prof[i]}return {x:mi,str:mx-mn}});
   const strs=found.map(f=>f.str).sort((a,b)=>a-b);const good=strs[Math.floor(strs.length*.5)]*.5;
   const drift=[];found.forEach((f,i)=>{if(f.str>=good)drift.push(f.x-xs[i])});const dm=median(drift)||0;
   xs=xs.map((x,i)=>found[i].str>=good&&Math.abs(found[i].x-x-dm)<R*.8?found[i].x:x+dm)}
  return xs}
 async function readGrid(){const s=st.src,dim=new Date(st.y,st.m+1,0).getDate(),P=st.pitch;st.diag={};
  const find=(cy,ranges)=>{let best=null;for(const [a,b] of ranges){const c=dayColumns(Math.max(0,cy+a*P),Math.min(s.h,cy+b*P));if(c&&(!best||c.length>best.length))best=c;if(best&&best.length>=dim-1)break}return best};
  const pairs=T=>T.slice(1).map((x,i)=>[T[i],x]);const bounds=c=>[c[0][0],...c.map(x=>x[1])];
  /* 1. Spalten an der eigenen Zeile finden (dort stehen die Linien meist klar), Linien hoch zu den Tageszahlen verfolgen */
  const fit=c=>c?(c.length>=dim-2&&c.length<=dim+2?1000-Math.abs(c.length-dim):c.length):-1;
  const hc=find(st.hY,[[-.9,.6],[-1.6,.7],[-1.2,1.2]]),rc=find(st.rY,[[-.6,.6],[-1.2,1.2],[-2.5,2.5]]);let cols=null,hcols=null;
  /* Die Seite mit der besseren Spaltenfolge nehmen und die Linien zur anderen Zeile verfolgen */
  if(hc&&fit(rc)<997&&fit(hc)>fit(rc)){hcols=hc;cols=pairs(traceDown(bounds(hc),st.hY,st.rY));st.diag.how='kopf'}
  else if(rc){cols=rc;hcols=pairs(traceDown(bounds(rc),st.rY,st.hY));st.diag.how='zeile'}
  st.diag.cols=cols?cols.length:0;if(!cols)return null;
  /* 2. Tageszahlen lesen → welcher Tag gehört zu welcher Spalte */
  const f=rowLine(st.hY),hh=Math.max(st.wh*.7,P*.3);const votes={};let seen=0,off=null,bv=0;
  for(let j=0;j<hcols.length;j++){prog('Tageszahlen werden gelesen … '+(j+1)+'/'+hcols.length);const c=hcols[j],m=f((c[0]+c[1])/2);
   const t=(await readCell(c,[m-hh,m+hh],'0123456789','7')).replace(/\D/g,'');const n=parseInt(t,10);
   if(n>=1&&n<=31){const o=n-j;votes[o]=(votes[o]||0)+1;seen++;const top=Math.max(...Object.values(votes));if(top>=6&&seen>=8)break}}
  for(const [o,v] of Object.entries(votes))if(v>bv){bv=v;off=Number(o)}st.diag.nums=bv;
  if(bv<3)off=cols.length>=dim-1&&cols.length<=dim+1?1:null;
  if(off==null)return null;
  const dayCols=cols.map((c,j)=>({day:j+off,c})).filter(o=>o.day>=1&&o.day<=dim&&o.c[1]>o.c[0]+3);if(dayCols.length<7)return null;
  /* 3. Eigene Zeile, Zelle für Zelle */
  const rbs=trackRow(dayCols.map(o=>o.c),st.rY);const out=[];
  for(let i=0;i<dayCols.length;i++){prog('Deine Zeile wird gelesen … '+(i+1)+'/'+dayCols.length);const t=clean(await readCell(dayCols[i].c,rbs[i],CELL_CHARS,'7'));if(t)out.push({day:dayCols[i].day,t})}
  st.diag.cells=out.length;
  st.header=dayCols.map(o=>({n:o.day,cx:(o.c[0]+o.c[1])/2}));st.sp=(dayCols[dayCols.length-1].c[1]-dayCols[0].c[0])/dayCols.length;
  return out}

 async function refine(){const s=st.src;DS.swap(busy('Tabelle wird erkannt …'),1);
  try{let toks=null;
   /* 1. Weg: Gitterlinien erkennen und jede Tageszelle einzeln lesen (am genauesten) */
   try{st.progLabel='';toks=await readGrid()}catch(x){console.warn(x);toks=null}
   /* 2. Weg (Plan ohne Linien): ganze Streifen lesen */
   if(!toks||!toks.length){const bh=st.pitch*1.15;const scale=Math.max(1,Math.min(4,38/Math.max(8,st.wh)));
    st.progLabel='Tageszahlen werden gelesen';
    const hc=prep(s.canvas,0,st.hY-bh/2,s.w,bh,scale,true);
    const hw=(await ocr(hc,{tessedit_pageseg_mode:'11',tessedit_char_whitelist:'0123456789'})).map(w=>({...w,x:w.x/scale,w:w.w/scale}));
    const seq=headerOf(hw);
    if(seq.length<7){const d=st.diag||{};throw new Error('Die Tageszahlen konnten nicht sicher gelesen werden. Tippe bitte genau auf die Zeile mit 1, 2, 3 … oder fotografiere etwas näher. (Info: Weg '+(d.how||'-')+', Spalten '+(d.cols||0)+', Zahlen '+(d.nums||0)+', Bild '+Math.round(s.w)+'×'+Math.round(s.h)+', Zeilenhöhe '+Math.round(st.pitch)+', Schräge '+(s.angle||0)+'°)')}
    setHeader(seq);st.progLabel='Deine Zeile wird gelesen';prog('Deine Zeile wird gelesen …');
    const rc=prep(s.canvas,0,st.rY-bh/2,s.w,bh,scale,true);
    const rw=(await ocr(rc,{tessedit_pageseg_mode:'11',tessedit_char_whitelist:CODE_CHARS})).map(w=>({...w,x:w.x/scale,w:w.w/scale}));
    toks=rowTokens({words:rw})}
   st.tokens=toks;
   let nl=null,bd=st.pitch*.6;for(const l of st.lines){const d=Math.abs(l.cy-st.rY);if(d<bd){bd=d;nl=l}}st.nameLine=nl;
   if(!st.tokens.length)throw new Error('In dieser Zeile wurden keine Dienste erkannt. Versuche ein schärferes Foto, etwas näher am Plan.');
   DS.swap(mapView(),1)}
  catch(x){fail(x,photoView)}}

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
  const back=st.src&&st.src.kind==='img'?photoView:rowView;
  const node=el('<div>'+DS.head('Dienstplan-Import','Kürzel zuordnen',{back:true})+
   '<p class="ip-p">Welcher Dienst steckt hinter welchem Kürzel? Schivio merkt sich die Zuordnung für den nächsten Import.</p>'+
   '<div class="ls ip-map">'+Object.keys(uniq).sort().map(k=>'<label class="r"><span class="ip-k">'+esc(uniq[k].t)+'</span><small>'+uniq[k].n+'×</small><select data-k="'+esc(k)+'" aria-label="Dienst für '+esc(uniq[k].t)+'">'+opts(st.map[k])+'</select></label>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next">Vorschau</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(s=>s.addEventListener('change',()=>{st.map[s.dataset.k]=s.value}));
  DS.wire(node,{back:()=>DS.swap(back(),-1),next:()=>DS.swap(preview(),1)});
  return node}

 /* ---------- 4. Vorschau & übernehmen ---------- */
 function plan(){st.ov=st.ov||{};return st.tokens.map(o=>{const k=st.y+'-'+pad2(st.m+1)+'-'+pad2(o.day);const auto=st.map[o.t.toUpperCase()]||'';return {k,day:o.day,t:o.t,c:k in st.ov?st.ov[k]:auto,old:data.shifts[k]||''}})}
 function preview(){const rows=plan(),dim=new Date(st.y,st.m+1,0).getDate(),missing=dim-rows.length;
  const opts=c=>'<option value=""'+(c===''?' selected':'')+'>nicht übernehmen</option>'+codes().map(x=>'<option value="'+esc(x)+'"'+(x===c?' selected':'')+'>'+esc(shiftTitle(x))+'</option>').join('');
  const summary=()=>{const r=plan(),use=r.filter(x=>x.c),ch=use.filter(x=>x.old&&x.old!==x.c).length;return {use,txt:use.length+(use.length===1?' Dienst wird':' Dienste werden')+' eingetragen'+(ch?', davon '+ch+' ersetzt':'')+'. Falls etwas falsch erkannt wurde, kannst du jeden Tag hier direkt ändern.'}};
  const S0=summary();
  const node=el('<div>'+DS.head(MON[st.m]+' '+st.y,'Vorschau',{back:true})+
   '<p class="ip-p" data-sum>'+esc(S0.txt)+'</p>'+
   (missing>3&&st.src&&st.src.kind==='img'?'<p class="ip-warn">'+IC.warn+'<span>Für '+missing+' Tage wurde nichts erkannt. Das kann an freien Tagen liegen – oder das Foto war an dieser Stelle unscharf. Bitte kurz vergleichen.</span></p>':'')+
   '<div class="ls ip-pv">'+rows.map(r=>{const d=new Date(r.k+'T12:00:00');return '<div class="r'+(r.c?'':' off')+'" data-row="'+r.k+'"><span class="dd"><b>'+pad2(r.day)+'.</b><small>'+WD[d.getDay()]+'</small></span><span class="ip-k">'+esc(r.t)+'</span><span class="to"><span class="nm"><i style="--c:'+esc(r.c?shiftColor(r.c):'transparent')+'"></i><select data-k="'+r.k+'" aria-label="Dienst am '+r.day+'.">'+opts(r.c)+'</select></span>'+(r.old&&r.old!==r.c&&r.c?'<small>ersetzt '+esc(shiftTitle(r.old))+'</small>':'')+'</span></div>'}).join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="apply"'+(S0.use.length?'':' disabled')+'>'+S0.use.length+' Dienste übernehmen</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(sel=>sel.addEventListener('change',()=>{st.ov[sel.dataset.k]=sel.value;const row=sel.closest('.r');row.classList.toggle('off',!sel.value);row.querySelector('i').style.setProperty('--c',sel.value?shiftColor(sel.value):'transparent');
   const S=summary();node.querySelector('[data-sum]').textContent=S.txt;const b=node.querySelector('[data-x="apply"]');b.textContent=S.use.length+' Dienste übernehmen';b.disabled=!S.use.length}));
  DS.wire(node,{back:()=>DS.swap(mapView(),-1),apply:()=>{const use=summary().use;const c=cfg();Object.assign(c.map,st.map);const nm=nameWord(st.nameLine);if(nm)c.name=nm;
   use.forEach(r=>{data.shifts[r.k]=r.c});try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}
   const n=use.length;discard();st=null;DS.close();toast(n+' Dienste eingetragen');try{window.SchivioMore?.render?.()}catch(e){}}});
  return node}

 function open(){fresh();zoom=0;DS.node(start);DS.onClose?.(()=>{discard();st=null})}
 window.SchivioImport={open,_test:{analyse:()=>analyse(),state:()=>st,tokens:i=>rowTokens(st.lines[i]),cols:(a,b)=>dayColumns(a,b)}};
})();
