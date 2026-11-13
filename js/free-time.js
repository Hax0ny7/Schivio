/* v1.0.63: Tage antippen → Kalender mit Tagesansicht; PDF markiert auch freie Zeiträume ab 2 Std.
   v1.0.62: Teilen – freie Zeiten finden und freie Tage als PDF (ohne Dienste und Termine) */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=(y,m,d)=>y+'-'+pad2(m+1)+'-'+pad2(d);
 const addDays=(k,n)=>{const t=new Date(k+'T12:00:00');t.setDate(t.getDate()+n);return key(t.getFullYear(),t.getMonth(),t.getDate())};
 const mm=t=>{const v=/^(\d\d):(\d\d)$/.exec(t||'');return v?Number(v[1])*60+Number(v[2]):null};
 const T=v=>Math.floor(v/60)+':'+pad2(v%60);
 const monthName=(y,m)=>new Date(y,m,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'});

 /* ---------- Regeln ---------- */
 const WIN_FROM=8*60,WIN_TO=22*60; // betrachteter Tag: 8 bis 22 Uhr
 const MIN_SLOT=120;               // freie Zeit erst ab 2 Stunden
 const BUF=30;                     // Weg zur Arbeit / nach Hause
 const REST=390;                   // nach Nachtdienst: Schlaf (6,5 Std. ab Dienstende)
 const FREE_CODES=['U','A'];       // Urlaub, Überstundenabbau = frei
 const BUSY_CODES=['K','T'];       // Krank, Fortbildung = ganzer Tag belegt
 const tmpl=c=>data.templates?.[c]||data.customShifts?.[c]||null;

 function eventIndex(){const idx={};for(const [k,list] of Object.entries(data.events||{})){if(!Array.isArray(list))continue;for(const e of list){const end=e.endDate&&e.endDate>k?e.endDate:k;let d=k,n=0;while(d<=end&&n<367){(idx[d]=idx[d]||[]).push({e,first:d===k,last:d===end});d=addDays(d,1);n++}}}return idx}
 function busy(k,EV){const out=[];
  const c=data.shifts?.[k];
  if(c&&!FREE_CODES.includes(c)){const t=tmpl(c),a=mm(t?.start),b=mm(t?.end);
   if(BUSY_CODES.includes(c)||a===null||b===null)out.push([0,1440]);else if(b>a)out.push([a-BUF,b+BUF]);else out.push([a-BUF,1440])}
  const p=data.shifts?.[addDays(k,-1)];
  if(p&&!FREE_CODES.includes(p)&&!BUSY_CODES.includes(p)){const t=tmpl(p),a=mm(t?.start),b=mm(t?.end);if(a!==null&&b!==null&&b<=a)out.push([0,b+REST])}
  for(const {e,first,last} of EV[k]||[]){if(e.allDay){out.push([0,1440]);continue}
   const s=mm(e.start),en=mm(e.end);const from=first?(s??0):0;let to=last?(en??(s!==null?s+60:1440)):1440;if(to<=from)to=first&&last?from+60:1440;out.push([from,to])}
  return out}
 function gaps(k,EV,notBefore){const lo=Math.max(WIN_FROM,notBefore||0);
  const iv=busy(k,EV).map(([a,b])=>[Math.max(lo,a),Math.min(WIN_TO,b)]).filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0]);
  let cur=lo;const g=[];for(const [a,b] of iv){if(a>cur)g.push([cur,a]);cur=Math.max(cur,b)}if(cur<WIN_TO)g.push([cur,WIN_TO]);
  return g.map(([a,b])=>[Math.ceil(a/15)*15,Math.floor(b/15)*15]).filter(([a,b])=>b-a>=MIN_SLOT)}
 const isFull=g=>g.length===1&&g[0][0]===WIN_FROM&&g[0][1]===WIN_TO;
 const todayKey=()=>{const t=new Date();return key(t.getFullYear(),t.getMonth(),t.getDate())};

 /* Freie Zeiten eines Monats (ab heute) */
 function analyse(y,m){const EV=eventIndex(),tk=todayKey(),now=new Date(),nowMin=now.getHours()*60+now.getMinutes()+30;const days=[];
  for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const k=key(y,m,d);const past=k<tk;const fullG=gaps(k,EV);
   const g=past?[]:(k===tk?gaps(k,EV,nowMin):fullG);const free=!past&&isFull(fullG);days.push({d,k,past,free,part:past||free?[]:fullG,gaps:g})}
  return days}
 const shortGap=([a,b])=>a===WIN_FROM?'bis '+T(b):b===WIN_TO?'ab '+T(a):T(a)+'–'+T(b);
 const gapText=([a,b])=>a===WIN_FROM&&b===WIN_TO?'ganztägig':a===WIN_FROM?'bis '+T(b)+' Uhr':b===WIN_TO?'ab '+T(a)+' Uhr':T(a)+' – '+T(b)+' Uhr';
 const dayLabel=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).replace(/\.,/,',');

 /* ---------- PDF (A4, nur freie Tage markiert) ---------- */
 const WR={' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':278,';':278,'?':556,'@':1015,A:667,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:500,K:667,L:556,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,a:556,b:556,c:500,d:556,e:556,f:278,g:556,h:556,i:222,j:222,k:500,l:222,m:833,n:556,o:556,p:556,q:556,r:333,s:500,t:278,u:556,v:500,w:722,x:500,y:500,z:500,'ß':611,'–':556,'·':278};
 const WB={...WR,'!':333,':':333,A:722,B:722,J:556,K:722,L:611,a:556,b:611,c:556,d:611,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556};
 const BASE={'ä':'a','ö':'o','ü':'u','Ä':'A','Ö':'O','Ü':'U','é':'e'};
 const tw=(s,size,bold)=>{const W=bold?WB:WR;let n=0;for(const ch of String(s)){const c=BASE[ch]||ch;n+=/[0-9]/.test(c)?556:(W[c]??556)}return n*size/1000};
 const WIN={'€':128,'„':132,'“':147,'”':148,'–':150,'—':151};
 function pstr(s){let o='';for(const ch of String(s)){let c=WIN[ch]??ch.charCodeAt(0);if(c>255)c=63;if(c===40||c===41||c===92)o+='\\'+ch;else if(c<32||c>126)o+='\\'+c.toString(8).padStart(3,'0');else o+=ch}return '('+o+')'}
 function buildPdf(y,m,days){const W=595.28,H=841.89,M=46;let c='';const n=v=>(Math.round(v*100)/100).toString();
  const rgb=h=>[1,3,5].map(i=>n(parseInt(h.slice(i,i+2),16)/255)).join(' ');
  const fill=h=>{c+=rgb(h)+' rg\n'};
  const rr=(x,yy,w,h,r)=>{const k=.5523*r,X=x,Y=H-yy-h;c+=[n(X+r),n(Y),'m',n(X+w-r),n(Y),'l',n(X+w-r+k),n(Y),n(X+w),n(Y+r-k),n(X+w),n(Y+r),'c',n(X+w),n(Y+h-r),'l',n(X+w),n(Y+h-r+k),n(X+w-r+k),n(Y+h),n(X+w-r),n(Y+h),'c',n(X+r),n(Y+h),'l',n(X+r-k),n(Y+h),n(X),n(Y+h-r+k),n(X),n(Y+h-r),'c',n(X),n(Y+r),'l',n(X),n(Y+r-k),n(X+r-k),n(Y),n(X+r),n(Y),'c','h','f'].join(' ')+'\n'};
  const text=(s,x,yy,size,bold,color,align)=>{const w=tw(s,size,bold);const X=align==='c'?x-w/2:align==='r'?x-w:x;fill(color);c+='BT /'+(bold?'F2':'F1')+' '+size+' Tf '+n(X)+' '+n(H-yy)+' Td '+pstr(s)+' Tj ET\n'};
  const ACC='#16a37f',ACC2='#0e7c66',INK='#16181c',MUT='#6b7280';
  const free=days.filter(x=>x.free).length,part=days.filter(x=>x.part.length).length;
  // Kopf
  fill(ACC);rr(M,M,30,30,9);text('S',M+15,M+21.5,17,true,'#ffffff','c');
  text('Schivio',M+40,M+20,13,true,INK);
  text('Erstellt am '+new Date().toLocaleDateString('de-DE'),W-M,M+20,9.5,false,MUT,'r');
  text('Freie Tage',M,M+82,30,true,INK);
  const mn=new Date(y,m,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  text(mn,M,M+108,16,false,MUT);
  const pill=free+(free===1?' freier Tag':' freie Tage')+(part?' · '+part+' teilweise':'');const pw=tw(pill,11,true)+28;
  fill('#e3f5ee');rr(W-M-pw,M+88,pw,28,14);text(pill,W-M-pw/2,M+106,11,true,ACC2,'c');
  // Raster
  const gx=M,gw=W-2*M,gap=7,cw=(gw-gap*6)/7;let top=M+150;
  ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach((t,i)=>text(t,gx+i*(cw+gap)+cw/2,top,10,true,MUT,'c'));top+=14;
  const first=(new Date(y,m,1).getDay()+6)%7,count=days.length,rows=Math.ceil((first+count)/7);
  const ch=Math.min(92,(H-top-120-gap*(rows-1))/rows);
  for(let i=0;i<rows*7;i++){const d=i-first+1;const x=gx+(i%7)*(cw+gap),yy=top+Math.floor(i/7)*(ch+gap);
   if(d<1||d>count)continue;const D=days[d-1];
   if(D.free){fill(ACC);rr(x,yy,cw,ch,11);text(String(d),x+11,yy+24,17,true,'#ffffff');text('frei',x+cw-11,yy+ch-12,11,true,'#ffffff','r')}
   else if(D.part.length){fill('#d7f3e8');rr(x,yy,cw,ch,11);text(String(d),x+11,yy+24,15,true,ACC2);
    const L=D.part.map(shortGap);const show=L.length>2?[L[0],'+'+(L.length-1)+' weitere']:L;show.forEach((s,i)=>text(s,x+cw-9,yy+ch-12-(show.length-1-i)*12,8.5,true,ACC2,'r'))}
   else if(D.past){fill('#f7f7f8');rr(x,yy,cw,ch,11);text(String(d),x+11,yy+24,15,false,'#c3c6cc')}
   else{fill('#f1f2f4');rr(x,yy,cw,ch,11);text(String(d),x+11,yy+24,15,false,'#8a9099')}}
  // Legende
  const ly=top+rows*(ch+gap)+22;fill(ACC);rr(M,ly-11,14,14,4);text('Ganztägig frei (8 bis 22 Uhr)',M+22,ly,10.5,false,INK);
  const lx=M+22+tw('Ganztägig frei (8 bis 22 Uhr)',10.5,false)+26;fill('#d7f3e8');rr(lx,ly-11,14,14,4);text('Teilweise frei – Uhrzeit = freier Zeitraum (mind. 2 Std.)',lx+22,ly,10.5,false,INK);
  text('Grau = nicht frei. Dienste und Termine werden aus Datenschutzgründen nicht angezeigt.',M,ly+18,9.5,false,MUT);
  text('Erstellt mit Schivio · Dein Dienstplan. Dein Gehalt.',W/2,H-M+8,8.5,false,'#9ca3af','c');
  // Datei zusammensetzen
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
   '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
   '<< /Length '+c.length+' >>\nstream\n'+c+'endstream',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
   '<< /Title '+pstr('Freie Tage '+mn)+' /Producer (Schivio) >>'];
  let out='%PDF-1.4\n';const off=[];objs.forEach((o,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});
  const xref=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R /Info 7 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  const b=new Uint8Array(out.length);for(let i=0;i<out.length;i++)b[i]=out.charCodeAt(i)&255;return b}
 function download(file){const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 function pdfFile(y,m){return new File([buildPdf(y,m,analyse(y,m))],'Schivio-freie-Tage-'+y+'-'+pad2(m+1)+'.pdf',{type:'application/pdf'})}
 async function sharePdf(y,m){const f=pdfFile(y,m);
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Freie Tage '+monthName(y,m)});return}}catch(e){if(e&&e.name==='AbortError')return}
  download(f);toast('PDF gespeichert – du findest es in deinen Downloads.')}
 async function shareText(t){try{if(navigator.share){await navigator.share({text:t});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(t);toast('Kopiert – füge die Zeiten jetzt in einen Chat ein.')}catch(e){toast('Teilen ist auf diesem Gerät nicht möglich.')}}

 /* ---------- Fenster ---------- */
 const IC={
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14.5l2 2 4-4.5"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/></svg>',
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 15l2.2 2.2 4.8-4.7"/></svg>'};
 const chev='<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
 let Y,Mo;
 const minYM=()=>{const t=new Date();return [t.getFullYear(),t.getMonth()]};
 const cmp=(a,b)=>a[0]*12+a[1]-(b[0]*12+b[1]);
 function shift(d){const t=new Date(Y,Mo+d,1);const n=[t.getFullYear(),t.getMonth()];if(cmp(n,minYM())<0||cmp(n,minYM())>12)return false;Y=n[0];Mo=n[1];return true}
 const monthBar=()=>'<div class="ft-mon"><button type="button" class="ib" data-x="prev" aria-label="Voriger Monat"'+(cmp([Y,Mo],minYM())<=0?' disabled':'')+'>'+IC.l+'</button><b>'+esc(monthName(Y,Mo))+'</b><button type="button" class="ib" data-x="next" aria-label="Nächster Monat">'+IC.r+'</button></div>';

 function menu(){const node=el('<div>'+DS.head('Teilen','Freie Zeit finden')+monthBar()+
   '<div class="ls ft-opts"><button type="button" class="r" data-x="slots"><i class="ft-ic">'+IC.clock+'</i><span>Freie Zeiten anzeigen<small>Wann du dich in diesem Monat verabreden kannst</small></span>'+chev+'</button>'+
   '<button type="button" class="r" data-x="pdf"><i class="ft-ic">'+IC.pdf+'</i><span>Freie Tage als PDF<small>Monatskalender mit markierten freien Tagen – ohne Dienste und Termine</small></span>'+chev+'</button></div>'+
   '<p class="nt">Schivio berücksichtigt deine Dienste und Termine. Was du davon teilst, entscheidest du selbst.</p></div>');
  DS.wire(node,{prev:()=>{if(shift(-1))DS.swap(menu(),-1)},next:()=>{if(shift(1))DS.swap(menu(),1)},slots:()=>DS.swap(slots(),1),pdf:()=>DS.swap(pdfView(),1)});return node}

 function slots(){const days=analyse(Y,Mo).filter(x=>x.gaps.length);const full=days.filter(x=>isFull(x.gaps)).length;
  let h=DS.head(monthName(Y,Mo),'Freie Zeiten',{back:true})+monthBar();
  if(!days.length)h+='<div class="ft-empty">'+IC.cal+'<b>Keine freien Zeiten gefunden</b><span>In diesem Monat ist zwischen 8 und 22 Uhr kein Zeitraum von mindestens 3 Stunden frei.</span></div>';
  else{h+='<div class="kp"><div class="big"><b>'+days.length+'</b><small>'+(days.length===1?'Tag':'Tage')+' mit freier Zeit · '+full+' davon ganztägig</small></div></div>';
   h+='<div class="ls ft-days">'+days.map(x=>{const f=isFull(x.gaps);return '<button type="button" class="r'+(f?' ft-full':'')+'" data-x="day" data-k="'+x.k+'"><span class="ft-d">'+esc(dayLabel(x.k))+'</span><b>'+x.gaps.map(g=>'<em>'+esc(gapText(g))+'</em>').join('')+'</b>'+chev+'</button>'}).join('')+'</div>';
   h+='<div class="ac"><button type="button" class="bt pr" data-x="share">'+IC.share+'Zeiten teilen</button></div>'}
  h+='<p class="nt">Berücksichtigt werden Dienste mit 30 Minuten Weg davor und danach, nach einem Nachtdienst Schlaf bis zum Mittag, sowie alle Termine. Gezeigt werden freie Zeiträume ab 2 Stunden zwischen 8 und 22 Uhr. Tippe auf einen Tag, um ihn im Kalender zu öffnen.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,{day:b=>goDay(b.dataset.k),back:()=>DS.swap(menu(),-1),prev:()=>{if(shift(-1))DS.swap(slots(),-1)},next:()=>{if(shift(1))DS.swap(slots(),1)},
   share:()=>{const txt='Meine freien Zeiten im '+monthName(Y,Mo)+':\n'+days.map(x=>dayLabel(x.k)+' – '+x.gaps.map(gapText).join(', ')).join('\n')+'\n\nErstellt mit Schivio';shareText(txt)}});
  return node}

 function pdfView(){const days=analyse(Y,Mo);const free=days.filter(x=>x.free).length,part=days.filter(x=>x.part.length).length;const first=(new Date(Y,Mo,1).getDay()+6)%7;
  let g='<div class="ft-grid" aria-hidden="true">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(t=>'<span class="wd">'+t+'</span>').join('')+'<span></span>'.repeat(first)+days.map(x=>'<span class="dy'+(x.free?' on':x.part.length?' part':'')+(x.past?' past':'')+'">'+x.d+'</span>').join('')+'</div>';
  let h=DS.head(monthName(Y,Mo),'Freie Tage als PDF',{back:true})+monthBar()+'<div class="ft-prev">'+g+'<p><b>'+free+'</b> ganztägig · <b>'+part+'</b> teilweise frei</p><div class="ft-leg"><span><i class="on"></i>ganztägig frei</span><span><i class="part"></i>teilweise frei (mit Uhrzeit)</span></div></div>';
  h+='<div class="ac"><button type="button" class="bt" data-x="save">'+IC.dl+'Speichern</button><button type="button" class="bt pr" data-x="send">'+IC.share+'PDF teilen</button></div>';
  h+='<p class="nt">Dunkelgrün: Tage ohne Dienst und Termin zwischen 8 und 22 Uhr. Hellgrün: Tage mit mindestens 2 Stunden freier Zeit – im PDF steht dazu die Uhrzeit, z. B. „ab 15:00“. Dienste und Termine selbst sind nicht zu sehen.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,{back:()=>DS.swap(menu(),-1),prev:()=>{if(shift(-1))DS.swap(pdfView(),-1)},next:()=>{if(shift(1))DS.swap(pdfView(),1)},
   send:()=>sharePdf(Y,Mo),save:()=>{download(pdfFile(Y,Mo));toast('PDF gespeichert – du findest es in deinen Downloads.')}});
  return node}

 /* Tag im Kalender öffnen – mit Tagesansicht (Dienste, Termine, Termin hinzufügen) */
 function goDay(k){const t=new Date(k+'T12:00:00');try{$('tabPlan')?.click()}catch(e){}try{shown=new Date(t.getFullYear(),t.getMonth(),1);render()}catch(e){}setTimeout(()=>DS.open(k),60)}
 function open(){const s=typeof shown!=='undefined'?[shown.getFullYear(),shown.getMonth()]:minYM();const n=cmp(s,minYM())<0||cmp(s,minYM())>12?minYM():s;Y=n[0];Mo=n[1];DS.node(menu)}

 /* ---------- Reiter „Teilen“ ---------- */
 const panel=$('sharePanel');
 if(panel){panel.innerHTML='<div class="ft-hero"><div class="ft-art">'+IC.cal+'</div><h2>Gemeinsam Zeit finden</h2><p>Schichtdienst und Verabredungen passen selten zusammen. Schivio sucht dir die freien Zeiten aus deinem Kalender heraus – zum Teilen mit Familie und Freunden.</p><button type="button" class="ft-go" id="freeTimeOpen">'+IC.clock+'Freie Zeiten finden</button></div><p class="ft-soon">Gemeinsame Kalender für Paare und Familien folgen mit Schivio Pro.</p>';
  $('freeTimeOpen').addEventListener('click',()=>{try{navigator.vibrate&&navigator.vibrate(7)}catch(e){}open()})}
 window.SchivioFreeTime={open,analyse,buildPdf};
})();
