/* v1.0.65: Müllkalender – Tonnen als kleine Symbole im Kalender, Import (.ics) oder selbst eintragen */
(function(){
 const DS=window.SchivioDay,toast=window.SchivioToast||(()=>{});if(!DS)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const addDays=(k,n)=>{const t=new Date(k+'T12:00:00');t.setDate(t.getDate()+n);return key(t)};
 const diffDays=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
 const today=()=>key(new Date());
 const dLabel=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'numeric'}).replace(/\.,/,',');
 const dLong=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
 const save=()=>{try{persist()}catch(e){}try{render()}catch(e){}try{window.SchivioMore?.render?.()}catch(e){}};

 /* Tonnenarten – Reihenfolge = Erkennung beim Import */
 const TYPES=[
  {id:'sperr',name:'Sperrmüll',color:'#a855f7',kw:/sperr/i},
  {id:'schad',name:'Schadstoffe',color:'#ef4444',kw:/schadstoff|giftmobil|sonderm|problemabfall/i},
  {id:'baum',name:'Weihnachtsbaum',color:'#15803d',kw:/weihnachtsb|tannenb|christb/i},
  {id:'glas',name:'Altglas',color:'#22c55e',kw:/glas/i},
  {id:'papier',name:'Papier',color:'#3b82f6',kw:/papier|pappe|ppk|blaue/i},
  {id:'gelb',name:'Gelber Sack',color:'#facc15',kw:/gelb|wertstoff|leichtverpack|lvp|verpackung/i},
  {id:'bio',name:'Biotonne',color:'#a16207',kw:/bio|kompost|braune|küchenabf/i},
  {id:'gruen',name:'Grünschnitt',color:'#65a30d',kw:/grün|gruen|garten|laub|baum-? ?und strauch|strauchschnitt/i},
  {id:'rest',name:'Restmüll',color:'#94a3b8',kw:/rest|hausm|haushaltsabf|graue|schwarze/i}];
 const PICK=['rest','bio','papier','gelb','glas','gruen'];
 const COLORS=['#94a3b8','#a16207','#3b82f6','#facc15','#22c55e','#65a30d','#ef4444','#a855f7','#f97316','#ec4899'];
 const RHY=[[1,'Jede Woche'],[2,'Alle 2 Wochen'],[3,'Alle 3 Wochen'],[4,'Alle 4 Wochen'],[0,'Keine Wiederholung']];
 const W=()=>{if(!data.waste||typeof data.waste!=='object')data.waste={on:true,bins:[],dates:{},skip:{}};const w=data.waste;w.bins=w.bins||[];w.dates=w.dates||{};w.skip=w.skip||{};return w};
 const binById=id=>W().bins.find(b=>b.id===id);
 const icon=(c,cls)=>'<svg class="'+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8h13.6l-1.25 12.1a2 2 0 0 1-2 1.8H8.45a2 2 0 0 1-2-1.8z" fill="'+esc(c)+'"/><rect x="3.4" y="4" width="17.2" height="3" rx="1.3" fill="'+esc(c)+'"/><rect x="9.5" y="2" width="5" height="2.6" rx="1" fill="'+esc(c)+'"/><path d="M10 11v7.5M14 11v7.5" stroke="rgba(0,0,0,.28)" stroke-width="1.4" stroke-linecap="round"/></svg>';

 /* Welche Tonnen an Tag k? */
 function binsOn(k){const w=W();const out=[];const sk=w.skip[k]||[];
  for(const b of w.bins){if(sk.includes(b.id))continue;let hit=(w.dates[k]||[]).includes(b.id);
   if(!hit&&b.rule&&b.rule.weeks>0&&b.rule.start&&k>=b.rule.start){hit=diffDays(b.rule.start,k)%(7*b.rule.weeks)===0}
   if(hit)out.push(b)}
  return out}
 function nextOf(b,from){for(let i=0,k=from||today();i<400;i++,k=addDays(k,1)){if(binsOn(k).some(x=>x.id===b.id))return k}return null}
 function countOf(b){let n=0;for(const [k,l] of Object.entries(W().dates))if(l.includes(b.id)&&k>=today())n++;return n}

 /* ---------- Kalender ---------- */
 function paint(cell,k){cell.querySelector('.sx-waste')?.remove();const w=W();if(!w.on||!w.bins.length)return;const l=binsOn(k);if(!l.length)return;
  const s=document.createElement('span');s.className='sx-waste';s.setAttribute('aria-hidden','true');s.innerHTML=l.slice(0,3).map(b=>icon(b.color)).join('')+(l.length>3?'<i>+</i>':'');cell.append(s)}
 function dayHtml(k){const w=W();if(!w.on)return '';const l=binsOn(k);if(!l.length)return '';
  return '<div class="sx-wday"><span class="lb">Müllabfuhr</span>'+l.map(b=>'<button type="button" class="wc" data-wk="'+esc(k)+'" data-wb="'+esc(b.id)+'">'+icon(b.color)+esc(b.name)+'</button>').join('')+'</div>'}
 function cellLabel(k){const l=W().on?binsOn(k):[];return l.length?', Müllabfuhr: '+l.map(b=>b.name).join(', '):''}

 /* ---------- Fenster ---------- */
 const chev='<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
 const IC={up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>'};

 function main(){const w=W();
  let h=DS.head('Mehr','Müllkalender');
  if(!w.bins.length){h+='<div class="wm-empty">'+icon('#94a3b8','a')+icon('#3b82f6','b')+icon('#facc15','c')+'<b>Nie wieder die Tonne vergessen</b><span>Deine Abholtage erscheinen als kleine Tonnen direkt im Kalender.</span></div>'+
   '<div class="wm-two"><button type="button" class="wm-big pr" data-x="imp">'+IC.up+'<b>Abfallkalender importieren</b><small>Datei deiner Stadt (.ics) – schnellster Weg</small></button>'+
   '<button type="button" class="wm-big" data-x="add">'+IC.plus+'<b>Selbst eintragen</b><small>Tonne, Farbe und Rhythmus wählen</small></button></div>'+
   '<p class="nt">Die Datei findest du meist auf der Website deiner Stadt oder deines Entsorgers unter „Abfallkalender“ – als „iCal“, „ICS“ oder „Kalender-Export“. Herunterladen, dann hier importieren.</p>'}
  else{h+='<div class="ls"><div class="r"><span>Im Kalender anzeigen<small>Kleine Tonnen-Symbole an den Abholtagen</small></span><button type="button" class="sx-sw" role="switch" aria-label="Müllkalender im Kalender anzeigen" aria-checked="'+(w.on!==false)+'" data-x="tog"></button></div></div>';
   h+='<h4 class="wm-h">Deine Tonnen</h4><div class="ls">'+w.bins.map(b=>{const n=nextOf(b);const how=b.rule&&b.rule.weeks>0?(RHY.find(r=>r[0]===b.rule.weeks)||[0,''])[1]:(countOf(b)?'Aus Abfallkalender':'Einzeltermine');
    return '<button type="button" class="r" data-x="edit" data-id="'+esc(b.id)+'"><i class="wm-ic">'+icon(b.color)+'</i><span>'+esc(b.name)+'<small>'+esc(how)+' · '+(n?'nächste: '+esc(dLabel(n)):'keine weiteren Termine')+'</small></span>'+chev+'</button>'}).join('')+'</div>';
   h+='<div class="ac"><button type="button" class="bt" data-x="imp">'+IC.up+'Importieren</button><button type="button" class="bt pr" data-x="add">'+IC.plus+'Tonne</button></div>';
   h+='<p class="nt">Tippe im Kalender auf einen Tag und dort auf eine Tonne, um eine einzelne Abholung zu verschieben oder zu entfernen.</p>'}
  const node=el('<div>'+h+'</div>');
  DS.wire(node,{tog:b=>{w.on=!(w.on!==false);b.setAttribute('aria-checked',String(w.on));save()},imp:()=>pickFile(),add:()=>DS.swap(edit(null),1),edit:b=>DS.swap(edit(binById(b.dataset.id)),1)});
  return node}

 function edit(bin){const isNew=!bin;const w=W();const imported=bin&&countOf(bin)>0;
  let st={type:bin?.type||'rest',name:bin?.name||'Restmüll',color:bin?.color||'#94a3b8',weeks:bin?.rule?.weeks??(imported?0:2),start:bin?.rule?.start||nextWeekday()};
  const html=DS.head(isNew?'Müllkalender':'Tonne',isNew?'Tonne hinzufügen':'Tonne bearbeiten',{back:true})+
   '<div class="fm"><div><span class="wm-lbl">Art</span><div class="wm-types">'+PICK.map(id=>{const t=TYPES.find(x=>x.id===id);return '<button type="button" data-x="type" data-t="'+id+'" class="'+(st.type===id?'on':'')+'">'+icon(t.color)+'<span>'+esc(t.name)+'</span></button>'}).join('')+'</div></div>'+
   '<label>Name<input data-f="name" maxlength="30" value="'+esc(st.name)+'" autocomplete="off"></label>'+
   '<div><span class="wm-lbl">Farbe</span><div class="cl">'+COLORS.map(c=>'<button type="button" data-x="col" data-c="'+c+'" class="'+(c===st.color?'on':'')+'" style="--c:'+c+'" aria-label="Farbe '+c+'"></button>').join('')+'</div></div>'+
   '<div><span class="wm-lbl">Abholung</span><div class="wm-rhy">'+RHY.map(([v,t])=>'<button type="button" data-x="rhy" data-v="'+v+'" class="'+(st.weeks===v?'on':'')+'">'+t+'</button>').join('')+'</div></div>'+
   '<label data-start'+(st.weeks?'':' hidden')+'>Nächster Abholtag<input type="date" data-f="start" value="'+esc(st.start)+'"></label>'+
   '<div class="r2 wm-one"><label>Einzelnen Abholtag hinzufügen<input type="date" data-f="one"></label><button type="button" class="bt" data-x="one">'+IC.plus+'Hinzufügen</button></div>'+
   (imported?'<p class="wm-info">'+countOf(bin)+' Abholtage aus dem importierten Abfallkalender.</p>':'')+
   '<div class="er" data-err></div></div>'+
   '<div class="ac">'+(isNew?'':'<button type="button" class="bt dg" data-x="del">'+IC.del+'Löschen</button>')+'<button type="button" class="bt pr" data-x="save">'+IC.ok+'Speichern</button></div>';
  const node=el('<div>'+html+'</div>');const f=n=>node.querySelector('[data-f="'+n+'"]');const err=t=>{node.querySelector('[data-err]').textContent=t||''};
  const commit=()=>{st.name=f('name').value.trim()||TYPES.find(t=>t.id===st.type)?.name||'Tonne';st.start=f('start').value;
   if(st.weeks&&!st.start){err('Bitte den nächsten Abholtag wählen.');return null}
   const b=bin||{id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)};Object.assign(b,{type:st.type,name:st.name,color:st.color,rule:st.weeks?{weeks:st.weeks,start:st.start}:null});if(!bin)w.bins.push(b);bin=b;return b};
  DS.wire(node,{back:()=>DS.swap(main(),-1),
   type:b=>{const t=TYPES.find(x=>x.id===b.dataset.t);const nm=f('name');if(!nm.value.trim()||TYPES.some(x=>x.name===nm.value.trim()))nm.value=t.name;st.type=t.id;st.color=t.color;
    node.querySelectorAll('[data-x="type"]').forEach(x=>x.classList.toggle('on',x===b));node.querySelectorAll('[data-x="col"]').forEach(x=>x.classList.toggle('on',x.dataset.c===t.color))},
   col:b=>{st.color=b.dataset.c;node.querySelectorAll('[data-x="col"]').forEach(x=>x.classList.toggle('on',x===b))},
   rhy:b=>{st.weeks=Number(b.dataset.v);node.querySelectorAll('[data-x="rhy"]').forEach(x=>x.classList.toggle('on',x===b));node.querySelector('[data-start]').hidden=!st.weeks},
   one:()=>{const d=f('one').value;if(!d){err('Bitte zuerst ein Datum wählen.');return}err();const b=commit();if(!b)return;(w.dates[d]=w.dates[d]||[]);if(!w.dates[d].includes(b.id))w.dates[d].push(b.id);if(w.skip[d])w.skip[d]=w.skip[d].filter(x=>x!==b.id);save();f('one').value='';toast(b.name+' am '+dLabel(d)+' eingetragen')},
   del:()=>{if(!confirmDel(bin))return;w.bins=w.bins.filter(x=>x.id!==bin.id);for(const o of [w.dates,w.skip])for(const k of Object.keys(o)){o[k]=o[k].filter(x=>x!==bin.id);if(!o[k].length)delete o[k]}save();toast(bin.name+' gelöscht');DS.swap(main(),-1)},
   save:()=>{const b=commit();if(!b)return;if(!b.rule&&!Object.values(w.dates).some(l=>l.includes(b.id))){err('Bitte einen Rhythmus wählen oder einen Abholtag hinzufügen.');if(isNew)w.bins=w.bins.filter(x=>x!==b),bin=null;return}save();toast(b.name+' gespeichert');DS.swap(main(),-1)}});
  return node}
 let delArm=0;function confirmDel(b){if(Date.now()-delArm<3000)return true;delArm=Date.now();toast('Nochmal tippen, um „'+b.name+'“ mit allen Abholtagen zu löschen.');return false}
 function nextWeekday(){return addDays(today(),1)}

 /* Einzelne Abholung (aus der Tagesansicht) */
 function single(k,id){const b=binById(id);if(!b)return el('<div></div>');
  const html=DS.head(dLong(k),b.name,{back:true})+'<div class="wm-one-hd">'+icon(b.color,'big')+'</div>'+
   '<div class="fm"><label>Auf anderen Tag verschieben<input type="date" data-f="to" value="'+esc(k)+'"></label></div>'+
   '<div class="ac"><button type="button" class="bt dg" data-x="rm">'+IC.del+'Entfällt</button><button type="button" class="bt pr" data-x="mv">'+IC.ok+'Verschieben</button></div>'+
   '<p class="nt">Ändert nur diese eine Abholung. Rhythmus und alle anderen Termine bleiben gleich.</p>';
  const node=el('<div>'+html+'</div>');const w=W();
  const remove=()=>{if(w.dates[k]){w.dates[k]=w.dates[k].filter(x=>x!==id);if(!w.dates[k].length)delete w.dates[k]}if(binsOn(k).some(x=>x.id===id)){(w.skip[k]=w.skip[k]||[]).push(id)}};
  DS.wire(node,{back:()=>DS.open(k),rm:()=>{remove();save();toast(b.name+' am '+dLabel(k)+' entfernt');DS.open(k)},
   mv:()=>{const to=node.querySelector('[data-f="to"]').value;if(!to||to===k){DS.open(k);return}remove();(w.dates[to]=w.dates[to]||[]);if(!w.dates[to].includes(id))w.dates[to].push(id);if(w.skip[to])w.skip[to]=w.skip[to].filter(x=>x!==id);save();toast(b.name+' auf '+dLabel(to)+' verschoben');DS.open(to)}});
  return node}
 document.addEventListener('click',e=>{const c=e.target.closest('.sx-wday .wc');if(!c)return;try{navigator.vibrate&&navigator.vibrate(7)}catch(x){}DS.swap(single(c.dataset.wk,c.dataset.wb),1)});

 /* ---------- Import (.ics) ---------- */
 let inp=null;
 function pickFile(){if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='.ics,.ical,.ifb,.icalendar,text/calendar';inp.hidden=true;document.body.append(inp);
   inp.addEventListener('change',()=>{const fl=inp.files&&inp.files[0];inp.value='';if(!fl)return;const r=new FileReader();r.onload=()=>{try{const res=importIcs(String(r.result||''));DS.swap(result(res),1)}catch(e){toast('Die Datei konnte nicht gelesen werden.')}};r.readAsText(fl)})}
  inp.click()}
 function parseIcs(txt){const lines=txt.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n');const evs=[];let cur=null;
  for(const ln of lines){if(ln==='BEGIN:VEVENT'){cur={ex:[]};continue}if(ln==='END:VEVENT'){if(cur)evs.push(cur);cur=null;continue}if(!cur)continue;
   const i=ln.indexOf(':');if(i<0)continue;const name=ln.slice(0,i).split(';')[0].toUpperCase(),val=ln.slice(i+1);
   if(name==='SUMMARY')cur.sum=val.replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1').trim();
   else if(name==='DTSTART')cur.d=icsDate(val,ln.slice(0,i));else if(name==='RRULE')cur.rr=val;else if(name==='EXDATE')val.split(',').forEach(v=>{const d=icsDate(v,ln.slice(0,i));if(d)cur.ex.push(d)});
   else if(name==='STATUS'&&/CANCELLED/i.test(val))cur.cancel=true}
  return evs}
 function icsDate(v,params){const m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(v.trim());if(!m)return null;
  if(m[4]&&m[7]){const d=new Date(Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+m[6]));return key(d)}return m[1]+'-'+m[2]+'-'+m[3]}
 function expand(ev){const out=[ev.d];if(!ev.rr)return out;const p={};ev.rr.split(';').forEach(s=>{const [a,b]=s.split('=');p[(a||'').toUpperCase()]=b});
  const step={DAILY:1,WEEKLY:7}[p.FREQ];const iv=Math.max(1,Number(p.INTERVAL)||1);const until=p.UNTIL?icsDate(p.UNTIL):addDays(today(),730);const cnt=Number(p.COUNT)||0;
  if(step){let k=ev.d,n=1;while(n<(cnt||800)){k=addDays(k,step*iv);if(k>until)break;out.push(k);n++}}
  else if(p.FREQ==='MONTHLY'){const d=new Date(ev.d+'T12:00:00');for(let n=1;n<(cnt||36);n++){const t=new Date(d);t.setMonth(d.getMonth()+n*iv);const k=key(t);if(k>until)break;out.push(k)}}
  return out.filter(k=>!ev.ex.includes(k))}
 function typeOf(s){return TYPES.find(t=>t.kw.test(s))||null}
 function importIcs(txt){const evs=parseIcs(txt).filter(e=>e.d&&!e.cancel);if(!evs.length)throw new Error('leer');
  const w=W();const from=addDays(today(),-31);const res={};let used=COLORS.slice(6);
  for(const ev of evs){const sum=ev.sum||'Abfuhr';const t=typeOf(sum);const tid=t?t.id:'x:'+sum.toLowerCase().slice(0,30);
   let b=w.bins.find(x=>(x.type===tid)||(!t&&x.name.toLowerCase()===sum.toLowerCase()));
   if(!b){b={id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type:tid,name:t?t.name:sum.replace(/^(abfuhr|leerung|abholung)\s*:?\s*/i,'').slice(0,30)||'Abfuhr',color:t?t.color:(used.shift()||'#f97316'),rule:null};w.bins.push(b)}
   for(const k of expand(ev)){if(k<from)continue;const l=(w.dates[k]=w.dates[k]||[]);if(!l.includes(b.id)){l.push(b.id);res[b.id]=(res[b.id]||0)+1}}}
  w.on=true;save();return res}
 function result(res){const ids=Object.keys(res);const total=ids.reduce((s,i)=>s+res[i],0);
  let h=DS.head('Müllkalender','Import abgeschlossen',{back:true});
  h+=ids.length?'<div class="kp"><div class="big"><b>'+total+'</b><small>Abholtage aus '+ids.length+' '+(ids.length===1?'Tonne':'Tonnen')+' übernommen</small></div></div><div class="ls">'+ids.map(id=>{const b=binById(id);return '<button type="button" class="r" data-x="edit" data-id="'+esc(id)+'"><i class="wm-ic">'+icon(b.color)+'</i><span>'+esc(b.name)+'<small>'+res[id]+' Abholtage · Farbe und Name änderbar</small></span>'+chev+'</button>'}).join('')+'</div>':'<p class="nt">Alle Abholtage aus der Datei waren schon eingetragen.</p>';
  h+='<div class="ac"><button type="button" class="bt pr" data-x="done">'+IC.ok+'Fertig</button></div><p class="nt">Die Tonnen wurden anhand ihres Namens erkannt. Bitte kurz prüfen – Farben und Namen kannst du jederzeit anpassen.</p>';
  const node=el('<div>'+h+'</div>');DS.wire(node,{back:()=>DS.swap(main(),-1),done:()=>DS.swap(main(),-1),edit:b=>DS.swap(edit(binById(b.dataset.id)),1)});return node}

 function open(){DS.node(main)}
 window.SchivioWaste={open,paint,dayHtml,cellLabel,binsOn,importIcs};
 try{render()}catch(e){}
})();
