/* v1.0.78: Dienstplan-Import · Teil 5: Kalender- und Tabellendateien (am genauesten)
   - Kalenderdatei (.ics) aus dem Mitarbeiterportal: jeder Termin = ein Tag mit Titel und Uhrzeit
   - Excel (.xlsx) oder CSV, zwei Aufbauten werden erkannt:
     a) Liste: eine Spalte mit Datum, eine mit dem Dienst (optional eine Spalte mit Namen → Person wählen)
     b) Plan-Tabelle: eine Zeile mit Tageszahlen 1 … 31, eine Zeile pro Person → eigene Zeile wählen
   Danach wie beim Foto: Kürzel zuordnen → Vorschau → übernehmen (mit „Rückgängig“).
   Datenschutz: Die Datei wird nur hier im Arbeitsspeicher gelesen und nicht gespeichert.
   Gespeichert werden nur die übernommenen Dienste, die Kürzel-Zuordnung und das Namens-Stichwort. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const toDate=k=>new Date(k+'T12:00:00');
 const addDays=(k,n)=>{const t=toDate(k);t.setDate(t.getDate()+n);return key(t)};
 const today=()=>key(new Date());
 const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const IC={
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="m5 12 5 5 9-10"/></svg>'
 };
 const lib=()=>window.SchivioImport&&window.SchivioImport.lib;
 const refresh=()=>{try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}};
 const s=v=>v==null?'':String(v).trim();

 let st=null,back=null;
 function busy(t){return el('<div>'+DS.head('Dienstplan-Import','Einen Moment …')+'<div class="ip-busy"><i></i><span>'+esc(t)+'</span></div></div>')}
 function fail(x){console.warn(x);const b=back;st=null;DS.swap(b(),-1);setTimeout(()=>{const er=DS.view()?.querySelector('[data-err]');if(er)er.innerHTML=IC.warn+'<span>'+esc(x&&x.message||'Die Datei konnte nicht gelesen werden.')+'</span>'},60)}

 /* ---------- Datei lesen ---------- */
 async function readText(f){const buf=await f.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('�'))t=new TextDecoder('windows-1252').decode(buf);return t.replace(/^﻿/,'')}
 async function load(file,backFn){back=backFn;const name=(file.name||'').toLowerCase(),type=file.type||'';
  DS.swap(busy('Datei wird gelesen …'),1);
  try{
   if(file.size>15e6)throw new Error('Die Datei ist zu groß.');
   if(/\.(ics|ical|icalendar|ifb)$/.test(name)||/calendar/.test(type)){const items=fromIcs(await readText(file));if(!items.length)throw new Error('In der Kalenderdatei wurden keine Termine gefunden.');st={kind:'ics',items};DS.swap(mapView(),1);return}
   if(/\.xls$/.test(name))throw new Error('Alte Excel-Dateien (.xls) kann Schivio nicht lesen. Bitte in Excel als .xlsx oder .csv speichern.');
   let rows;
   if(/\.(xlsx|xlsm)$/.test(name)||/spreadsheetml/.test(type))rows=await readXlsx(file);
   else rows=parseCsv(await readText(file));
   rows=rows.map(r=>r.map(v=>typeof v==='number'?v:s(v))).filter(r=>r.some(v=>v!==''));
   if(rows.length<2)throw new Error('In der Tabelle wurden keine Daten gefunden.');
   table(rows)}
  catch(x){fail(x)}}

 /* ---------- Kalenderdatei (.ics) ---------- */
 /* v1.0.99: nutzt den gemeinsamen Kalender-Leser aus import-cal.js (kann auch Wiederholungen, Zeitzonen, Ausnahmen) */
 function fromIcs(txt){const I=window.SchivioCalImport?.ics;if(!I)throw new Error('Kalender-Leser nicht geladen.');
  const r=I.build(I.parse(txt),addDays(today(),-400),addDays(today(),400)),out=[];
  for(const o of r.items){const days=[o.k];/* ganztägige Termine über mehrere Tage (z. B. Urlaub) auf jeden Tag verteilen */if(o.ad&&o.endK){let k=addDays(o.k,1);while(k<=o.endK&&days.length<31){days.push(k);k=addDays(k,1)}}
   for(const k of days)out.push({k,t:o.title.slice(0,40),time:o.ad?'':o.s})}
  /* gleicher Titel, aber verschiedene Uhrzeiten (z. B. alles heißt „Dienst“) → nach Beginn trennen, damit Früh/Spät/Nacht unterscheidbar sind */
  const times={};out.forEach(o=>{(times[o.t]=times[o.t]||new Set()).add(o.time||'')});
  out.forEach(o=>{const set=times[o.t];if(set.size>1&&set.size<=6&&!set.has(''))o.t=o.t.slice(0,30)+' '+o.time});
  return out.sort((a,b)=>a.k<b.k?-1:a.k>b.k?1:(a.time||'')<(b.time||'')?-1:1)}

 /* ---------- CSV ---------- */
 function parseCsv(txt){const first=txt.split(/\r?\n/).slice(0,8).join('\n');
  const cnt=c=>first.split(c).length;const d=[';','\t',','].sort((a,b)=>cnt(b)-cnt(a))[0];
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<txt.length;i++){const ch=txt[i];
   if(q){if(ch==='"'){if(txt[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch;continue}
   if(ch==='"'&&cell==='')q=true;else if(ch===d){row.push(cell);cell=''}
   else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
   else cell+=ch}
  if(cell!==''||row.length){row.push(cell);rows.push(row)}
  return rows}

 /* ---------- Excel (.xlsx = ZIP mit XML) ---------- */
 async function inflate(bytes){if(typeof DecompressionStream==='undefined')throw new Error('Dieses Gerät kann Excel-Dateien nicht öffnen. Bitte den Plan als CSV speichern.');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())}
 async function unzip(buf){const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error('Die Excel-Datei ist beschädigt.');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};const dec=new TextDecoder();
  for(let j=0;j<n&&dv.getUint32(p,true)===0x02014b50;j++){const method=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
   const name=dec.decode(u8.subarray(p+46,p+46+nl));files[name]={method,cs,lho};p+=46+nl+xl+cl}
  return async name=>{const f=files[name];if(!f)return null;const start=f.lho+30+dv.getUint16(f.lho+26,true)+dv.getUint16(f.lho+28,true);const raw=u8.subarray(start,start+f.cs);
   const data=f.method===0?raw:f.method===8?await inflate(raw):null;if(!data)throw new Error('Die Excel-Datei ist verschlüsselt oder ungewöhnlich gepackt.');return dec.decode(data)}}
 const xml=t=>new DOMParser().parseFromString(t,'application/xml');
 const tags=(n,t)=>[...n.getElementsByTagNameNS('*',t)];
 function colIdx(r){const m=/^([A-Z]+)/.exec(r||'');if(!m)return -1;let n=0;for(const c of m[1])n=n*26+c.charCodeAt(0)-64;return n-1}
 async function readXlsx(file){const get=await unzip(await file.arrayBuffer());
  let path='xl/worksheets/sheet1.xml';
  try{const wb=xml(await get('xl/workbook.xml')),rels=xml(await get('xl/_rels/workbook.xml.rels'));const sh=tags(wb,'sheet')[0];
   const id=sh&&(sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
   const rel=tags(rels,'Relationship').find(r=>r.getAttribute('Id')===id);if(rel){const t=rel.getAttribute('Target');path=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'')}}catch(e){}
  const shared=[];const ss=await get('xl/sharedStrings.xml');if(ss)tags(xml(ss),'si').forEach(si=>shared.push(tags(si,'t').filter(t=>t.parentNode.localName!=='rPh').map(t=>t.textContent).join('')));
  const sx=await get(path);if(!sx)throw new Error('In der Excel-Datei wurde keine Tabelle gefunden.');
  const rows=[];
  for(const r of tags(xml(sx),'row')){const out=[];let ci=0;
   for(const c of tags(r,'c')){const i=colIdx(c.getAttribute('r'));if(i>=0)ci=i;if(ci>400)break;const t=c.getAttribute('t'),v=tags(c,'v')[0]?.textContent??'';
    let val;if(t==='s')val=shared[Number(v)]??'';else if(t==='inlineStr')val=tags(c,'t').map(x=>x.textContent).join('');else if(t==='str'||t==='b'||t==='e')val=v;else val=v===''?'':Number(v);
    while(out.length<ci)out.push('');out[ci]=val;ci++}
   const ri=Number(r.getAttribute('r'))-1;while(ri>rows.length&&rows.length<5000)rows.push([]);rows.push(out)}
  return rows}

 /* ---------- Tabellen verstehen ---------- */
 function asDate(v){if(typeof v==='number'){if(v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);return d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate())}return null}
  let m=/(?:^|\D)(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?!\d)/.exec(v);if(m){const y=m[3].length===2?2000+Number(m[3]):Number(m[3]);const d=+m[1],mo=+m[2];if(mo>=1&&mo<=12&&d>=1&&d<=31&&y>1990&&y<2100)return y+'-'+pad2(mo)+'-'+pad2(d)}
  m=/(\d{4})-(\d{2})-(\d{2})/.exec(v);if(m)return m[1]+'-'+m[2]+'-'+m[3];return null}
 function asDay(v){if(typeof v==='number')return Number.isInteger(v)&&v>=1&&v<=31?v:(asDate(v)?Number(asDate(v).slice(8)):0);
  const m=/^(?:(?:mo|di|mi|do|fr|sa|so)[a-z]*\.?,?\s*)?(\d{1,2})\.?(?:\s*(?:mo|di|mi|do|fr|sa|so)[a-z]*\.?)?$/i.exec(v);if(m){const d=+m[1];return d>=1&&d<=31?d:0}
  const k=asDate(v);return k?Number(k.slice(8)):0}
 const cols=rows=>Math.max(...rows.map(r=>r.length));
 function table(rows){const nc=cols(rows);
  /* a) Liste mit Datumsspalte */
  let best=-1,bn=0;for(let c=0;c<nc;c++){const n=rows.filter(r=>r[c]!==''&&r[c]!=null&&asDate(r[c])).length;if(n>bn){bn=n;best=c}}
  if(best>=0&&bn>=3&&bn>=rows.length*.4){st={kind:'list',rows,dc:best};st.head=asDate(rows[0][best])?null:rows[0];st.body=st.head?rows.slice(1):rows;st.sc=guessShiftCol();DS.swap(colView(),1);return}
  /* b) Plan-Tabelle mit Tageszahlen */
  let hi=-1,hm=null;for(let i=0;i<Math.min(rows.length,20);i++){const map={};let last=0,ok=0;
   rows[i].forEach((v,c)=>{if(v===''||v==null)return;const d=asDay(v);if(d&&d>last){map[c]=d;ok++;last=d}});
   if(ok>=20&&(!hm||ok>Object.keys(hm).length)){hi=i;hm=map}}
  if(hi<0)throw new Error('Schivio hat keine Datumsspalte und keine Zeile mit Tageszahlen (1, 2, 3 …) gefunden. Ist das der Dienstplan?');
  st={kind:'grid',rows,hi,hm};
  /* Monat: aus Datumsangaben in der Kopfzeile, sonst aus „November 2026“ o. Ä. oben im Plan */
  const firstC=Object.keys(hm).map(Number).sort((a,b)=>a-b);const dk=asDate(rows[hi][firstC[0]]);
  let y,m;if(dk){y=+dk.slice(0,4);m=+dk.slice(5,7)-1;st.monthAuto=true}
  else{const top=rows.slice(0,hi+1).map(r=>r.join(' ')).join(' ');const re=new RegExp('('+MON.join('|')+'|'+MON.map(x=>x.slice(0,3)).join('|')+')[a-zä]*\\.?\\s*(\\d{4})','i');const mm=re.exec(top);
   if(mm){m=MON.findIndex(x=>x.slice(0,3).toLowerCase()===mm[1].slice(0,3).toLowerCase());y=+mm[2];st.monthAuto=true}
   else{const n=new Date();y=n.getFullYear();m=n.getMonth();if(n.getDate()>15){m++;if(m>11){m=0;y++}}}}
  st.y=y;st.m=m;st.firstC=firstC[0];
  st.people=rows.map((r,i)=>({i,label:r.slice(0,st.firstC).map(s).filter(Boolean).join(' '),n:firstC.filter(c=>s(r[c])).length})).filter(p=>p.i!==st.hi&&p.n>0&&p.label&&!asDay(p.label));
  if(!st.people.length)throw new Error('Im Plan wurden keine Zeilen mit Diensten gefunden.');
  const nm=(lib()?.cfg().name||'').toLowerCase();const own=nm?st.people.find(p=>p.label.toLowerCase().includes(nm)):null;st.row=own?own.i:null;
  DS.swap(rowView(),1)}

 /* Liste: welche Spalte ist der Dienst? */
 function guessShiftCol(){const nc=cols(st.body);let best=-1,score=-1;
  for(let c=0;c<nc;c++){if(c===st.dc)continue;const v=st.body.map(r=>s(r[c])).filter(Boolean);if(!v.length)continue;
   const h=s(st.head?.[c]);let sc=v.filter(x=>x.length<=12&&!asDate(x)).length/v.length+(/dienst|schicht|kürzel|kuerzel|code|art/i.test(h)?2:0)-(/name|mitarbeiter|person/i.test(h)?2:0);
   const uniq=new Set(v.map(x=>x.toUpperCase())).size;if(uniq>40)sc-=1;if(sc>score){score=sc;best=c}}
  return best}
 const samples=c=>[...new Set(st.body.map(r=>s(r[c])).filter(Boolean))].slice(0,5).join(' · ');
 function colView(){const nc=cols(st.body);const list=[];for(let c=0;c<nc;c++)if(c!==st.dc&&st.body.some(r=>s(r[c])))list.push(c);
  const lbl=c=>s(st.head?.[c])||('Spalte '+String.fromCharCode(65+Math.min(c,25)));
  const node=el('<div>'+DS.head('Dienstplan-Import','Spalte wählen',{back:true})+
   '<p class="ip-p">Schivio hat '+st.body.filter(r=>asDate(r[st.dc])).length+' Tage in der Spalte „'+esc(lbl(st.dc))+'“ gefunden. In welcher Spalte steht dein Dienst?</p>'+
   '<div class="ls">'+list.map(c=>'<button type="button" class="r if-pick'+(c===st.sc?' on':'')+'" data-x="col" data-c="'+c+'"><span class="if-col"><b>'+esc(lbl(c))+'</b><small>'+esc(samples(c))+'</small></span><i class="if-ok">'+(c===st.sc?IC.ok:'')+'</i></button>').join('')+'</div>'+
   '<div class="ip-err" data-err role="alert"></div><div class="ac"><button type="button" class="bt pr" data-x="next"'+(st.sc>=0?'':' disabled')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>{st=null;DS.swap(back(),-1)},col:b=>{st.sc=Number(b.dataset.c);DS.swap(colView(),0)},next:()=>{
   /* stehen mehrere Personen in der Liste? → Spalte mit Namen suchen */
   const dates=st.body.map(r=>asDate(r[st.dc])).filter(Boolean);const dup=dates.length/new Set(dates).size;
   if(dup>1.3){let pc=-1,pn=0;for(let c=0;c<nc;c++){if(c===st.dc||c===st.sc)continue;const u=new Set(st.body.map(r=>s(r[c])).filter(Boolean)).size;if(u>=2&&u<=300&&u>pn&&(pc<0||/name|mitarbeiter|person/i.test(s(st.head?.[c]))||!/name|mitarbeiter|person/i.test(s(st.head?.[pc]))))
     {pc=c;pn=u}}
    if(pc>=0){st.pc=pc;const nm=(lib()?.cfg().name||'').toLowerCase();st.people=[...new Set(st.body.map(r=>s(r[pc])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de')).map(label=>({label,n:st.body.filter(r=>s(r[pc])===label).length}));
     st.person=nm?(st.people.find(p=>p.label.toLowerCase().includes(nm))||{}).label||null:null;DS.swap(personView(),1);return}}
   st.pc=-1;listItems();DS.swap(mapView(),1)}});
  return node}
 function personView(){const node=el('<div>'+DS.head('Dienstplan-Import','Wer bist du?',{back:true})+
   '<p class="ip-p">In der Datei stehen mehrere Personen. Wähle deinen Namen – nur deine Dienste werden übernommen.</p>'+
   '<div class="ls">'+st.people.map((p,i)=>'<button type="button" class="r if-pick'+(p.label===st.person?' on':'')+'" data-x="p" data-i="'+i+'"><span class="if-col"><b>'+esc(p.label)+'</b><small>'+p.n+' Einträge</small></span><i class="if-ok">'+(p.label===st.person?IC.ok:'')+'</i></button>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(st.person?'':' disabled')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>DS.swap(colView(),-1),p:b=>{st.person=st.people[Number(b.dataset.i)].label;DS.swap(personView(),0)},next:()=>{if(!st.person)return;listItems();DS.swap(mapView(),1)}});
  return node}
 function listItems(){st.items=st.body.filter(r=>st.pc<0||s(r[st.pc])===st.person).map(r=>({k:asDate(r[st.dc]),t:s(r[st.sc]).slice(0,40)})).filter(x=>x.k&&x.t);
  st.nameWord=st.pc>=0?nameWord(st.person):''}
 const nameWord=t=>(String(t||'').split(/[\s,;]+/).filter(w=>/^[A-Za-zÄÖÜäöüß-]{3,}$/.test(w)).sort((a,b)=>b.length-a.length)[0]||'').toLowerCase();

 /* Plan-Tabelle: eigene Zeile wählen */
 function rowView(){const node=el('<div>'+DS.head('Dienstplan-Import','Deine Zeile',{back:true})+
   '<p class="ip-p">Tippe auf deinen Namen. Nur diese Zeile wird ausgelesen.</p>'+
   '<div class="ls">'+st.people.map(p=>'<button type="button" class="r if-pick'+(p.i===st.row?' on':'')+'" data-x="row" data-i="'+p.i+'"><span class="if-col"><b>'+esc(p.label.slice(0,60))+'</b><small>'+esc(Object.keys(st.hm).map(c=>s(st.rows[p.i][c])).filter(Boolean).slice(0,8).join(' · '))+'</small></span><i class="if-ok">'+(p.i===st.row?IC.ok:'')+'</i></button>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(st.row!=null?'':' disabled')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>{st=null;DS.swap(back(),-1)},row:b=>{st.row=Number(b.dataset.i);DS.swap(rowView(),0)},next:()=>{if(st.row==null)return;
   const r=st.rows[st.row];st.tokens=Object.entries(st.hm).map(([c,d])=>({day:d,t:s(r[c]).slice(0,40)})).filter(x=>x.t);st.nameWord=nameWord(st.people.find(p=>p.i===st.row)?.label);gridItems();DS.swap(mapView(),1)}});
  return node}
 function gridItems(){const dim=new Date(st.y,st.m+1,0).getDate();st.items=st.tokens.filter(o=>o.day<=dim).map(o=>({k:st.y+'-'+pad2(st.m+1)+'-'+pad2(o.day),t:o.t}))}

 /* ---------- Kürzel zuordnen ---------- */
 const has=c=>(typeof orderedPlannerCodes==='function'?orderedPlannerCodes():['F','S','N']).includes(c);
 function timeGuess(t,time){if(!time||!(t.length<=4||/dienst|schicht/i.test(t)))return '';const h=+time.slice(0,2);const c=h>=4&&h<10?'F':h>=10&&h<17?'S':'N';return has(c)?c:''}
 function mapView(){const L=lib();const uniq={};st.items.forEach(o=>{const k=o.t.toUpperCase();const u=uniq[k]=uniq[k]||{t:o.t,n:0,times:{}};u.n++;if(o.time)u.times[o.time]=(u.times[o.time]||0)+1});
  st.map=st.map||{};
  for(const k of Object.keys(uniq)){if(k in st.map)continue;const u=uniq[k];const tm=Object.entries(u.times).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';u.time=tm;st.map[k]=L.guess(u.t)||timeGuess(u.t,tm)}
  for(const k of Object.keys(uniq)){const u=uniq[k];u.time=Object.entries(u.times).sort((a,b)=>b[1]-a[1])[0]?.[0]||''}
  const keys=Object.keys(uniq).sort((a,b)=>uniq[b].n-uniq[a].n||a.localeCompare(b));
  const node=el('<div>'+DS.head('Dienstplan-Import','Kürzel zuordnen',{back:true})+
   '<p class="ip-p">'+(st.kind==='ics'?'Welcher Dienst steckt hinter welchem Termin? Termine, die keine Dienste sind, stellst du auf „ignorieren“.':'Welcher Dienst steckt hinter welchem Kürzel?')+' Schivio merkt sich die Zuordnung für den nächsten Import.</p>'+
   '<div class="ls ip-map">'+keys.map(k=>'<label class="r"><span class="ip-k">'+esc(uniq[k].t)+'</span><small>'+uniq[k].n+'×'+(uniq[k].time?' · '+uniq[k].time:'')+'</small><select data-k="'+esc(k)+'" aria-label="Dienst für '+esc(uniq[k].t)+'">'+L.shiftOptions(st.map[k],'— frei / ignorieren —')+'</select></label>').join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next">Vorschau</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(x=>x.addEventListener('change',()=>{st.map[x.dataset.k]=x.value}));
  DS.wire(node,{back:()=>{if(st.kind==='ics'){st=null;DS.swap(back(),-1)}else if(st.kind==='grid')DS.swap(rowView(),-1);else DS.swap(st.pc>=0?personView():colView(),-1)},next:()=>DS.swap(preview(),1)});
  return node}

 /* ---------- Vorschau & übernehmen ---------- */
 function plan(){st.ov=st.ov||{};const seen={},out=[];
  for(const o of st.items){const auto=st.map[o.t.toUpperCase()]||'';if(seen[o.k]){if(!seen[o.k].c&&auto&&!(o.k in st.ov)){seen[o.k].c=auto;seen[o.k].t=o.t}continue}
   const r={k:o.k,t:o.t,c:o.k in st.ov?st.ov[o.k]:auto,old:data.shifts[o.k]||''};seen[o.k]=r;out.push(r)}
  return out.sort((a,b)=>a.k<b.k?-1:1)}
 function summary(){const use=plan().filter(x=>x.c&&x.c!==x.old),ch=use.filter(x=>x.old).length;
  return {use,txt:use.length+(use.length===1?' Dienst wird':' Dienste werden')+' eingetragen'+(ch?', davon '+ch+' ersetzt':'')+'. Du kannst jeden Tag hier direkt ändern.'}}
 function preview(){const L=lib(),rows=plan(),S0=summary();let lastM='';
  const row=r=>{const d=toDate(r.k);const mk=r.k.slice(0,7);let h='';if(mk!==lastM){lastM=mk;h='<div class="if-mh">'+MON[d.getMonth()]+' '+d.getFullYear()+'</div>'}
   return h+'<div class="r'+(r.c?'':' off')+'"><span class="dd"><b>'+pad2(d.getDate())+'.</b><small>'+WD[d.getDay()]+'</small></span><span class="ip-k">'+esc(r.t)+'</span>'+
   '<span class="to"><span class="nm"><i style="--c:'+esc(r.c?shiftColor(r.c):'transparent')+'"></i><select data-k="'+r.k+'" aria-label="Dienst am '+d.getDate()+'.">'+L.shiftOptions(r.c,'nicht übernehmen')+'</select></span>'+(r.old&&r.old!==r.c&&r.c?'<small>ersetzt '+esc(shiftTitle(r.old))+'</small>':'')+'</span></div>'};
  const mb=st.kind==='grid'?'<div class="ip-mon"><button type="button" class="ib" data-x="mp" aria-label="Vorheriger Monat">'+IC.prev+'</button><b>'+MON[st.m]+' '+st.y+'</b><button type="button" class="ib" data-x="mn" aria-label="Nächster Monat">'+IC.next+'</button></div><p class="ip-p">'+(st.monthAuto?'Monat aus dem Dienstplan erkannt.':'Bitte prüfen: Ist das der richtige Monat?')+'</p>':'';
  const node=el('<div>'+DS.head('Dienstplan-Import','Vorschau',{back:true})+mb+
   '<p class="ip-p" data-sum>'+esc(S0.txt)+'</p>'+
   '<p class="ip-hint" style="margin:-4px 2px 12px">Beta: Bitte kurz mit deinem Plan vergleichen.</p>'+
   '<div class="ls ip-pv">'+rows.map(row).join('')+'</div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="apply"'+(S0.use.length?'':' disabled')+'>'+S0.use.length+' Dienste übernehmen</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(sel=>sel.addEventListener('change',()=>{st.ov[sel.dataset.k]=sel.value;const r=sel.closest('.r');r.classList.toggle('off',!sel.value);r.querySelector('i').style.setProperty('--c',sel.value?shiftColor(sel.value):'transparent');
   const S=summary(),b=node.querySelector('[data-x="apply"]');node.querySelector('[data-sum]').textContent=S.txt;b.textContent=S.use.length+' Dienste übernehmen';b.disabled=!S.use.length}));
  const mv=d=>{st.m+=d;if(st.m<0){st.m=11;st.y--}if(st.m>11){st.m=0;st.y++}st.monthAuto=false;st.ov={};gridItems();DS.swap(preview(),0)};
  DS.wire(node,{back:()=>DS.swap(mapView(),-1),mp:()=>mv(-1),mn:()=>mv(1),apply});
  return node}
 function apply(){const use=summary().use;if(!use.length)return;const a=use[0].k,b=use[use.length-1].k,d0=toDate(a);
  const lbl=a.slice(0,7)===b.slice(0,7)?MON[d0.getMonth()]+' '+d0.getFullYear():d0.getDate()+'.'+(d0.getMonth()+1)+'. – '+toDate(b).getDate()+'.'+(toDate(b).getMonth()+1)+'.'+toDate(b).getFullYear();
  data.importUndo={at:new Date().toISOString(),y:d0.getFullYear(),m:d0.getMonth(),n:use.length,label:lbl,prev:Object.fromEntries(use.map(r=>[r.k,data.shifts[r.k]||null]))};
  const c=lib().cfg();Object.assign(c.map,st.map);if(st.nameWord)c.name=st.nameWord;
  use.forEach(r=>{data.shifts[r.k]=r.c});refresh();st=null;DS.close();toast(use.length+' Dienste eingetragen');try{window.SchivioMore?.render?.()}catch(e){}
  setTimeout(()=>{try{document.getElementById('tabPlan')?.click()}catch(e){}try{shown=new Date(d0.getFullYear(),d0.getMonth(),1);render()}catch(e){}},350)}

 window.SchivioImportFile={load,_test:{parseCsv,fromIcs,asDate,asDay}};
})();
