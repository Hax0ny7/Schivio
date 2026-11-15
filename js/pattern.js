/* v1.0.78: Schichtmuster (Tools)
   Wiederkehrender Dienstrhythmus: einmal festlegen, Schivio trägt ihn für einen Zeitraum ein.
   - Vorlagen (Mo–Fr, jedes 2. Wochenende, 2-2-2-4, wochenweise Früh/Spät) oder eigenes Muster
   - Muster wird mit einem „Pinsel“ Tag für Tag festgelegt (Länge 1–56 Tage)
   - Urlaub, Krank und Fortbildung werden nie überschrieben; andere Dienste nur, wenn gewünscht
   - „Rückgängig“ für das letzte Eintragen
   Gespeichert: data.pattern = {cycle:[Code|''], start:'JJJJ-MM-TT', until:'JJJJ-MM-TT'} und data.patternUndo.
   SchivioPattern.dutyOn(k) sagt anderen Tools (z. B. Urlaubsplaner), ob laut Muster an einem Tag Dienst wäre. */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const toDate=k=>new Date(k+'T12:00:00');
 const addDays=(k,n)=>{const t=toDate(k);t.setDate(t.getDate()+n);return key(t)};
 const dn=k=>Math.round(Date.UTC(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10))/864e5);
 const today=()=>key(new Date());
 const WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const MON3=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
 const dShort=k=>{const d=toDate(k);return WD[d.getDay()]+'., '+d.getDate()+'. '+MON3[d.getMonth()]+' '+d.getFullYear()};
 const KEEP=['U','K','T'];/* werden nie überschrieben */
 const codes=()=>typeof orderedPlannerCodes==='function'?orderedPlannerCodes().filter(c=>!KEEP.includes(c)):['F','S','N','X','A'];
 const title=c=>c?shiftTitle(c):'Frei';
 const color=c=>c?(typeof displayShiftColor==='function'?displayShiftColor(shiftColor(c)):shiftColor(c)):'transparent';
 const short=c=>{if(!c)return '–';const t=shiftTitle(c);return t.length<=3?t:t.slice(0,2)};
 const refresh=()=>{try{persist()}catch(e){}try{render()}catch(e){}try{renderStatsOnly()}catch(e){}try{window.SchivioMore?.render?.()}catch(e){}};
 const IC={
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
  rep:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>'
 };

 /* nächster Montag (oder heute, wenn Montag) als sinnvoller Start */
 function nextMonday(){let k=today();while(toDate(k).getDay()!==1)k=addDays(k,1);return k}
 function monthEnd(k,plus){const d=toDate(k);return key(new Date(d.getFullYear(),d.getMonth()+1+plus,0,12))}
 const has=c=>codes().includes(c);
 const pick=(...l)=>l.find(has)||codes()[0]||'X';
 function templates(){const D=pick('X','F'),F=pick('F','X'),S=pick('S','X'),N=pick('N','X');
  return [
   {id:'mofr',name:'Mo–Fr, Wochenende frei',sub:'5 Tage Dienst, 2 Tage frei',cycle:[D,D,D,D,D,'','']},
   {id:'we2',name:'Jedes 2. Wochenende Dienst',sub:'2-Wochen-Rhythmus – Tage danach anpassen',cycle:[D,D,'',D,'',D,D, D,D,D,D,D,'','']},
   {id:'fsn',name:'Früh, Spät, Nacht (2-2-2-4)',sub:'10-Tage-Rhythmus im Wechsel',cycle:[F,F,S,S,N,N,'','','','']},
   {id:'fs',name:'Früh und Spät wochenweise',sub:'1 Woche Früh, 1 Woche Spät',cycle:[F,F,F,F,F,'','', S,S,S,S,S,'','']},
   {id:'own',name:'Eigenes Muster',sub:'Leere Woche, selbst festlegen',cycle:['','','','','','','']}
  ]}

 function P(){const p=data.pattern;return p&&Array.isArray(p.cycle)&&p.cycle.length&&/^\d{4}-\d\d-\d\d$/.test(p.start||'')?p:null}
 /* Laut Muster: Code (Dienst), '' (frei) oder null (kein Muster) */
 function dutyOn(k){const p=P();if(!p)return null;const n=p.cycle.length,i=((dn(k)-dn(p.start))%n+n)%n;return p.cycle[i]||''}

 /* ---------- Start ---------- */
 function main(){const p=P(),u=data.patternUndo;
  let h=DS.head('Tools','Schichtmuster')+
   '<p class="pt-p">Wiederholt sich dein Dienstrhythmus? Lege ihn einmal fest – Schivio trägt ihn für die nächsten Monate ein. Abweichungen änderst du danach einfach im Kalender.</p>';
  if(p)h+='<div class="pt-cur"><div class="pt-cur-h"><b>Dein Muster</b><small>'+p.cycle.length+' Tage · seit '+dShort(p.start)+(p.until?' · eingetragen bis '+dShort(p.until):'')+'</small></div>'+strip(p.cycle,p.start)+
   '<div class="ac"><button type="button" class="bt" data-x="edit">Bearbeiten</button><button type="button" class="bt pr" data-x="more">Weiterführen</button></div></div>';
  h+='<h4 class="pt-h">'+(p?'Neues Muster aus Vorlage':'Vorlage wählen')+'</h4><div class="ls">'+templates().map((t,i)=>'<button type="button" class="r pt-r" data-x="tpl" data-i="'+i+'"><span>'+esc(t.name)+'<small>'+esc(t.sub)+'</small></span>'+strip(t.cycle,null,true)+IC.chev+'</button>').join('')+'</div>'+
   (u?'<button type="button" class="ip-undo" data-x="undo">Letztes Eintragen rückgängig machen<small>'+u.n+' Tage · '+esc(u.label||'')+'</small></button>':'')+
   '<p class="pt-p">Tipp: Einzelne Tage trägst du am schnellsten mit dem Stift oben im Kalender ein – Dienst wählen und Tage antippen oder darüber wischen.</p>';
  const node=el('<div>'+h+'</div>');
  DS.wire(node,{
   tpl:b=>{const t=templates()[Number(b.dataset.i)];DS.swap(editor({cycle:t.cycle.slice(),start:nextMonday()}),1)},
   edit:()=>DS.swap(editor({cycle:p.cycle.slice(),start:p.start}),1),
   more:()=>{const from=p.until&&p.until>=today()?addDays(p.until,1):today();DS.swap(applyView({cycle:p.cycle.slice(),start:p.start},from),1)},
   undo:undoLast});
  return node}
 /* kleine Farbleiste als Vorschau */
 function strip(cycle,start,mini){const n=Math.min(cycle.length,mini?14:56);
  return '<em class="pt-strip'+(mini?' mini':'')+'" aria-hidden="true">'+cycle.slice(0,n).map(c=>'<i style="--c:'+esc(c?color(c):'transparent')+'"'+(c?'':' class="f"')+'></i>').join('')+'</em>'}

 function undoLast(){const u=data.patternUndo;if(!u)return;
  if(!confirm(u.n+' eingetragene Tage wieder auf den vorherigen Stand setzen?'))return;
  for(const [k,v] of Object.entries(u.prev||{})){if(v)data.shifts[k]=v;else delete data.shifts[k]}
  delete data.patternUndo;refresh();toast('Rückgängig gemacht');DS.swap(main(),0)}

 /* ---------- Muster festlegen ---------- */
 let brush=null;
 function editor(p){if(brush==null||(brush&&!codes().includes(brush)))brush=codes()[0]||'';
  const n=p.cycle.length;
  const cells=p.cycle.map((c,i)=>{const k=addDays(p.start,i);return '<button type="button" class="pt-c'+(c?'':' f')+'" data-x="cell" data-i="'+i+'" style="--c:'+esc(color(c))+'" aria-label="'+WD[toDate(k).getDay()]+', Tag '+(i+1)+': '+esc(title(c))+'"><small>'+WD[toDate(k).getDay()]+'</small><b>'+esc(short(c))+'</b></button>'}).join('');
  const node=el('<div>'+DS.head('Schichtmuster','Muster festlegen',{back:true})+
   '<div class="ls vp-form"><label class="vp-f"><span>Erster Tag<small>Ab hier beginnt das Muster</small></span><input type="date" data-f="start" value="'+esc(p.start)+'"></label></div>'+
   '<p class="pt-p">Dienst wählen, dann die Tage antippen:</p>'+
   '<div class="pt-brush" role="radiogroup" aria-label="Pinsel">'+codes().concat(['']).map(c=>'<button type="button" role="radio" aria-checked="'+(c===brush)+'" class="'+(c===brush?'on':'')+'" data-x="brush" data-c="'+esc(c)+'" style="--c:'+esc(c?color(c):'var(--sx-muted)')+'">'+esc(title(c))+'</button>').join('')+'</div>'+
   '<div class="pt-grid">'+cells+'</div>'+
   '<div class="pt-len"><span>Länge: <b>'+n+' '+(n===1?'Tag':'Tage')+'</b>'+(n%7===0?' ('+n/7+(n===7?' Woche':' Wochen')+')':'')+'</span><span class="pt-lb"><button type="button" class="ch2" data-x="lm" aria-label="Einen Tag kürzer"'+(n<=1?' disabled':'')+'>−1</button><button type="button" class="ch2" data-x="lp" aria-label="Einen Tag länger"'+(n>=56?' disabled':'')+'>+1</button><button type="button" class="ch2" data-x="wp" aria-label="Eine Woche länger"'+(n>49?' disabled':'')+'>+7</button></span></div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="next"'+(p.cycle.some(Boolean)?'':' disabled')+'>Weiter</button></div></div>');
  const re=()=>{const sc=DS.scroller?.scrollTop;DS.swap(editor(p),0);if(sc!=null)requestAnimationFrame(()=>{DS.scroller.scrollTop=sc})};
  node.querySelector('[data-f="start"]').addEventListener('change',e=>{if(/^\d{4}-\d\d-\d\d$/.test(e.target.value)){p.start=e.target.value;re()}});
  DS.wire(node,{back:()=>DS.swap(main(),-1),
   brush:b=>{brush=b.dataset.c;node.querySelectorAll('.pt-brush button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',String(on))})},
   cell:b=>{const i=Number(b.dataset.i);p.cycle[i]=p.cycle[i]===brush?'':brush;const c=p.cycle[i];
    b.classList.toggle('f',!c);b.style.setProperty('--c',color(c));b.querySelector('b').textContent=short(c);b.setAttribute('aria-label',b.getAttribute('aria-label').replace(/: .*$/,': '+title(c)));
    try{b.animate?.([{transform:'scale(.88)'},{transform:'scale(1)'}],{duration:180,easing:'ease-out'})}catch(e){}
    node.querySelector('[data-x="next"]').disabled=!p.cycle.some(Boolean)},
   lm:()=>{if(p.cycle.length>1){p.cycle.pop();re()}},lp:()=>{if(p.cycle.length<56){p.cycle.push('');re()}},wp:()=>{for(let i=0;i<7&&p.cycle.length<56;i++)p.cycle.push('');re()},
   next:()=>DS.swap(applyView(p,p.start),1)});
  return node}

 /* ---------- Eintragen ---------- */
 function plan(p,from,to,over){const out=[];if(!from||!to||to<from)return out;
  const n=p.cycle.length;for(let k=from,i=0;k<=to&&i<800;k=addDays(k,1),i++){const c=p.cycle[((dn(k)-dn(p.start))%n+n)%n]||'';const old=data.shifts[k]||'';
   if(KEEP.includes(old))continue;/* Urlaub, Krank, Fortbildung bleiben */
   if(old&&!over)continue;
   if(c===old)continue;
   if(!c&&!old)continue;
   out.push({k,c,old})}
  return out}
 function applyView(p,from){const to0=monthEnd(from<today()?today():from,3);
  const node=el('<div>'+DS.head('Schichtmuster','Eintragen',{back:true})+
   '<div class="pt-cur">'+strip(p.cycle,p.start)+'</div>'+
   '<div class="ls vp-form"><label class="vp-f"><span>Von</span><input type="date" data-f="from" value="'+esc(from)+'"></label><label class="vp-f"><span>Bis</span><input type="date" data-f="to" value="'+esc(to0)+'"></label>'+
   '<div class="vp-f pt-swr"><span>Vorhandene Dienste ersetzen<small>Aus: nur leere Tage werden gefüllt. Urlaub, Krank und Fortbildung bleiben immer erhalten.</small></span><button type="button" class="sx-sw" role="switch" aria-checked="false" aria-label="Vorhandene Dienste ersetzen" data-x="over"></button></div></div>'+
   '<p class="pt-p" data-sum></p><div data-w></div>'+
   '<div class="ac"><button type="button" class="bt pr" data-x="save" disabled>Eintragen</button></div></div>');
  const F=n=>node.querySelector('[data-f="'+n+'"]'),sw=node.querySelector('[data-x="over"]'),btn=node.querySelector('[data-x="save"]');let list=[];
  const upd=()=>{let a=F('from').value,b=F('to').value;if(a&&b&&b<a){b=a;F('to').value=a}F('to').min=a||'';
   const over=sw.getAttribute('aria-checked')==='true';list=plan(p,a,b,over);
   const add=list.filter(x=>x.c&&!x.old).length,rep=list.filter(x=>x.c&&x.old).length,del=list.filter(x=>!x.c).length;
   const span=a&&b?dn(b)-dn(a)+1:0;
   node.querySelector('[data-sum]').innerHTML=list.length?'<b>'+add+'</b> '+(add===1?'Dienst wird':'Dienste werden')+' eingetragen'+(rep?', <b>'+rep+'</b> ersetzt':'')+(del?', <b>'+del+'</b> laut Muster frei':'')+'.':(span?'Im Zeitraum ist schon alles eingetragen.':'Bitte Zeitraum wählen.');
   node.querySelector('[data-w]').innerHTML=span>366?'<p class="vp-warn">'+IC.warn+'<span>Bitte höchstens ein Jahr auf einmal eintragen.</span></p>':'';
   btn.disabled=!list.length||span>366;btn.textContent=list.length?list.length+(list.length===1?' Tag':' Tage')+' eintragen':'Eintragen'};
  F('from').addEventListener('input',upd);F('to').addEventListener('input',upd);upd();
  DS.wire(node,{back:()=>DS.swap(editor(p),-1),
   over:b=>{b.setAttribute('aria-checked',String(b.getAttribute('aria-checked')!=='true'));upd()},
   save:()=>{if(!list.length)return;const a=F('from').value,b=F('to').value;
    data.patternUndo={n:list.length,label:dShort(a)+' – '+dShort(b),prev:Object.fromEntries(list.map(x=>[x.k,x.old||null]))};
    list.forEach(x=>{if(x.c)data.shifts[x.k]=x.c;else delete data.shifts[x.k]});
    const old=P();data.pattern={cycle:p.cycle.slice(),start:p.start,until:old&&old.until&&old.until>b&&old.start===p.start&&old.cycle.join()===p.cycle.join()?old.until:b};
    refresh();toast(list.length+(list.length===1?' Tag':' Tage')+' eingetragen');DS.close();
    setTimeout(()=>{try{document.getElementById('tabPlan')?.click()}catch(e){}try{const d=toDate(a);shown=new Date(d.getFullYear(),d.getMonth(),1);render();scrollToMonth?.(shown,true)}catch(e){}},350)}});
  return node}

 function open(){DS.node(main)}
 window.SchivioPattern={open,dutyOn,get:P};
})();
