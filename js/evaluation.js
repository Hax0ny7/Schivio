/* v1.0.54: Neuer Auswertungs-Kreis */
(function(){
 const wheel=document.querySelector('#hoursPanel .sch-wheel'),dash=document.querySelector('#hoursPanel .sch-dashboard');
 if(!wheel||!dash)return;
 const NS='http://www.w3.org/2000/svg',C=160,RD=146,RP=121;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(7)}catch(e){}};
 const el=(tag,cls,html)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n};
 const svg=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);return n};
 const I={
  chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  work:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  balance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/></svg>',
  history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/></svg>',
  payout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>',
  adjust:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'};

 /* ---- Kopfzeile mit Monatswechsel ---- */
 const head=el('div','sv-head');
 const prev=el('button','sv-nav',I.chevL);prev.type='button';prev.setAttribute('aria-label','Vorheriger Monat');
 const next=el('button','sv-nav',I.chevR);next.type='button';next.setAttribute('aria-label','Nächster Monat');
 const mBox=el('div','sv-month');const mName=el('strong');const mSub=el('small');mBox.append(mName,mSub);
 head.append(prev,mBox,next);dash.insertBefore(head,wheel);

 /* ---- Kreis ---- */
 wheel.classList.add('sv-dial');wheel.removeAttribute('aria-label');
 const center=wheel.querySelector('.sch-wheel-center');
 const sectors=[...wheel.querySelectorAll('.sch-sector')];
 const s=svg('svg',{viewBox:'0 0 320 320',class:'sv-svg','aria-hidden':'true'});
 s.innerHTML='<defs><linearGradient id="svGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--sv-a)"/><stop offset="1" stop-color="var(--sv-b)"/></linearGradient><filter id="svGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
 const gDays=svg('g',{});const track=svg('circle',{cx:C,cy:C,r:RP,fill:'none',stroke:'var(--sv-track)','stroke-width':10});
 const glow=svg('circle',{cx:C,cy:C,r:RP,fill:'none',stroke:'url(#svGrad)','stroke-width':10,'stroke-linecap':'round',transform:`rotate(-90 ${C} ${C})`,filter:'url(#svGlow)',opacity:.55,class:'sv-prog'});
 const prog=svg('circle',{cx:C,cy:C,r:RP,fill:'none',stroke:'url(#svGrad)','stroke-width':10,'stroke-linecap':'round',transform:`rotate(-90 ${C} ${C})`,class:'sv-prog'});
 const over=svg('circle',{cx:C,cy:C,r:RP,fill:'none',stroke:'var(--sv-pos)','stroke-width':10,'stroke-linecap':'round',transform:`rotate(-90 ${C} ${C})`,class:'sv-prog'});
 const knob=svg('g',{class:'sv-knob'});knob.innerHTML=`<circle class="sv-halo" cx="${C}" cy="${C-RP}" r="9" fill="var(--sv-a)"/><circle cx="${C}" cy="${C-RP}" r="6.5" fill="#fff"/><circle cx="${C}" cy="${C-RP}" r="3" fill="var(--sv-b)"/>`;
 const todayDot=svg('circle',{r:3.2,fill:'var(--sv-text)',class:'sv-today-dot'});
 s.append(gDays,track,glow,prog,over,knob,todayDot);
 const tip=el('div','sv-tip');
 wheel.prepend(s);wheel.append(tip);
 const CIRC=2*Math.PI*RP;[prog,glow,over].forEach(c=>{c.style.strokeDasharray=CIRC;c.style.strokeDashoffset=CIRC});

 /* Mitte */
 const amount=el('div','sv-amount','–');
 const eyebrow=center.querySelector('#wheelEyebrow'),info=center.querySelector('#wheelInfo'),srcAmount=center.querySelector('#wheelAmount');
 eyebrow.after(amount);
 const hrs=el('div','sv-hrs');const more=el('div','sv-more','Details ›');
 info.after(hrs,more);

 /* ---- Legende + Kacheln ---- */
 const legend=el('div','sv-legend');wheel.after(legend);
 const tiles=el('div','sv-tiles');legend.after(tiles);
 const byPanel={};sectors.forEach(b=>byPanel[b.dataset.panel]=b);
 const subs={};
 function makeTile(key,label,opts={}){const b=byPanel[key];if(!b)return null;const em=b.querySelector('em');b.className='sv-tile'+(opts.small?' sv-small':'');b.replaceChildren();
  const ic=el('span','sv-ic',I[key]);const chev=el('span','sv-chev',I.chevR);const lbl=el('span','sv-lbl',label);const sub=el('span','sv-sub');subs[key]=sub;
  if(opts.small){const txt=el('span');txt.style.cssText='display:flex;flex-direction:column;min-width:0';txt.append(lbl,sub);b.append(ic,txt);if(em)b.append(em);b.append(chev)}
  else{b.append(ic,chev,lbl);if(em)b.append(em);b.append(sub);if(opts.extra)b.append(opts.extra)}
  b.setAttribute('aria-label',label);b.addEventListener('click',buzz);tiles.append(b);return b}
 const workBar=el('div','sv-bar','<i></i>');const spark=el('div','sv-spark');
 makeTile('work','Arbeitszeit',{extra:workBar});
 makeTile('target','Monatssoll');
 makeTile('balance','Zeitguthaben');
 const hist=makeTile('history','Monatsverlauf',{extra:spark});
 makeTile('payout','Ausgezahlt',{small:true});
 makeTile('adjust','Korrektur',{small:true});

 /* ---- Hilfsfunktionen ---- */
 const parseEuro=t=>{const m=String(t||'').match(/-?[\d.]+,\d{2}/);return m?Number(m[0].replace(/\./g,'').replace(',','.')):null};
 const euro=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 let shownAmount=null,raf=0;
 function countTo(text){const target=parseEuro(text);cancelAnimationFrame(raf);
  if(target===null||reduce){amount.textContent=text&&text.trim()?text:'–';shownAmount=target;return}
  const from=shownAmount===null?target*0.6:shownAmount,t0=performance.now(),dur=900,suffix=/\+\s*$/.test(text)?' +':'';
  const step=now=>{const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);amount.textContent=euro(from+(target-from)*e)+suffix;if(p<1)raf=requestAnimationFrame(step)};
  shownAmount=target;raf=requestAnimationFrame(step)}
 const salaryOn=()=>!!data.setupOptions?.salaryEnabled;
 function syncCenter(){
  if(salaryOn()){countTo(srcAmount.textContent);info.textContent=(info.textContent||'').replace(/\s*·\s*Details\s*$/,'');more.hidden=false}
 }
 new MutationObserver(()=>{if(salaryOn())syncCenter()}).observe(srcAmount,{childList:true,characterData:true,subtree:true});
 new MutationObserver(()=>{if(/·\s*Details\s*$/.test(info.textContent))info.textContent=info.textContent.replace(/\s*·\s*Details\s*$/,'')}).observe(info,{childList:true,characterData:true,subtree:true});

 function pt(r,deg){const a=(deg-90)*Math.PI/180;return [C+r*Math.cos(a),C+r*Math.sin(a)]}
 function arc(r,a0,a1){const [x0,y0]=pt(r,a0),[x1,y1]=pt(r,a1);return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
 function dayInfo(y,m,d){const k=dateKey(y,m,d),code=data.shifts?.[k]||'';const tpl=code&&typeof templateFor==='function'?templateFor(code):null;
  return {k,code,title:code?shiftTitle(code):'Frei',time:tpl&&tpl.start&&tpl.end?tpl.start+'–'+tpl.end+' Uhr':'',color:code?ringColor(code):null}}
 function ringColor(code){let hex=typeof displayShiftColor==='function'?displayShiftColor(shiftColor(code)):shiftColor(code);if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const lum=(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])/255;if(document.body.dataset.theme==='light'||lum>=.3)return hex;const f=Math.min(.5,(.3-lum)*1.6);return '#'+rgb.map(v=>Math.round(v+(255-v)*f).toString(16).padStart(2,'0')).join('')}

 let lastKey='',sel=-1,tipTimer=0;
 function drawDays(y,m,animate){gDays.replaceChildren();const n=new Date(y,m+1,0).getDate(),span=360/n,cap=6/RD*180/Math.PI,gap=Math.max(.6,span*.09);
  const now=new Date(),isCur=now.getFullYear()===y&&now.getMonth()===m;
  for(let d=1;d<=n;d++){const a0=(d-1)*span+gap+cap,a1=d*span-gap-cap;const di=dayInfo(y,m,d);
   const p=svg('path',{d:arc(RD,a0,Math.max(a0+.01,a1)),fill:'none',stroke:di.color||'var(--sv-free)','stroke-width':12,'stroke-linecap':'round',class:'sv-day'+(animate&&!reduce?' sv-in':'')});
   if(animate&&!reduce)p.style.animationDelay=(d*14)+'ms';
   p.dataset.d=d;gDays.append(p)}
  if(isCur){const [x,y2]=pt(RD+14,(now.getDate()-.5)*span);todayDot.setAttribute('cx',x);todayDot.setAttribute('cy',y2);todayDot.style.display=''}else todayDot.style.display='none'}
 function setProgress(ratio,animate){const r=Math.max(0,ratio||0),base=Math.min(1,r),ex=Math.min(1,Math.max(0,r-1));
  const apply=()=>{prog.style.strokeDashoffset=CIRC*(1-base);glow.style.strokeDashoffset=CIRC*(1-base);over.style.strokeDashoffset=CIRC*(1-ex);knob.style.transform=`rotate(${(r>1?ex:base)*360}deg)`;knob.style.transformOrigin=`${C}px ${C}px`};
  if(animate&&!reduce){[prog,glow,over].forEach(c=>{c.style.transition='none';c.style.strokeDashoffset=CIRC});knob.style.transition='none';knob.style.transform='rotate(0deg)';knob.style.transformOrigin=`${C}px ${C}px`;void s.getBoundingClientRect();requestAnimationFrame(()=>{[prog,glow,over,knob].forEach(c=>c.style.transition='');apply()})}else apply();
  knob.style.display=ratio==null||ratio<=0?'none':''}
 function hideTip(){tip.classList.remove('show');gDays.classList.remove('sv-dim');gDays.querySelectorAll('.sv-sel').forEach(p=>p.classList.remove('sv-sel'));sel=-1}

 function update(animate){
  const y=shown.getFullYear(),m=shown.getMonth(),key=y+'-'+m,changed=key!==lastKey;lastKey=key;if(changed)hideTip();
  const now=new Date(),isCur=now.getFullYear()===y&&now.getMonth()===m;
  mName.textContent=shown.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  mSub.replaceChildren();if(isCur)mSub.textContent='Aktueller Monat';else{const b=el('button','sv-today','Zum aktuellen Monat');b.type='button';b.onclick=()=>goMonth(null);mSub.append(b)}
  drawDays(y,m,animate||changed);
  const t=monthTarget(y,m),st=monthStats(y,m),saldo=displaySaldo(y,m),payout=Number(data.hourPayouts?.[monthKey(y,m)]||0),adj=Number(data.adjustments?.[monthKey(y,m)]||0),total=carryAt(y,m);
  const ist=t?(saldo!==null?t.target+saldo:st.total):st.total;
  setProgress(t&&t.target>0?ist/t.target:null,animate||changed);
  /* Mitte */
  hrs.replaceChildren();
  if(t){const a=el('span',null,'<b>'+fmtHours(ist)+'</b> / '+fmtHours(t.target)+' h');hrs.append(a);if(saldo!==null){const pl=el('span','sv-pill '+(saldo>=0.05?'pos':saldo<=-0.05?'neg':''),displaySaldoText(saldo));hrs.append(pl)}}
  else hrs.append(el('span',null,'<b>'+fmtHours(st.total)+' h</b> · kein Soll'));
  if(!salaryOn()){eyebrow.textContent='Arbeitszeit';cancelAnimationFrame(raf);amount.textContent=fmtHours(ist)+' h';info.textContent=t?Math.round(ist/t.target*100)+' % vom Monatssoll':'Monatssoll fehlt';more.hidden=true;hrs.hidden=!t||saldo===null;if(!hrs.hidden){hrs.replaceChildren(el('span',null,'Saldo'),el('span','sv-pill '+(saldo>=0.05?'pos':saldo<=-0.05?'neg':''),displaySaldoText(saldo)))}}
  else{hrs.hidden=false;syncCenter()}
  center.setAttribute('aria-label',(salaryOn()?'Gehaltsdetails öffnen: ':'')+eyebrow.textContent+' '+amount.textContent);
  /* Legende */
  legend.replaceChildren();const counts={};for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const c=data.shifts?.[dateKey(y,m,d)];if(c)counts[c]=(counts[c]||0)+1}
  const keys=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  if(!keys.length){const h=el('div','sv-hint','Noch keine Dienste in diesem Monat – im Kalender eintragen');legend.append(h)}
  for(const c of keys){const ch=el('span','sv-chip');const dot=el('i');dot.style.background=ringColor(c);ch.append(dot,document.createTextNode(shiftTitle(c)+' '),el('b',null,'×'+counts[c]));legend.append(ch)}
  /* Kacheln */
  if(subs.work){subs.work.textContent=st.credit>0?'+ '+fmtHours(st.credit)+' h Gutschrift':'aus geplanten Diensten';workBar.firstChild.style.width=(t&&t.target>0?Math.min(100,st.worked/t.target*100):0)+'%'}
  if(subs.target)subs.target.textContent=t?(t.manual?'manuell festgelegt':'automatisch berechnet'):'Wochenstunden fehlen';
  const balEm=byPanel.balance?.querySelector('em');if(balEm){const v=total?total.sum:null;balEm.classList.toggle('pos',v!==null&&v>=0.05);balEm.classList.toggle('neg',v!==null&&v<=-0.05)}
  if(subs.balance)subs.balance.textContent=saldo===null?'gesamt':'Monat '+displaySaldoText(saldo===null?null:saldo-payout);
  for(const id of ['schRingPayout','schRingAdjust']){const e=$(id);if(e&&/^[-+]?0,0 h$/.test(e.textContent))e.textContent='0 h'}
  if(subs.payout)subs.payout.textContent='diesen Monat';
  if(subs.adjust)subs.adjust.textContent='diesen Monat';
  if(subs.history){spark.replaceChildren();const vals=[];for(let b=5;b>=0;b--){const d=new Date(y,m-b,1),yy=d.getFullYear(),mm=d.getMonth();const sd=displaySaldo(yy,mm);vals.push({v:sd===null?null:sd-Number(data.hourPayouts?.[monthKey(yy,mm)]||0),cur:b===0,label:d.toLocaleDateString('de-DE',{month:'short'})})}
   const max=Math.max(4,...vals.map(x=>Math.abs(x.v||0)));
   for(const x of vals){const sp=el('span',x.cur?'cur':'');const bar=el('i',x.v!==null&&x.v<0?'neg':'');const h=x.v===null?0:Math.max(3,Math.abs(x.v)/max*50);bar.style.height=h+'%';if(x.v!==null&&x.v<0)bar.style.top='50%';else bar.style.bottom='50%';sp.title=x.label+': '+(x.v===null?'–':displaySaldoText(x.v));sp.style.color=x.v!==null&&x.v<0?'var(--sv-neg)':'var(--sv-pos)';sp.append(bar);spark.append(sp)}
   const known=vals.filter(x=>x.v!==null).length;subs.history.textContent=known?'Saldo der letzten '+(known>1?known+' Monate':'Monate'):'noch keine Monate erfasst'}
 }
 let pending=0,wantAnim=false;
 function schedule(anim){wantAnim=wantAnim||anim;cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{if(!document.getElementById('hoursPanel').classList.contains('hidden')){update(wantAnim)}else lastKey='';wantAnim=false})}

 /* Monat wechseln */
 function goMonth(dir){buzz();if(dir===null){shown=new Date();shown.setDate(1)}else shown=new Date(shown.getFullYear(),shown.getMonth()+dir,1);
  wheel.style.setProperty('--sv-dx',dir===null?'0px':(dir>0?'30px':'-30px'));wheel.classList.remove('sv-swap');void wheel.offsetWidth;if(!reduce)wheel.classList.add('sv-swap');
  renderStatsOnly()}
 prev.onclick=()=>goMonth(-1);next.onclick=()=>goMonth(1);

 /* Tippen auf Tage + Wischen */
 let sx=0,sy=0,moved=false;
 wheel.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;moved=false},{passive:true});
 wheel.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10)moved=true},{passive:true});
 wheel.addEventListener('pointerup',e=>{const dx=e.clientX-sx,dy=e.clientY-sy;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4&&!e.target.closest('.sv-tip')){goMonth(dx<0?1:-1);return}
  if(moved||e.target.closest('.sch-wheel-center')||e.target.closest('.sv-tip'))return;
  const r=s.getBoundingClientRect(),k=320/r.width,px=(e.clientX-r.left)*k-C,py=(e.clientY-r.top)*k-C,dist=Math.hypot(px,py);
  if(dist<RP-14||dist>RD+26){hideTip();return}
  const y=shown.getFullYear(),m=shown.getMonth(),n=new Date(y,m+1,0).getDate();let ang=Math.atan2(py,px)*180/Math.PI+90;if(ang<0)ang+=360;const d=Math.min(n,Math.floor(ang/(360/n))+1);
  if(sel===d){hideTip();return}
  hideTip();sel=d;buzz();const p=gDays.querySelector('[data-d="'+d+'"]');if(p)p.classList.add('sv-sel');gDays.classList.add('sv-dim');
  const di=dayInfo(y,m,d),date=new Date(y,m,d,12);
  tip.innerHTML='<b>'+date.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'})+'</b>'+(di.code?'<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+di.color+';opacity:1"></i>'+di.title+'</span>':'<span>Kein Dienst</span>')+(di.time?'<br><i>'+di.time+'</i>':'')+'<br><i>Im Kalender öffnen ›</i>';
  tip.dataset.k=di.k;const [tx,ty]=pt(RD,(d-.5)*(360/n));const wpx=r.width/320;tip.style.left=Math.min(r.width-80,Math.max(80,tx*wpx))+'px';tip.style.top=(ty*wpx-8)+'px';
  tip.classList.add('show');clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,4500)});
 tip.addEventListener('click',()=>{const k=tip.dataset.k;hideTip();if(!k)return;const [yy,mm]=k.split('-').map(Number);shown=new Date(yy,mm-1,1);tab('plan')});
 document.addEventListener('pointerdown',e=>{if(!wheel.contains(e.target))hideTip()},{passive:true});
 center.addEventListener('click',buzz);

 /* Einstiegsanimation beim Öffnen des Tabs */
 function enter(){if(reduce)return;tiles.querySelectorAll('.sv-tile').forEach((t,i)=>{t.classList.remove('sv-anim');void t.offsetWidth;t.style.animationDelay=(120+i*55)+'ms';t.classList.add('sv-anim')});shownAmount=null}
 document.getElementById('tabHours')?.addEventListener('click',()=>{enter();lastKey='';schedule(true)});

 /* Einhängen in bestehende Aktualisierung */
 const oldStats=renderStatsOnly;renderStatsOnly=function(){oldStats.apply(this,arguments);schedule(false)};
 const oldRender=render;render=function(){oldRender.apply(this,arguments);schedule(false)};
 schedule(true);
})();
