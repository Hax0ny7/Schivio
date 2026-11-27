/* v1.0.89: Kalender übernehmen (Umzug aus einem anderen Kalender)
   - Kalenderdatei (.ics) aus FamilyWall, Google, Apple, Outlook, Supershift u. a. einlesen
   - Wiederkehrende Termine (RRULE inkl. Ausnahmen) werden in einzelne Termine aufgelöst
   - Häufige Titel, die nach Diensten aussehen, kann man einem Schivio-Dienst zuordnen – alles andere wird zum normalen Termin
   - Doppelte Termine (gleicher Tag, Titel, Beginn oder gleiche UID aus einem früheren Import) werden übersprungen
   - Letzten Import rückgängig machen
   - Willkommens-Frage nach der ersten Einrichtung
   Datenschutz: Die Datei wird nur im Arbeitsspeicher gelesen; gespeichert werden nur die übernommenen Termine und Dienste. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const toDate=k=>new Date(k+'T12:00:00');
 const addDays=(k,n)=>{const t=toDate(k);t.setDate(t.getDate()+n);return key(t)};
 const today=()=>key(new Date());
 const MAX_SERIES=800,MAX_EVENTS=8000,COLOR='#14b8a6';
 const IC={
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5 12 18l2.5-2.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'
 };
 const refresh=()=>{try{render()}catch(e){}try{window.SchivioMore?.render?.()}catch(e){}};

 /* ---------- Anleitungen je Quelle ---------- */
 const SRC=[
  ['familywall','FamilyWall','FamilyWall gibt dir einen iCal-Link. Kopiere ihn und füge ihn oben ins Feld ein. Klappt das nicht: Link im Handy-Browser öffnen (vorne „webcal://“ durch „https://“ ersetzen) – die Datei landet in „Downloads“ und du wählst sie oben aus. Teile den Link mit niemandem, er öffnet deinen Kalender.'],
  ['google','Google Kalender (Android)','Am Computer calendar.google.com öffnen → Zahnrad → Einstellungen → Importieren & Exportieren → Exportieren. Du bekommst eine ZIP-Datei; darin steckt pro Kalender eine .ics-Datei.'],
  ['apple','iPhone / iCloud','Am Mac in der Kalender-App: Kalender auswählen → Ablage → Exportieren. Ohne Mac: auf icloud.com den Kalender kurz öffentlich teilen, den Link im Browser öffnen und die Datei speichern – danach das Teilen wieder ausschalten.'],
  ['outlook','Outlook','Kalender → Freigeben/Veröffentlichen → ICS-Link oder Datei → Speichern unter → iCalendar (.ics).'],
  ['other','Supershift oder andere App','Die meisten Kalender- und Dienstplan-Apps haben unter Einstellungen einen Export als „iCal“ oder „.ics“. Diese Datei hier auswählen.']
 ];

 /* ---------- Kalenderdatei lesen ---------- */
 /* Datum/Uhrzeit aus ICS: Z = UTC → Ortszeit; mit TZID oder ohne Zone = so wie angegeben */
 function icsTime(v){const m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(String(v||'').trim());if(!m)return null;
  if(m[4]&&m[7]){const d=new Date(Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)));return {k:key(d),t:pad2(d.getHours())+':'+pad2(d.getMinutes())}}
  return {k:m[1]+'-'+m[2]+'-'+m[3],t:m[4]?m[4]+':'+m[5]:''}}
 const unesc=v=>v.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1').trim();
 function parse(txt){const lines=txt.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n');const evs=[];let cur=null,depth=0,cal='';
  for(const ln of lines){
   if(ln==='BEGIN:VEVENT'){cur={ex:[]};depth=0;continue}
   if(ln==='END:VEVENT'){if(cur)evs.push(cur);cur=null;continue}
   if(!cur){if(/^X-WR-CALNAME:/i.test(ln))cal=unesc(ln.slice(ln.indexOf(':')+1));continue}
   if(/^BEGIN:/.test(ln)){depth++;continue}if(/^END:/.test(ln)){depth--;continue}if(depth>0)continue;/* VALARM usw. überspringen */
   const i=ln.indexOf(':');if(i<0)continue;const head=ln.slice(0,i),val=ln.slice(i+1);const nm=head.split(';')[0].toUpperCase();
   if(nm==='SUMMARY')cur.title=unesc(val).replace(/\s+/g,' ');
   else if(nm==='DTSTART'){cur.a=icsTime(val);cur.ad=/VALUE=DATE(?!-)/i.test(head)||!/T/.test(val)}
   else if(nm==='DTEND')cur.b=icsTime(val);
   else if(nm==='DURATION')cur.dur=val;
   else if(nm==='LOCATION')cur.place=unesc(val);
   else if(nm==='DESCRIPTION')cur.note=unesc(val).slice(0,500);
   else if(nm==='UID')cur.uid=val.trim();
   else if(nm==='RRULE')cur.rrule=val.trim();
   else if(nm==='EXDATE')val.split(',').forEach(x=>{const t=icsTime(x);if(t)cur.ex.push(t.k)});
   else if(nm==='RECURRENCE-ID'){const t=icsTime(val);if(t)cur.rid=t.k}
   else if(nm==='STATUS'&&/CANCELLED/i.test(val))cur.cancel=true}
  return {evs,cal}}

 /* Dauer aus DURATION (z. B. PT8H30M, P1D) in Minuten */
 function durMin(s){const m=/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(s||'');if(!m)return 0;return (+m[1]||0)*10080+(+m[2]||0)*1440+(+m[3]||0)*60+(+m[4]||0)}
 const toMin=t=>{const m=/^(\d\d):(\d\d)$/.exec(t||'');return m?+m[1]*60+ +m[2]:0};
 const fromMin=n=>pad2(Math.floor(n/60)%24)+':'+pad2(n%60);

 /* Wiederholungen auflösen: FREQ, INTERVAL, COUNT, UNTIL, BYDAY (wöchentlich / n-ter Wochentag im Monat) */
 const WDN={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};
 function occurrences(e,lo,hi){const start=e.a.k;if(!e.rrule)return [start];
  const r={};e.rrule.split(';').forEach(p=>{const [k,v]=p.split('=');r[k.toUpperCase()]=v});
  const f=r.FREQ,iv=Math.max(1,+r.INTERVAL||1),cnt=+r.COUNT||0,until=r.UNTIL?icsTime(r.UNTIL)?.k:'';const ex=new Set(e.ex);
  const by=(r.BYDAY||'').split(',').filter(Boolean).map(x=>{const m=/^([+-]?\d+)?([A-Z]{2})$/.exec(x);return m?{n:+m[1]||0,d:WDN[m[2]]}:null}).filter(Boolean);
  const out=[];let n=0;const end=until&&until<hi?until:hi;const sd=toDate(start);
  const take=k=>{if(k<start)return true;if(until&&k>until)return false;if(cnt&&n>=cnt)return false;n++;if(k>=lo&&k<=hi&&!ex.has(k))out.push(k);return out.length<MAX_SERIES};
  const nth=(y,m,d,nn)=>{if(nn>0){const f1=new Date(y,m,1,12);const off=(d-f1.getDay()+7)%7;const day=1+off+(nn-1)*7;return day<=new Date(y,m+1,0).getDate()?key(new Date(y,m,day,12)):null}
   const last=new Date(y,m+1,0,12);const off=(last.getDay()-d+7)%7;const day=last.getDate()-off+(nn+1)*7;return day>=1?key(new Date(y,m,day,12)):null};
  for(let i=0;i<5000;i++){let list=[];
   if(f==='DAILY')list=[addDays(start,i*iv)];
   else if(f==='WEEKLY'){const wk=addDays(start,i*7*iv-((sd.getDay()+6)%7));/* Montag der Woche */
    list=(by.length?by.map(b=>addDays(wk,(b.d+6)%7)):[addDays(start,i*7*iv)]).sort()}
   else if(f==='MONTHLY'){const d=new Date(sd.getFullYear(),sd.getMonth()+i*iv,1,12);
    if(by.length&&by[0].n)list=by.map(b=>nth(d.getFullYear(),d.getMonth(),b.d,b.n)).filter(Boolean).sort();
    else{const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();if(sd.getDate()<=dim)list=[key(new Date(d.getFullYear(),d.getMonth(),sd.getDate(),12))]}}
   else if(f==='YEARLY'){const y=sd.getFullYear()+i*iv;const d=new Date(y,sd.getMonth(),sd.getDate(),12);if(d.getMonth()===sd.getMonth())list=[key(d)]}
   else return [start];
   if(!list.length)continue;if(list[0]>end&&list[0]>start)break;
   let go=true;for(const k of list){if(k>end){go=false;break}if(!take(k)){go=false;break}}if(!go)break}
  return out}

 /* Termine aus der Datei → einheitliche Liste {k,title,ad,s,e,endK,place,note,uid} */
 function build(parsed,lo,hi){const ov={};parsed.evs.forEach(e=>{if(e.rid&&e.uid)(ov[e.uid]=ov[e.uid]||new Set()).add(e.rid)});
  const out=[];let skipped=0;
  for(const e of parsed.evs){if(!e.a||!e.title){skipped++;continue}if(e.cancel)continue;
   const ad=e.ad;let len=0,dur=0;/* Länge in Tagen (ganztägig) bzw. Minuten */
   if(ad){len=e.b?Math.max(1,Math.round((toDate(e.b.k)-toDate(e.a.k))/864e5)):1}
   else{dur=e.b?Math.round((new Date(e.b.k+'T'+(e.b.t||'00:00')+':00')-new Date(e.a.k+'T'+e.a.t+':00'))/6e4):durMin(e.dur);if(!(dur>0))dur=0}
   const days=e.rid?[e.a.k]:occurrences(e,addDays(lo,ad?-(len-1):-1),hi).filter(k=>!(e.uid&&ov[e.uid]&&!e.rid&&ov[e.uid].has(k)));
   for(const k of days){
    if(ad){const endK=addDays(k,len-1);if(endK<lo||k>hi)continue;out.push({k,title:e.title,ad:true,s:'',e:'',endK:len>1?endK:'',place:e.place||'',note:e.note||'',uid:(e.uid||'')+'|'+k})}
    else{const sm=toMin(e.a.t),em=sm+dur;if(k<lo&&addDays(k,Math.floor(em/1440))<lo)continue;if(k>hi)continue;
     const span=e.b&&e.b.t?Math.round((toDate(e.b.k)-toDate(e.a.k))/864e5):Math.floor(em/1440);const eT=e.b&&e.b.t?e.b.t:fromMin(em);/* Wanduhr, damit die Zeitumstellung nicht stört */
     out.push({k,title:e.title,ad:false,s:e.a.t,e:dur?eT:'',endK:span>=1&&dur>=1440?addDays(k,span):'',place:e.place||'',note:e.note||'',uid:(e.uid||'')+'|'+k,mins:dur,span,eT})}
    if(out.length>MAX_EVENTS*2)break}}
  return {items:out.sort((a,b)=>a.k<b.k?-1:a.k>b.k?1:(a.s<b.s?-1:1)),skipped}}

 /* ---------- Dienste erkennen ---------- */
 const codes=()=>typeof orderedPlannerCodes==='function'?orderedPlannerCodes():['F','S','N','X','U','K','T','A'];
 const cfg=()=>{if(!data.calImport||typeof data.calImport!=='object')data.calImport={};if(!data.calImport.map)data.calImport.map={};return data.calImport};
 /* nur eindeutige Fälle vorschlagen – „Fitness“ ist kein Frühdienst */
 function guess(t){const u=t.trim().toUpperCase();const m=cfg().map;if(Object.prototype.hasOwnProperty.call(m,u))return m[u];
  for(const c of codes()){const n=String(shiftTitle(c)).toUpperCase();if(u===n||u===c)return c}
  const rules=[[/^(FRÜH|FRUEH)(DIENST|SCHICHT)?\b/,'F'],[/^(SPÄT|SPAET)(DIENST|SCHICHT)?\b/,'S'],[/^NACHT(DIENST|SCHICHT)?\b/,'N'],[/^URLAUB\b/,'U'],[/^(KRANK|AU)\b/,'K'],[/^(FORTBILDUNG|SCHULUNG)\b/,'T'],[/^(FREI|DIENSTFREI|FREIER TAG)\b/,'O']];
  for(const [re,c] of rules)if(re.test(u))return codes().includes(c)?c:'';return 'ev'}
 const optList=(v)=>'<option value="ev"'+(v==='ev'?' selected':'')+'>Als Termin</option>'+codes().map(c=>'<option value="'+esc(c)+'"'+(c===v?' selected':'')+'>Dienst: '+esc(shiftTitle(c))+'</option>').join('')+'<option value="skip"'+(v==='skip'?' selected':'')+'>Nicht übernehmen</option>';

 /* ---------- Diagnose (v1.0.92) ---------- */
 const MON=k=>toDate(k).toLocaleDateString('de-DE',{month:'short',year:'numeric'});
 function storeInfo(){let all=0,own=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const n=(localStorage.getItem(k)||'').length;all+=n;if(k==='schivio-v01')own=n}}catch(e){}
  const imp=Object.values(data.events||{}).reduce((n,l)=>n+(Array.isArray(l)?l.filter(e=>e&&e.src==='import').length:0),0);
  return {pct:Math.round(all/5e6*100),imp}}/* Browser erlauben meist ca. 5 Mio. Zeichen */
 /* Was steckt in der Datei? – Zeitraum, Einträge je Jahr, Wiederholungen, unlesbare Einträge */
 function fileStats(p){let lo='',hi='',rec=0,bad=0,canc=0,noUid=0;const yr={};
  for(const e of p.evs){if(!e.a||!e.title){bad++;continue}if(e.cancel){canc++;continue}if(!e.uid)noUid++;const k=e.a.k;if(!lo||k<lo)lo=k;if(!hi||k>hi)hi=k;const y=k.slice(0,4);yr[y]=(yr[y]||0)+1;if(e.rrule)rec++}
  return {lo,hi,rec,bad,canc,noUid,yr}}
 /* ---------- Ablauf ---------- */
 let st=null,busy=false;
 function intro(){const u=data.calImportUndo||Object.values(data.events||{}).some(l=>Array.isArray(l)&&l.some(e=>e&&e.src==='import'));
  const node=el('<div>'+DS.head('Tools','Kalender übernehmen')+
   '<p class="ip-p">Nimm deine Termine aus einem anderen Kalender mit – z. B. aus FamilyWall, Google, dem iPhone oder Supershift. Du brauchst dafür eine Kalenderdatei (.ics).</p>'+
   '<button type="button" class="ip-src" data-x="pick"><span class="ii">'+IC.file+'</span><span class="tt"><b>Kalenderdatei auswählen</b><small>.ics oder .ical · bleibt nur auf deinem Handy</small></span></button>'+
   '<div class="ci-link"><input type="url" inputmode="url" data-f="url" placeholder="oder iCal-Link einfügen (webcal:// oder https://)" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="bt pr" data-x="link">Laden</button></div>'+
   '<p class="ip-hint" data-lh hidden></p>'+
   '<p class="ip-p" style="margin-top:18px"><b style="color:var(--sx-text)">So bekommst du die Datei</b></p>'+
   '<div class="ls">'+SRC.map(([id,t,h])=>'<details class="r ci-how"><summary><b>'+esc(t)+'</b></summary><small>'+esc(h)+'</small></details>').join('')+'</div>'+
   (()=>{const i=storeInfo();return '<p class="ip-hint">Übernommene Termine im Kalender: <b>'+i.imp+'</b> · Speicher ca. '+i.pct+' % belegt'+(i.pct>=85?' – <b>fast voll</b>':'')+'</p>'})()+
   (u?'<button type="button" class="ip-undo" data-x="undo">Kalender-Import rückgängig machen<small>Entfernt alle übernommenen Termine und stellt deine Dienste wieder her</small></button>':'')+
   '<p class="ip-hint">Termine aus der Datei werden einmalig kopiert. Änderungen im alten Kalender kommen danach nicht automatisch nach Schivio.</p></div>');
  DS.wire(node,{pick:()=>pickFile(),undo:()=>undo(),link:b=>loadLink(node,b)});
  return node}
 function pickFile(){const inp=document.createElement('input');inp.type='file';inp.accept='.ics,.ical,.icalendar,text/calendar';
  inp.onchange=async()=>{const f=inp.files?.[0];if(!f)return;
   if(f.size>15e6){toast('Die Datei ist zu groß (max. 15 MB).');return}
   if(/\.zip$/i.test(f.name)){toast('Bitte die ZIP-Datei zuerst entpacken und die .ics-Datei darin wählen.');return}
   try{start(await f.text(),f.name)}catch(x){toast(x.message||'Die Datei konnte nicht gelesen werden.')}};
  inp.click()}
 function start(txt,name){if(!/BEGIN:VCALENDAR/i.test(txt))throw new Error('Das ist keine Kalenderdatei (.ics).');
  const p=parse(txt);if(!p.evs.length)throw new Error('In der Datei wurden keine Termine gefunden.');
  st={p,name,range:'year',over:false};DS.swap(rangeView(),1)}
 /* iCal-Link direkt laden. Viele Anbieter erlauben das aus einer Web-App nicht (CORS) – dann erklären wir den Umweg über den Browser.
    Der Link selbst wird nicht gespeichert (er ist wie ein Passwort zum Kalender). */
 async function loadLink(node,btn){const inp=node.querySelector('[data-f="url"]'),hint=node.querySelector('[data-lh]');let u=inp.value.trim();
  if(!u){inp.focus();return}u=u.replace(/^webcals?:\/\//i,'https://');if(!/^https?:\/\//i.test(u)){hint.hidden=false;hint.textContent='Das sieht nicht wie ein Kalender-Link aus. Er beginnt meist mit webcal:// oder https://';return}
  btn.disabled=true;const old=btn.textContent;btn.textContent='Lädt …';hint.hidden=true;
  try{const r=await fetch(u,{cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error('http '+r.status);const txt=await r.text();start(txt,'Kalender-Link')}
  catch(x){hint.hidden=false;hint.innerHTML='Der Anbieter erlaubt das direkte Laden leider nicht. So klappt es trotzdem: <b>Link kopieren → im Handy-Browser (z. B. Chrome) in die Adresszeile einfügen</b> – vorne „webcal://“ durch „https://“ ersetzen – öffnen. Die Datei wird heruntergeladen; danach oben „Kalenderdatei auswählen“ und sie im Ordner „Downloads“ wählen.'}
  finally{btn.disabled=false;btn.textContent=old}}
 const RANGES=[['future','Nur ab heute'],['year','Ab vor 1 Jahr'],['all','Alles']];
 function bounds(){const t=today();return {lo:st.range==='future'?t:st.range==='year'?addDays(t,-365):'1990-01-01',hi:addDays(t,730)}}
 function compute(){const b=bounds();const r=build(st.p,b.lo,b.hi);st.items=r.items;st.skipped=r.skipped;
  const u={};st.items.forEach(o=>{const k=o.title.toUpperCase();const x=u[k]=u[k]||{t:o.title,n:0};x.n++});st.uniq=u}
 function rangeView(){compute();const n=st.items.length;
  const node=el('<div>'+DS.head('Kalender übernehmen','Zeitraum',{back:true})+
   '<p class="ip-p"><b style="color:var(--sx-text)">'+esc(st.p.cal||st.name)+'</b> · '+st.p.evs.length+' Einträge in der Datei'+(st.p.evs.some(e=>e.rrule)?', wiederkehrende Termine werden einzeln eingetragen':'')+'.</p>'+
   (()=>{const f=st.stats||(st.stats=fileStats(st.p));return '<div class="ls"><div class="r"><span><b>Datei reicht von '+(f.lo?MON(f.lo):'–')+' bis '+(f.hi?MON(f.hi):'–')+'</b><small>'+Object.keys(f.yr).sort().map(y=>y+': '+f.yr[y]).join(' · ')+(f.rec?' · '+f.rec+' wiederkehrend':'')+(f.bad?' · '+f.bad+' ohne Titel/Datum':'')+(f.canc?' · '+f.canc+' abgesagt':'')+'</small></span></div></div>'})()+
   '<div class="vp-q" style="padding:14px 0 0"><b>Welche Termine sollen mit?</b><div class="vp-seg" role="radiogroup">'+RANGES.map(([v,l])=>'<button type="button" role="radio" data-x="rg" data-v="'+v+'" aria-checked="'+(st.range===v)+'" class="'+(st.range===v?'on':'')+'">'+l+'</button>').join('')+'</div></div>'+
   '<div class="vp-cost"><b data-n>'+n+'</b><span>Termine im Zeitraum (bis 2 Jahre voraus)</span></div>'+
   '<p class="ip-hint">Ältere Termine brauchst du meist nicht – weniger Einträge halten Schivio schnell.</p>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(n?'':' disabled')+'>Weiter</button></div></div>');
  DS.wire(node,{back:()=>{st=null;DS.swap(intro(),-1)},
   rg:b=>{st.range=b.dataset.v;DS.swap(rangeView(),0)},
   next:()=>{if(st.items.length>MAX_EVENTS){toast('Das sind sehr viele Termine – bitte einen kürzeren Zeitraum wählen.');return}DS.swap(mapView(),1)}});
  return node}
 /* Titel, die oft vorkommen, könnten Dienste sein – nur diese zur Auswahl zeigen */
 function mapView(){st.map=st.map||{};const keys=Object.keys(st.uniq).filter(k=>st.uniq[k].n>=3||guess(st.uniq[k].t)!=='ev').sort((a,b)=>st.uniq[b].n-st.uniq[a].n).slice(0,40);
  keys.forEach(k=>{if(!(k in st.map))st.map[k]=guess(st.uniq[k].t)});
  const node=el('<div>'+DS.head('Kalender übernehmen','Dienste erkennen',{back:true})+
   '<p class="ip-p">Diese Einträge kommen oft vor. Ist einer davon dein Dienst, wähle den passenden Schivio-Dienst – dann zählt er auch für Stunden und Gehalt. Alles andere wird ein normaler Termin.</p>'+
   (keys.length?'<div class="ls ip-map">'+keys.map(k=>'<label class="r"><span class="ip-k">'+esc(st.uniq[k].t)+'</span><small>'+st.uniq[k].n+'×</small><select data-k="'+esc(k)+'">'+optList(st.map[k])+'</select></label>').join('')+'</div>':'<p class="ip-p">Keine wiederkehrenden Einträge gefunden – alles wird als Termin übernommen.</p>')+
   '<p class="ip-hint">Tipp bei geteilten Kalendern: Dienste deiner Partnerin oder deines Partners stellst du auf „Als Termin“ oder „Nicht übernehmen“.</p>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next">Vorschau</button></div></div>');
  node.querySelectorAll('select[data-k]').forEach(x=>x.addEventListener('change',()=>{st.map[x.dataset.k]=x.value}));
  DS.wire(node,{back:()=>DS.swap(rangeView(),-1),next:()=>DS.swap(preview(),1)});
  return node}
 const norm=s=>String(s||'').trim().toLowerCase();
 function plan(){const have=new Set(),uids=new Set();
  for(const [k,list] of Object.entries(data.events||{}))if(Array.isArray(list))list.forEach(e=>{have.add(k+'|'+norm(e.title)+'|'+(e.allDay?'':e.start||''));if(e.uid)uids.add(e.uid)});
  const ev=[],sh=[],dup=[],conf=[];const seenSh={};
  for(const o of st.items){const m=st.map[o.title.toUpperCase()]||'ev';if(m==='skip')continue;
   if(m==='ev'){if(uids.has(o.uid)||have.has(o.k+'|'+norm(o.title)+'|'+(o.ad?'':o.s))){dup.push(o);continue}have.add(o.k+'|'+norm(o.title)+'|'+(o.ad?'':o.s));ev.push(o);continue}
   /* Dienst: mehrtägige Einträge (z. B. Urlaub) auf jeden Tag verteilen */
   /* v1.0.95: auch mehrtägige Einträge mit Uhrzeit auf jeden Tag verteilen (z. B. Nachtdienst 24.–28.10.).
      Der letzte Tag zählt nur, wenn der Eintrag dort nach 10 Uhr endet – sonst ist es nur das Ende der Nacht davor. */
   let last=o.k;if(o.ad&&o.endK)last=o.endK;else if(!o.ad&&o.span>0)last=addDays(o.k,toMin(o.eT)>600?o.span:o.span-1);for(let k=o.k;k<=last;k=addDays(k,1)){if(seenSh[k])continue;seenSh[k]=1;const old=data.shifts[k]||'';
    if(old===m)continue;if(old&&!st.over){conf.push(k);continue}sh.push({k,c:m,old})}}
  return {ev,sh,dup,conf}}
 function preview(){const P=plan();
  const node=el('<div>'+DS.head('Kalender übernehmen','Vorschau',{back:true})+
   '<div class="ls">'+
    '<div class="r"><span><b>'+P.ev.length+' Termine</b><small>werden neu eingetragen</small></span></div>'+
    '<div class="r"><span><b>'+P.sh.length+' Dienste</b><small>'+(P.sh.filter(x=>x.old).length?P.sh.filter(x=>x.old).length+' davon ersetzen einen vorhandenen Dienst':'an freien Tagen eingetragen')+'</small></span></div>'+
    (P.dup.length?'<div class="r"><span><b>'+P.dup.length+' schon vorhanden</b><small>gleicher Tag, Titel und Uhrzeit – werden übersprungen</small></span></div>':'')+
   '</div>'+
   (P.conf.length||st.over?'<div class="vp-q" style="padding:14px 2px 0"><div class="vp-sw"><span><b>Vorhandene Dienste überschreiben</b></span><button type="button" class="sx-sw" role="switch" aria-checked="'+st.over+'" data-x="over"></button></div><small style="margin:4px 0 0">'+(st.over?'Dienste aus der Datei ersetzen deine eingetragenen Dienste.':P.conf.length+(P.conf.length===1?' Tag hat':' Tage haben')+' schon einen anderen Dienst – Schivio lässt sie unverändert.')+'</small></div>':'')+
   (P.ev.length>3000?'<p class="ip-warn">'+IC.warn+'<span>Sehr viele Termine. Wenn der Speicher nicht reicht, wähle einen kürzeren Zeitraum.</span></p>':'')+
   (P.ev.length?'<p class="ip-p" style="margin-top:16px"><b style="color:var(--sx-text)">Nächste Termine</b></p><div class="ls">'+(P.ev.some(o=>o.k>=today())?P.ev.filter(o=>o.k>=today()):P.ev).slice(0,6).map(o=>'<div class="r"><span><b>'+esc(o.title)+'</b><small>'+toDate(o.k).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+(o.ad?' · ganztägig':' · '+o.s+(o.e?'–'+o.e:'')+' Uhr')+(o.place?' · '+esc(o.place):'')+'</small></span></div>').join('')+'</div>':'')+
   '<div class="ac"><button type="button" class="bt pr" data-x="apply"'+(P.ev.length+P.sh.length?'':' disabled')+'>Übernehmen</button></div></div>');
  DS.wire(node,{back:()=>DS.swap(mapView(),-1),over:()=>{st.over=!st.over;DS.swap(preview(),0)},apply:b=>{if(busy)return;busy=true;b.disabled=true;b.textContent='Wird übernommen …';node.querySelectorAll('button').forEach(x=>x.disabled=true);setTimeout(()=>{try{apply(P)}finally{busy=false}},60)}});
  return node}
 function apply(P){if(!data.events||typeof data.events!=='object')data.events={};
  const before={events:JSON.stringify(data.events),shifts:Object.assign({},data.shifts)};
  const ids=[];const now=Date.now().toString(36);let i=0;
  for(const o of P.ev){const it={id:'i'+now+(i++).toString(36),title:o.title.slice(0,120),allDay:o.ad,start:o.ad?'':o.s,end:o.ad?'':o.e,color:COLOR,place:o.place.slice(0,200),note:o.note,uid:o.uid,src:'import'};
   if(o.endK&&o.endK>o.k)it.endDate=o.endK;
   const l=Array.isArray(data.events[o.k])?data.events[o.k]:[];l.push(it);data.events[o.k]=l;ids.push([o.k,it.id])}
  for(const k of Object.keys(data.events)){const l=data.events[k];if(Array.isArray(l)&&l.length>1)l.sort((a,b)=>(a.allDay?-1:toMin(a.start))-(b.allDay?-1:toMin(b.start)))}
  const prev={};P.sh.forEach(r=>{prev[r.k]=r.old||null;data.shifts[r.k]=r.c});
  const c=cfg();Object.entries(st.map).forEach(([k,v])=>{if(v!=='ev')c.map[k]=v;else delete c.map[k]});
  const pu=data.calImportUndo;const allPrev=Object.assign({},prev,pu&&pu.prev||{});/* frühester Stand gewinnt */
  data.calImportUndo={at:new Date().toISOString(),n:(pu?pu.n:0)+ids.length+P.sh.length,ids:[],prev:allPrev};
  let ok=true;try{ok=persist()!==false}catch(e){ok=false}
  if(!ok){data.events=JSON.parse(before.events);data.shifts=before.shifts;delete data.calImportUndo;try{persist()}catch(e){}toast('Speicher voll – bitte einen kürzeren Zeitraum wählen.');return}
  const first=(P.ev.find(o=>o.k>=today())||P.ev[0]||P.sh[0]||{}).k;st=null;refresh();DS.close();
  toast(ids.length+' Termine'+(P.sh.length?' und '+P.sh.length+' Dienste':'')+' übernommen');
  if(first)setTimeout(()=>{try{document.getElementById('tabPlan')?.click()}catch(e){}try{const d=toDate(first);shown=new Date(d.getFullYear(),d.getMonth(),1);render()}catch(e){}},350)}
 function undo(){const evN=Object.values(data.events||{}).reduce((n,l)=>n+(Array.isArray(l)?l.filter(e=>e&&e.src==='import').length:0),0);const shN=Object.keys(data.calImportUndo?.prev||{}).length;
  const node=el('<div>'+DS.head('Kalender übernehmen','Rückgängig machen',{back:true})+
   '<p class="ip-p">Das entfernt <b style="color:var(--sx-text)">'+evN+' übernommene Termine</b>'+(shN?' und setzt <b style="color:var(--sx-text)">'+shN+' Dienste</b> auf den Stand vor dem Import zurück':'')+'. Selbst eingetragene Termine bleiben.</p>'+
   '<div class="ac"><button type="button" class="bt" data-x="back">Abbrechen</button><button type="button" class="bt pr" data-x="go">Entfernen</button></div></div>');
  DS.wire(node,{back:()=>DS.swap(intro(),-1),go:b=>{b.disabled=true;b.textContent='Wird entfernt …';setTimeout(()=>{
   for(const k of Object.keys(data.events||{})){const l=data.events[k];if(!Array.isArray(l))continue;const keep=l.filter(e=>!(e&&e.src==='import'));if(keep.length)data.events[k]=keep;else delete data.events[k]}
   for(const [k,old] of Object.entries(data.calImportUndo?.prev||{})){if(old)data.shifts[k]=old;else delete data.shifts[k]}
   delete data.calImportUndo;let ok=false;try{ok=persist()!==false}catch(e){}refresh();
   if(ok){toast('Kalender-Import rückgängig gemacht');DS.swap(intro(),-1)}else{b.disabled=false;b.textContent='Entfernen';toast('Speichern fehlgeschlagen – der Gerätespeicher ist voll. Bitte Screenshot an Claude schicken.')}},60)}});
  DS.swap(node,1)}

 /* ---------- Willkommens-Frage nach der ersten Einrichtung ---------- */
 function welcomeView(){const node=el('<div>'+DS.head('Willkommen','Kalender mitnehmen?')+
   '<p class="ip-p">Nutzt du bisher einen anderen Kalender – z. B. FamilyWall, Google, den iPhone-Kalender oder Supershift? Dann kannst du deine Termine und Dienste jetzt übernehmen, statt alles neu einzutragen.</p>'+
   '<div class="ac"><button type="button" class="bt" data-x="no">Nein, danke</button><button type="button" class="bt pr" data-x="yes">Ja, übernehmen</button></div>'+
   '<p class="ip-hint">Geht auch später unter Mehr → Tools → Kalender übernehmen.</p></div>');
  DS.wire(node,{yes:()=>DS.swap(intro(),1),no:()=>DS.close()});return node}
 function welcome(){if(data.calImportAsked)return;data.calImportAsked=true;try{persist()}catch(e){}DS.node(welcomeView)}

 function open(){st=null;DS.node(intro)}
 window.SchivioCalImport={open,welcome,_test:{parse,build,occurrences,guess,plan:(items,map)=>{st={items,map,over:true};return plan()}}};
})();
