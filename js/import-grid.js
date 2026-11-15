/* Dienstplan-Import · Teil 3: Tabelle erkennen
   Aus erkannten Wörtern bzw. dem Foto werden Zeilen, Tagesspalten und die Kürzel der eigenen Zeile.
   Alle Funktionen arbeiten mit dem Import-Zustand „st“ (Monat, Quelle, Zeilen, Tipp-Positionen).
   Ablauf Foto:
     1. photoPrep: grobe Texterkennung → Schräglage ausgleichen
     2. analyse: Wörter zu Zeilen gruppieren, Zeilenhöhe schätzen, Kopfzeile mit Tageszahlen suchen
     3. readRow: Spalten über die Gitterlinien finden, Linien zwischen Tageszahlen und eigener Zeile verfolgen
        (Perspektive), Tageszahlen lesen → Zuordnung Spalte/Tag, dann jede Zelle der eigenen Zeile einzeln lesen.
        Ohne erkennbares Gitter: ganze Streifen lesen (Ausweichweg).
   Stellt bereit: SchivioImportLib.grid */
(function(){
 const L=window.SchivioImportLib=window.SchivioImportLib||{};
 const IMG=L.image,OCR=L.ocr;
 const {median}=IMG;

 /* ---------- Einstellungen ---------- */
 const PASS1_SIDE=2000;        // grobe Erkennung auf verkleinertem Bild (schneller)
 const COL_TOLERANCE=.25;      // Tagesspalten dürfen um 25 % in der Breite schwanken (Perspektive)
 const COL_MIN_RUN=8;          // mindestens so viele gleich breite Spalten = Tabelle erkannt
 const LINE_FRAC=.3;           // Linie: in mind. 30 % mehr Zeilen dunkel als die Umgebung
 const HEADER_VOTES=3;         // mind. 3 übereinstimmend gelesene Tageszahlen
 const CODE_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789/-';
 const CELL_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789/';
 const NOT_NAMES=/^(frei|urlaub|krank|früh|spät|nacht|dienst|mehrarbeit|name)$/i;

 const daysIn=st=>new Date(st.y,st.m+1,0).getDate();
 const isDayNum=t=>/^\d{1,2}\.?$/.test(t);

 /* ---------- 1. Foto vorbereiten ---------- */
 async function photoPrep(full,report){
  report('Plan wird erkannt …');
  const k=Math.min(1,PASS1_SIDE/Math.max(full.width,full.height));
  const small=IMG.prep(full,0,0,full.width,full.height,k,false);
  let words=(await OCR.recognize(small,{psm:11,progress:true})).map(w=>({...w,x:w.x/k,y:w.y/k,w:w.w/k,h:w.h/k}));
  const ang=IMG.skewOf(words);const canvas=IMG.rotate(full,-ang);words=IMG.rotateWords(words,-ang,full.width,full.height);
  const dk=Math.min(1,PASS1_SIDE/Math.max(canvas.width,canvas.height));const disp=document.createElement('canvas');disp.width=Math.round(canvas.width*dk);disp.height=Math.round(canvas.height*dk);
  disp.getContext('2d').drawImage(canvas,0,0,disp.width,disp.height);
  return {kind:'img',canvas,angle:ang,img:disp.toDataURL('image/jpeg',.8),w:canvas.width,h:canvas.height,words}}

 /* ---------- 2. Zeilen, Zeilenhöhe, Kopfzeile ---------- */
 function groupLines(ws0){const ws=ws0.slice().sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2));const lines=[];
  for(const w of ws){const cy=w.y+w.h/2;let ln=null;
   for(let i=lines.length-1;i>=0&&i>=lines.length-4;i--){const l=lines[i];if(Math.abs(l.cy-cy)<Math.min(l.h,w.h)*.6){ln=l;break}}
   if(!ln){ln={cy,h:w.h,words:[]};lines.push(ln)}ln.words.push(w);ln.cy=ln.words.reduce((s,o)=>s+o.y+o.h/2,0)/ln.words.length;ln.h=Math.max(ln.h,w.h)}
  for(const l of lines){l.words.sort((a,b)=>a.x-b.x);l.x0=Math.min(...l.words.map(w=>w.x));l.x1=Math.max(...l.words.map(w=>w.x+w.w));l.y0=Math.min(...l.words.map(w=>w.y));l.y1=Math.max(...l.words.map(w=>w.y+w.h));l.text=l.words.map(w=>w.t).join(' ')}
  return lines.sort((a,b)=>a.cy-b.cy)}
 /* längste aufsteigende Folge von Tageszahlen (1–31) von links nach rechts */
 function headerOf(words){const nums=words.filter(w=>isDayNum(w.t)).map(w=>({n:parseInt(w.t,10),cx:w.x+w.w/2})).filter(o=>o.n>=1&&o.n<=31).sort((a,b)=>a.cx-b.cx);let seq=[],run=[];
  for(const o of nums){if(run.length&&o.n>run[run.length-1].n&&o.n<=run[run.length-1].n+3)run.push(o);else{if(run.length>seq.length)seq=run;run=[o]}}
  return run.length>seq.length?run:seq}
 function setHeader(st,seq){if(seq&&seq.length>=5){st.header=seq;st.sp=(seq[seq.length-1].cx-seq[0].cx)/Math.max(1,seq[seq.length-1].n-seq[0].n)}else{st.header=null;st.sp=0}}
 function analyse(st){st.lines=groupLines(st.src.words);let best=null;
  st.lines.forEach((l,i)=>{const seq=headerOf(l.words);if(seq.length>=7&&(!best||seq.length>best.seq.length))best={i,seq}});
  st.hIdx=best?best.i:-1;setHeader(st,best&&best.seq);
  st.wh=median(st.src.words.map(w=>w.h))||14;
  const cys=st.lines.map(l=>l.cy),d=[];for(let i=1;i<cys.length;i++){const x=cys[i]-cys[i-1];if(x>st.wh*.8)d.push(x)}
  st.pitch=Math.max(st.wh*1.4,Math.min(st.wh*4,median(d)||st.wh*2));
  /* Zeilenhöhe nie kleiner als ca. 1,6-fache Schrifthöhe (sonst werden Zellen zu knapp ausgeschnitten) */
  const th=median(st.src.words.filter(w=>w.t.length>=2&&/[A-Za-zÄÖÜ0-9]/.test(w.t)).map(w=>w.h))||st.wh;st.pitch=Math.max(st.pitch,th*1.6)}
 /* Monat aus dem Plan: „Dezember 2026“ oder „01.12.2026 - 31.12.2026“ → [Jahr, Monat 0–11] */
 function detectMonth(st){const txt=(st.lines||[]).map(l=>l.text).join('\n');
  const names=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'];
  const m1=txt.match(/(Januar|Februar|M[äa]e?rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(20\d\d)/i);
  if(m1){const i=names.indexOf(m1[1].toLowerCase().replace(/^ma(e|)rz$/,'märz'));if(i>=0)return [Number(m1[2]),i]}
  const m2=txt.match(/0?1\.(\d{1,2})\.(20\d\d)/);if(m2){const m=Number(m2[1])-1;if(m>=0&&m<12)return [Number(m2[2]),m]}
  return null}
 function findNameLine(st,name){const n=(name||'').toLowerCase();if(!n)return -1;return st.lines.findIndex((l,j)=>j!==st.hIdx&&l.text.toLowerCase().includes(n))}
 function nameWord(line){if(!line)return '';const w=line.words.find(o=>/^[A-ZÄÖÜ][a-zäöüß]{2,}[,.]?$/.test(o.t)&&!NOT_NAMES.test(o.t.replace(/[,.]$/,'')));return w?w.t.replace(/[,.]$/,''):''}
 /* Tipp auf die Mitte der nächstgelegenen erkannten Zeile ziehen */
 function snap(st,y){let best=y,bd=st.pitch*.5;for(const l of st.lines){const d=Math.abs(l.cy-y);if(d<bd){bd=d;best=l.cy}}return best}
 function nearestLine(st,y,within=.6){let nl=null,bd=st.pitch*within;for(const l of st.lines){const d=Math.abs(l.cy-y);if(d<bd){bd=d;nl=l}}return nl}

 /* Kürzel säubern; Texterkennung liest „S“ gern als „Ss“ */
 function clean(t){t=t.replace(/[|\[\](){}_;:"'„“”’`]/g,'').replace(/^[.,-]+|[.,]+$/g,'').trim();if(/^([a-zäöü])\1$/i.test(t)&&t[0]!==t[1])t=t[0].toUpperCase();return t}
 /* Wörter einer Zeile den Tagen zuordnen (PDF und Streifen-Lesen) */
 function rowTokens(st,line){const dim=daysIn(st),by={};
  if(st.header){const H=st.header,sp=st.sp;const firstX=H[0].cx-(H[0].n-1)*sp-sp*.6;
   const put=(t,cx)=>{const est=Math.round(H[0].n+(cx-H[0].cx)/sp);let day=null,bd=1e9;for(const o of H){const d=Math.abs(o.cx-cx);if(d<bd){bd=d;day=o.n}}if(bd>sp*.6)day=est;t=clean(t);if(!t||day<1||day>dim)return;by[day]=by[day]?by[day]+' '+t:t};
   for(const w of line.words){const cx=w.x+w.w/2;if(cx<firstX)continue;/* Name und Vorspalten überspringen */
    const span=Math.round(w.w/sp),t=clean(w.t);
    /* ein „Wort“ über mehrere Spalten (z. B. „FF“) auf die Spalten aufteilen */
    if(span>=2&&t.length>=span&&t.length%span===0&&!/\d/.test(t)){const n=t.length/span;for(let i=0;i<span;i++)put(t.slice(i*n,(i+1)*n),w.x+sp*(i+.5))}
    else put(w.t,cx)}}
  else{/* ohne Kopfzeile: der Reihe nach ab dem 1. */let i=0,started=false;
   for(const w of line.words){const t=clean(w.t);if(!t)continue;if(!started&&/^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(t)&&!/^(frei|urlaub|krank)$/i.test(t))continue;started=true;i++;if(i<=dim)by[i]=t}}
  return Object.keys(by).map(Number).sort((a,b)=>a-b).map(d=>({day:d,t:by[d]}))}

 /* ---------- 3a. Gitterlinien und Tagesspalten ---------- */
 /* Spitzen über gleitendem Mittelwert finden (schmale Linien heben sich ab, breite Farbflächen nicht) */
 function peaks(prof,thr,merge){const n=prof.length,win=20,pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+prof[i];
  const r=new Float32Array(n);for(let i=0;i<n;i++){const a=Math.max(0,i-win),b=Math.min(n,i+win+1);r[i]=prof[i]-(pre[b]-pre[a])/(b-a)}
  if(thr==null){const s=Array.from(r).sort((a,b)=>a-b);thr=Math.max(6,.3*s[Math.floor(n*.995)])}
  const out=[];let i=0;while(i<n){if(r[i]>thr){let j=i;while(j+1<n&&(r[j+1]>thr||(j+2<n&&r[j+2]>thr&&j+2-i<merge)))j++;out.push((i+j)/2);i=j+1}else i++}return out}
 /* Bewertung einer Spaltenfolge: so viele Spalten wie Tage im Monat ist ideal */
 function colFit(st,c){const dim=daysIn(st);return c?(c.length>=dim-2&&c.length<=dim+2?1000-Math.abs(c.length-dim):c.length):-1}
 /* Aus Linienpositionen die längste Folge ähnlich breiter Spalten bilden.
    Einzelne Störlinien werden übersprungen, fehlende Linien (verdeckt durch Farbe) ergänzt. */
 function columnRun(st,xs){if(xs.length<COL_MIN_RUN)return null;const minG=Math.max(8,st.pitch*.5);let best=null;
  for(let i=0;i<xs.length-1;i++){const g0=xs[i+1]-xs[i];if(g0<minG)continue;let j=i+1;const gaps=[g0],cols=[[xs[i],xs[i+1]]];
   while(j+1<xs.length){const g=xs[j+1]-xs[j],m=median(gaps);
    if(g<m*.6&&j+2<xs.length&&Math.abs(xs[j+2]-xs[j]-m)<=m*COL_TOLERANCE){cols.push([xs[j],xs[j+2]]);gaps.push(xs[j+2]-xs[j]);j+=2;continue}
    const q=Math.round(g/m);if(q<1||q>2||Math.abs(g-q*m)>m*.22*q)break;
    for(let r=0;r<q;r++){cols.push([xs[j]+g*r/q,xs[j]+g*(r+1)/q]);gaps.push(g/q)}j++}
   if(!best||colFit(st,cols)>colFit(st,best))best=cols}
  return best&&best.length>=COL_MIN_RUN?best:null}
 /* Senkrechte Linien in einem waagerechten Streifen → Tagesspalten.
    Zwei Detektoren: (a) mittlere Dunkelheit, (b) Anteil dunkler Zeilen (Linien laufen durch, Schrift nicht). */
 function dayColumns(st,y0,y1){const G=IMG.gray(st.src.canvas,0,y0,st.src.w,y1-y0);const paper=IMG.paperLevel(G.v),thr=paper-40;
  const pa=new Float32Array(G.W),pb=new Float32Array(G.W);
  for(let y=0;y<G.H;y++){const o=y*G.W;let last=-9;for(let x=0;x<G.W;x++){const v=G.v[o+x],d=paper-v;if(d>0)pa[x]+=d;
   if(v<thr){const a=Math.max(last+1,x-2),b=Math.min(G.W-1,x+2);for(let i=a;i<=b;i++)pb[i]++;last=b}}}/* ±2 px gegen leichte Schräglage */
  for(let x=0;x<G.W;x++){pa[x]/=G.H;pb[x]/=G.H}
  const A=columnRun(st,peaks(pa,null,6)),B=columnRun(st,peaks(pb,LINE_FRAC,8));return colFit(st,A)>=colFit(st,B)?A:B}
 function findColumns(st,cy,ranges){const P=st.pitch,dim=daysIn(st);let best=null;
  for(const [a,b] of ranges){const c=dayColumns(st,Math.max(0,cy+a*P),Math.min(st.src.h,cy+b*P));if(c&&(!best||c.length>best.length))best=c;if(best&&best.length>=dim-1)break}
  return best}
 /* Spaltenlinien von einer Zeile zur anderen verfolgen (Perspektive, gewölbtes Papier) */
 function traceLines(st,bounds,y0,y1){const P=st.pitch,h=P*.45;let xs=bounds.slice();
  const cw=median(xs.slice(1).map((x,i)=>x-xs[i]))||P,R=Math.max(3,cw*.3);const n=Math.max(1,Math.ceil(Math.abs(y1-y0)/h));
  for(let k=1;k<=n;k++){const yc=y0+(y1-y0)*k/n;const G=IMG.gray(st.src.canvas,0,yc-h/2,st.src.w,h);const paper=IMG.paperLevel(G.v);const prof=new Float32Array(G.W);
   for(let yy=0;yy<G.H;yy++){const o=yy*G.W;for(let x=0;x<G.W;x++){const d=paper-G.v[o+x];if(d>0)prof[x]+=d}}
   const found=xs.map(x=>{const a=Math.max(0,Math.floor(x-R)),b=Math.min(G.W-1,Math.ceil(x+R));let mx=-1,mi=x,mn=1e18;
    for(let i=a;i<=b;i++){if(prof[i]>mx){mx=prof[i];mi=i}if(prof[i]<mn)mn=prof[i]}return {x:mi,str:mx-mn}});
   const good=found.map(f=>f.str).sort((a,b)=>a-b)[Math.floor(found.length*.5)]*.5;
   const dm=median(found.filter(f=>f.str>=good).map(f=>f.x-xs[found.indexOf(f)]))||0;
   xs=xs.map((x,i)=>found[i].str>=good&&Math.abs(found[i].x-x-dm)<R*.8?found[i].x:x+dm)}
  return xs}
 /* Verlauf einer Zeile aus den erkannten Wörtern (Perspektive: Zeilen laufen leicht schräg).
    Die Höhe bleibt an der angetippten Stelle verankert. */
 function rowLine(st,cy){const P=st.pitch,W=st.src.w;let a=cy,b=0;
  for(let it=0;it<4;it++){const pts=st.src.words.map(w=>({x:w.x+w.w/2,y:w.y+w.h/2})).filter(p=>Math.abs(p.y-(a+b*p.x))<P*(it?.35:.45));
   if(pts.length<3)break;const xs=pts.map(p=>p.x),n=pts.length,mx=xs.reduce((s,x)=>s+x,0)/n,my=pts.reduce((s,p)=>s+p.y,0)/n;
   if(Math.max(...xs)-Math.min(...xs)<W*.25){a=my-b*mx;continue}
   let sxy=0,sxx=0;for(const p of pts){sxy+=(p.x-mx)*(p.y-my);sxx+=(p.x-mx)**2}
   const nb=sxx?sxy/sxx:0;if(Math.abs(nb)>.08)break;b=nb;a=my-b*mx}
  const ref=nearestLine(st,cy,.5);const xr=ref?(ref.x0+ref.x1)/2:W*.2;const a2=cy-b*xr;return x=>a2+b*x}
 /* Ober- und Unterkante der Zellen einer Zeile */
 function cellBoxes(st,cols,cy,half){const f=rowLine(st,cy);return cols.map(c=>{const m=f((c[0]+c[1])/2);return [m-half,m+half]})}
 async function readCell(st,col,box,whitelist){const c=IMG.cell(st.src.canvas,col[0],col[1],box[0],box[1]);if(!c)return '';
  for(const psm of [7,13,10]){const w=await OCR.recognize(c,{psm,whitelist,minConf:5});const t=w.map(o=>o.t).join('');if(t.replace(/[^0-9A-Za-zÄÖÜäöüß]/g,''))return t}
  return ''}

 /* ---------- 3b. Mit Gitter: Zelle für Zelle ---------- */
 async function readGrid(st,report){const dim=daysIn(st),P=st.pitch;st.diag={};
  const pairs=T=>T.slice(1).map((x,i)=>[T[i],x]),bounds=c=>[c[0][0],...c.map(x=>x[1])];
  /* Spalten dort suchen, wo die Folge am besten passt, und die Linien zur anderen Zeile verfolgen */
  const hc=findColumns(st,st.hY,[[-.9,.6],[-1.6,.7],[-1.2,1.2]]),rc=findColumns(st,st.rY,[[-.6,.6],[-1.2,1.2],[-2.5,2.5]]);let cols=null,hcols=null;
  if(hc&&colFit(st,rc)<997&&colFit(st,hc)>colFit(st,rc)){hcols=hc;cols=pairs(traceLines(st,bounds(hc),st.hY,st.rY));st.diag.how='kopf'}
  else if(rc){cols=rc;hcols=pairs(traceLines(st,bounds(rc),st.rY,st.hY));st.diag.how='zeile'}
  st.diag.cols=cols?cols.length:0;if(!cols)return null;
  /* Tageszahlen lesen → welcher Tag gehört zu welcher Spalte (Mehrheitsentscheid) */
  const hh=Math.max(st.wh*.7,P*.3),hb=cellBoxes(st,hcols,st.hY,hh);const votes={};let seen=0,off=null,bv=0;
  for(let j=0;j<hcols.length;j++){report('Tageszahlen werden gelesen … '+(j+1)+'/'+hcols.length);
   const n=parseInt((await readCell(st,hcols[j],hb[j],'0123456789')).replace(/\D/g,''),10);
   if(n>=1&&n<=31){votes[n-j]=(votes[n-j]||0)+1;seen++;if(Math.max(...Object.values(votes))>=6&&seen>=8)break}}
  for(const [o,v] of Object.entries(votes))if(v>bv){bv=v;off=Number(o)}st.diag.nums=bv;
  if(bv<HEADER_VOTES)off=cols.length>=dim-1&&cols.length<=dim+1?1:null;/* Notlösung: genau so viele Spalten wie Tage */
  if(off==null)return null;
  const dayCols=cols.map((c,j)=>({day:j+off,c})).filter(o=>o.day>=1&&o.day<=dim&&o.c[1]>o.c[0]+3);if(dayCols.length<7)return null;
  /* eigene Zeile, Zelle für Zelle */
  const rb=cellBoxes(st,dayCols.map(o=>o.c),st.rY,P*.5);const out=[];
  for(let i=0;i<dayCols.length;i++){report('Deine Zeile wird gelesen … '+(i+1)+'/'+dayCols.length);const t=clean(await readCell(st,dayCols[i].c,rb[i],CELL_CHARS));if(t)out.push({day:dayCols[i].day,t})}
  st.header=dayCols.map(o=>({n:o.day,cx:(o.c[0]+o.c[1])/2}));st.sp=(dayCols[dayCols.length-1].c[1]-dayCols[0].c[0])/dayCols.length;
  return out}

 /* ---------- 3c. Ohne Gitter: ganze Streifen lesen ---------- */
 async function readBands(st,report){const s=st.src,bh=st.pitch*1.15,scale=Math.max(1,Math.min(4,38/Math.max(8,st.wh)));
  report('Tageszahlen werden gelesen …');
  const hw=(await OCR.recognize(IMG.prep(s.canvas,0,st.hY-bh/2,s.w,bh,scale,true),{psm:11,whitelist:'0123456789',progress:true})).map(w=>({...w,x:w.x/scale,w:w.w/scale}));
  const seq=headerOf(hw);
  if(seq.length<7){const d=st.diag||{};throw new Error('Die Tageszahlen konnten nicht sicher gelesen werden. Tippe bitte genau auf die Zeile mit 1, 2, 3 … oder fotografiere etwas näher. (Info: Weg '+(d.how||'-')+', Spalten '+(d.cols||0)+', Zahlen '+(d.nums||0)+', Bild '+Math.round(s.w)+'×'+Math.round(s.h)+', Zeilenhöhe '+Math.round(st.pitch)+', Schräge '+(s.angle||0)+'°)')}
  setHeader(st,seq);report('Deine Zeile wird gelesen …');
  const rw=(await OCR.recognize(IMG.prep(s.canvas,0,st.rY-bh/2,s.w,bh,scale,true),{psm:11,whitelist:CODE_CHARS,progress:true})).map(w=>({...w,x:w.x/scale,w:w.w/scale}));
  return rowTokens(st,{words:rw})}

 /* Eigene Zeile eines Fotos lesen: erst mit Gitter, sonst Streifen */
 async function readRow(st,report){let toks=null;
  try{toks=await readGrid(st,report)}catch(x){console.warn(x)}
  if(!toks||!toks.length)toks=await readBands(st,report);
  st.nameLine=nearestLine(st,st.rY);
  if(!toks.length)throw new Error('In dieser Zeile wurden keine Dienste erkannt. Versuche ein schärferes Foto, etwas näher am Plan.');
  return toks}

 L.grid={photoPrep,analyse,detectMonth,findNameLine,nameWord,snap,rowTokens,readRow,daysIn};
})();
