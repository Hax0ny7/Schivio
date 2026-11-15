/* v1.0.77: Urlaubsplaner (Tools)
   - Resturlaub-Zähler: Anspruch (Tarif-Vorschlag, änderbar) + Zusatzurlaub + Rest aus dem Vorjahr − genommen − geplant
   - Urlaub planen: Zeitraum wählen, Schivio zeigt die nötigen Urlaubstage und trägt „Urlaub“ ein
   - Brückentage (Schivio Pro): wenige Urlaubstage, viele freie Tage am Stück – nach Feiertagen und deiner Arbeitswoche
   - Jahresübersicht: alle Urlaubstage eines Jahres auf einen Blick
   Gezählt wird jeder im Kalender eingetragene Tag mit „Urlaub“ (Code U).
   Gespeichert in data.vacation.years[Jahr] = {base, extra, carry, carryAuto} – nur was der Nutzer selbst ändert. */
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
 const MON3=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const dShort=k=>{const d=toDate(k);return WD[d.getDay()]+'., '+d.getDate()+'. '+MON3[d.getMonth()]};
 const fmt=n=>(Math.round(n*10)/10).toLocaleString('de-DE');
 const VAC='U';
 const IC={
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg>',
  r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 15h3"/></svg>',
  bridge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16h20M4 16v4M20 16v4M2 16c4-6 16-6 20 0M8 12v4M16 12v4M12 11v5"/></svg>',
  year:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'
 };
 const refresh=()=>{try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}try{window.SchivioMore?.render?.()}catch(e){}};
 const isPro=()=>!window.SchivioPro||SchivioPro.active();

 /* ---------- Arbeitswoche und Feiertage ---------- */
 const workdays=()=>{try{return typeof workdayList==='function'?workdayList():[1,2,3,4,5]}catch(e){return [1,2,3,4,5]}};
 const hol={};const holidays=y=>{const st=data.profile?.state||'NW';const k=y+st;if(!hol[k]){try{hol[k]=holidaySet(y,st)}catch(e){hol[k]=new Set()}}return hol[k]};
 /* Arbeitstag nach Arbeitswoche (ohne Feiertage) – Grundlage für „kostet X Urlaubstage“ */
 const isWorkday=k=>{const d=toDate(k);return workdays().includes(d.getDay())&&!holidays(d.getFullYear()).has(k)};

 /* ---------- Anspruch ---------- */
 /* Vorschlag aus dem Tarif bei 5-Tage-Woche (Stand 2026, bitte im Arbeitsvertrag prüfen):
    TVöD: 30 Tage, ab 2027 31 Tage · TV-L, AVR Caritas, AVR Diakonie u. a.: 30 Tage (teils regionale Zusatztage) */
 function tariffDays(y){const t=(document.getElementById('tariff')?.value||data.profile?.tariff||'').toString();
  const tvoed=/^TVöD/i.test(t)||/Württemberg I$/.test(t);return {days:tvoed&&y>=2027?31:30,known:!!t,name:t}}
 function suggestedBase(y){const per5=tariffDays(y).days;const n=workdays().length||5;return Math.round(per5*n/5*2)/2}
 const V=()=>{if(!data.vacation||typeof data.vacation!=='object')data.vacation={};if(!data.vacation.years)data.vacation.years={};return data.vacation};
 function cfgOf(y){return V().years[y]||{}}
 function vacDays(y){return Object.keys(data.shifts||{}).filter(k=>k.startsWith(y+'-')&&data.shifts[k]===VAC).sort()}
 /* Jahresbilanz; Rest aus dem Vorjahr wird automatisch übernommen, solange er nicht von Hand gesetzt ist */
 function balance(y,depth=0){const c=cfgOf(y);const base=c.base!=null?Number(c.base):suggestedBase(y);const extra=Number(c.extra)||0;
  let carry=0,carryAuto=false;
  if(c.carry!=null)carry=Number(c.carry)||0;
  /* automatisch nur, wenn das Vorjahr im Urlaubsplaner eingerichtet wurde – sonst wären unvollständige Vorjahre ein falscher Rest */
  else if(depth<3&&V().years[y-1]){const p=balance(y-1,depth+1);carry=Math.max(0,p.left);carryAuto=true}
  const days=vacDays(y),t=today();const taken=days.filter(k=>k<t).length,planned=days.length-taken;
  const total=base+extra+carry,left=total-days.length;
  /* Rest aus dem Vorjahr muss bis 31. März angetreten werden (Ausnahme: bis 31. Mai bei Krankheit/dienstlichen Gründen) */
  const usedQ1=days.filter(k=>k<=y+'-03-31').length,carryOpen=Math.max(0,carry-usedQ1);
  return {y,base,extra,carry,carryAuto,total,taken,planned,left,days,carryOpen}}

 /* ---------- Ansichten ---------- */
 let Y=new Date().getFullYear();
 const yearBar=()=>'<div class="vp-year"><button type="button" class="ib" data-x="yp" aria-label="Voriges Jahr">'+IC.l+'</button><b>Urlaubsjahr '+Y+'</b><button type="button" class="ib" data-x="yn" aria-label="Nächstes Jahr">'+IC.r+'</button></div>';
 const yearNav={yp:()=>{Y--;DS.swap(main(),-1)},yn:()=>{Y++;DS.swap(main(),1)}};
 const row=(x,ic,title,sub,extra='')=>'<button type="button" class="r vp-r" data-x="'+x+'"><span class="vp-ic">'+ic+'</span><span>'+title+'<small>'+sub+'</small></span>'+extra+IC.chev+'</button>';

 function main(){const b=balance(Y),pct=b.total>0?Math.max(0,Math.min(100,b.left/b.total*100)):0;const t=tariffDays(Y);
  const deadline=Y+'-03-31';const showCarry=b.carryOpen>0&&today()<=Y+'-05-31';
  let h=DS.head('Tools','Urlaubsplaner')+yearBar()+
   '<div class="vp-card"><div class="vp-left"><b>'+fmt(b.left)+'</b><span>'+(Math.abs(b.left)===1?'Tag':'Tage')+' übrig</span></div>'+
   '<div class="vp-bar" aria-hidden="true"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
   '<div class="vp-grid"><span><small>Genommen</small><b>'+fmt(b.taken)+'</b></span><span><small>Geplant</small><b>'+fmt(b.planned)+'</b></span><span><small>Anspruch gesamt</small><b>'+fmt(b.total)+'</b></span></div>'+
   '<p class="vp-sum">'+fmt(b.base)+' Tage Jahresurlaub'+(b.extra?' + '+fmt(b.extra)+' Zusatzurlaub':'')+(b.carry?' + '+fmt(b.carry)+' Rest aus '+(Y-1):'')+'</p></div>';
  if(b.left<0)h+='<p class="vp-warn">'+IC.warn+'<span>Du hast '+fmt(-b.left)+' Urlaubstage mehr eingetragen als dir zustehen.</span></p>';
  if(showCarry)h+='<p class="vp-warn">'+IC.warn+'<span>Noch '+fmt(b.carryOpen)+' '+(b.carryOpen===1?'Tag':'Tage')+' Resturlaub aus '+(Y-1)+': in der Regel bis 31. März antreten (bei Krankheit oder dienstlichen Gründen bis 31. Mai).</span></p>';
  h+='<div class="ls">'+
   row('plan',IC.plan,'Urlaub planen','Zeitraum wählen und eintragen')+
   row('bridges',IC.bridge,'Brückentage finden','Mit wenigen Urlaubstagen lange frei',isPro()?'':'<span class="vp-pro">Pro</span>')+
   row('year',IC.year,'Jahresübersicht','Alle Urlaubstage '+Y+' auf einen Blick')+
   row('edit',IC.edit,'Anspruch anpassen',(cfgOf(Y).base!=null?'Eigener Wert':'Vorschlag aus '+(t.known?esc(t.name):'Standard')+' · '+t.days+' Tage bei 5-Tage-Woche'))+'</div>'+
   '<p class="vp-note">Gezählt werden alle Tage, die im Kalender als „Urlaub“ eingetragen sind. Angaben ohne Gewähr – maßgeblich sind dein Arbeitsvertrag und dein Tarif.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,Object.assign({},yearNav,{plan:()=>DS.swap(planView(),1),bridges:()=>DS.swap(bridgeView(),1),year:()=>DS.swap(yearView(),1),edit:()=>DS.swap(editView(),1)}));
  return node}

 /* Anspruch anpassen */
 function editView(){const b=balance(Y),c=cfgOf(Y),t=tariffDays(Y);
  const f=(id,label,val,hint,ph)=>'<label class="vp-f"><span>'+label+'<small>'+hint+'</small></span><input type="number" inputmode="decimal" min="0" max="60" step="0.5" data-f="'+id+'" value="'+(val==null?'':esc(val))+'" placeholder="'+esc(ph)+'"></label>';
  const node=el('<div>'+DS.head('Urlaubsplaner','Anspruch '+Y,{back:true})+
   '<div class="ls vp-form">'+
    f('base','Jahresurlaub',c.base,'Leer = Vorschlag: '+fmt(suggestedBase(Y))+' Tage ('+t.days+' bei 5-Tage-Woche, umgerechnet auf deine '+workdays().length+'-Tage-Woche)',fmt(suggestedBase(Y)))+
    f('extra','Zusatzurlaub',c.extra,'z. B. für Wechselschicht, Nachtarbeit oder Schwerbehinderung','0')+
    f('carry','Rest aus '+(Y-1),c.carry,c.carry!=null?'Von Hand gesetzt':(b.carryAuto?'Leer = automatisch aus '+(Y-1)+' ('+fmt(b.carry)+')':'Resturlaub aus dem Vorjahr, z. B. laut Lohnabrechnung'),fmt(b.carry))+
   '</div><p class="vp-note">Tipp: Regionale Zusatztage (z. B. bei der Caritas) oder Zusatzurlaub für Schichtarbeit trägst du unter „Zusatzurlaub“ ein.</p>'+
   '<div class="ac"><button type="button" class="bt" data-x="reset">Vorschläge nutzen</button><button type="button" class="bt pr" data-x="save">Speichern</button></div></div>');
  DS.wire(node,{back:()=>DS.swap(main(),-1),
   reset:()=>{delete V().years[Y];refresh();toast('Vorschläge werden genutzt');DS.swap(main(),-1)},
   save:()=>{const v=id=>{const s=node.querySelector('[data-f="'+id+'"]').value.trim().replace(',','.');if(s==='')return null;const n=Number(s);return isFinite(n)&&n>=0?Math.round(n*2)/2:null};
    const o={};const base=v('base'),extra=v('extra'),carry=v('carry');if(base!=null)o.base=base;if(extra)o.extra=extra;if(carry!=null)o.carry=carry;
    if(Object.keys(o).length)V().years[Y]=o;else delete V().years[Y];refresh();toast('Gespeichert');DS.swap(main(),-1)}});
  return node}

 /* Urlaub planen */
 function costOf(a,b){const out=[];if(!a||!b||b<a)return out;for(let k=a;k<=b;k=addDays(k,1))out.push(k);return out}
 function planView(from,to){const t=today();from=from||(Y===new Date().getFullYear()?t:Y+'-01-01');to=to||from;
  const node=el('<div>'+DS.head('Urlaubsplaner','Urlaub planen',{back:true})+
   '<div class="ls vp-form"><label class="vp-f"><span>Von</span><input type="date" data-f="from" value="'+from+'"></label><label class="vp-f"><span>Bis</span><input type="date" data-f="to" value="'+to+'"></label></div>'+
   '<div class="vp-calc" data-calc></div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="save" disabled>Als Urlaub eintragen</button></div></div>');
  const F=n=>node.querySelector('[data-f="'+n+'"]'),calc=node.querySelector('[data-calc]'),btn=node.querySelector('[data-x="save"]');
  let days=[];
  const update=()=>{let a=F('from').value,b=F('to').value;if(a&&(!b||b<a)){b=a;F('to').value=a}F('to').min=a||'';
   const all=costOf(a,b);days=all.filter(isWorkday);const hd=all.filter(k=>holidays(toDate(k).getFullYear()).has(k)).length;
   const over=days.filter(k=>data.shifts[k]&&data.shifts[k]!==VAC);const left=balance(toDate(a||t).getFullYear()).left-days.filter(k=>data.shifts[k]!==VAC).length;
   if(!all.length){calc.innerHTML='';btn.disabled=true;return}
   calc.innerHTML='<div class="vp-cost"><b>'+days.length+'</b><span>'+(days.length===1?'Urlaubstag':'Urlaubstage')+' für '+all.length+(all.length===1?' Tag':' Tage')+' frei</span></div>'+
    '<p class="vp-note">Gezählt werden deine Arbeitstage ('+workdays().map(d=>WD[d]).join(', ')+')'+(hd?', ohne '+hd+(hd===1?' Feiertag':' Feiertage'):'')+'. Danach übrig: <b>'+fmt(left)+'</b> Tage.</p>'+
    (over.length?'<p class="vp-warn">'+IC.warn+'<span>An '+over.length+(over.length===1?' Tag ist':' Tagen sind')+' schon Dienste eingetragen – sie werden durch „Urlaub“ ersetzt.</span></p>':'')+
    (left<0?'<p class="vp-warn">'+IC.warn+'<span>Dafür reicht dein Urlaub nicht ganz.</span></p>':'');
   btn.disabled=!days.length;btn.textContent=days.length?days.length+(days.length===1?' Tag':' Tage')+' als Urlaub eintragen':'Keine Arbeitstage im Zeitraum'};
  F('from').addEventListener('input',update);F('to').addEventListener('input',update);update();
  DS.wire(node,{back:()=>DS.swap(main(),-1),save:()=>{if(!days.length)return;days.forEach(k=>{data.shifts[k]=VAC});refresh();toast(days.length+(days.length===1?' Urlaubstag':' Urlaubstage')+' eingetragen');Y=toDate(days[0]).getFullYear();DS.swap(main(),-1)}});
  return node}

 /* Brückentage: Zeiträume, die mit wenigen Urlaubstagen viele freie Tage am Stück ergeben */
 function bridges(y){const out=[],t=today();
  for(let k=y+'-01-01';k<=y+'-12-31';k=addDays(k,1)){
   if(k<t||!isWorkday(addDays(k,-1)))continue;/* Start: direkt nach einem Arbeitstag */
   let best=null,cost=0;
   for(let len=1,e=k;len<=16;len++,e=addDays(e,1)){if(isWorkday(e))cost++;if(cost>4)break;
    if(!isWorkday(e)&&isWorkday(addDays(e,1))&&cost>0){const gain=len/cost;if(len>=4&&gain>=2.2&&(!best||gain>best.gain||(gain===best.gain&&len>best.len)))best={from:k,to:e,len,cost,gain}}}
   if(best&&costOf(best.from,best.to).some(d=>holidays(toDate(d).getFullYear()).has(d)))out.push(best)}
  /* überlappende Vorschläge: den besseren behalten */
  out.sort((a,b)=>b.gain-a.gain||b.len-a.len);const res=[];for(const o of out)if(!res.some(r=>!(o.to<r.from||o.from>r.to)))res.push(o);
  return res.sort((a,b)=>a.from<b.from?-1:1)}
 function bridgeView(){
  if(!isPro())return el('<div>'+DS.head('Urlaubsplaner','Brückentage',{back:true})+'<p class="vp-note">Brückentage-Vorschläge gehören zu Schivio Pro.</p></div>');
  const list=bridges(Y);
  const node=el('<div>'+DS.head('Urlaubsplaner','Brückentage '+Y,{back:true})+
   '<p class="vp-note">Nach deiner Arbeitswoche ('+workdays().map(d=>WD[d]).join(', ')+') und den Feiertagen in '+esc(data.profile?.state||'NW')+'. Im Schichtdienst ist das eine grobe Orientierung – dein Dienstplan kann abweichen.</p>'+
   (list.length?'<div class="ls">'+list.map((o,i)=>'<button type="button" class="r vp-br" data-x="pick" data-i="'+i+'"><span class="vp-gain"><b>'+o.len+'</b><small>Tage frei</small></span><span>'+dShort(o.from)+' – '+dShort(o.to)+'<small>'+o.cost+(o.cost===1?' Urlaubstag':' Urlaubstage')+(o.cost&&o.len/o.cost>=3?' · sehr effizient':'')+'</small></span>'+IC.chev+'</button>').join('')+'</div>'
    :'<p class="vp-note">'+(Y<new Date().getFullYear()?'Dieses Jahr ist schon vorbei.':'Keine passenden Brückentage mehr gefunden.')+'</p>')+'</div>');
  DS.wire(node,{back:()=>DS.swap(main(),-1),pick:b=>{const o=list[Number(b.dataset.i)];DS.swap(planView(o.from,o.to),1)}});
  return node}

 /* Jahresübersicht */
 function yearView(){const b=balance(Y),set=new Set(b.days),t=today();
  let h=DS.head('Urlaubsplaner','Jahresübersicht '+Y,{back:true})+'<div class="vp-legend"><span><i class="u"></i>Urlaub</span><span><i class="h"></i>Feiertag</span></div><div class="vp-months">';
  for(let m=0;m<12;m++){const first=new Date(Y,m,1),dim=new Date(Y,m+1,0).getDate(),off=(first.getDay()+6)%7;const n=b.days.filter(k=>k.slice(5,7)===pad2(m+1)).length;
   h+='<button type="button" class="vp-m" data-x="month" data-m="'+m+'"><b>'+MON[m]+(n?' <em>'+n+'</em>':'')+'</b><span class="vp-g">';
   for(let i=0;i<off;i++)h+='<i></i>';
   for(let d=1;d<=dim;d++){const k=Y+'-'+pad2(m+1)+'-'+pad2(d);h+='<i class="'+(set.has(k)?'u':'')+(holidays(Y).has(k)?' h':'')+(k===t?' t':'')+'"></i>'}
   h+='</span></button>'}
  const node=el('<div>'+h+'</div></div>');
  DS.wire(node,{back:()=>DS.swap(main(),-1),month:btn=>{const m=Number(btn.dataset.m);DS.close();setTimeout(()=>{try{document.getElementById('tabPlan')?.click()}catch(e){}try{shown=new Date(Y,m,1);render()}catch(e){}},300)}});
  return node}

 function open(){Y=new Date().getFullYear();DS.node(main)}
 window.SchivioVacation={open,balance,bridges};
})();
