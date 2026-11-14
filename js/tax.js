/* v1.0.66: Steuer-Helfer – Fahrten zur Arbeit, Fortbildungen, Export (PDF/CSV)
   Hinweis: Keine Steuerberatung. Alle Werte werden aus den eingetragenen Diensten ermittelt. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const addDays=(k,n)=>{const t=new Date(k+'T12:00:00');t.setDate(t.getDate()+n);return key(t)};
 const today=()=>key(new Date());
 const eur=v=>(Math.round((Number(v)||0)*100)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 const eur0=v=>Math.round(Number(v)||0).toLocaleString('de-DE')+' €';
 const num=v=>{const n=parseFloat(String(v??'').replace(/\./g,'').replace(',','.'));return isFinite(n)&&n>0?n:0};
 const fmtNum=v=>v?String(v).replace('.',','):'';
 const dShort=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
 const dShort2=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
 const range=(a,b)=>a===b?dShort(a):dShort2(a)+' – '+dShort(b);
 const MON=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
 const save=()=>{try{persist()}catch(e){}try{window.SchivioMore?.render?.()}catch(e){}};

 /* ---------- Regeln (Stand 2026) ---------- */
 const PAUSCHBETRAG=1230;            // Arbeitnehmer-Pauschbetrag
 const CAP=4500;                     // Höchstbetrag ohne eigenes Auto
 const KM_TRIP=0.30;                 // Fortbildung: je gefahrenem km (Auto)
 const VMA_SMALL=14,VMA_FULL=28;     // Verpflegungspauschalen Inland
 const rateFor=(y,km)=>y>=2026?km*0.38:Math.min(km,20)*0.30+Math.max(km-20,0)*0.38;
 const rateText=y=>y>=2026?'0,38 € je km ab dem 1. km':'0,30 € bis 20 km, 0,38 € ab dem 21. km';
 const MODES=[['auto','Auto / Motorrad'],['oepnv','Bus & Bahn'],['rad','Fahrrad / zu Fuß'],['fg','Fahrgemeinschaft']];
 const T=()=>{if(!data.tax||typeof data.tax!=='object')data.tax={};const t=data.tax;t.km=t.km||0;t.mode=t.mode||'auto';t.ticket=t.ticket||{};t.adj=t.adj||{};t.tr=t.tr||{};t.extra=t.extra||[];return t};

 /* Fahrtage: Tage, an denen ein Dienst beginnt (Nachtdienst zählt einmal) */
 function isWork(k){const c=data.shifts?.[k];if(!c)return false;if(types.includes(c))return true;const cs=data.customShifts?.[c];if(!cs)return false;if(cs.bd?.stage==='RB')return Number(data.rbWork?.[k])>0;return true}
 function commute(y){const t=T();const months=Array(12).fill(0),list=[];let future=0;const tk=today();
  for(let d=new Date(y,0,1,12);d.getFullYear()===y;d.setDate(d.getDate()+1)){const k=key(d);if(isWork(k)){months[d.getMonth()]++;list.push(k);if(k>tk)future++}}
  const adj=Number(t.adj[y])||0;const days=Math.max(0,list.length+adj);const km=Math.floor(Number(t.km)||0);
  let pausch=days*rateFor(y,km);let capped=false;if(t.mode!=='auto'&&pausch>CAP){pausch=CAP;capped=true}
  const ticket=t.mode==='oepnv'?Number(t.ticket[y])||0:0;const useTicket=ticket>pausch;
  return {y,months,list,future,adj,days,km,pausch,capped,ticket,useTicket,amount:useTicket?ticket:pausch,mode:t.mode,
   empty:months.map((n,i)=>!n&&new Date(y,i,1)<=new Date()?i:-1).filter(i=>i>=0)}}

 /* Fortbildungen: automatisch aus „Fortbildung“-Tagen + eigene Einträge */
 function trainings(y){const t=T();const out=[];const ys=String(y);
  const tk=Object.keys(data.shifts||{}).filter(k=>data.shifts[k]==='T'&&k.startsWith(ys)).sort();
  for(let i=0;i<tk.length;){let j=i;while(j+1<tk.length&&tk[j+1]===addDays(tk[j],1))j++;const id='auto:'+tk[i];out.push(Object.assign({title:'',km:0,fee:0,other:0,refund:0,night:false,away:true},t.tr[id]||{},{id,auto:true,from:tk[i],to:tk[j]}));i=j+1}
  for(const e of t.extra)if(String(e.from||'').startsWith(ys))out.push(Object.assign({auto:false},e));
  return out.sort((a,b)=>a.from<b.from?-1:1).map(e=>Object.assign(e,calcTr(e)))}
 function calcTr(e){const n=Math.max(1,Math.round((new Date(e.to+'T12:00:00')-new Date(e.from+'T12:00:00'))/864e5)+1);
  const km=Number(e.km)||0;const trips=e.night?1:n;const fahrt=trips*2*km*KM_TRIP;
  let vma=0;if(e.night&&n>=2)vma=2*VMA_SMALL+(n-2)*VMA_FULL;else if(e.away)vma=n*VMA_SMALL;
  const gross=(Number(e.fee)||0)+(Number(e.other)||0)+fahrt+vma;return {n,fahrt,vma,sum:Math.max(0,gross-(Number(e.refund)||0))}}
 function summary(y){const c=commute(y),tr=trainings(y);const trSum=tr.reduce((s,e)=>s+e.sum,0);return {c,tr,trSum,total:c.amount+trSum}}

 /* ---------- Fenster ---------- */
 const chev='<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
 const IC={
  car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-4.5l-2-5H7l-2 5z"/><path d="M5 12.5h14"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/></svg>',
  cap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5V15"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  csv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 10h16M4 15h16M10 4v16"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/></svg>',
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'};
 const DISCLAIMER='Ermittelt anhand deiner eingetragenen Dienste. Fehler sind möglich – bitte prüfe alle Angaben selbst. Schivio ersetzt keine Steuerberatung.';
 let Y=new Date().getFullYear();
 const yearBar=()=>'<div class="ft-mon tx-year"><button type="button" class="ib" data-x="yprev" aria-label="Voriges Jahr"'+(Y<=2020?' disabled':'')+'>'+IC.l+'</button><b>Steuerjahr '+Y+'</b><button type="button" class="ib" data-x="ynext" aria-label="Nächstes Jahr"'+(Y>=new Date().getFullYear()?' disabled':'')+'>'+IC.r+'</button></div>';
 const yearWire=fn=>({yprev:()=>{Y--;DS.swap(fn(),-1)},ynext:()=>{Y++;DS.swap(fn(),1)}});

 function main(){const s=summary(Y),c=s.c,t=T();
  let h=DS.head('Mehr','Steuer-Helfer')+yearBar()+'<div class="tx-warn">'+IC.info+'<span>'+esc(DISCLAIMER)+'</span></div>';
  h+='<div class="tx-cards">';
  h+='<button type="button" class="tx-card" data-x="com"><span class="ti">'+IC.car+'</span><span class="tt"><small>Fahrten zur Arbeit</small><b>'+(c.km?eur0(c.amount):'Entfernung fehlt')+'</b><em>'+(c.km?c.days+' Fahrtage × '+c.km+' km'+(c.useTicket?' · Ticketkosten angesetzt':''):'Einmal Entfernung und Verkehrsmittel angeben')+'</em></span>'+chev+'</button>';
  h+='<button type="button" class="tx-card" data-x="trl"><span class="ti">'+IC.cap+'</span><span class="tt"><small>Fortbildungen</small><b>'+eur0(s.trSum)+'</b><em>'+(s.tr.length?s.tr.length+(s.tr.length===1?' Fortbildung':' Fortbildungen')+(s.tr.some(e=>e.auto&&!e.title)?' · Angaben ergänzen':''):'Noch keine eingetragen')+'</em></span>'+chev+'</button>';
  h+='</div>';
  const over=s.total>PAUSCHBETRAG;
  h+='<div class="kp"><div class="big"><b>'+eur0(s.total)+'</b><small>Werbungskosten aus Schivio</small></div><div class="tx-bar"><i style="width:'+Math.min(100,s.total/PAUSCHBETRAG*100)+'%"></i></div><p class="tx-pb">'+(over?'Liegt über dem Arbeitnehmer-Pauschbetrag von '+eur0(PAUSCHBETRAG)+'. Einzelne Angaben können sich daher lohnen.':'Noch '+eur0(PAUSCHBETRAG-s.total)+' bis zum Arbeitnehmer-Pauschbetrag von '+eur0(PAUSCHBETRAG)+', den das Finanzamt ohnehin ansetzt. Andere Kosten (z. B. Gewerkschaft, Arbeitsmittel) kommen evtl. noch dazu.')+'</p></div>';
  if(c.empty.length&&c.km)h+='<p class="tx-note">Ohne eingetragene Dienste: '+esc(c.empty.map(i=>MON[i]).join(', '))+' '+Y+'. Für diese Monate werden keine Fahrten gezählt.</p>';
  if(c.future&&c.km)h+='<p class="tx-note">Enthält '+c.future+' geplante Dienste, die noch in der Zukunft liegen.</p>';
  h+='<div class="ac"><button type="button" class="bt" data-x="csv">'+IC.csv+'CSV</button><button type="button" class="bt pr" data-x="pdf">'+IC.pdf+'PDF exportieren</button></div>';
  h+='<p class="nt">Das PDF fasst alles für deine Steuererklärung oder deinen Steuerberater zusammen – mit Liste aller Fahrtage.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,Object.assign(yearWire(main),{com:()=>DS.swap(comView(),1),trl:()=>DS.swap(trList(),1),pdf:()=>exportPdf(),csv:()=>exportCsv()}));
  return node}

 function comView(){const t=T(),c=commute(Y);
  let h=DS.head('Steuer-Helfer','Fahrten zur Arbeit',{back:true})+yearBar()+
   '<div class="fm"><label>Entfernung zur Arbeit (einfache Strecke, km)<input data-f="km" inputmode="decimal" placeholder="z. B. 18" value="'+esc(fmtNum(t.km))+'"></label>'+
   '<p class="tx-hint">Gemeint ist die kürzeste Straßenverbindung von deiner Wohnung zur Arbeit, nur eine Richtung. Angefangene Kilometer zählen nicht.</p>'+
   '<div><span class="wm-lbl">Verkehrsmittel</span><div class="wm-rhy">'+MODES.map(([v,l])=>'<button type="button" data-x="mode" data-v="'+v+'" class="'+(t.mode===v?'on':'')+'">'+l+'</button>').join('')+'</div></div>'+
   '<label data-ticket'+(t.mode==='oepnv'?'':' hidden')+'>Ticketkosten '+Y+' (€, optional)<input data-f="ticket" inputmode="decimal" placeholder="z. B. 756" value="'+esc(fmtNum(t.ticket[Y]))+'"></label>'+
   '<label>Korrektur Fahrtage (z. B. −3 für Tage ohne Fahrt)<input data-f="adj" inputmode="numeric" placeholder="0" value="'+esc(c.adj||'')+'"></label></div>';
  h+='<h4 class="wm-h">Fahrtage '+Y+' laut Dienstplan</h4><div class="tx-months">'+c.months.map((n,i)=>'<span class="'+(n?'':'z')+'"><small>'+MON[i]+'</small><b>'+n+'</b></span>').join('')+'</div>';
  h+='<div class="kp"><div class="big"><b data-out>'+eur0(c.amount)+'</b><small data-outs>'+esc(outText(c))+'</small></div></div>';
  h+='<div class="ac"><button type="button" class="bt pr" data-x="save">'+IC.ok+'Speichern</button></div>';
  h+='<p class="nt">Gezählt wird jeder Tag, an dem ein Dienst beginnt – ein Nachtdienst über zwei Kalendertage also einmal. Urlaub, Krank, Überstundenabbau und Fortbildung zählen nicht, Rufbereitschaft nur mit eingetragenem Einsatz. Satz '+Y+': '+rateText(Y)+(t.mode!=='auto'?'; ohne eigenes Auto höchstens '+eur0(CAP)+' im Jahr':'')+'.</p>';
  const node=el('<div>'+h+'</div>');const f=n=>node.querySelector('[data-f="'+n+'"]');
  const apply=()=>{t.km=num(f('km').value);t.ticket[Y]=num(f('ticket').value);const a=parseInt(String(f('adj').value).replace('−','-'),10);t.adj[Y]=isFinite(a)?a:0;const c2=commute(Y);node.querySelector('[data-out]').textContent=eur0(c2.amount);node.querySelector('[data-outs]').textContent=outText(c2)};
  node.addEventListener('input',apply);
  DS.wire(node,Object.assign(yearWire(comView),{back:()=>{apply();save();DS.swap(main(),-1)},
   mode:b=>{t.mode=b.dataset.v;node.querySelectorAll('[data-x="mode"]').forEach(x=>x.classList.toggle('on',x===b));node.querySelector('[data-ticket]').hidden=t.mode!=='oepnv';apply()},
   save:()=>{apply();save();toast('Gespeichert');DS.swap(main(),-1)}}));
  return node}
 function outText(c){if(!c.km)return 'Bitte Entfernung eintragen';let s=c.days+' Fahrtage × '+c.km+' km'+(Y>=2026?' × 0,38 €':'');if(c.capped)s+=' · auf '+eur0(CAP)+' begrenzt';if(c.useTicket)s='Ticketkosten '+eur(c.ticket)+' (höher als die Pauschale von '+eur(c.pausch)+')';return s}

 function trList(){const tr=trainings(Y);
  let h=DS.head('Steuer-Helfer','Fortbildungen',{back:true})+yearBar();
  if(!tr.length)h+='<div class="ft-empty">'+IC.cap+'<b>Keine Fortbildungen in '+Y+'</b><span>Tage, die du im Kalender als „Fortbildung“ einträgst, erscheinen hier automatisch. Du kannst auch selbst eine hinzufügen.</span></div>';
  else h+='<div class="ls">'+tr.map(e=>'<button type="button" class="r" data-x="ed" data-id="'+esc(e.id)+'"><span>'+esc(e.title||'Fortbildung')+'<small>'+esc(range(e.from,e.to))+(e.auto?' · aus dem Kalender':'')+(e.auto&&!e.title?' · bitte ergänzen':'')+'</small></span><b>'+eur0(e.sum)+'</b>'+chev+'</button>').join('')+'</div>';
  h+='<div class="ac"><button type="button" class="bt pr" data-x="add">'+IC.plus+'Fortbildung hinzufügen</button></div>';
  h+='<p class="nt">Absetzbar sind z. B. Kursgebühren, Fahrten (0,30 € je gefahrenem km mit dem Auto), Verpflegungspauschalen (14 € ab 8 Std. Abwesenheit, 28 € für volle Tage bei mehrtägigen Fortbildungen mit Übernachtung) und Übernachtungskosten – abzüglich Erstattungen vom Arbeitgeber.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,Object.assign(yearWire(trList),{back:()=>DS.swap(main(),-1),add:()=>DS.swap(trEdit(null),1),ed:b=>DS.swap(trEdit(tr.find(e=>e.id===b.dataset.id)),1)}));
  return node}

 function trEdit(e){const t=T();const isNew=!e;const auto=!!e?.auto;const d=Object.assign({title:'',km:0,fee:0,other:0,refund:0,night:false,away:true,from:Y===new Date().getFullYear()?today():Y+'-01-01'},e||{});d.to=d.to||d.from;
  const money=(f,l,ph)=>'<label>'+l+'<input data-f="'+f+'" inputmode="decimal" placeholder="'+(ph||'0')+'" value="'+esc(fmtNum(d[f]))+'"></label>';
  let h=DS.head(auto?range(d.from,d.to):'Fortbildung',isNew?'Fortbildung hinzufügen':'Fortbildung',{back:true})+
   '<div class="fm"><label>Titel<input data-f="title" maxlength="80" placeholder="z. B. Strahlenschutzkurs" value="'+esc(d.title)+'" autocomplete="off"></label>'+
   (auto?'<p class="tx-hint">Zeitraum aus deinem Kalender (Dienstart „Fortbildung“).</p>':'<div class="r2"><label>Von<input type="date" data-f="from" value="'+esc(d.from)+'"></label><label>Bis<input type="date" data-f="to" value="'+esc(d.to)+'"></label></div>')+
   '<div class="r2">'+money('fee','Kursgebühr (€)')+money('km','Strecke einfach (km, Auto)')+'</div>'+
   '<div class="sw"><span>Mehr als 8 Std. unterwegs</span><button type="button" class="sx-sw" role="switch" aria-label="Mehr als 8 Stunden unterwegs" aria-checked="'+!!d.away+'" data-x="away"></button></div>'+
   '<div class="sw"><span>Mit Übernachtung</span><button type="button" class="sx-sw" role="switch" aria-label="Mit Übernachtung" aria-checked="'+!!d.night+'" data-x="night"></button></div>'+
   '<div class="r2">'+money('other','Sonstiges (€)','Hotel, Bücher, Ticket')+money('refund','Erstattung Arbeitgeber (€)')+'</div>'+
   '<div class="tx-calc" data-calc></div><div class="er" data-err></div></div>'+
   '<div class="ac">'+(isNew||auto?'':'<button type="button" class="bt dg" data-x="del">'+IC.del+'Löschen</button>')+'<button type="button" class="bt pr" data-x="save">'+IC.ok+'Speichern</button></div>';
  if(auto)h+='<p class="nt">Um diese Fortbildung zu entfernen, ändere die Tage im Kalender.</p>';
  const node=el('<div>'+h+'</div>');const f=n=>node.querySelector('[data-f="'+n+'"]');
  const read=()=>{d.title=f('title').value.trim();['fee','km','other','refund'].forEach(k=>d[k]=num(f(k).value));if(!auto){d.from=f('from').value||d.from;d.to=f('to').value||d.from;if(d.to<d.from)d.to=d.from}
   const r=calcTr(d);node.querySelector('[data-calc]').innerHTML='<span>'+r.n+(r.n===1?' Tag':' Tage')+'</span><span>Fahrt '+eur(r.fahrt)+'</span><span>Verpflegung '+eur(r.vma)+'</span><b>Absetzbar '+eur(r.sum)+'</b>'};
  node.addEventListener('input',read);setTimeout(read,0);
  const sw=(b,k)=>{d[k]=!d[k];b.setAttribute('aria-checked',String(d[k]));read()};
  DS.wire(node,{back:()=>DS.swap(trList(),-1),away:b=>sw(b,'away'),night:b=>sw(b,'night'),
   del:()=>{t.extra=t.extra.filter(x=>x.id!==d.id);save();toast('Fortbildung gelöscht');DS.swap(trList(),-1)},
   save:()=>{read();if(!auto&&!d.from){node.querySelector('[data-err]').textContent='Bitte ein Datum wählen.';return}
    const rec={title:d.title,km:d.km,fee:d.fee,other:d.other,refund:d.refund,night:!!d.night,away:!!d.away};
    if(auto)t.tr[d.id]=rec;else{const id=d.id||'tr'+Date.now().toString(36);const ex=t.extra.find(x=>x.id===id);const full=Object.assign(rec,{id,from:d.from,to:d.to});if(ex)Object.assign(ex,full);else t.extra.push(full)}
    Y=Number(d.from.slice(0,4))||Y;save();toast('Fortbildung gespeichert');DS.swap(trList(),-1)}});
  return node}

 /* ---------- Export ---------- */
 function share(file,title){(async()=>{try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title});return}}catch(e){if(e&&e.name==='AbortError')return}
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Gespeichert – du findest die Datei in deinen Downloads.')})()}
 function exportCsv(){const s=summary(Y),c=s.c;const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const n2=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',');
  const rows=[['Schivio Steuer-Übersicht '+Y],[DISCLAIMER],[],['Datum','Art','Beschreibung','km','Betrag (€)']];
  c.list.forEach(k=>rows.push([dShort(k),'Fahrt zur Arbeit',typeof shiftTitle==='function'?shiftTitle(data.shifts[k]):data.shifts[k],c.km,'']));
  if(c.adj)rows.push(['','Korrektur Fahrtage',String(c.adj)+' Tage','','']);
  rows.push(['','Summe Fahrten zur Arbeit',c.days+' Fahrtage'+(c.useTicket?' (Ticketkosten angesetzt)':''),c.km,n2(c.amount)]);
  s.tr.forEach(e=>rows.push([range(e.from,e.to),'Fortbildung',[e.title||'Fortbildung','Gebühr '+n2(e.fee||0),'Fahrt '+n2(e.fahrt),'Verpflegung '+n2(e.vma),'Sonstiges '+n2(e.other||0),'Erstattung '+n2(e.refund||0)].join(' | '),e.km||'',n2(e.sum)]));
  rows.push(['','Summe Werbungskosten aus Schivio','','',n2(s.total)]);
  const txt='﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n');
  share(new File([txt],'Schivio-Steuer-'+Y+'.csv',{type:'text/csv'}),'Steuer-Übersicht '+Y)}

 /* Kleiner PDF-Baukasten (A4, Helvetica, mehrseitig) */
 const WR={' ':278,'!':278,'"':355,'#':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':278,';':278,'?':556,'@':1015,A:667,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:500,K:667,L:556,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,a:556,b:556,c:500,d:556,e:556,f:278,g:556,h:556,i:222,j:222,k:500,l:222,m:833,n:556,o:556,p:556,q:556,r:333,s:500,t:278,u:556,v:500,w:722,x:500,y:500,z:500,'ß':611,'–':556,'·':278,'€':556,'×':584,'„':333,'“':333,' ':278,'|':260};
 const WB={...WR,'!':333,':':333,A:722,B:722,J:556,K:722,L:611,b:611,d:611,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556,'|':280};
 const BASE={'ä':'a','ö':'o','ü':'u','Ä':'A','Ö':'O','Ü':'U','é':'e'};
 const tw=(s,size,bold)=>{const W=bold?WB:WR;let n=0;for(const ch of String(s)){const c=BASE[ch]||ch;n+=/[0-9]/.test(c)?556:(W[c]??556)}return n*size/1000};
 const WIN={'€':128,'„':132,'“':147,'”':148,'–':150,'—':151,'×':215};
 function pstr(s){let o='';for(const ch of String(s)){let c=WIN[ch]??ch.charCodeAt(0);if(c>255)c=63;if(c===40||c===41||c===92)o+='\\'+ch;else if(c<32||c>126)o+='\\'+c.toString(8).padStart(3,'0');else o+=ch}return '('+o+')'}
 function Pdf(){const W=595.28,H=841.89,M=46;const pages=[];let c='';let y=0;const n=v=>(Math.round(v*100)/100).toString();
  const rgb=h=>[1,3,5].map(i=>n(parseInt(h.slice(i,i+2),16)/255)).join(' ');
  const api={W,H,M,get y(){return y},set y(v){y=v},
   page(){if(c)pages.push(c);c='';y=M;return api},
   fill(h){c+=rgb(h)+' rg\n'},
   rect(x,yy,w,h,col){api.fill(col);c+=n(x)+' '+n(H-yy-h)+' '+n(w)+' '+n(h)+' re f\n'},
   rr(x,yy,w,h,r,col){api.fill(col);const k=.5523*r,X=x,Y=H-yy-h;c+=[n(X+r),n(Y),'m',n(X+w-r),n(Y),'l',n(X+w-r+k),n(Y),n(X+w),n(Y+r-k),n(X+w),n(Y+r),'c',n(X+w),n(Y+h-r),'l',n(X+w),n(Y+h-r+k),n(X+w-r+k),n(Y+h),n(X+w-r),n(Y+h),'c',n(X+r),n(Y+h),'l',n(X+r-k),n(Y+h),n(X),n(Y+h-r+k),n(X),n(Y+h-r),'c',n(X),n(Y+r),'l',n(X),n(Y+r-k),n(X+r-k),n(Y),n(X+r),n(Y),'c','h','f'].join(' ')+'\n'},
   text(s,x,yy,size,bold,col,align){const w=tw(s,size,bold);const X=align==='c'?x-w/2:align==='r'?x-w:x;api.fill(col||'#16181c');c+='BT /'+(bold?'F2':'F1')+' '+size+' Tf '+n(X)+' '+n(H-yy)+' Td '+pstr(s)+' Tj ET\n'},
   wrap(s,maxW,size,bold){const out=[];let line='';for(const w of String(s).split(' ')){const t=line?line+' '+w:w;if(tw(t,size,bold)>maxW&&line){out.push(line);line=w}else line=t}if(line)out.push(line);return out},
   fit(s,maxW,size,bold){if(tw(s,size,bold)<=maxW)return s;let t=String(s);while(t.length>1&&tw(t+'…',size,bold)>maxW)t=t.slice(0,-1);return t.replace(/\s+$/,'')+'...'},
   need(h,onNew){if(y+h>H-M-20){api.page();onNew&&onNew()}},
   bytes(title){if(c)pages.push(c);const objs=[];const np=pages.length;const pageIds=pages.map((_,i)=>3+i*2);
    objs[0]='<< /Type /Catalog /Pages 2 0 R >>';objs[1]='<< /Type /Pages /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] /Count '+np+' >>';
    const fontA=3+np*2,fontB=fontA+1,info=fontA+2;
    pages.forEach((pc,i)=>{const foot=(()=>{let f='';const s='Seite '+(i+1)+' von '+np;const w=tw(s,8,false);f+='0.612 0.639 0.686 rg\nBT /F1 8 Tf '+n(W-M-w)+' '+n(M-22)+' Td '+pstr(s)+' Tj ET\n';f+='BT /F1 8 Tf '+n(M)+' '+n(M-22)+' Td '+pstr('Erstellt mit Schivio · keine Steuerberatung')+' Tj ET\n';return f})();const body=pc+foot;
     objs[pageIds[i]-1]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+fontA+' 0 R /F2 '+fontB+' 0 R >> >> /Contents '+(pageIds[i]+1)+' 0 R >>';
     objs[pageIds[i]]='<< /Length '+body.length+' >>\nstream\n'+body+'endstream'});
    objs[fontA-1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';objs[fontB-1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objs[info-1]='<< /Title '+pstr(title)+' /Producer (Schivio) >>';
    let out='%PDF-1.4\n';const off=[];objs.forEach((o,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});
    const xr=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+xr+'\n%%EOF\n';
    const b=new Uint8Array(out.length);for(let i=0;i<out.length;i++)b[i]=out.charCodeAt(i)&255;return b}};
  return api.page()}

 function buildPdf(y){const s=summary(y),c=s.c;const P=Pdf();const {W,M}=P;const CW=W-2*M;const ACC='#16a37f',ACC2='#0e7c66',INK='#16181c',MUT='#6b7280',LINE='#e5e7eb';
  // Kopf
  P.rr(M,M,28,28,8,ACC);P.text('S',M+14,M+20,16,true,'#ffffff','c');P.text('Schivio',M+38,M+19,13,true,INK);
  P.text('Erstellt am '+new Date().toLocaleDateString('de-DE'),W-M,M+19,9,false,MUT,'r');
  P.text('Steuer-Übersicht '+y,M,M+72,26,true,INK);P.text('Werbungskosten aus deinen eingetragenen Diensten',M,M+92,11.5,false,MUT);
  P.y=M+110;
  const lines=P.wrap('Wichtig: '+DISCLAIMER+' Die Werte sind Rechenhilfen auf Grundlage der Angaben in der App.',CW-28,9.5,false);
  P.rr(M,P.y,CW,lines.length*13+16,10,'#fff7e6');lines.forEach((l,i)=>P.text(l,M+14,P.y+19+i*13,9.5,false,'#7a4b00'));P.y+=lines.length*13+34;
  const h2=t=>{P.need(40);P.text(t,M,P.y,14,true,INK);P.y+=8;P.rect(M,P.y,CW,1.2,ACC);P.y+=20};
  const row=(l,v,b)=>{P.need(18);P.text(l,M,P.y,10.5,false,b?INK:MUT);P.text(v,W-M,P.y,10.5,!!b,INK,'r');P.y+=6;P.rect(M,P.y,CW,.6,LINE);P.y+=13};
  // 1. Fahrten
  h2('1. Wege zwischen Wohnung und erster Tätigkeitsstätte');
  row('Fahrtage laut Dienstplan',String(c.list.length));if(c.adj)row('Korrektur (selbst eingetragen)',(c.adj>0?'+':'')+c.adj);
  row('Fahrtage gesamt',String(c.days),true);row('Entfernung (einfache Strecke)',c.km?c.km+' km':'nicht angegeben');
  row('Verkehrsmittel',(MODES.find(m=>m[0]===c.mode)||['',''])[1]);row('Entfernungspauschale',rateText(y));
  row('Betrag Entfernungspauschale',eur(c.pausch)+(c.capped?' (Höchstbetrag)':''));
  if(c.mode==='oepnv'&&c.ticket)row('Tatsächliche Ticketkosten',eur(c.ticket));
  row(c.useTicket?'Anzusetzen (Ticketkosten höher)':'Anzusetzen',eur(c.amount),true);
  // Monatsraster
  P.need(56);const mw=CW/12;c.months.forEach((v,i)=>{const x=M+i*mw;P.rr(x+1.5,P.y,mw-3,40,6,v?'#e3f5ee':'#f3f4f6');P.text(MON[i],x+mw/2,P.y+14,8,false,MUT,'c');P.text(String(v),x+mw/2,P.y+31,12,true,v?ACC2:'#9ca3af','c')});P.y+=56;
  if(c.empty.length){P.wrap('Hinweis: Für '+c.empty.map(i=>MON[i]).join(', ')+' sind keine Dienste eingetragen – dort wurden keine Fahrten gezählt.',CW,9,false).forEach(l=>{P.need(13);P.text(l,M,P.y,9,false,MUT);P.y+=13});P.y+=4}
  if(c.future){P.need(13);P.text('Enthält '+c.future+' geplante Dienste, die beim Erstellen noch in der Zukunft lagen.',M,P.y,9,false,MUT);P.y+=17}
  P.y+=10;
  // 2. Fortbildungen
  h2('2. Fortbildungskosten');
  if(!s.tr.length){P.text('Keine Fortbildungen eingetragen.',M,P.y,10.5,false,MUT);P.y+=24}
  else{const cols=[['Zeitraum',0,'l'],['Fortbildung',92,'l'],['Gebühr',258,'r'],['Fahrt',303,'r'],['Verpfl.',348,'r'],['Sonst.',393,'r'],['Erstatt.',443,'r'],['Summe',CW,'r']];
   const th=()=>{P.rect(M,P.y-12,CW,18,'#f3f4f6');cols.forEach(([t,x,a])=>P.text(t,a==='r'?M+x:M+x+4,P.y,8.5,true,MUT,a==='r'?'r':'l'));P.y+=18};
   th();
   const n2=v=>(Math.round((v||0)*100)/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
   s.tr.forEach(e=>{P.need(20,th);const rg=e.from===e.to?dShort(e.from):dShort2(e.from)+'–'+dShort2(e.to);
    P.text(rg,M+4,P.y,8.5,false,INK);P.text(P.fit(e.title||'Fortbildung',160,8.5,false),M+92,P.y,8.5,false,INK);
    [[e.fee,258],[e.fahrt,303],[e.vma,348],[e.other,393],[e.refund?-e.refund:0,443]].forEach(([v,x])=>P.text(v?n2(v):'–',M+x,P.y,8.5,false,INK,'r'));P.text(n2(e.sum),M+CW,P.y,8.5,true,INK,'r');P.y+=6;P.rect(M,P.y,CW,.6,LINE);P.y+=13});
   row('Summe Fortbildungskosten',eur(s.trSum),true);
   P.need(28);P.wrap('Fahrt: 0,30 € je gefahrenem km mit dem Auto (Hin- und Rückweg). Verpflegung: 14 € bei mehr als 8 Std. Abwesenheit bzw. für An- und Abreisetag, 28 € für volle Tage bei Übernachtung.',CW,8.5,false).forEach(l=>{P.text(l,M,P.y,8.5,false,MUT);P.y+=12});P.y+=10}
  // 3. Summe
  h2('3. Zusammenfassung');row('Fahrten zur Arbeit',eur(c.amount));row('Fortbildungen',eur(s.trSum));row('Werbungskosten aus Schivio',eur(s.total),true);
  P.need(60);const msg=s.total>PAUSCHBETRAG?'Die Summe liegt über dem Arbeitnehmer-Pauschbetrag von '+eur0(PAUSCHBETRAG)+'.':'Die Summe liegt unter dem Arbeitnehmer-Pauschbetrag von '+eur0(PAUSCHBETRAG)+', den das Finanzamt ohnehin berücksichtigt. Weitere Werbungskosten können dazukommen.';
  P.wrap(msg+' In ELSTER gehören diese Angaben in die Anlage N zu den Werbungskosten (Wege zur Arbeit bzw. Fortbildungskosten).',CW,9.5,false).forEach(l=>{P.text(l,M,P.y,9.5,false,INK);P.y+=13});
  // Anhang: Fahrtage
  P.page();P.text('Anhang: Fahrtage '+y,M,P.y+12,16,true,INK);P.y+=26;P.text('Tage mit Dienstbeginn laut Schivio (ohne Korrektur). Zahl = Tag im Monat.',M,P.y+4,9,false,MUT);P.y+=24;
  for(let m=0;m<12;m++){const ds=c.list.filter(k=>Number(k.slice(5,7))===m+1).map(k=>String(Number(k.slice(8))));const txt=ds.length?ds.join(', '):'–';const ls=P.wrap(txt,CW-110,9.5,false);
   P.need(ls.length*13+10);P.text(new Date(y,m,1).toLocaleDateString('de-DE',{month:'long'}),M,P.y,10,true,INK);P.text(ds.length+' Tage',M+70,P.y,9,false,MUT);ls.forEach((l,i)=>P.text(l,M+110,P.y+i*13,9.5,false,INK));P.y+=ls.length*13+6;P.rect(M,P.y-2,CW,.6,LINE);P.y+=12}
  return P.bytes('Steuer-Übersicht '+y)}
 function exportPdf(){share(new File([buildPdf(Y)],'Schivio-Steuer-'+Y+'.pdf',{type:'application/pdf'}),'Steuer-Übersicht '+Y)}

 function open(){Y=new Date().getMonth()<3?new Date().getFullYear()-1:new Date().getFullYear();DS.node(main)}
 window.SchivioTax={open,summary,buildPdf};
})();
