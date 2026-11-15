/* Dienstplan-Import · Teil 2: Bild aufbereiten
   Reine Bildbearbeitung, ohne Texterkennung und ohne Oberfläche:
   Graustufen, Schräglage, Zellen ausschneiden und für die Texterkennung lesbar machen.
   Stellt bereit: SchivioImportLib.image = { median, gray, paperLevel, prep, skewOf, rotate, rotateWords, cell } */
(function(){
 const L=window.SchivioImportLib=window.SchivioImportLib||{};

 /* ---------- Einstellungen ---------- */
 const SKEW_MAX=7,SKEW_STEP=.25;   // gesuchte Schräglage in Grad (± SKEW_MAX)
 const CELL_INSET_X=.08,CELL_INSET_Y=.1; // Zellrand weglassen (Anteil der Zellbreite/-höhe), dort liegen Gitterlinien
 const CELL_EMPTY_SPREAD=40;       // weniger Helligkeitsunterschied → Zelle ist leer
 const CELL_MIN_INK=.012;          // weniger als 1,2 % Schrift → Zelle ist leer
 const DARK_BG_MAX=215,DARK_BG_MIN=110; // kräftige dunkle Zellfarbe (Blau, Rot) → weiße Schrift erwartet
 const BW_THRESHOLD=140;           // Schwarz-Weiß-Grenze nach dem Kontrast-Strecken
 const TARGET_TEXT_PX=46;          // Schrifthöhe, auf die vergrößert wird (Texterkennung mag ca. 30–50 px)
 const PAD=40;                     // weißer Rand um jede Zelle

 const median=a=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};

 /* Ausschnitt als Graustufen: hellster Farbkanal (schwarze Schrift auf gelb/rot/blau bleibt dunkel, Farbe wird hell) */
 function gray(src,x,y,w,h){x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
  const d=src.getContext('2d',{willReadFrequently:true}).getImageData(x,y,w,h).data;const v=new Uint8Array(w*h);
  for(let i=0,j=0;i<v.length;i++,j+=4)v[i]=Math.max(d[j],d[j+1],d[j+2]);return {x,y,W:w,H:h,v}}
 /* Helligkeit des Papiers (Median) */
 function paperLevel(v){const h=new Uint32Array(256);for(const a of v)h[a]++;let acc=0;for(let i=0;i<256;i++){acc+=h[i];if(acc>v.length/2)return i}return 200}

 /* Ausschnitt entfärben, Kontrast strecken, optional Gitterlinien entfernen (für das Lesen ganzer Streifen) */
 function prep(src,sx,sy,sw,sh,scale,removeLines){sx=Math.max(0,Math.round(sx));sy=Math.max(0,Math.round(sy));sw=Math.min(src.width-sx,Math.round(sw));sh=Math.min(src.height-sy,Math.round(sh));
  const W=Math.max(1,Math.round(sw*scale)),H=Math.max(1,Math.round(sh*scale));const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
  g.imageSmoothingQuality='high';g.drawImage(src,sx,sy,sw,sh,0,0,W,H);const id=g.getImageData(0,0,W,H),d=id.data,n=W*H;const v=new Uint8ClampedArray(n);const hist=new Uint32Array(256);
  for(let i=0,j=0;i<n;i++,j+=4){const m=Math.max(d[j],d[j+1],d[j+2]);v[i]=m;hist[m]++}
  let lo=0,hi=255,acc=0;for(let i=0;i<256;i++){acc+=hist[i];if(acc>n*.02){lo=i;break}}acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>n*.35){hi=i;break}}if(hi-lo<30)lo=Math.max(0,hi-60);
  const k=255/Math.max(1,hi-lo);for(let i=0;i<n;i++)v[i]=Math.max(0,Math.min(255,(v[i]-lo)*k));
  if(removeLines){const thr=110;
   const col=new Uint32Array(W);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(v[y*W+x]<thr)col[x]++;
   for(let x=0;x<W;x++)if(col[x]>H*.62)for(let y=0;y<H;y++)v[y*W+x]=255;           // senkrechte Linien
   const row=new Uint32Array(H);for(let y=0;y<H;y++){let s=0;for(let x=0;x<W;x++)if(v[y*W+x]<thr)s++;row[y]=s}
   for(let y=0;y<H;y++)if(row[y]>W*.45)for(let x=0;x<W;x++)v[y*W+x]=255}         // waagerechte Linien
  for(let i=0,j=0;i<n;i++,j+=4){d[j]=d[j+1]=d[j+2]=v[i];d[j+3]=255}g.putImageData(id,0,0);return c}

 /* Schräglage aus den Wortpositionen schätzen: der Winkel, bei dem die Wörter am saubersten in Zeilen liegen */
 function skewOf(words){if(words.length<6)return 0;const bin=Math.max(2,(median(words.map(w=>w.h))||12)*.45);let best=0,bs=-1;
  for(let a=-SKEW_MAX;a<=SKEW_MAX+.001;a+=SKEW_STEP){const t=Math.tan(a*Math.PI/180);const m=new Map();
   for(const w of words){const k=Math.round((w.y+w.h/2-t*(w.x+w.w/2))/bin);m.set(k,(m.get(k)||0)+1)}
   let s=0;for(const v of m.values())s+=v*v;if(s>bs){bs=s;best=a}}
  return best}
 function rotate(src,deg){if(Math.abs(deg)<.15)return src;const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.translate(c.width/2,c.height/2);g.rotate(deg*Math.PI/180);g.drawImage(src,-src.width/2,-src.height/2);return c}
 function rotateWords(words,deg,W,H){if(Math.abs(deg)<.15)return words;const r=deg*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),cx=W/2,cy=H/2;
  return words.map(w=>{const x=w.x+w.w/2-cx,y=w.y+w.h/2-cy;return {...w,x:x*cs-y*sn+cx-w.w/2,y:x*sn+y*cs+cy-w.h/2}})}

 /* Reste von Gitterlinien entfernen: alles Schwarze, das den Zellrand berührt */
 function clearBorder(px,W,H){const seen=new Uint8Array(W*H),q=[];const blk=i=>px[i*4]===0;
  const push=i=>{if(!seen[i]&&blk(i)){seen[i]=1;q.push(i)}};for(let x=0;x<W;x++){push(x);push((H-1)*W+x)}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1)}
  let total=0;for(let i=0;i<W*H;i++)if(blk(i))total++;
  const rm=[];while(q.length){const i=q.pop();rm.push(i);const x=i%W,y=(i/W)|0;if(x>0)push(i-1);if(x<W-1)push(i+1);if(y>0)push(i-W);if(y<H-1)push(i+W)}
  if(rm.length<total*.85)for(const i of rm)px[i*4]=px[i*4+1]=px[i*4+2]=255}

 /* Eine Tabellenzelle ausschneiden und für die Texterkennung vorbereiten.
    Ergebnis: Canvas mit schwarzer Schrift auf Weiß – oder null, wenn die Zelle leer ist. */
 function cell(src,x0,x1,y0,y1){const w=x1-x0,h=y1-y0;const ix=w*CELL_INSET_X,iy=h*CELL_INSET_Y;
  const X=Math.max(0,Math.round(x0+ix)),Y=Math.max(0,Math.round(y0+iy)),CW=Math.max(1,Math.round(w-2*ix)),CH=Math.max(1,Math.round(h-2*iy));
  const d=src.getContext('2d',{willReadFrequently:true}).getImageData(X,Y,CW,CH).data;const n=CW*CH;
  /* 1. Farbkanal wählen: hellster Kanal (schwarze Schrift auf Farbe) oder dunkelster (weiße Schrift auf Blau/Rot) */
  const vMax=new Uint8Array(n),vMin=new Uint8Array(n);for(let i=0,j=0;i<n;i++,j+=4){vMax[i]=Math.max(d[j],d[j+1],d[j+2]);vMin[i]=Math.min(d[j],d[j+1],d[j+2])}
  const stats=v=>{const h=new Uint32Array(256);for(const a of v)h[a]++;let acc=0,lo=-1,mid=-1,hi=255;
   for(let i=0;i<256;i++){acc+=h[i];if(lo<0&&acc>n*.01)lo=i;if(mid<0&&acc>n*.5)mid=i;if(acc>n*.99){hi=i;break}}lo=Math.max(0,lo);mid=Math.max(0,mid);return {lo,mid,hi,sp:hi-lo}};
  const sa=stats(vMax),sb=stats(vMin);const useMin=sa.mid<DARK_BG_MAX&&sb.mid<DARK_BG_MIN;const v=useMin?vMin:vMax,S=useMin?sb:sa;
  if(S.sp<CELL_EMPTY_SPREAD)return null;
  /* 2. Ist die Schrift dunkel oder hell? */
  const lim=S.sp*.35;let dk=0,br=0;for(const a of v){if(a<S.mid-lim)dk++;else if(a>S.mid+lim)br++}
  const inv=br>dk;if((inv?br:dk)/n<CELL_MIN_INK)return null;
  /* 3. Schwarz-Weiß, Linienreste am Rand entfernen */
  const t=document.createElement('canvas');t.width=CW;t.height=CH;const tg=t.getContext('2d');const id=tg.createImageData(CW,CH);
  const lo=inv?S.mid:S.lo,hi=inv?S.hi:S.mid;
  for(let i=0,j=0;i<n;i++,j+=4){let a=(v[i]-lo)/Math.max(1,hi-lo)*255;a=Math.max(0,Math.min(255,a));if(inv)a=255-a;a=a>BW_THRESHOLD?255:0;id.data[j]=id.data[j+1]=id.data[j+2]=a;id.data[j+3]=255}
  clearBorder(id.data,CW,CH);
  /* 4. Nur das Schriftband nehmen, das der Zellmitte am nächsten liegt (schneidet z. B. „Mehrarbeit“ darunter ab) */
  const ink=new Uint32Array(CH);for(let y=0;y<CH;y++){let c=0;for(let x=0;x<CW;x++)if(id.data[(y*CW+x)*4]===0)c++;ink[y]=c}
  const runs=[],gap=Math.max(2,Math.round(CH*.06));let y=0;
  while(y<CH){if(ink[y]){let e=y,z=y;while(z<CH&&(ink[z]||z-e<=gap)){if(ink[z])e=z;z++}runs.push([y,e]);y=z}else y++}
  if(!runs.length)return null;
  const mid=CH/2,dist=r=>r[0]<=mid&&r[1]>=mid?0:Math.min(Math.abs(r[0]-mid),Math.abs(r[1]-mid));runs.sort((a,b)=>dist(a)-dist(b));
  const [r0,r1]=runs[0];if(r1-r0<2)return null;const top=Math.max(0,r0-3),bot=Math.min(CH,r1+4),bh=bot-top;
  tg.putImageData(id,0,0);
  /* 5. Weich vergrößern und mit weißem Rand versehen */
  const k=Math.max(1.5,Math.min(6,TARGET_TEXT_PX/Math.max(6,bh)));const W=Math.round(CW*k)+PAD*2,H=Math.round(bh*k)+PAD*2;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.imageSmoothingQuality='high';
  g.drawImage(t,0,top,CW,bh,PAD,PAD,W-PAD*2,H-PAD*2);return c}

 L.image={median,gray,paperLevel,prep,skewOf,rotate,rotateWords,cell};
})();
