/* v1.0.53: Auswertung – aufgeräumte Gehaltskarte und neues Fenster „Gehalt anpassen“ */
(function(){
 const P=window.SchivioPay;const dash=document.querySelector('#hoursPanel .sch-dashboard');if(!P||!dash)return;
 const eur=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});const num=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:1});
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 /* v1.0.80: Zulagen passend zur Berufsgruppe. Werte anderer Berufsgruppen bleiben gespeichert,
    werden aber ausgeblendet und nicht mitgerechnet (beim Zurückwechseln sind sie wieder da). */
 const DEF={wechsel:['Wechselschichtzulage',/wechselschicht/i],schicht:['Schichtzulage',/^schichtzulage/i],pflege1:['Pflegezulage',/pflegezulage/i],pflege2:['Pflegezulage II',null],praxis:['Praxisanleiterzulage',null],leistung:['Leistungszulage',null],stelle:['Stellenzulage',null],
  polizei:['Polizeizulage',null],feuerwehr:['Feuerwehrzulage',null],familie:['Familienzuschlag',null],erschwer:['Erschwerniszulage',null],sonstige:['Sonstige Zulage',null]};
 const BY={pflege:'wechsel schicht pflege1 pflege2 praxis leistung stelle sonstige',alten:'wechsel schicht pflege1 praxis leistung stelle sonstige',rettung:'wechsel schicht praxis leistung stelle sonstige',arzt:'wechsel schicht leistung stelle sonstige',
  hebamme:'wechsel schicht praxis leistung stelle sonstige',mtr:'wechsel schicht leistung stelle sonstige',mfa:'leistung stelle sonstige',polizei:'polizei familie wechsel schicht erschwer sonstige',feuerwehr:'feuerwehr familie wechsel schicht erschwer sonstige',
  beamte:'familie stelle wechsel schicht erschwer sonstige',sonst:'wechsel schicht leistung stelle sonstige'};
 const JOBS=[['pflege','Pflege'],['alten','Altenpflege'],['rettung','Rettungsdienst'],['arzt','Ärztin / Arzt'],['polizei','Polizei'],['hebamme','Hebamme'],['mtr','MTRA / MTA'],['feuerwehr','Feuerwehr'],['mfa','MFA'],['sonst','Sonstiges']];
 const isBeamte=()=>{const t=String(data.profile?.tariff||data.setupOptions?.tariff||'');return t==='beamte'||/beamte/i.test(t)};
 function job(){const p=data.setupOptions?.profession||'';if(isBeamte()&&(!BY[p]||p==='sonst'))return 'beamte';return BY[p]?p:'sonst'}
 const jobName=()=>{const j=job();return j==='beamte'?'Beamte (Kommune)':(JOBS.find(x=>x[0]===j)||[])[1]||'Sonstiges'};
 /* Beamte bekommen zusätzlich den Familienzuschlag angeboten */
 const ALLOW_LIST=()=>{let l=BY[job()].split(' ');if(isBeamte()&&!l.includes('familie'))l.splice(l.length-1,0,'familie');return l.map(k=>[k,DEF[k][0],DEF[k][1]])};
 let ALLOW=ALLOW_LIST();
 /* v1.0.81: Polizei- und Feuerwehrzulage je Dienstherr – Betrag nach 2 Dienstjahren (Quelle: dbb-Besoldungstabellen, Stand siehe Datum).
    NRW: Polizei ab A 9, Feuerwehr A 7/A 8. Werte mit Datum in der Zukunft/„Entwurf“ beim dbb: BY, HB, HE, NW. */
 const POLFW={bund:[228,190,'05/2026','Bund'],bw:[132.69,132.69,'04/2026','Baden-Württemberg'],by:[191.52,191.52,'10/2026','Bayern'],be:[177.27,177.27,'04/2026','Berlin'],bb:[200,200,'01/2026','Brandenburg'],
  hb:[127.38,150,'04/2026','Bremen'],hh:[170,170,'04/2026','Hamburg'],he:[160,160,'07/2026','Hessen'],mv:[159.37,159.37,'04/2026','Mecklenburg-Vorpommern'],ni:[127.38,133.75,'04/2026','Niedersachsen'],
  nw:[130.56,132.16,'04/2026','Nordrhein-Westfalen'],rp:[180,180,'04/2026','Rheinland-Pfalz'],sl:[135.14,160.14,'11/2024','Saarland'],sn:[150,150,'04/2026','Sachsen'],st:[152.86,152.86,'04/2026','Sachsen-Anhalt'],
  sh:[184.02,184.02,'01/2026','Schleswig-Holstein'],th:[145,145,'02/2025','Thüringen']};
 function polfw(){const d=data.individualPay?.duzPreset;const k=d==='bund'?'bund':String(data.profile?.state||data.setupOptions?.region||'').toLowerCase();return POLFW[k]||null}
 const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const card=document.createElement('section');card.id='gpCard';
 const anchor=document.getElementById('schSimpleSections')||dash;anchor.insertAdjacentElement(anchor.id==='schSimpleSections'?'beforebegin':'afterend',card);
 function allowSum(){ALLOW=ALLOW_LIST();const c=data.salaryAllowances||{};return ALLOW.reduce((a,[k])=>a+(c[k]?.enabled?Number(c[k].value)||0:0),0)}
 function hintAmount(label){const r=P.compute(shown.getFullYear(),shown.getMonth());for(const [l,v] of (r.hints||[])){if(label&&label.test(l)){const m=/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/.exec(v);if(m)return Number(m[1].replace(/\./g,'').replace(',','.'))}}return null}
 function draw(){const enabled=!!data.setupOptions?.salaryEnabled;card.hidden=!enabled;if(!enabled)return;
  const y=shown.getFullYear(),m=shown.getMonth();const r=P.compute(y,m);
  if(!(r.base>0)){card.innerHTML='<p class="gp-eyebrow">Gehalt im '+MONTHS[m]+'</p><div class="gp-warn">'+esc(r.reason||'Für diesen Monat ist keine Berechnung möglich.')+'</div><button class="gp-btn" type="button" data-gp-open>Gehalt anpassen</button>';card.querySelector('[data-gp-open]').onclick=open;return}
  const base=r.base,al=Math.round(allowSum()*100)/100,zu=r.zuschlag?.total||0,tot=base+al+zu;
  const lines=(r.zuschlag?.lines||[]).filter(x=>x.euro>0);
  const short=l=>l.replace(/s?arbeit\b/,'').replace(/ \(.*$/,'').replace('24./31.12.','24./31. Dez.');
  const sub=r.tariffId==='individual'?'Eigene Werte':r.tariff?.beamte?'Besoldung':[r.tariff?.name?.replace(/ \(.*\)$/,''),r.info].filter(Boolean).join(' · ');
  const warns=(r.notes||[]).filter(n=>/nicht (hinterlegt|berechnet)|bitte mit/i.test(n));
  const w=v=>tot>0?Math.max(0,v/tot*100).toFixed(2)+'%':'0';
  card.innerHTML='<p class="gp-eyebrow">Brutto-Prognose '+MONTHS[m]+' '+y+'</p><div class="gp-total">'+eur(tot)+'</div>'+
   '<div class="gp-bar" aria-hidden="true"><i style="width:'+w(base)+'"></i><i style="width:'+w(al)+'"></i><i style="width:'+w(zu)+'"></i></div>'+
   '<button class="gp-row" type="button" data-gp-open><i class="gp-dot"></i><span>Grundgehalt<small>'+esc(sub)+'</small></span><b>'+eur(base)+'</b></button>'+
   '<button class="gp-row" type="button" data-gp-open><i class="gp-dot"></i><span>Zulagen<small>'+(al>0?'feste Beträge pro Monat':'noch keine eingetragen')+'</small></span><b>'+eur(al)+'</b></button>'+
   '<button class="gp-row" type="button" id="gpZuToggle" aria-expanded="false"'+(lines.length?'':' disabled')+'><i class="gp-dot"></i><span>Zuschläge<small>'+(lines.length?'für Nacht, Wochenende & Feiertage':'keine in diesem Monat')+'</small></span><b>'+eur(zu)+'</b>'+(lines.length?'<em class="gp-chev">▾</em>':'')+'</button>'+
   '<div class="gp-sub" id="gpZuLines" hidden>'+lines.map(x=>'<div><span>'+esc(short(x.label))+'<em>'+num(x.hours)+' Std.</em></span><b>'+eur(x.euro)+'</b></div>').join('')+'</div>'+
   warns.map(n=>'<div class="gp-warn">'+esc(n)+'</div>').join('')+
   '<button class="gp-btn" type="button" data-gp-open>Gehalt anpassen</button>'+
   '<details class="gp-how"><summary>Wie wird gerechnet?</summary><ul>'+(r.notes||[]).filter(n=>!warns.includes(n)).map(n=>'<li>'+esc(n)+'</li>').join('')+'<li>Prognose aus deinen eingetragenen Diensten – keine verbindliche Abrechnung.</li></ul></details>';
  card.querySelectorAll('[data-gp-open]').forEach(b=>b.onclick=open);
  const t=card.querySelector('#gpZuToggle');if(t&&lines.length)t.onclick=()=>{const o=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',o);card.querySelector('#gpZuLines').hidden=!o}}
 // Fenster „Gehalt anpassen“
 const sheet=document.createElement('div');sheet.id='gpSheet';sheet.hidden=true;sheet.innerHTML='<div class="gp-panel" role="dialog" aria-modal="true" aria-label="Gehalt anpassen"></div>';document.body.append(sheet);
 const panel=sheet.querySelector('.gp-panel');
 const parse=v=>{const t=String(v).trim().replace(/\s|€|%/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');return t===''?0:Number(t)};
 function setAllow(k,v){data.salaryAllowances=data.salaryAllowances||{};data.salaryAllowances[k]={enabled:v>0,value:v};persist();render()}
 function opt(group,val,title,sub,cur,fn){const b=document.createElement('button');b.type='button';b.className='gp-opt'+(val===cur?' sel':'');b.innerHTML='<i></i><span>'+esc(title)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>';b.onclick=()=>{group.querySelectorAll('.gp-opt').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');fn(val)};group.append(b)}
 function field(label,key,ph,type){const l=document.createElement('label');l.className='gp-field';const s=document.createElement('span');s.textContent=label;const i=document.createElement('input');i.type=type||'text';if(!type)i.inputMode='decimal';i.placeholder=ph||'';const v=(data.individualPay||{})[key];i.value=v===undefined||v===''?'':(type?v:String(v).replace('.',','));
  i.onchange=()=>{data.individualPay=data.individualPay||{};data.individualPay[key]=type==='time'?i.value:(i.value.trim()===''?'':parse(i.value));persist();render()};l.append(s,i);return l}
 function build(){const r=P.compute(shown.getFullYear(),shown.getMonth());const T=r.tariff;panel.replaceChildren();
  panel.insertAdjacentHTML('beforeend','<div class="gp-grab"></div><h2>Gehalt anpassen</h2><p class="gp-hint">Änderungen werden sofort übernommen.</p>');
  // eigenes Gehalt (Individuell / Beamte)
  if(T?.beamte){panel.insertAdjacentHTML('beforeend','<h3>Besoldung</h3><p class="gp-hint">Grundgehalt laut Bezügemitteilung und die Stundensätze für Dienst zu ungünstigen Zeiten.</p>');
   panel.append(field('Grundgehalt (brutto)','monthly','z. B. 3.600'));const ip=data.individualPay||{};const l=document.createElement('label');l.className='gp-field';l.innerHTML='<span>Sätze von</span>';const s=document.createElement('select');s.innerHTML=Object.entries(P.DUZ).map(([k,v])=>'<option value="'+k+'">'+esc(v.name.replace(/ \(.*\)$/,''))+'</option>').join('');s.value=P.DUZ[ip.duzPreset]?ip.duzPreset:'bund';
   s.onchange=()=>{data.individualPay=data.individualPay||{};data.individualPay.duzPreset=s.value;['duzSun','duzSat','duzNight'].forEach(k=>delete data.individualPay[k]);persist();render();build()};l.append(s);panel.append(l);
   const D=P.DUZ[s.value]||P.DUZ.bund;const ph=v=>v?String(v.toFixed(2)).replace('.',',')+' €':'€ je Std.';panel.append(field('Sonn- & Feiertag (€/Std.)','duzSun',ph(D.sun)),field('Samstag 13–20 Uhr (€/Std.)','duzSat',ph(D.sat)),field('Nacht 20–6 Uhr (€/Std.)','duzNight',ph(D.night)))}
  else if(T?.individual){panel.insertAdjacentHTML('beforeend','<h3>Dein Gehalt</h3><p class="gp-hint">Monatsgehalt und Zuschlagssätze findest du auf deiner Gehaltsabrechnung oder im Arbeitsvertrag.</p>');
   panel.append(field('Monatsgehalt (brutto)','monthly','z. B. 3.500'),field('Nachtzuschlag (%)','night','z. B. 20'),field('Sonntagszuschlag (%)','sunday','z. B. 25'),field('Feiertagszuschlag (%)','holiday','z. B. 35'),field('Samstagszuschlag (%)','saturday','0'),field('Nacht ab','nightFrom','21:00','time'),field('Nacht bis','nightTo','06:00','time'))}
  // Zulagen
  ALLOW=ALLOW_LIST();
  panel.insertAdjacentHTML('beforeend','<h3>Deine Zulagen</h3><p class="gp-hint">Feste Beträge, die jeden Monat auf deiner Abrechnung stehen. Passend zu deiner Berufsgruppe <b>'+esc(jobName())+'</b> – ändern unter Mehr › Tarif &amp; Eingruppierung.</p>');
  const list=document.createElement('div');panel.append(list);const chips=document.createElement('div');chips.className='gp-chips';
  const c=data.salaryAllowances||{};const shownKeys=ALLOW.filter(([k])=>c[k]?.enabled&&Number(c[k].value)>0||sheet.dataset['add_'+k]);
  shownKeys.forEach(([k,label])=>{const row=document.createElement('div');row.className='gp-al';const s=document.createElement('span');s.textContent=label;const i=document.createElement('input');i.type='text';i.inputMode='decimal';i.placeholder='0,00 €';const v=Number(c[k]?.value)||0;i.value=v?String(v).replace('.',','):'';
   i.onchange=()=>{const n=parse(i.value);if(!Number.isFinite(n)||n<0||n>5000){i.value='';return}setAllow(k,n)};const x=document.createElement('button');x.type='button';x.className='gp-x';x.setAttribute('aria-label',label+' entfernen');x.textContent='×';x.onclick=()=>{delete sheet.dataset['add_'+k];setAllow(k,0);build()};row.append(s,i,x);list.append(row);if(sheet.dataset['add_'+k]==='focus'){sheet.dataset['add_'+k]='1';setTimeout(()=>i.focus(),50)}});
  const pf=polfw();
  ALLOW.filter(x=>!shownKeys.includes(x)).forEach(([k,label,re])=>{const amt=k==='polizei'&&pf?pf[0]:k==='feuerwehr'&&pf?pf[1]:re?hintAmount(re):null;const b=document.createElement('button');b.type='button';b.className='gp-chip';b.textContent='+ '+label+(amt?' · '+eur(amt).replace(',00',''):'');
   b.onclick=()=>{if(amt){setAllow(k,amt)}else sheet.dataset['add_'+k]='focus';build()};chips.append(b)});
  if(!shownKeys.length)list.insertAdjacentHTML('beforeend','<p class="gp-hint" style="margin:0 0 4px">Noch keine Zulagen eingetragen. Tippe unten auf eine Zulage, um sie hinzuzufügen.</p>');
  panel.append(chips);
  {const pk=ALLOW.find(x=>x[0]==='polizei'||x[0]==='feuerwehr');if(pk)panel.insertAdjacentHTML('beforeend','<p class="gp-hint" style="margin-top:10px">'+(pf?esc(pk[1])+' '+esc(pf[3])+': '+eur(pk[0]==='polizei'?pf[0]:pf[1])+' nach zwei Dienstjahren (Stand '+pf[2]+(pf[3]==='Nordrhein-Westfalen'?(pk[0]==='polizei'?', ab A 9':', A 7/A 8'):'')+'). Im ersten Dienstjahr gibt es meist die Hälfte, davor nichts. Maßgeblich ist deine Bezügemitteilung.':'Für den Vorschlag zur '+esc(pk[1])+' bitte Bundesland oder „Sätze von: Bund“ wählen.')+'</p>')}
  {const keys=ALLOW.map(x=>x[0]);const hid=Object.entries(c).filter(([k,v])=>!keys.includes(k)&&v?.enabled&&Number(v.value)>0).map(([k])=>DEF[k]?DEF[k][0]:k);
   if(hid.length)panel.insertAdjacentHTML('beforeend','<p class="gp-hint" style="margin-top:10px">Ausgeblendet, weil sie nicht zu deiner Berufsgruppe passen: '+esc(hid.join(', '))+'. Sie werden nicht mitgerechnet und sind wieder da, wenn du die Berufsgruppe zurückstellst.</p>')}
  if(!T?.individual&&(r.hints||[]).length)panel.insertAdjacentHTML('beforeend','<p class="gp-hint" style="margin-top:10px">Vorschläge mit Betrag stammen aus deinem Tarif. Trag nur ein, was dir laut Abrechnung zusteht.</p>');
  // Dienste
  if(!T?.beamte){panel.insertAdjacentHTML('beforeend','<h3>Wie arbeitest du?</h3><p class="gp-hint">Davon hängen einige Zuschläge ab.</p>');const g=document.createElement('div');g.className='gp-seg';panel.append(g);const cur=r.settings?.shiftModel||'wechsel';
   const set=v=>{data.payShiftModel=v;persist();render()};opt(g,'wechsel','Wechselschicht mit Nachtdiensten','Früh, Spät und Nacht im Wechsel',cur,set);opt(g,'schicht','Schichten ohne Nachtdienste','z. B. nur Früh und Spät',cur,set);opt(g,'none','Keine Schichtarbeit','feste Arbeitszeiten',cur,set)}
  // Feiertag
  if(T&&!T.individual&&r.tariff?.rates&&r.tariff.rates.holidayNoComp!==r.tariff.rates.holidayComp){panel.insertAdjacentHTML('beforeend','<h3>Arbeit an Feiertagen</h3><p class="gp-hint">Bekommst du für einen Feiertagsdienst später einen freien Tag zurück? Das ist der Normalfall.</p>');
   const g=document.createElement('div');g.className='gp-seg';panel.append(g);const cur=data.tariffHolidayMode==='no-comp'?'no-comp':'comp';const set=v=>{data.tariffHolidayMode=v;persist();render()};
   opt(g,'comp','Ja, ich bekomme einen freien Tag','Normalfall',cur,set);opt(g,'no-comp','Nein, es gibt nur Geld','dann ist der Feiertagszuschlag deutlich höher',cur,set)}
  const done=document.createElement('button');done.type='button';done.className='gp-done';done.textContent='Fertig';done.onclick=close;panel.append(done)}
 function open(){Object.keys(sheet.dataset).forEach(k=>delete sheet.dataset[k]);build();sheet.hidden=false;document.body.classList.add('modal-open');requestAnimationFrame(()=>sheet.classList.add('show'))}
 function close(){sheet.classList.remove('show');setTimeout(()=>{sheet.hidden=true;document.body.classList.remove('modal-open')},250)}
 sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
 {const bg=()=>{const op=c=>c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c);const cb=getComputedStyle(document.body).backgroundColor,ch=getComputedStyle(document.documentElement).backgroundColor;panel.style.background=op(cb)?cb:(op(ch)?ch:'#1d1e21')};const o=open;open=function(){bg();o()}}
 // Kreis-Mitte öffnet das neue Fenster statt des alten
 document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.sch-wheel-center')&&data.setupOptions?.salaryEnabled){e.stopPropagation();e.preventDefault();open()}},true);
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('.sch-wheel-center')&&data.setupOptions?.salaryEnabled){e.stopPropagation();e.preventDefault();open()}},true);
 const oldRender=render;render=function(){oldRender();draw()};const oldStats=renderStatsOnly;renderStatsOnly=function(){oldStats();draw()};draw();
 window.SchivioPayCard={open,draw};
 window.SchivioAllow={JOBS,job,jobName,count:()=>{const c=data.salaryAllowances||{};return ALLOW_LIST().filter(([k])=>c[k]?.enabled&&Number(c[k].value)>0).length},sum:allowSum};
})();
