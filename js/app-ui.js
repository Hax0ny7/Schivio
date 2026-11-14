/* v1.0.55: Kalender-Optik, Stift-Menü, Tagesansicht mit Terminen, neuer Reiter „Mehr“ */
(function(){
 const VERSION='1.0.66';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(7)}catch(e){}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=(html)=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const todayKey=()=>{const n=new Date();return dateKey(n.getFullYear(),n.getMonth(),n.getDate())};
 const ICON={
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  ev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13v5M9.5 15.5h5"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2" fill="currentColor"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev:'<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  cv:'<svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chevD:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  loc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  F:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>',
  S:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 19h20M6.5 19a5.5 5.5 0 0 1 11 0M12 3v4.5M4.2 9.7l2.2 2.2M19.8 9.7l-2.2 2.2"/></svg>',
  N:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/></svg>',
  U:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 22V11M12 11c-3-4-7-4-9.5-2M12 11c3-4 7-4 9.5-2M12 11c-1-4-4-7.5-7.5-7.5M12 11c1-4 4-7.5 7.5-7.5"/></svg>',
  K:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
  T:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>',
  A:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  X:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>'
 };
 const EV_COLORS=['#3b82f6','#14b8a6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#64748b'];
 const ABSENCE=['U','K','T','A'];
 data.events=data.events&&typeof data.events==='object'&&!Array.isArray(data.events)?data.events:{};
 const toast=(()=>{let t,n;return msg=>{if(!n){n=document.createElement('div');n.className='sx-toast';n.setAttribute('role','status');document.body.append(n)}n.textContent=msg;n.classList.add('on');clearTimeout(t);t=setTimeout(()=>n.classList.remove('on'),3200)}})();

 /* ---------- Hilfen für Dienste, Termine, Feiertage ---------- */
 const tmplOf=c=>data.templates?.[c]||data.customShifts?.[c]||null;
 const isAllDay=c=>ABSENCE.includes(c)||!tmplOf(c)||!tmplOf(c).start||!tmplOf(c).end;
 const mm=t=>{const v=/^(\d\d):(\d\d)$/.exec(t||'');return v?Number(v[1])*60+Number(v[2]):null};
 const hrs=v=>v.toLocaleString('de-DE',{maximumFractionDigits:2});
 const sColor=c=>{const h=typeof displayShiftColor==='function'?displayShiftColor(shiftColor(c)):shiftColor(c);return h};
 const LONG={F:'Frühdienst',S:'Spätdienst',N:'Nachtdienst',X:'Dienst',U:'Urlaub',K:'Krank',T:'Fortbildung',A:'Überstundenabbau'};
 const longTitle=c=>(!data.shiftMeta?.[c]?.name&&!data.customShifts?.[c]&&LONG[c])||shiftTitle(c);
 function shiftDetail(c){const t=tmplOf(c);if(isAllDay(c))return ABSENCE.includes(c)?'Ganztägig · wird gutgeschrieben':'Ganztägig';let s=t.start+' – '+t.end+' Uhr';const d=typeof duration==='function'?duration(t):NaN;if(t.bd?.stage==='RB')s+=' · Rufbereitschaft';else{if(Number.isFinite(d))s+=' · '+hrs(d)+' h';if(Number(t.break))s+=' · Pause '+t.break+' Min.'}return s}
 const evList=k=>Array.isArray(data.events[k])?data.events[k]:[];
 const addDays=(k,n)=>{const t=new Date(k+'T12:00:00');t.setDate(t.getDate()+n);return dateKey(t.getFullYear(),t.getMonth(),t.getDate())};
 const dayDiff=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
 let evIdx=null,evSig='';
 function eventsOn(k){const sig=JSON.stringify(data.events);if(!evIdx||sig!==evSig){evSig=sig;evIdx={};for(const [key,list] of Object.entries(data.events||{})){for(const e of evList(key)){const end=e.endDate&&e.endDate>key?e.endDate:key;const n=Math.min(dayDiff(key,end),366);for(let i=0;i<=n;i++){const d=addDays(key,i);(evIdx[d]=evIdx[d]||[]).push({e,key,end,i,n})}}}}return evIdx[k]||[]}
 function holidayName(k){const y=Number(k.slice(0,4));const st=data.profile?.state||'NW';let set;try{set=holidaySet(y,st)}catch(e){return ''}if(!set.has(k))return '';const e=easter(y),off=(n)=>{const t=new Date(e);t.setDate(t.getDate()+n);return dateKey(t.getFullYear(),t.getMonth(),t.getDate())};
  const md=k.slice(5);const fixed={'01-01':'Neujahr','01-06':'Heilige Drei Könige','03-08':'Internationaler Frauentag','05-01':'Tag der Arbeit','08-08':'Augsburger Friedensfest','08-15':'Mariä Himmelfahrt','09-20':'Weltkindertag','10-03':'Tag der Deutschen Einheit','10-31':'Reformationstag','11-01':'Allerheiligen','12-25':'1. Weihnachtsfeiertag','12-26':'2. Weihnachtsfeiertag'};
  if(fixed[md])return fixed[md];const m={[off(-2)]:'Karfreitag',[off(0)]:'Ostersonntag',[off(1)]:'Ostermontag',[off(39)]:'Christi Himmelfahrt',[off(49)]:'Pfingstsonntag',[off(50)]:'Pfingstmontag',[off(60)]:'Fronleichnam'};if(m[k])return m[k];
  const nov23=new Date(y,10,23);const d=new Date(nov23);d.setDate(23-((nov23.getDay()+4)%7||7));if(k===dateKey(y,10,d.getDate()))return 'Buß- und Bettag';return 'Feiertag'}

 /* ---------- Kalender: Feiertage, Termin-Punkte, Navigation ---------- */
 const holCache={};
 function decorate(){const st=data.profile?.state||'NW';const root=$('calendar');if(!root)return;
  for(const b of root.querySelectorAll('.day[data-date]')){const k=b.dataset.date,y=k.slice(0,4),ck=y+st;if(!holCache[ck]){try{holCache[ck]=holidaySet(Number(y),st)}catch(e){holCache[ck]=new Set()}}
   b.classList.toggle('sx-hol',holCache[ck].has(k));b.querySelector('.sx-ev')?.remove();
   const c=data.shifts[k],ev=eventsOn(k);const base=new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});b.setAttribute('aria-label',base+(c?', '+shiftTitle(c):'')+(ev.length?', '+ev.length+' Termin'+(ev.length>1?'e':''):'')+(window.SchivioWaste?SchivioWaste.cellLabel(k):''));try{window.SchivioWaste?.paint(b,k)}catch(e){}}
  Bars.paint(root)}
 /* Durchgehende Balken für Dienste und Termine (je Woche, in Spuren gestapelt) */
 const Bars=(()=>{const cache=new WeakMap();let geo=null;
  function measure(root){const cell=root.querySelector('.month-grid .day[data-date]:not(.today)');if(!cell||!cell.offsetHeight)return null;const n=cell.firstElementChild.getBoundingClientRect(),r=cell.getBoundingClientRect();const top=Math.round(n.bottom-r.top+5);const lh=Math.max(15,Math.min(19,Math.round(r.height*.15)));return {top,lh,gap:2,cap:Math.max(1,Math.floor((r.height-top-3+2)/(lh+2))),h:Math.round(r.height)}}
  function weekItems(keys){/* keys: 7 Einträge (Datum oder null) */const items=[];
   for(let i=0;i<7;i++){const k=keys[i];if(!k)continue;const c=data.shifts[k];if(!c)continue;const prevSame=i>0&&keys[i-1]&&data.shifts[keys[i-1]]===c;if(prevSame)continue;let j=i;while(j<6&&keys[j+1]&&data.shifts[keys[j+1]]===c)j++;
    const before=data.shifts[addDays(k,-1)]===c,after=data.shifts[addDays(keys[j],1)]===c;items.push({kind:'s',c,a:i,b:j,cl:before,cr:after,pri:0})}
   const seen=new Set();for(let i=0;i<7;i++){const k=keys[i];if(!k)continue;for(const o of eventsOn(k)){const id=o.e.id+'|'+o.key;if(seen.has(id))continue;seen.add(id);let j=i;while(j<6&&keys[j+1]&&keys[j+1]<=o.end)j++;items.push({kind:'e',e:o.e,a:i,b:j,cl:o.key<k,cr:o.end>keys[j],pri:1,len:j-i,st:o.e.allDay?-1:(mm(o.e.start)??0)})}}
   items.sort((x,y)=>x.pri-y.pri||x.a-y.a||(y.b-y.a)-(x.b-x.a)||(x.st??0)-(y.st??0));
   const lanes=[];for(const it of items){let l=0;for(;;l++){lanes[l]=lanes[l]||[];if(lanes[l].every(o=>o.b<it.a||o.a>it.b))break}lanes[l].push(it);it.l=l}return items}
  function html(items,g,keys){const per=new Array(7).fill(0);items.forEach(it=>{for(let d=it.a;d<=it.b;d++)per[d]++});const need=Math.max(0,...per);const cap=need>g.cap?g.cap-1:g.cap;let out='';
   for(const it of items){if(it.l>=cap)continue;const top=g.top+it.l*(g.lh+g.gap);const cls='sx-bar'+(it.kind==='s'?' s '+esc(it.c):' e')+(it.cl?' cl':'')+(it.cr?' cr':'');
    let bg,fg,label,ttl;if(it.kind==='s'){bg=displayShiftColor(shiftColor(it.c));fg=contrastColor(bg);label=shiftTitle(it.c);ttl=label}else{bg=it.e.color||EV_COLORS[0];fg='#fff';label=(it.e.title||'').trim()||(it.e.start?it.e.start.replace(/^0/,'')+' Uhr':'Termin');/* v1.0.64: nur Text, keine Uhrzeit */ttl=it.e.title}
    out+='<span class="'+cls+'" aria-hidden="true" style="grid-column:'+(it.a+1)+' / '+(it.b+2)+';--t:'+top+'px;--h:'+g.lh+'px;--bg:'+esc(bg)+';--fg:'+esc(fg)+'"><i>'+esc(label)+'</i></span>'}
   if(cap<g.cap)for(let d=0;d<7;d++){const hid=items.filter(it=>it.l>=cap&&it.a<=d&&it.b>=d).length;if(hid)out+='<span class="sx-bar more" aria-hidden="true" style="grid-column:'+(d+1)+' / '+(d+2)+';--t:'+(g.top+cap*(g.lh+g.gap))+'px;--h:'+g.lh+'px"><i>+'+hid+'</i></span>'}
   return out}
  function paintGrid(grid,g){const cells=[...grid.children].filter(n=>n.classList.contains('day'));const weeks=Math.ceil(cells.length/7);
   const sigParts=[g.top,g.lh,g.cap,data.shiftIntensity,document.body.dataset.theme];const rows=[];for(let w=0;w<weeks;w++){const keys=cells.slice(w*7,w*7+7).map(c=>c.dataset.date||null);const items=weekItems(keys);rows.push(items);sigParts.push(items.map(it=>it.kind+(it.c||it.e.id+it.e.title+it.e.color+it.e.start)+it.a+it.b+it.l+it.cl+it.cr).join())}
   const tk=todayKey();const ti=cells.findIndex(c=>c.dataset.date===tk);sigParts.push('t'+ti);
   const sig=sigParts.join('|')+JSON.stringify(data.shiftMeta||{})+JSON.stringify(data.customShifts||{});if(cache.get(grid)===sig)return;cache.set(grid,sig);
   cells.forEach((c,i)=>{c.style.gridRow=String(Math.floor(i/7)+1);c.style.gridColumn=String(i%7+1)});
   grid.querySelectorAll(':scope>.sx-week,:scope>.sx-ring').forEach(n=>n.remove());
   if(ti>=0){const ring=document.createElement('div');ring.className='sx-ring';ring.setAttribute('aria-hidden','true');ring.style.gridRow=String(Math.floor(ti/7)+1);ring.style.gridColumn=String(ti%7+1);grid.append(ring)}
   rows.forEach((items,w)=>{if(!items.length)return;const wk=document.createElement('div');wk.className='sx-week';wk.style.gridRow=String(w+1);wk.innerHTML=html(items,g,cells.slice(w*7,w*7+7).map(c=>c.dataset.date||null));grid.append(wk)});grid.classList.add('sx-bars')}
  function paint(root){const g=measure(root);if(!g){requestAnimationFrame(()=>{if(measure(root))paint(root)});return}geo=g;
   const grids=[...root.querySelectorAll('.month-grid')];const vis=grids.filter(gr=>{const r=gr.getBoundingClientRect();return r.bottom>-innerHeight*2&&r.top<innerHeight*3});vis.forEach(gr=>paintGrid(gr,g));
   clearTimeout(paint.t);paint.t=setTimeout(()=>{const run=()=>{const rest=grids.filter(gr=>cache.get(gr)===undefined||!vis.includes(gr));let n=0;for(const gr of rest){paintGrid(gr,geo);if(++n>6)break}if(rest.length>6)setTimeout(run,60)};run()},250)}
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{const root=$('calendar');if(root)paint(root)},200)});
  return {paint}})();
 const oldRCM=renderCalendarMonths;renderCalendarMonths=function(){const r=oldRCM.apply(this,arguments);try{decorate()}catch(e){}return r};
 function popDots(k){}

 /* Navigation: saubere Symbole */
 const TABI={tabPlan:ICON.cal,tabHours:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></svg>',tabShare:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2 1-4 3-4s3 2 3 4"/></svg>',tabTemplates:ICON.A,tabSettings:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'};
 for(const id in TABI){const ic=document.querySelector('#'+id+' .tab-icon');if(ic)ic.innerHTML=TABI[id]}

 /* ---------- Stift-Button mit Auswahlmenü ---------- */
 const fab=$('togglePlanner'),shell=fab?.closest('.calendar-shell');
 const scrim=document.createElement('div');scrim.className='sx-scrim';
 const menu=el('<div class="sx-fmenu" role="menu" aria-label="Hinzufügen"><button type="button" role="menuitem" data-a="plan"><span class="ic">'+ICON.cal+'</span><span><b>Dienste planen</b><small>Mehrere Tage schnell eintragen</small></span></button><button type="button" role="menuitem" data-a="event"><span class="ic">'+ICON.ev+'</span><span><b>Termin hinzufügen</b><small>Arzttermin, Geburtstag, Treffen …</small></span></button></div>');
 if(shell){shell.append(scrim,menu)}
 function paintFab(){if(!fab)return;fab.innerHTML='<span class="sx-fi" aria-hidden="true"><svg class="p" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'+ICON.x.replace('<svg','<svg class="x"')+'</span>';fab.setAttribute('aria-label',menuOpen?'Menü schließen':'Dienst oder Termin hinzufügen');fab.setAttribute('aria-expanded',String(menuOpen));fab.setAttribute('aria-haspopup','menu');fab.title=''}
 let menuOpen=false,kbOpen=false;
 if(fab)fab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')kbOpen=true});
 function setMenu(on){menuOpen=on;fab.classList.toggle('sx-open',on);scrim.classList.toggle('on',on);menu.classList.toggle('on',on);paintFab();if(on){buzz();if(kbOpen)setTimeout(()=>menu.querySelector('button')?.focus({preventScroll:true}),360)}kbOpen=false}
 if(fab){fab.onclick=()=>{if(plannerActive){setPlanner(false);return}setMenu(!menuOpen)};paintFab()}
 scrim.addEventListener('click',()=>setMenu(false));window.SchivioFab={isOpen:()=>menuOpen,close:()=>setMenu(false)};
 menu.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;buzz();setMenu(false);if(b.dataset.a==='plan')setTimeout(()=>setPlanner(true),120);else{const n=new Date(),inShown=n.getFullYear()===shown.getFullYear()&&n.getMonth()===shown.getMonth();DS.openEvent(inShown?todayKey():dateKey(shown.getFullYear(),shown.getMonth(),1))}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuOpen)setMenu(false)});
 const oldSP=setPlanner;setPlanner=function(on){if(menuOpen)setMenu(false);const r=oldSP.apply(this,arguments);paintFab();return r};
 const oldRPI=renderPlannerItems;renderPlannerItems=function(){const r=oldRPI.apply(this,arguments);document.querySelectorAll('#plannerItems button[data-code]').forEach(b=>{const c=b.dataset.code;if(c){b.style.setProperty('--c',sColor(c));b.style.borderLeft=''}});return r};

 /* ---------- Fotos (IndexedDB) & Karten ---------- */
 const Media=(()=>{let p=null;const db=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('schivio-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const run=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('img',mode);const q=fn(t.objectStore('img'));t.oncomplete=()=>res(q?.result);t.onerror=()=>rej(t.error)}));
  const load=file=>new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{res(i);setTimeout(()=>URL.revokeObjectURL(u),500)};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};i.src=u});
  const canvas=(img,max,square)=>{const w=img.naturalWidth,h=img.naturalHeight;const c=document.createElement('canvas');if(square){const sz=Math.min(w,h);c.width=c.height=max;c.getContext('2d').drawImage(img,(w-sz)/2,(h-sz)/2,sz,sz,0,0,max,max)}else{const r=Math.min(1,max/Math.max(w,h));c.width=Math.round(w*r);c.height=Math.round(h*r);c.getContext('2d').drawImage(img,0,0,c.width,c.height)}return c};
  return {
   async prepare(file){const img=await load(file);const thumb=canvas(img,160,true).toDataURL('image/jpeg',.72);const blob=await new Promise(r=>canvas(img,1600,false).toBlob(r,'image/jpeg',.82));return {id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),thumb,blob}},
   put:(k,v)=>run('readwrite',s=>s.put(v,k)),get:k=>run('readonly',s=>s.get(k)).catch(()=>null),del:k=>run('readwrite',s=>s.delete(k)).catch(()=>{})
  }})();
 const Lightbox=(()=>{const n=el('<div class="sx-lb" hidden role="dialog" aria-modal="true" aria-label="Foto"><button type="button" class="lx" aria-label="Schließen">'+ICON.x+'</button><img alt=""><button type="button" class="lp" aria-label="Vorheriges Foto">'+ICON.back+'</button><button type="button" class="ln2" aria-label="Nächstes Foto">'+ICON.back+'</button><span class="lc"></span></div>');document.body.append(n);
  const img=n.querySelector('img');let list=[],idx=0,url=null,open=false;
  async function show(i){idx=(i+list.length)%list.length;const it=list[idx];if(url){URL.revokeObjectURL(url);url=null}img.src=it.thumb;img.classList.remove('in');void img.offsetWidth;img.classList.add('in');n.querySelector('.lc').textContent=list.length>1?(idx+1)+' / '+list.length:'';n.querySelectorAll('.lp,.ln2').forEach(b=>b.hidden=list.length<2);
   const blob=it.blob||await Media.get(it.id);if(blob&&list[idx]===it&&open){url=URL.createObjectURL(blob);img.src=url}}
  function close(){if(!open)return;open=false;n.classList.remove('on');setTimeout(()=>{n.hidden=true;img.removeAttribute('src');if(url){URL.revokeObjectURL(url);url=null}},reduce?0:260)}
  n.querySelector('.lx').onclick=close;n.querySelector('.lp').onclick=e=>{e.stopPropagation();show(idx-1)};n.querySelector('.ln2').onclick=e=>{e.stopPropagation();show(idx+1)};n.addEventListener('click',e=>{if(e.target===n)close()});
  let sx=0,sy=0;n.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});n.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(dy>90&&Math.abs(dy)>Math.abs(dx))close();else if(Math.abs(dx)>60&&list.length>1)show(idx+(dx<0?1:-1))},{passive:true});
  return {open(l,i){if(!l.length)return;list=l;open=true;n.hidden=false;void n.offsetWidth;n.classList.add('on');show(i)},close,isOpen:()=>open}})();
 const mapQuery=e=>e.mapUrl?e.mapUrl:e.geo?e.geo.lat+','+e.geo.lng:(e.place&&e.place!=='Aktueller Standort'?e.place:'');
 function openMap(e){const q=mapQuery(e);if(!q)return;const url=/^https?:/i.test(q)?q:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);window.open(url,'_blank','noopener')}
 window.SchivioLightbox=Lightbox;

 /* ---------- Tages-Sheet ---------- */
 const DS=(()=>{
  const root=el('<div class="sx-ds" hidden><div class="bg"></div><div class="sh" role="dialog" aria-modal="true" aria-labelledby="sxDsTitle"><div class="grab" aria-hidden="true"><i></i></div><div class="sc"><div class="bd"></div></div></div></div>');
  document.body.append(root);
  const sh=root.querySelector('.sh'),bd=root.querySelector('.bd'),sc=root.querySelector('.sc');
  let view=null,day='',lastFocus=null,isOpen=false,closeT=0;
  function show(){if(isOpen)return;isOpen=true;clearTimeout(closeT);lastFocus=document.activeElement;root.hidden=false;document.body.classList.add('modal-open');sh.style.transform='';void root.offsetWidth;root.classList.add('open')}
  function close(){if(!isOpen)return;isOpen=false;root.classList.remove('open');sh.style.transform='';document.body.classList.remove('modal-open');closeT=setTimeout(()=>{root.hidden=true;bd.replaceChildren();view=null},reduce?0:430);try{lastFocus?.focus({preventScroll:true})}catch(e){}}
  function swap(node,dir){node.classList.add('vw');const old=view;view=node;
   if(!old||reduce||!isOpen){bd.replaceChildren(node);bd.style.height='';sc.scrollTop=0;return}
   const h0=bd.offsetHeight;old.style.setProperty('--dx',dir>0?'-28px':'28px');old.classList.remove('in');old.classList.add('out');
   node.style.setProperty('--dx',dir>0?'28px':'-28px');node.classList.add('in');bd.append(node);
   const h1=node.offsetHeight;bd.style.height=h0+'px';void bd.offsetHeight;bd.style.height=h1+'px';sc.scrollTop=0;
   setTimeout(()=>{old.remove();bd.style.height='';node.classList.remove('in')},340)}
  root.querySelector('.bg').addEventListener('click',close);
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  /* Zum Schließen nach unten ziehen */
  let y0=0,dy=0,drag=false,t0=0;
  sh.addEventListener('pointerdown',e=>{if(!e.target.closest('.grab,.hd')||e.target.closest('button,input,textarea,select'))return;drag=true;y0=e.clientY;dy=0;t0=performance.now();sh.classList.add('drag');try{sh.setPointerCapture(e.pointerId)}catch(_){}});
  sh.addEventListener('pointermove',e=>{if(!drag)return;dy=Math.max(0,e.clientY-y0);sh.style.transform='translateY('+dy+'px)'});
  const endDrag=()=>{if(!drag)return;drag=false;sh.classList.remove('drag');const v=dy/Math.max(1,performance.now()-t0);if(dy>110||v>.8)close();else sh.style.transform=''};
  sh.addEventListener('pointerup',endDrag);sh.addEventListener('pointercancel',endDrag);

  const head=(eyebrow,title,opts={})=>'<div class="hd">'+(opts.back?'<button type="button" class="ib" data-x="back" aria-label="Zurück">'+ICON.back+'</button>':'')+'<div><span class="eb">'+esc(eyebrow)+'</span><h2 id="sxDsTitle">'+esc(title)+'</h2>'+(opts.hol?'<span class="hol">'+esc(opts.hol)+'</span>':'')+'</div><button type="button" class="ib" data-x="close" aria-label="Schließen">'+ICON.x+'</button></div>';
  const dTitle=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
  const dShort=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});
  const wkday=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long'});
  function wire(node,handlers){node.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b||!node.contains(b))return;const f=handlers[b.dataset.x]||({close,back:handlers.back})[b.dataset.x];if(f){buzz();f(b,e)}})}

  /* Tagesübersicht */
  function dayView(k,flashId){day=k;const items=[];
   const prev=new Date(k+'T12:00:00');prev.setDate(prev.getDate()-1);const pk=dateKey(prev.getFullYear(),prev.getMonth(),prev.getDate()),pc=data.shifts[pk];
   if(pc&&!isAllDay(pc)){const t=tmplOf(pc),a=mm(t.start),b=mm(t.end);if(a!==null&&b!==null&&b<a&&b>0)items.push({sort:-1,kind:'prev',code:pc,key:pk,t1:'00:00',t2:t.end,title:longTitle(pc),sub:'Vom Vortag · bis '+t.end+' Uhr',color:sColor(pc)})}
   const c=data.shifts[k];
   if(c){const ad=isAllDay(c),t=tmplOf(c);items.push({sort:ad?-2:mm(t.start),kind:'shift',code:c,key:k,t1:ad?'Ganz-':t.start,t2:ad?'tägig':t.end,title:longTitle(c),sub:shiftDetail(c),color:sColor(c),rb:!ad&&t.bd?.stage==='RB'})}
   eventsOn(k).forEach(({e,key,end,i,n})=>{const multi=n>0,first=i===0,last=i===n;const ad=e.allDay||(multi&&!first&&!last);const endTxt=new Date(end+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'short'});
    const t1=ad?'Ganz-':(multi&&!first?'bis':e.start),t2=ad?'tägig':(multi?(first?'ab':(e.end||'')):(e.end||''));
    const when=multi?('Tag '+(i+1)+' von '+(n+1)+' · '+(e.allDay?'bis '+endTxt:(first?'ab '+e.start+' Uhr · bis '+endTxt:last?'bis '+(e.end||'')+' Uhr':'ganztägig'))):(e.allDay?'Ganztägig':(e.start+(e.end?' – '+e.end:'')+' Uhr'));
    items.push({sort:ad?-2:(mm(multi&&!first?'00:00':e.start)??0),kind:'event',ev:e,key,t1:multi&&!first&&!last?'Ganz-':(multi&&last&&!e.allDay?'bis':t1),t2:multi&&!first&&!last?'tägig':(multi&&last&&!e.allDay?(e.end||''):t2),title:e.title,sub:[when,e.place,e.note].filter(Boolean).join(' · '),color:e.color||EV_COLORS[0]})});
   items.sort((a,b)=>a.sort-b.sort||(a.kind==='shift'?-1:1));
   let html=head(wkday(k),dTitle(k),{hol:holidayName(k)})+(window.SchivioWaste?SchivioWaste.dayHtml(k):'');
   if(items.length){html+='<div class="tl">';items.forEach((it,i)=>{const ic=it.kind==='event'?ICON.pin:(ICON[it.code]||ICON.X);const id=it.kind==='event'?it.ev.id:it.kind;
     html+='<button type="button" class="it'+(it.kind==='prev'?' ghost':'')+(flashId&&flashId===id?' flash':'')+'" data-x="'+(it.kind==='event'?'ev':it.kind==='prev'?'prev':'shift')+'" data-id="'+esc(id)+'" style="--c:'+esc(it.color)+';animation-delay:'+(i*45)+'ms" aria-label="'+esc(it.title+', '+it.sub+', bearbeiten')+'"><span class="tm"><b>'+esc(it.t1)+'</b><small>'+esc(it.t2)+'</small></span><span class="nd"><i></i></span><span class="cd"><span class="ic">'+ic+'</span><span class="tx"><b>'+esc(it.title)+'</b><small>'+esc(it.sub)+'</small></span><span class="kd">'+(it.kind==='event'?'Termin':'Dienst')+'</span>'+ICON.chev+'</span></button>';
     if(it.kind==='event'){const e=it.ev,imgs=Array.isArray(e.images)?e.images:[];const mq=mapQuery(e);if(imgs.length||mq){html+='<div class="ex" style="animation-delay:'+(i*45+60)+'ms">'+(mq?'<button type="button" class="mp" data-x="map" data-id="'+esc(e.id)+'">'+ICON.map+'Karte</button>':'')+imgs.slice(0,6).map((im,j)=>'<button type="button" class="tb" data-x="img" data-id="'+esc(e.id)+'" data-i="'+j+'" aria-label="Foto '+(j+1)+' ansehen"><img alt="" src="'+esc(im.thumb)+'"></button>').join('')+'</div>'}}
     if(it.rb)html+='<label class="rb">Einsatzzeit in der Rufbereitschaft (Std., aufgerundet) <input type="number" min="0" max="24" step="1" inputmode="numeric" data-rb value="'+esc(data.rbWork?.[k]||'')+'" placeholder="0"></label>'});html+='</div>'}
   else html+='<div class="em"><span>'+ICON.cal+'</span><b>Noch nichts geplant</b><small>Trage einen Dienst oder Termin ein.</small></div>';
   html+='<div class="ac">'+(c?'':'<button type="button" class="bt" data-x="addShift">'+ICON.A+'Dienst</button>')+'<button type="button" class="bt pr" data-x="addEv">'+ICON.plus+'Termin</button></div>';
   const node=el('<div>'+html+'</div>');
   const rb=node.querySelector('[data-rb]');if(rb)rb.onchange=()=>{const v=Math.max(0,Math.min(24,Math.ceil(Number(rb.value)||0)));data.rbWork=data.rbWork||{};if(v)data.rbWork[k]=v;else delete data.rbWork[k];rb.value=v||'';persist();render()};
   wire(node,{shift:()=>swap(shiftView(k,k),1),prev:b=>swap(shiftView(pk,k),1),addShift:()=>swap(shiftView(k,k),1),addEv:()=>swap(eventView(k,null,k),1),ev:b=>{const o=eventsOn(k).find(x=>x.e.id===b.dataset.id);if(o)swap(eventView(o.key,o.e,k),1)},map:b=>{const o=eventsOn(k).find(x=>x.e.id===b.dataset.id);if(o)openMap(o.e)},img:b=>{const o=eventsOn(k).find(x=>x.e.id===b.dataset.id);if(o)Lightbox.open(o.e.images||[],Number(b.dataset.i)||0)}});
   return node}

  /* Dienst wählen / ändern */
  function shiftView(k,ret){const cur=data.shifts[k]||'';const codes=typeof orderedPlannerCodes==='function'?orderedPlannerCodes():['F','S','N','X','U','T','A'];
   let html=head(dShort(k),cur?'Dienst ändern':'Dienst eintragen',{back:true})+'<div class="gr">';
   codes.forEach((c,i)=>{const t=tmplOf(c);const sub=isAllDay(c)?'Ganztägig':t.start+' – '+t.end;html+='<button type="button" class="op'+(c===cur?' on':'')+'" data-x="pick" data-c="'+esc(c)+'" style="--c:'+esc(sColor(c))+';animation-delay:'+(i*25)+'ms" aria-pressed="'+(c===cur)+'"><b>'+esc(shiftTitle(c))+'</b><small>'+esc(sub)+'</small></button>'});
   if(cur)html+='<button type="button" class="op rm" data-x="pick" data-c="" style="animation-delay:'+(codes.length*25)+'ms"><b>'+ICON.trash.replace('<svg','<svg width="16" height="16"')+'Dienst entfernen</b><small>Tag wird frei</small></button>';
   html+='</div>';const node=el('<div>'+html+'</div>');
   wire(node,{back:()=>swap(dayView(ret),-1),pick:b=>{const c=b.dataset.c;node.querySelectorAll('.op').forEach(o=>o.classList.toggle('on',o===b&&!!c));if(c)data.shifts[k]=c;else delete data.shifts[k];persist();render();if(typeof renderStatsOnly==='function')try{renderStatsOnly()}catch(e){}setTimeout(()=>swap(dayView(ret,c?(k===ret?'shift':'prev'):''),-1),c?220:120);toast(c?shiftTitle(c)+' eingetragen':'Dienst entfernt')}});
   return node}

  /* Termin anlegen / bearbeiten */
  function eventView(k,ev,ret){const isNew=!ev;let col=ev?.color||EV_COLORS[0];
   let s=ev?.start,e=ev?.end;if(!s){const n=new Date();if(k===todayKey()&&n.getHours()<23){s=String(n.getHours()+1).padStart(2,'0')+':00'}else s='09:00'}if(!e){const v=mm(s)+60;e=v>=1440?'23:59':String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0')}
   const allDay=!!ev?.allDay;
   const html=head(isNew?dShort(k):'Termin',isNew?'Neuer Termin':'Termin bearbeiten',{back:true})+
    '<div class="fm"><label>Titel<input data-f="title" maxlength="80" placeholder="z. B. Zahnarzt" value="'+esc(ev?.title||'')+'" autocomplete="off"></label>'+
    '<div class="r2"><label>Datum<input type="date" data-f="date" value="'+esc(k)+'"></label><label>Bis (optional)<input type="date" data-f="end2" value="'+esc(ev?.endDate||'')+'" min="'+esc(k)+'"></label></div>'+
    '<div class="sw"><span>Ganztägig</span><button type="button" class="sx-sw" role="switch" aria-checked="'+allDay+'" aria-label="Ganztägig" data-x="ad"></button></div>'+
    '<div class="r2" data-times'+(allDay?' hidden':'')+'><label>Beginn<input type="time" data-f="start" value="'+esc(s)+'"></label><label>Ende<input type="time" data-f="end" value="'+esc(e)+'"></label></div>'+
    '<div class="loc"><label>Ort (optional)<input data-f="place" maxlength="300" placeholder="Adresse oder Google-Maps-Link" value="'+esc(ev?.mapUrl||ev?.place||'')+'"></label><div class="lb"><button type="button" class="ch2" data-x="mapsearch">'+ICON.map+'In Google Maps suchen</button><button type="button" class="ch2" data-x="geo">'+ICON.loc+'Aktueller Standort</button></div><small class="hint" data-geo>'+(ev?.geo?'Standort gespeichert':'Tipp: In Google Maps einen Ort teilen → „Link kopieren“ → hier einfügen.')+'</small></div>'+
    '<label>Notiz (optional)<textarea data-f="note" maxlength="500" placeholder="">'+esc(ev?.note||'')+'</textarea></label>'+
    '<div><span style="display:block;font-size:12.5px;font-weight:700;color:var(--sx-muted);margin-bottom:8px">Fotos (optional)</span><div class="ph" data-ph></div></div>'+
    '<div><span style="display:block;font-size:12.5px;font-weight:700;color:var(--sx-muted);margin-bottom:8px">Farbe</span><div class="cl">'+EV_COLORS.map(c=>'<button type="button" data-x="col" data-c="'+c+'" class="'+(c===col?'on':'')+'" style="--c:'+c+'" aria-label="Farbe '+c+'"></button>').join('')+'</div></div>'+
    '<div class="er" data-err></div></div>'+
    '<div class="ac">'+(isNew?'':'<button type="button" class="bt dg" data-x="del">'+ICON.trash+'Löschen</button>')+'<button type="button" class="bt pr" data-x="save">'+ICON.check+'Speichern</button></div>';
   const node=el('<div>'+html+'</div>');const f=n=>node.querySelector('[data-f="'+n+'"]');const err=node.querySelector('[data-err]');
   let geo=ev?.geo||null;const imgs=(Array.isArray(ev?.images)?ev.images:[]).map(x=>({...x}));const removed=[];
   const ph=node.querySelector('[data-ph]');
   const paintPh=()=>{ph.innerHTML=imgs.map((im,j)=>'<span class="pt"><button type="button" class="tb" data-x="pv" data-i="'+j+'" aria-label="Foto '+(j+1)+' ansehen"><img alt="" src="'+esc(im.thumb)+'"></button><button type="button" class="rmv" data-x="prm" data-i="'+j+'" aria-label="Foto entfernen">'+ICON.x+'</button></span>').join('')+(imgs.length<6?'<label class="add"><input type="file" accept="image/*" multiple hidden data-file>'+ICON.cam+'<span>'+(imgs.length?'Mehr':'Foto')+'</span></label>':'');
    ph.querySelector('[data-file]')?.addEventListener('change',async e2=>{const files=[...e2.target.files].slice(0,6-imgs.length);e2.target.value='';for(const file of files){try{const r=await Media.prepare(file);imgs.push(r);paintPh()}catch(x){toast('Dieses Bild konnte nicht geladen werden.')}}})};
   paintPh();
   f('place').addEventListener('input',()=>{if(geo&&f('place').value.trim()!==ev?.place){geo=null;node.querySelector('[data-geo]').textContent='Tipp: In Google Maps einen Ort teilen → „Link kopieren“ → hier einfügen.'}});
   wire(node,{back:()=>swap(dayView(ret),-1),
    mapsearch:()=>{const q=f('place').value.trim();if(!q){toast('Gib zuerst eine Adresse oder einen Namen ein.');f('place').focus();return}openMap({place:q})},
    geo:b=>{if(!navigator.geolocation){toast('Standort ist auf diesem Gerät nicht verfügbar.');return}const hint=node.querySelector('[data-geo]');hint.textContent='Standort wird ermittelt …';navigator.geolocation.getCurrentPosition(p=>{geo={lat:Math.round(p.coords.latitude*1e5)/1e5,lng:Math.round(p.coords.longitude*1e5)/1e5};if(!f('place').value.trim())f('place').value='Aktueller Standort';hint.textContent='Standort gespeichert ✓'},()=>{hint.textContent='Standort konnte nicht ermittelt werden. Bitte Freigabe prüfen.'},{enableHighAccuracy:true,timeout:12000})},
    pv:b=>Lightbox.open(imgs,Number(b.dataset.i)||0),
    prm:b=>{const j=Number(b.dataset.i);const [x]=imgs.splice(j,1);if(x&&!x.blob)removed.push(x.id);paintPh()},
    ad:b=>{const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',String(on));const tb=node.querySelector('[data-times]');tb.hidden=on;if(!on)tb.animate?.([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:reduce?0:260,easing:'ease-out'})},
    col:b=>{col=b.dataset.c;node.querySelectorAll('.cl button').forEach(x=>x.classList.toggle('on',x===b))},
    del:()=>{if(!confirm('Diesen Termin löschen?'))return;(ev.images||[]).forEach(im=>Media.del(im.id));const list=evList(k).filter(x=>x.id!==ev.id);if(list.length)data.events[k]=list;else delete data.events[k];persist();render();toast('Termin gelöscht');swap(dayView(ret),-1)},
    save:async()=>{const title=f('title').value.trim(),date=f('date').value,ad=node.querySelector('.sx-sw').getAttribute('aria-checked')==='true',st=f('start').value,en=f('end').value;err.textContent='';
     const bad=(m,inp)=>{err.textContent=m;inp?.focus();const box=inp?.closest('label')||err;box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake')};
     if(!title)return bad('Bitte gib einen Titel ein.',f('title'));if(!/^\d{4}-\d\d-\d\d$/.test(date))return bad('Bitte wähle ein Datum.',f('date'));
     const end2=f('end2').value;if(end2&&end2<date)return bad('Das Enddatum liegt vor dem Beginn.',f('end2'));const multi=!!end2&&end2>date;
     if(!ad){if(!st)return bad('Bitte gib eine Beginnzeit ein.',f('start'));if(!multi&&en&&mm(en)<=mm(st))return bad('Das Ende muss nach dem Beginn liegen.',f('end'))}
     const rawPlace=f('place').value.trim(),isUrl=/^https?:\/\//i.test(rawPlace);
     for(const im of imgs){if(im.blob){try{await Media.put(im.id,im.blob)}catch(x){}delete im.blob}}removed.forEach(id=>Media.del(id));
     const item={id:ev?.id||('e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),title,allDay:ad,start:ad?'':st,end:ad?'':en,color:col,place:isUrl?'Google-Maps-Ort':rawPlace,note:f('note').value.trim()};
     if(multi)item.endDate=end2;if(isUrl)item.mapUrl=rawPlace;if(geo)item.geo=geo;if(imgs.length)item.images=imgs.map(x=>({id:x.id,thumb:x.thumb}));
     if(ev){const list=evList(k).filter(x=>x.id!==ev.id);if(list.length)data.events[k]=list;else delete data.events[k]}
     data.events[date]=[...evList(date),item].sort((a,b)=>(a.allDay?-1:mm(a.start))-(b.allDay?-1:mm(b.start)));
     if(!persist()){err.textContent='Speicher voll – bitte weniger oder kleinere Fotos verwenden.';return}render();popDots(date);toast(isNew?'Termin gespeichert':'Termin aktualisiert');swap(dayView(date,item.id),-1)}});
   if(isNew)setTimeout(()=>{try{f('title').focus({preventScroll:true})}catch(_){}},reduce?0:380);
   return node}

  return {
   head,wire,swap,show,
   isOpen:()=>isOpen,
   view:()=>view,
   node(fn){show();swap(fn(),0)},
   open(k){show();swap(dayView(k),0)},
   openEvent(k){show();swap(eventView(k,null,k),0)},
   refresh(){if(isOpen&&view&&day&&view.querySelector('.tl,.em'))swap(dayView(day),0)},
   sheet:sh,scroller:sc,
   close
  };
 })();
 window.SchivioDay=DS;window.SchivioToast=toast;
 openAgenda=function(day){DS.open(day)};

 /* ---------- Backup inkl. Termine ---------- */
 const exp=$('exportData');if(exp){const orig=exp.onclick;exp.onclick=function(ev){const js=JSON.stringify;JSON.stringify=function(v,...r){if(v&&typeof v==='object'&&v.version&&v.shifts){v.events=data.events||{};v.icsReminder=data.icsReminder}return js.call(this,v,...r)};try{orig?.call(this,ev)}finally{JSON.stringify=js}data.lastBackup=new Date().toISOString();persist();MX.render()}}
 const imp=$('importFile');if(imp){const orig=imp.onchange;imp.onchange=async function(ev){const f=ev.target.files?.[0];let extra=null;try{if(f&&f.size<2000000)extra=JSON.parse(await f.text())}catch(e){}const before=data.shifts;await orig?.call(this,ev);if(extra&&data.shifts!==before){data.events=extra.events&&typeof extra.events==='object'&&!Array.isArray(extra.events)?extra.events:{};if('icsReminder' in extra)data.icsReminder=extra.icsReminder;persist();render();MX.render()}}}

 /* ---------- Kalenderdatei (.ics) ---------- */
 function makeICS(){const remind=data.icsReminder!==false;const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Schivio//Dienstplan//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Schivio'];
  const tx=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
  const d8=k=>k.replace(/-/g,'');const plus=(k,n)=>{const t=new Date(k+'T12:00:00');t.setDate(t.getDate()+n);return dateKey(t.getFullYear(),t.getMonth(),t.getDate())};
  const utc=dt=>dt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const stamp=utc(new Date());
  const from=new Date();from.setDate(from.getDate()-31);const fromK=dateKey(from.getFullYear(),from.getMonth(),from.getDate());const to=new Date();to.setDate(to.getDate()+400);const toK=dateKey(to.getFullYear(),to.getMonth(),to.getDate());
  const push=(uid,sum,k,ad,s,e,extra=[],alarm)=>{L.push('BEGIN:VEVENT','UID:'+uid+'@schivio','DTSTAMP:'+stamp,'SUMMARY:'+tx(sum));if(ad){L.push('DTSTART;VALUE=DATE:'+d8(k),'DTEND;VALUE=DATE:'+d8(plus(k,1)))}else{const ek=e&&mm(e)<=mm(s)?plus(k,1):k;L.push('DTSTART:'+d8(k)+'T'+s.replace(':','')+'00','DTEND:'+d8(ek)+'T'+(e||s).replace(':','')+'00')}L.push(...extra);if(alarm)L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+tx(sum),alarm,'END:VALARM');L.push('END:VEVENT')};
  let n=0;
  for(const [k,c] of Object.entries(data.shifts||{})){if(k<fromK||k>toK||!c)continue;const ad=isAllDay(c),t=tmplOf(c);let alarm=null;if(remind&&!ad){const ev=new Date(k+'T20:00:00');ev.setDate(ev.getDate()-1);alarm='TRIGGER;VALUE=DATE-TIME:'+utc(ev)}push('shift-'+k,longTitle(c),k,ad,t?.start,t?.end,['CATEGORIES:Dienst'],alarm);n++}
  for(const [k,list] of Object.entries(data.events||{})){if(k<fromK||k>toK)continue;for(const e of evList(k)){const ex=[];if(e.place)ex.push('LOCATION:'+tx(e.place));if(e.note)ex.push('DESCRIPTION:'+tx(e.note));const multi=e.endDate&&e.endDate>k;if(multi){L.push('BEGIN:VEVENT','UID:event-'+e.id+'@schivio','DTSTAMP:'+stamp,'SUMMARY:'+tx(e.title));if(e.allDay)L.push('DTSTART;VALUE=DATE:'+d8(k),'DTEND;VALUE=DATE:'+d8(plus(e.endDate,1)));else L.push('DTSTART:'+d8(k)+'T'+e.start.replace(':','')+'00','DTEND:'+d8(e.endDate)+'T'+(e.end||'23:59').replace(':','')+'00');L.push(...ex,'END:VEVENT')}else push('event-'+e.id,e.title,k,e.allDay,e.start,e.end,ex,remind&&!e.allDay?'TRIGGER:-PT1H':null);n++}}
  L.push('END:VCALENDAR');
  const fold=l=>{const out=[];let cur='',len=0;for(const ch of l){const b=new TextEncoder().encode(ch).length;if(len+b>73){out.push(cur);cur=' '+ch;len=1+b}else{cur+=ch;len+=b}}out.push(cur);return out.join('\r\n')};
  return {text:L.map(fold).join('\r\n')+'\r\n',count:n}}
 async function exportICS(){const {text,count}=makeICS();if(!count){toast('Keine Dienste oder Termine im Zeitraum vorhanden.');return}
  const name='Schivio-Kalender.ics';const file=new File([text],name,{type:'text/calendar'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})&&/Android|iPhone|iPad/i.test(navigator.userAgent)){await navigator.share({files:[file],title:'Schivio-Kalender'});toast(count+' Einträge geteilt – mit deiner Kalender-App öffnen.');return}}catch(e){if(e?.name==='AbortError')return}
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast(count+' Einträge gespeichert. Öffne die Datei, um sie in deinen Kalender zu übernehmen.')}

 /* ---------- Reiter „Mehr“ ---------- */
 const MX=(()=>{
  const sec=$('settings');if(!sec)return {render(){}};
  sec.classList.add('sx-mx');const box=document.createElement('div');box.className='mx';sec.prepend(box);
  const page=document.createElement('div');page.className='mxp';page.hidden=true;page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');document.body.append(page);
  const openPay=()=>{const b=document.querySelector('[data-gp-open]');if(b)b.click();else toast('Bitte zuerst ein Tarifprofil wählen.')};
  const opt=(id)=>{const s=$(id);return s?.selectedOptions?.[0]?.textContent||''};
  const tariffShort=()=>{const t=opt('tariff');return !$('tariff')?.value?'Kein Tarif gewählt':t.split(' · ')[0]};
  const levelInfo=()=>{const t=opt('level');const p=t.split(' · ');return {label:p[0]||'',amount:p[1]||''}};
  const stateName=()=>opt('state')||'';
  const fmtH=v=>Number(v).toLocaleString('de-DE',{maximumFractionDigits:2});
  const PAL={emerald:['Emerald','#16924c'],blue:['Blau','#1977b9'],violet:['Violett','#8654ba'],amber:['Gold','#ba8731'],teal:['Türkis','#148f8c'],rose:['Rosé','#b45d79']};
  const R=(k,ic,title,sub,act,extra='')=>'<button type="button" class="rw" data-m="'+act+'"><span class="ri" style="--k:'+k+'">'+ic+'</span><span class="rt"><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+extra+ICON.cv+'</button>';
  function render(){const p=data.profile||{},o=data.setupOptions||{};const theme=document.body.dataset.theme||'anthracite';const mode=theme==='anthracite'?'anthracite':theme==='light'?'light':'colored';
   const vivid=data.shiftIntensity!=='subtle';const lv=levelInfo();const salaryOn=!!o.salaryEnabled;
   const allowances=Object.values(data.salaryAllowances||{}).filter(a=>a&&Number(a.value)>0).length;
   const weekly=Number(p.weekly)>0?fmtH(p.weekly)+' h / Woche':(o.hoursValue?fmtH(o.hoursValue)+' h / Woche':'Stunden fehlen');
   const ind=$('group')?.hidden;
   const chips=[ind?'Eigene Werte':((p.group||'')+(lv.label?' · '+lv.label:'')),weekly,stateName()].filter(Boolean).map(t=>'<span>'+esc(t)+'</span>').join('');
   const bk=data.lastBackup?new Date(data.lastBackup):null;
   const wdl0=typeof workdayList==='function'?workdayList():[1,2,3,4,5];const wn=['So','Mo','Di','Mi','Do','Fr','Sa'];const workdaysTxt=String(p.workdays||'5').startsWith('m:')?wdl0.length+'-Tage-Woche ('+wdl0.map(d=>wn[d]).join(', ')+')':opt('workdays');
   box.innerHTML='<h1>Mehr</h1>'+
    '<button type="button" class="pc" data-m="tarif"><span class="top"><span class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg></span><span class="nm"><small>DEIN PROFIL</small><b>'+esc(tariffShort())+'</b></span>'+ICON.cv+'</span><span class="chips">'+chips+'</span>'+(lv.amount?'<span class="ft"><span>Tarifliches Grundentgelt</span><b>'+esc(lv.amount)+'</b></span>':'')+'</button>'+
    '<section><h3>Arbeit &amp; Gehalt</h3><div class="gp">'+
     R('var(--sx-a)','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/></svg>','Tarif &amp; Eingruppierung',esc(ind?tariffShort()+' · eigene Werte':[tariffShort(),p.group,lv.label].filter(Boolean).join(' · ')),'tarif')+
     R('#8fb0ff',ICON.A,'Arbeitszeit &amp; Soll',esc([weekly.replace(' / Woche',''),workdaysTxt,stateName()&&'Feiertage '+(p.state||'')].filter(Boolean).join(' · ')),'hours')+
     (salaryOn?R('#4ade80','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>','Gehalt anpassen',(allowances?allowances+' Zulage'+(allowances>1?'n':'')+' · ':'Zulagen, ')+'Schichtmodell, Feiertage','pay',allowances?'':'<span class="bdg">Prüfen</span>'):'')+
     R('#34d399','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>','Steuer-Helfer','Fahrten &amp; Fortbildungen fürs Finanzamt','tax',data.tax&&data.tax.km?'':'<span class="bdg">Neu</span>')+
     '<button type="button" class="rw" data-m="shifts"><span class="ri" style="--k:#b79cff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span><span class="rt"><b>Dienstarten</b><span class="bars">'+['F','S','N','U'].map(c=>'<i style="--c:'+esc(sColor(c))+'"></i>').join('')+'</span></span>'+ICON.cv+'</button>'+
    '</div></section>'+
    '<section><h3>Darstellung</h3><div class="gp pd"><span class="lbl">Theme</span>'+(window.SchivioThemes?SchivioThemes.pickerHTML():'')+


     '<div class="hr"></div><div class="ln"><span class="rt"><b>Dienstfarben</b><small>im Kalender</small></span><span class="seg"><button type="button" data-m="int" data-v="subtle" class="'+(vivid?'':'on')+'">Dezent</button><button type="button" data-m="int" data-v="vivid" class="'+(vivid?'on':'')+'">Kräftig</button></span></div>'+
     '<div class="pills">'+['F','S','N','U'].map(c=>'<span style="--c:'+esc(sColor(c))+'">'+esc(shiftTitle(c))+'</span>').join('')+'</div>'+
    '</div></section>'+
    '<section><h3>Erinnerungen &amp; Kalender <em>· neu</em></h3><div class="gp">'+
     '<div class="rw" style="cursor:default"><span class="ri" style="--k:var(--sx-warn)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg></span><span class="rt"><b>Dienst-Erinnerung</b><small>'+(data.icsReminder!==false?'Am Vorabend um 20:00 Uhr · über den Handy-Kalender':'Aus')+'</small></span><button type="button" class="sx-sw" role="switch" aria-label="Dienst-Erinnerung" aria-checked="'+(data.icsReminder!==false)+'" data-m="remind"></button></div>'+
     R('#facc15','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 12a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8z"/><path d="M3.5 5h17M10 3h4"/></svg>','Müllkalender',(()=>{const w=data.waste;const n=w&&w.bins?w.bins.length:0;return n?(w.on===false?'Ausgeblendet · ':'')+n+(n===1?' Tonne':' Tonnen'):'Abholtage als Tonnen im Kalender'})(),'waste',data.waste&&data.waste.bins&&data.waste.bins.length?'':'<span class="bdg">Neu</span>')+
     R('#8fb0ff','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5L12 18l2.5-2.5"/></svg>','In Handy-Kalender übernehmen','Dienste &amp; Termine als Kalenderdatei','ics')+
    '</div></section>'+
    '<section><h3>Daten &amp; Sicherheit</h3><div class="gp pd"><p class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>Alle Daten bleiben nur auf diesem Gerät. Ein Backup schützt sie bei Handywechsel oder beim Löschen des Browsers.</span></p>'+
     (bk?'<div class="bk ok">Letztes Backup: '+bk.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})+'</div>':'<div class="bk warn">Letztes Backup: noch keins</div>')+
     '<div class="two"><button type="button" class="bt pr" data-m="backup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Sichern</button><button type="button" class="bt" data-m="restore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>Wiederherstellen</button></div></div></section>'+
    '<section><h3>Hilfe &amp; Info</h3><div class="gp">'+
     R('var(--sx-muted)','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6"/></svg>','Einrichtung neu starten','Beruf, Tarif und Stunden neu wählen','setup')+
     R('var(--sx-muted)','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>','So funktioniert die Prognose','Kurz erklärt, was berechnet wird','help')+
     '<div class="rw" style="cursor:default"><span class="ri" style="--k:var(--sx-a);font-weight:800;font-size:15px">S</span><span class="rt"><b>Über Schivio</b><small>Version '+VERSION+'</small></span></div>'+
    '</div></section><p class="foot">Dein Dienstplan. Dein Gehalt.</p>'}
  box.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;buzz();const a=b.dataset.m,v=b.dataset.v;
   if(a==='tarif')openPage('tarif');else if(a==='hours')openPage('tarif','hours');
   else if(a==='pay')openPay()
   else if(a==='waste')window.SchivioWaste?.open()
   else if(a==='tax')window.SchivioTax?.open()
   else if(a==='shifts'){$('tabTemplates')?.click();window.__sxFromMore=true}
   else if(a==='skin'){SchivioThemes.set(v);setTimeout(render,30)}
   else if(a==='neonpal'){SchivioThemes.set('neon',v);setTimeout(render,30)}
   else if(a==='int'){document.querySelector('[data-intensity="'+v+'"]')?.click();setTimeout(render,30)}
   else if(a==='remind'){data.icsReminder=b.getAttribute('aria-checked')!=='true';persist();b.setAttribute('aria-checked',String(data.icsReminder));const sm=b.parentElement.querySelector('small');if(sm)sm.textContent=data.icsReminder?'Am Vorabend um 20:00 Uhr · über den Handy-Kalender':'Aus';toast(data.icsReminder?'Erinnerung wird beim nächsten Kalender-Export mitgeschickt.':'Erinnerung aus')}
   else if(a==='ics')exportICS();
   else if(a==='backup'){$('exportData')?.click();toast('Backup-Datei wird gespeichert.')}
   else if(a==='restore')$('importButton')?.click();
   else if(a==='setup')$('setupOpen')?.click();
   else if(a==='help')openPage('help')});

  /* Unterseiten */
  let saveT=0,lastEl=null,retPage='';
  /* Nach „Gehalt anpassen“ zurück auf die Seite, von der es geöffnet wurde */
  (()=>{const gs=$('gpSheet');if(!gs)return;new MutationObserver(()=>{if(gs.hidden&&retPage){const p=retPage;retPage='';setTimeout(()=>openPage(p),60)}}).observe(gs,{attributes:true,attributeFilter:['hidden']})})();
  document.querySelector('.bottom-tabs')?.addEventListener('click',()=>{retPage='';window.__sxFromMore=false},true);
  function openPage(which,focus){lastEl=document.activeElement;page.hidden=false;page.innerHTML='';page.scrollTop=0;if(which==='help')renderHelp();else renderTarif();void page.offsetWidth;page.classList.add('on');document.body.classList.add('modal-open');if(focus==='hours')setTimeout(()=>page.querySelector('[data-sec="hours"]')?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'}),reduce?0:450)}
  function closePage(){page.classList.remove('on');document.body.classList.remove('modal-open');setTimeout(()=>{page.hidden=true;page.innerHTML=''},reduce?0:430);render();try{lastEl?.focus({preventScroll:true})}catch(e){}}
  page.addEventListener('keydown',e=>{if(e.key==='Escape')closePage()});
  const top=(title,saved)=>'<div class="tp"><button type="button" class="bk2" data-p="back">'+ICON.back+'Mehr</button>'+(saved?'<span class="sv" data-sv>'+ICON.check+'Automatisch gespeichert</span>':'')+'</div><h1>'+title+'</h1>';
  function renderHelp(){page.innerHTML='<div class="in">'+top('So funktioniert die Prognose')+'<div class="bx txt">'+
   '<p><b>Grundlage sind deine eingetragenen Dienste.</b> Schivio zählt alle Dienste des Monats – auch zukünftige – und berechnet daraus Arbeitszeit, Zeitguthaben und eine Brutto-Prognose.</p>'+
   '<p><b>Das Gehalt kommt aus deinem Tarifprofil.</b> Tarifwerk, Entgeltgruppe und Stufe bestimmen das Grundentgelt. Bei Teilzeit wird es anteilig nach deinen Wochenstunden berechnet.</p>'+
   '<p><b>Zuschläge werden automatisch ergänzt</b> – etwa für Nacht-, Sonntags- und Feiertagsarbeit, soweit dein Tarif sie vorsieht. Feste Zulagen trägst du einmalig unter „Gehalt anpassen“ ein.</p>'+
   '<p><b>Das Monatssoll</b> ergibt sich aus Wochenstunden, Arbeitstagen und den Feiertagen deines Bundeslandes. Urlaub und Fortbildung werden gutgeschrieben. Für Krankheit legst du dir bei Bedarf unter „Schichten“ eine eigene Schicht an.</p>'+
   '<p><b>Wichtig:</b> Die Prognose zeigt Brutto, nicht Netto, und ist keine verbindliche Abrechnung. Maßgeblich ist deine Gehaltsabrechnung.</p></div></div>';wireP()}
  function renderTarif(){const p=data.profile||{};const tS=$('tariff'),gS=$('group'),lS=$('level'),sS=$('state'),wS=$('workdays');const ind=gS?.hidden;
   const tOpts=[...(tS?.options||[])].filter(o=>o.value);const gOpts=[...(gS?.options||[])].filter(o=>o.value);const lOpts=[...(lS?.options||[])].filter(o=>o.value);
   const lv=levelInfo();const weekly=$('weekly')?.value||'';const ft=$('fulltime');const ftDef=Number((ft?.placeholder||'').match(/[\d,]+/)?.[0]?.replace(',','.'))||39;
   const wv=Number(weekly);const share=wv>0?(wv>=ftDef-0.001?'Vollzeit ('+fmtH(ftDef)+' h)':'Teilzeit · '+fmtH(Math.round(wv/ftDef*1000)/10)+' % von '+fmtH(ftDef)+' h'):'Bitte Wochenstunden eintragen';
   const wOpts=[...(wS?.options||[])];
   page.innerHTML='<div class="in">'+top('Tarif &amp; Eingruppierung',true)+
    '<section><button type="button" class="tw" data-p="tlist" aria-expanded="false"><span><small>TARIFWERK</small><b>'+esc(tS?.value?opt('tariff'):'Bitte auswählen')+'</b></span><em>Ändern</em></button><div class="tl2" data-tl><div><div class="ls">'+tOpts.map(o=>'<button type="button" data-p="t" data-v="'+esc(o.value)+'" class="'+(o.value===tS.value?'on':'')+'">'+esc(o.textContent)+(o.value===tS.value?ICON.check.replace('<svg','<svg width="18" height="18"'):'')+'</button>').join('')+'</div></div></div></section>'+
    (ind?'<section><div class="bx"><p style="margin:0;font-size:14px;line-height:1.5;color:var(--sx-muted)">Bei diesem Tarif trägst du Grundgehalt und Zuschläge selbst ein.</p><button type="button" class="bt pr" data-p="pay">Eigene Werte eintragen</button></div></section>':
    (gOpts.length?'<section><h3>Entgeltgruppe</h3><div class="chs">'+gOpts.map(o=>'<button type="button" data-p="g" data-v="'+esc(o.value)+'" class="'+(o.value===gS.value?'on':'')+'" aria-pressed="'+(o.value===gS.value)+'">'+esc(o.textContent)+'</button>').join('')+'</div></section>':'')+
    (lOpts.length?'<section><h3>'+(lOpts[0].textContent.startsWith('Stufe')?'Erfahrungsstufe':'Stufe')+'</h3><div class="lv" style="--n:'+Math.min(lOpts.length,6)+'">'+lOpts.map(o=>{const short=o.textContent.split(' · ')[0].replace(/^Stufe\s*/,'');return '<button type="button" data-p="l" data-v="'+esc(o.value)+'" class="'+(o.value===lS.value?'on':'')+'" aria-pressed="'+(o.value===lS.value)+'" aria-label="'+esc(o.textContent)+'">'+esc(short)+'</button>'}).join('')+'</div>'+(lv.amount?'<div class="am"><span>'+esc([gS.value,lv.label].filter(Boolean).join(' · '))+' · Grundentgelt</span><b>'+esc(lv.amount)+'</b></div>':'')+'</section>':(gOpts.length?'':'<section><div class="bx"><p style="margin:0;font-size:14px;color:var(--sx-muted)">Für diesen Tarif sind noch keine Entgeltgruppen hinterlegt.</p></div></section>')))+
    '<section data-sec="hours"><h3>Arbeitszeit</h3><div class="bx">'+
     '<div class="ln"><span class="rt"><b>Wochenstunden</b><small data-share>'+esc(share)+'</small></span><span class="stp"><button type="button" data-p="minus" aria-label="Weniger Stunden">−</button><input type="number" inputmode="decimal" step="0.5" min="1" max="60" data-p-in="weekly" value="'+esc(weekly)+'" aria-label="Wochenstunden"><button type="button" data-p="plus" aria-label="Mehr Stunden">+</button></span></div>'+
     '<div class="hr"></div><div class="ln ft2"><span class="rt"><b>Tarifliche Vollzeit</b><small>leer = Tarifwert ('+fmtH(ftDef)+' h)</small></span><input type="number" inputmode="decimal" step="0.1" min="30" max="45" data-p-in="fulltime" value="'+esc(ft?.value||'')+'" placeholder="'+fmtH(ftDef)+'" aria-label="Tarifliche Vollzeit"></div>'+
     '<div class="hr"></div>'+workdaysHTML()+
     '<div class="hr"></div><div class="ln"><span class="rt"><b>Bundesland</b><small>für Feiertage</small></span><span class="sel">'+esc(stateName())+ICON.chevD+'</span><select class="ov" data-p-sel="state" aria-label="Bundesland">'+[...(sS?.options||[])].map(o=>'<option value="'+esc(o.value)+'"'+(o.value===sS.value?' selected':'')+'>'+esc(o.textContent)+'</option>').join('')+'</select></div>'+
     '<div class="er" data-perr></div>'+
    '</div></section></div>';
   wireP()}
  function workdaysHTML(){const w=String($('workdays')?.value||data.profile?.workdays||'5');const mode=w==='6'?'6':w.startsWith('m:')?'m':'5';const mask=typeof workdayList==='function'?workdayList():[1,2,3,4,5];const wk=Number($('weekly')?.value)||0;
   const info=mode==='5'?'Üblich im Schichtdienst (TVöD, TV-L, AVR): Das Monatssoll wird auf Basis Mo–Fr berechnet – auch wenn du am Wochenende arbeitest.':mode==='6'?'Nur wählen, wenn dein Vertrag eine 6-Tage-Woche (Mo–Sa) vorsieht.':'Für feste Arbeitstage laut Vertrag, z. B. 4-Tage-Woche Mo–Do.'+(wk&&mask.length?' Pro Arbeitstag: '+fmtH(Math.round(wk/mask.length*100)/100)+' h.':'');
   return '<div class="wd"><div class="ln"><span class="rt"><b>Arbeitstage</b><small>für Monatssoll &amp; Gutschriften</small></span><span class="seg">'+[['5','Mo–Fr'],['6','Mo–Sa'],['m','Eigene']].map(([v,l])=>'<button type="button" data-p="wm" data-v="'+v+'" class="'+(mode===v?'on':'')+'" aria-pressed="'+(mode===v)+'">'+l+'</button>').join('')+'</span></div>'+
    (mode==='m'?'<div class="wdc">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map((l,i)=>{const d=(i+1)%7,on=mask.includes(d);return '<button type="button" data-p="wdd" data-v="'+d+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+l+'</button>'}).join('')+'</div>':'')+'<p class="wdi">'+esc(info)+'</p></div>'}
  function setWorkdays(v){const s2=$('workdays');if(!s2)return;if(![...s2.options].some(o=>o.value===v)){const o=document.createElement('option');o.value=v;o.textContent='Eigene Arbeitstage';s2.append(o)}s2.value=v;saveProfile();rerender()}
  function setSel(id,v){const s=$(id);if(!s)return;s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}
  function saveProfile(){const err=page.querySelector('[data-perr]');const weekly=$('weekly').value;if(err)err.textContent='';
   if(weekly&&(Number(weekly)<=0||Number(weekly)>60)){if(err)err.textContent='Bitte gültige Wochenstunden (bis 60) angeben.';return}
   const ftv=$('fulltime').value;if(ftv&&(Number(ftv)<30||Number(ftv)>45)){if(err)err.textContent='Tarifliche Vollzeit muss zwischen 30 und 45 Stunden liegen.';return}
   data.profile=data.profile||{};for(const id of ['tariff','group','level','weekly','fulltime','state','workdays'])data.profile[id]=$(id).value;
   if(data.setupOptions){const w=data.setupOptions;w.tariff=data.profile.tariff;w.group=data.profile.group;w.level=data.profile.level;w.region=data.profile.state;w.fulltime=Number(data.profile.fulltime)>0?Number(data.profile.fulltime):null;if(Number(data.profile.weekly)>0){w.hoursMode='weekly';w.hoursValue=Number(data.profile.weekly);delete data.profile.fixedMonthlyTarget}}
   if(persist()){Object.keys(holCache).forEach(k=>delete holCache[k]);render();const sv=page.querySelector('[data-sv]');if(sv){sv.classList.remove('pulse');void sv.offsetWidth;sv.classList.add('pulse')}}}
  const queueSave=(ms=350)=>{clearTimeout(saveT);saveT=setTimeout(saveProfile,ms)};
  function rerender(){const y=page.scrollTop;const open=page.querySelector('[data-tl]')?.classList.contains('on');renderTarif();page.scrollTop=y;if(open)page.querySelector('[data-tl]')?.classList.add('on')}
  function wireP(){
   page.querySelector('[data-p="back"]')?.addEventListener('click',closePage);
   page.onclick=e=>{const b=e.target.closest('[data-p]');if(!b||b.dataset.p==='back')return;buzz();const a=b.dataset.p,v=b.dataset.v;
    if(a==='tlist'){const tl=page.querySelector('[data-tl]');const on=!tl.classList.contains('on');tl.classList.toggle('on',on);b.setAttribute('aria-expanded',String(on))}
    else if(a==='t'){setSel('tariff',v);saveProfile();renderTarif()}
    else if(a==='g'){setSel('group',v);saveProfile();rerender()}
    else if(a==='l'){setSel('level',v);saveProfile();rerender()}
    else if(a==='wm'){if(v==='m'){const cur=String($('workdays').value);setWorkdays(cur.startsWith('m:')?cur:'m:1234')}else setWorkdays(v)}
    else if(a==='wdd'){const d=Number(v);let l=typeof workdayList==='function'?workdayList():[1,2,3,4];l=l.includes(d)?l.filter(x=>x!==d):[...l,d];if(!l.length){toast('Mindestens ein Arbeitstag ist nötig.');return}setWorkdays('m:'+l.sort().join(''))}
    else if(a==='minus'||a==='plus'){const i=page.querySelector('[data-p-in="weekly"]');let n=Number(i.value)||0;n=Math.round((n+(a==='plus'?.5:-.5))*2)/2;n=Math.max(.5,Math.min(60,n));i.value=String(n);$('weekly').value=String(n);upShare();queueSave()}
    else if(a==='pay'){closePage();retPage='tarif';setTimeout(openPay,200)}};
   page.querySelectorAll('[data-p-in]').forEach(i=>i.addEventListener('input',()=>{$(i.dataset.pIn).value=i.value;upShare();queueSave(700)}));
   page.querySelectorAll('[data-p-sel]').forEach(s=>s.addEventListener('change',()=>{setSel(s.dataset.pSel,s.value);saveProfile();rerender()}))}
  function upShare(){const el2=page.querySelector('[data-share]');if(!el2)return;const ft=$('fulltime');const def=Number(ft.value)||Number((ft.placeholder||'').match(/[\d,]+/)?.[0]?.replace(',','.'))||39;const v=Number($('weekly').value);el2.textContent=v>0?(v>=def-0.001?'Vollzeit ('+fmtH(def)+' h)':'Teilzeit · '+fmtH(Math.round(v/def*1000)/10)+' % von '+fmtH(def)+' h'):'Bitte Wochenstunden eintragen'}
  $('tabSettings')?.addEventListener('click',()=>render());
  render();
  return {render,close:closePage,isOpen:()=>!page.hidden&&page.classList.contains('on'),page};
 })();

 window.SchivioMore=MX;
 /* Termine erscheinen sofort im Kalender */
 try{decorate()}catch(e){}
})();
