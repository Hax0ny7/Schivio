const $=id=>document.getElementById(id), key='schivio-v01';
let data;try{data=JSON.parse(localStorage.getItem(key))||{}}catch{data={}}
const validPalettes=['anthracite','light','emerald','blue','violet','amber','teal','rose'];
function applyPalette(palette){const chosen=validPalettes.includes(palette)?palette:'anthracite';document.body.dataset.theme=chosen;document.querySelectorAll('.theme-option').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.palette===chosen)));const mode=chosen==='anthracite'?'anthracite':chosen==='light'?'light':'colored';document.querySelectorAll('[data-mode]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.mode===mode)));document.getElementById('themeColorPicker')?.classList.toggle('hidden',mode!=='colored');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',({anthracite:'#1c1e21',light:'#ffffff',emerald:'#03110d',blue:'#030c17',violet:'#0c0816',amber:'#110d07',teal:'#030f11',rose:'#12080f'})[chosen]);}
applyPalette(data.palette);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{data.palette=btn.dataset.mode==='colored'?(validPalettes.includes(data.lastColor)&&!['light','anthracite'].includes(data.lastColor)?data.lastColor:'emerald'):btn.dataset.mode;applyPalette(data.palette);persist()}));document.querySelectorAll('.theme-option').forEach(btn=>btn.addEventListener('click',()=>{data.palette=btn.dataset.palette;data.lastColor=data.palette;applyPalette(data.palette);persist()}));
(function initOnboarding(){const overlay=document.getElementById('themeOnboarding');let choice='anthracite',color='emerald';function draw(){document.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===choice)));document.getElementById('onboardingColors').classList.toggle('hidden',choice!=='emerald');document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===color)))}overlay.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{choice=b.dataset.choice;draw()}));overlay.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{color=b.dataset.color;choice='emerald';draw()}));document.getElementById('onboardingConfirm').addEventListener('click',()=>{data.palette=choice==='emerald'?color:choice;if(choice==='emerald')data.lastColor=color;data.themeOnboardingDone=true;applyPalette(data.palette);persist();overlay.classList.add('hidden')});draw();if(!data.themeOnboardingDone){overlay.classList.remove('hidden')}})();
data.shifts||={};data.profile||={};data.adjustments||={};data.monthTargets||={};data.hourPayouts||={};data.openingBalance??=0;data.hours||={F:7.7,S:7.7,N:9,X:7.7};
const defaults={F:{start:'06:00',end:'14:12',break:30},S:{start:'13:48',end:'22:00',break:30},N:{start:'21:00',end:'06:30',break:30},X:{start:'08:00',end:'16:12',break:30}};
const types=['F','S','N','X'],labels={F:'Früh',S:'Spät',N:'Nacht',U:'Urlaub',K:'Krank',X:'Dienst',T:'Fortb.',A:'Ausgl.'};
const defaultColors={F:'#176f68',S:'#493078',N:'#620b0b',X:'#28536c',U:'#3e7653',K:'#824657',T:'#33658b',A:'#556477'};
function shiftTitle(code){return data.customShifts?.[code]?.name||data.shiftMeta?.[code]?.name||labels[code]||code}
function shiftColor(code){return data.customShifts?.[code]?.color||data.shiftMeta?.[code]?.color||defaultColors[code]||'#36536a'}
function displayShiftColor(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
if(data.shiftIntensity!=='subtle'){const target=Math.max(...rgb);return toHex(rgb.map(v=>Math.min(255,v*1.24+(v===target?15:0))))}
/* Dezent: Farbton bleibt, Sättigung und Helligkeit werden einheitlich gedämpft */
const [r,g,b]=rgb.map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l0=(mx+mn)/2,d=mx-mn;let h=0,s0=0;if(d){s0=d/(1-Math.abs(2*l0-1));h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}
const light=document.body&&document.body.dataset.theme==='light';const s1=Math.min(s0*.45,.3),l1=light?.85:.33;const c=(1-Math.abs(2*l1-1))*s1,x=c*(1-Math.abs((h/60)%2-1)),m0=l1-c/2;const [r1,g1,b1]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return toHex([r1+m0,g1+m0,b1+m0].map(v=>v*255))}
function updateIntensityUI(){document.querySelectorAll('[data-intensity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.intensity===(data.shiftIntensity||'vivid'))))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-intensity]');if(!b)return;data.shiftIntensity=b.dataset.intensity;persist();updateIntensityUI();renderCalendarMonths()});
function contrastColor(hex){if(!/^#[0-9a-f]{6}$/i.test(hex))return '#fff';const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722>.32?'#172027':'#fff'}
function mins(t){const v=/^(\d\d):(\d\d)$/.exec(t||'');return v?Number(v[1])*60+Number(v[2]):NaN}
function duration(t){let a=mins(t.start),b=mins(t.end),pause=Number(t.break);if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(pause)||pause<0||pause>180)return NaN;let gross=(b-a+1440)%1440;if(gross===0)gross=1440;return pause<gross?(gross-pause)/60:NaN}
function migrate(){data.templates||={};for(const type of types){if(!data.templates[type]){const d={...defaults[type]};const old=Number(data.hours[type]);if(Number.isFinite(old)&&old>=0&&old<=23.5){let total=Math.round(old*60)+d.break;let end=(mins(d.start)+total)%1440;d.end=`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`}data.templates[type]=d}}}
migrate();
data.completedMonths=(data.completedMonths&&typeof data.completedMonths==='object'&&!Array.isArray(data.completedMonths))?data.completedMonths:{};
function persist(){try{localStorage.setItem(key,JSON.stringify(data));return true}catch(e){alert('Speichern nicht möglich: Browser-Speicher blockiert oder voll.');return false}}
let selectedShift='',shown=new Date(),selectionStart='',selectionEnd='',dragging=false,activePointer=null;shown.setDate(1);
const pad=n=>String(n).padStart(2,'0'),dateKey=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
function daysBetween(a,b){let first=a<=b?a:b,last=a<=b?b:a,keys=[];let t=new Date(first+'T12:00:00'),stop=new Date(last+'T12:00:00');while(t<=stop){keys.push(dateKey(t.getFullYear(),t.getMonth(),t.getDate()));t.setDate(t.getDate()+1)}return keys}

// Feiertage: bundesweite und landesweite gesetzliche Feiertage. Kommunale Sonderfälle
// (z.B. Augsburger Friedensfest) und sächsische Fronleichnamsgebiete sind nicht enthalten.
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;return new Date(y,Math.floor(n/31)-1,n%31+1,12)}
function holidaySet(y,state){const h=new Set();const add=(m,d)=>h.add(dateKey(y,m-1,d));const move=(offset)=>{const t=easter(y);t.setDate(t.getDate()+offset);h.add(dateKey(t.getFullYear(),t.getMonth(),t.getDate()))};
add(1,1);move(-2);move(1);add(5,1);move(39);move(50);add(10,3);add(12,25);add(12,26);
if(['BW','BY','ST'].includes(state))add(1,6);
if(['BE','MV'].includes(state))add(3,8);
if(['BW','BY','HE','NW','RP','SL'].includes(state))move(60);
if(['SL','BY'].includes(state))add(8,15); // BY: nur Gemeinden mit überwiegend katholischer Bevölkerung
if(['BB','MV','SN','ST','TH','HB','HH','NI','SH'].includes(state))add(10,31);
if(['BW','BY','NW','RP','SL'].includes(state))add(11,1);
if(state==='SN'){const d=new Date(y,10,23,12);d.setDate(23-((d.getDay()+4)%7));h.add(dateKey(y,10,d.getDate()))}
if(state==='TH')add(9,20);
if(state==='BB'){move(0);move(49)}
return h}
function workdayList(){const w=String(data.profile?.workdays||'5');if(w==='6')return [1,2,3,4,5,6];const mt=/^m:([0-6]{1,7})$/.exec(w);if(mt){const l=[...new Set(mt[1].split('').map(Number))].sort();if(l.length)return l}return [1,2,3,4,5]}
function monthTarget(y,m){const manual=Number(data.monthTargets?.[dateKey(y,m,1).slice(0,7)]);const hasManual=Object.prototype.hasOwnProperty.call(data.monthTargets||{},dateKey(y,m,1).slice(0,7))&&Number.isFinite(manual)&&manual>=0&&manual<=300;const weekly=Number(data.profile.weekly),wdl=workdayList(),workdays=wdl.length,state=data.profile.state||'NW';const fixed=Number(data.profile.fixedMonthlyTarget),hasFixed=Number.isFinite(fixed)&&fixed>0&&fixed<=300;if(!(weekly>0&&weekly<=60)&&!hasManual&&!hasFixed)return null;const holidays=holidaySet(y,state),days=new Date(y,m+1,0).getDate();let planned=0,holidayCount=0;for(let d=1;d<=days;d++){const wd=new Date(y,m,d,12).getDay();if(wdl.includes(wd)){const k=dateKey(y,m,d);if(holidays.has(k))holidayCount++;else planned++}}return {target:hasManual?manual:(hasFixed?fixed:planned*weekly/workdays),days:planned,holidays:holidayCount,weekly:hasFixed?fixed*workdays/Math.max(planned,1):weekly,workdays,manual:hasManual}}
function monthStats(y,m){let worked=0,credit=0,absence=0;const target=monthTarget(y,m),holidays=holidaySet(y,data.profile.state||'NW');const wdl=workdayList(),workdays=wdl.length;for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const k=dateKey(y,m,d),t=data.shifts[k];if(types.includes(t))worked+=duration(data.templates[t])||0;else if(data.customShifts?.[t])worked+=data.customShifts[t].bd?.stage==='RB'?(Number(data.rbWork?.[k])||0):(duration(data.customShifts[t])||0);else if(['U','K','T'].includes(t)){const wd=new Date(y,m,d,12).getDay();if(target&&wdl.includes(wd)&&!holidays.has(k)){credit+=target.weekly/workdays;absence++}}}return {worked,credit,absence,total:worked+credit+Number(data.adjustments[dateKey(y,m,1).slice(0,7)]||0)}}
function monthHours(y,m){return monthStats(y,m).total}
function fmtHours(n){return n.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})}
function monthKey(y,m){return dateKey(y,m,1).slice(0,7)}
function isComplete(y,m){return monthKey(y,m)<monthKey(new Date().getFullYear(),new Date().getMonth())}
function hasEntriesOrComplete(y,m){return monthHasEntries(y,m)||Object.prototype.hasOwnProperty.call(data.monthTargets||{},monthKey(y,m))||Number(data.hourPayouts?.[monthKey(y,m)]||0)!==0}
function displaySaldo(y,m){const t=monthTarget(y,m);if(!t)return null;if(!hasEntriesOrComplete(y,m))return null;return monthHours(y,m)-t.target}
function displaySaldoText(value){return value===null?'–':(value>=0?'+':'')+fmtHours(value)+' h'}
function monthHasEntries(y,m){const prefix=dateKey(y,m,1).slice(0,7);return Object.keys(data.shifts).some(k=>k.startsWith(prefix))||Object.prototype.hasOwnProperty.call(data.adjustments,prefix)}
function carryAt(y,m){
  // Nur Monate mit Plan-/Korrekturdaten einbeziehen.
  // Ein leerer Monat wird nicht als vollständiger Dienstplan interpretiert.
  const end=monthKey(y,m),opening=Number(data.openingBalance||0);
  const keys=new Set();
  for(const k of Object.keys(data.shifts||{}))if(/^\d{4}-\d\d-\d\d$/.test(k))keys.add(k.slice(0,7));
  for(const obj of [data.adjustments,data.monthTargets,data.hourPayouts])for(const k of Object.keys(obj||{}))if(/^\d{4}-\d\d$/.test(k))keys.add(k);
  const months=[...keys].filter(k=>k<=end).sort();
  let sum=opening,count=0,missing=0;
  for(const k of months){const yy=Number(k.slice(0,4)),mm=Number(k.slice(5,7))-1,t=monthTarget(yy,mm);
    if(t){sum+=monthHours(yy,mm)-t.target;count++}else missing++;
    sum-=Number(data.hourPayouts?.[k]||0);
  }
  return {sum,first:months[0]||null,gaps:missing,months:count};
}
function accumulated(y,m){return carryAt(y,m)}
function renderAbsences(y,m){const root=$('absenceBreakdown');root.replaceChildren();const target=monthTarget(y,m),holidays=holidaySet(y,data.profile.state||'NW'),wdl=workdayList(),workdays=wdl.length;const kinds=[['K','Krankheit'],['U','Urlaub'],['T','Fortbildung'],['A','Überstundenabbau']];for(const [code,label] of kinds){let count=0,eligible=0;for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const k=dateKey(y,m,d);if(data.shifts[k]!==code)continue;count++;const wd=new Date(y,m,d,12).getDay();if(wdl.includes(wd)&&!holidays.has(k))eligible++}if(!count)continue;const item=document.createElement('div');item.className='history-row';const left=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small'),right=document.createElement('strong');title.textContent=label;detail.textContent=count+' Kalendertag(e) · '+eligible+' reguläre Arbeitstage'+(code==='A'?' · geschätzter Zeitabbau, nicht zusätzlich verrechnet':'');right.textContent=code==='A'?(target?'−'+fmtHours(eligible*target.weekly/workdays)+' h*':'Profil fehlt'):target?fmtHours(eligible*target.weekly/workdays)+' h':'Profil fehlt';left.append(title,detail);item.append(left,right);root.append(item)}if(!root.children.length){const note=document.createElement('p');note.className='note';note.textContent='Keine Abwesenheiten im ausgewählten Monat erfasst.';root.append(note)}if(!target){const note=document.createElement('p');note.className='note';note.textContent='Für Stundengutschriften bitte Wochenstunden im Profil speichern.';root.append(note)}}
function renderHistory(){const root=$('monthHistory');root.replaceChildren();const y=shown.getFullYear(),m=shown.getMonth();for(let back=5;back>=0;back--){const date=new Date(y,m-back,1),yy=date.getFullYear(),mm=date.getMonth(),prefix=dateKey(yy,mm,1).slice(0,7);const hasData=hasEntriesOrComplete(yy,mm);if(!hasData&&back!==0)continue;const t=monthTarget(yy,mm),v=monthStats(yy,mm),delta=t?v.total-t.target:null;const item=document.createElement('div');item.className='history-row'+(back===0?' current':'');const left=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=date.toLocaleDateString('de-DE',{month:'short',year:'numeric'});detail.textContent=`Prognose · Geplant ${fmtHours(v.worked)} h · Gutschrift ${fmtHours(v.credit)} h · Korrektur ${fmtHours(Number(data.adjustments[prefix]||0))} h · Auszahlung ${fmtHours(Number(data.hourPayouts?.[prefix]||0))} h`;left.append(title,detail);const right=document.createElement('strong');right.textContent=displaySaldoText(delta===null?null:delta-Number(data.hourPayouts?.[prefix]||0));item.append(left,right);root.append(item)}if(!root.children.length)root.textContent='Noch keine Monate erfasst.'}
function updateSelection(){const keys=selectionStart?daysBetween(selectionStart,selectionEnd):[];document.querySelectorAll('.day[data-date]').forEach(b=>b.classList.toggle('selected',keys.includes(b.dataset.date)));return keys}
function closeEditor(){$('shiftChoices').classList.add('hidden');$('shiftTrigger').setAttribute('aria-expanded','false');$('modalBackdrop').classList.add('hidden');document.body.classList.remove('modal-open')}
function openEditor(){if(!selectionStart)return;const keys=updateSelection(),fmt=k=>new Date(k+'T12:00:00').toLocaleDateString('de-DE');$('selectedDate').textContent=keys.length===1?fmt(keys[0]):fmt(keys[0])+' – '+fmt(keys[keys.length-1]);$('rangeHint').textContent=keys.length===1?'1 Tag ausgewählt':keys.length+' Tage ausgewählt (einschließlich Wochenenden). Bereits eingetragene Dienste können gemeinsam geändert oder gelöscht werden.';const current=data.shifts[keys[0]]||'';setSelectedShift(keys.every(k=>(data.shifts[k]||'')===current)?current:'');$('shiftChoices').classList.add('hidden');$('shiftTrigger').setAttribute('aria-expanded','false');$('modalBackdrop').classList.remove('hidden');document.body.classList.add('modal-open');$('shiftTrigger').focus({preventScroll:true})}
let calendarBuilt=false,calendarReady=false,scrollSyncTimer=0;const calendarStart=new Date(new Date().getFullYear()-2,0,1),calendarEnd=new Date(new Date().getFullYear()+3,11,1);
function renderCalendarMonths(){const root=$('calendar');if($('monthScroll').clientHeight>0)root.style.setProperty('--month-height',$('monthScroll').clientHeight+'px');if(!calendarBuilt){const frag=document.createDocumentFragment();for(let d=new Date(calendarStart);d<=calendarEnd;d.setMonth(d.getMonth()+1)){const y=d.getFullYear(),m=d.getMonth(),block=document.createElement('div');block.className='month-block';block.dataset.month=monthKey(y,m);const label=document.createElement('div');label.className='month-label';label.textContent=d.toLocaleDateString('de-DE',{month:'long',year:'numeric'});block.append(label);const grid=document.createElement('div');grid.className='month-grid';const leading=(new Date(y,m,1).getDay()+6)%7,daysInMonth=new Date(y,m+1,0).getDate(),weekCount=Math.ceil((leading+daysInMonth)/7);grid.style.setProperty('--week-count',weekCount);for(let i=0;i<leading;i++){const blank=document.createElement('div');blank.className='day empty';const n=document.createElement('span');n.textContent=new Date(y,m,1-leading+i).getDate();blank.append(n);grid.append(blank)}for(let day=1;day<=new Date(y,m+1,0).getDate();day++){const k=dateKey(y,m,day),b=document.createElement('button');b.type='button';b.dataset.date=k;b.className='day';const num=document.createElement('span');num.textContent=day;b.append(num);grid.append(b)}while(grid.children.length<weekCount*7){const blank=document.createElement('div');blank.className='day empty';const n=document.createElement('span');n.textContent=grid.children.length-leading-daysInMonth+1;blank.append(n);grid.append(blank)}block.append(grid);frag.append(block)}root.append(frag);calendarBuilt=true}
for(const b of root.querySelectorAll('.day[data-date]')){const k=b.dataset.date,code=data.shifts[k]||'',isToday=k===dateKey(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());b.classList.toggle('today',isToday);let tag=b.querySelector('.tag');if(code){if(!tag){tag=document.createElement('span');b.append(tag)}tag.className='tag '+code;tag.textContent=shiftTitle(code);tag.style.background=displayShiftColor(shiftColor(code));tag.style.color=contrastColor(displayShiftColor(shiftColor(code)))}else if(tag)tag.remove()}
$('month').textContent=shown.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
if(!calendarReady){calendarReady=true;requestAnimationFrame(()=>scrollToMonth(shown,false))}}
function scrollToMonth(date,smooth){const key=monthKey(date.getFullYear(),date.getMonth()),block=$('calendar').querySelector('[data-month="'+key+'"]');if(!block)return;const scroll=$('monthScroll');scroll.scrollTo({top:block.offsetTop-$('calendar').offsetTop,behavior:smooth?'smooth':'instant'})}
function updateVisibleMonth(){const sc=$('monthScroll'),blocks=$('calendar').querySelectorAll('.month-block');let found=null;for(const b of blocks){if(b.offsetTop-$('calendar').offsetTop<=sc.scrollTop+100)found=b;else break}if(found){const [yy,mm]=found.dataset.month.split('-').map(Number);if(shown.getFullYear()!==yy||shown.getMonth()!==mm-1){shown=new Date(yy,mm-1,1);renderStatsOnly()}$('month').textContent=shown.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}}
function renderStatsOnly(){const y=shown.getFullYear(),m=shown.getMonth(),t=monthTarget(y,m),stats=monthStats(y,m),saldo=displaySaldo(y,m),previous=carryAt(m===0?y-1:y,m===0?11:m-1),total=carryAt(y,m);$('freeDays').textContent=displaySaldoText(saldo);$('adjustHours').value=data.adjustments[monthKey(y,m)]??0;$('manualTarget').value=data.monthTargets?.[monthKey(y,m)]??'';$('paidHours').value=data.hourPayouts?.[monthKey(y,m)]??0;$('targetModeInfo').textContent=t?(t.manual?'Manuell festgelegt: ':'Automatisch berechnet: ')+fmtHours(t.target)+' h':'Bitte Wochenstunden im Profil hinterlegen oder ein Monatssoll eintragen.';$('workedDetail').textContent=fmtHours(stats.worked)+' h';$('creditDetail').textContent=fmtHours(stats.credit)+' h';$('balanceDetailHours').textContent=displaySaldoText(saldo);$('carryCurrent').textContent=displaySaldoText(saldo===null?null:saldo-Number(data.hourPayouts?.[monthKey(y,m)]||0));$('carryTotal').textContent=total?displaySaldoText(total.sum):'–';$('carryPrevious').textContent=previous?displaySaldoText(previous.sum):'–';renderHistory();renderAbsences(y,m);const ringTarget=$('schRingTarget');if(ringTarget)ringTarget.textContent=t?fmtHours(t.target)+' h':'–';syncSchivioDashboard()}
function render(){const y=shown.getFullYear(),m=shown.getMonth();renderCalendarMonths();let count=0,hours=0;for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const k=dateKey(y,m,d),s=data.shifts[k]||'';if(types.includes(s)||data.customShifts?.[s]){count++;hours+=data.customShifts?.[s]?.bd?.stage==='RB'?(Number(data.rbWork?.[k])||0):(duration(data.templates[s]||data.customShifts[s])||0)}}$('shiftCount').textContent=count;$('hours').textContent=hours.toLocaleString('de-DE',{maximumFractionDigits:1});const t=monthTarget(y,m),stats=monthStats(y,m),saldo=displaySaldo(y,m);
$('freeDays').textContent=displaySaldoText(saldo);
$('targetDetail').textContent=t?`Soll: ${fmtHours(t.target)} h · ${t.days} Arbeitstage · ${t.holidays} Feiertag(e) auf regulären Arbeitstagen`:'Soll: Bitte Wochenstunden im Tarifprofil eintragen.';
renderAbsences(y,m);$('workedDetail').textContent=fmtHours(stats.worked)+' h';$('creditDetail').textContent=fmtHours(stats.credit)+' h';$('balanceDetailHours').textContent=displaySaldoText(saldo);$('adjustHours').value=data.adjustments[dateKey(y,m,1).slice(0,7)]||0;renderHistory();$('hoursInfo').textContent=`${stats.absence} gutgeschriebene Abwesenheitstage · ${t?fmtHours(t.target)+' h Soll':'Sollzeit fehlt'} · Alle eingetragenen Dienste, auch zukünftige, zählen zur Prognose.`;const total=accumulated(y,m),prevDate=new Date(y,m-1,1),previous=carryAt(prevDate.getFullYear(),prevDate.getMonth()),opening=Number(data.openingBalance||0);$('openingBalance').value=opening;
$('carryPrevious').textContent=previous?(previous.sum>=0?'+':'')+fmtHours(previous.sum)+' h':(opening>=0?'+':'')+fmtHours(opening)+' h';
$('carryCurrent').textContent=displaySaldoText(saldo===null?null:saldo-Number(data.hourPayouts?.[monthKey(y,m)]||0));
$('carryTotal').textContent=total?displaySaldoText(total.sum):'–';
$('carryInfo').textContent=total?`Automatische Prognose aus ${total.months} Monat(en) mit hinterlegtem Plan, inklusive Startguthaben und Stundenauszahlungen. ${total.gaps?total.gaps+' Monat(e) ohne berechenbares Soll. ':''}Nicht eingetragene Dienste werden nicht geschätzt. Kein verbindlicher Arbeitszeitnachweis.`:'Bitte Wochenstunden im Profil eintragen.';
$('balanceDetail').textContent=total?`Voraussichtliches Zeitguthaben: ${displaySaldoText(total.sum)}`:'';
const ringTarget=$('schRingTarget');if(ringTarget)ringTarget.textContent=t?fmtHours(t.target)+' h':'–';updateSelection()}
window.addEventListener('resize',()=>{const root=$('calendar');if($('monthScroll').clientHeight>0)root.style.setProperty('--month-height',$('monthScroll').clientHeight+'px')});
const cal=$('calendar');
let holdTimer=null,downX=0,downY=0,pendingDate='',longPress=false,gestureMoved=false;
let blockSyntheticClickUntil=0;
function clearHold(){if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null}}
function stopSelection(){clearHold();dragging=false;activePointer=null;longPress=false;gestureMoved=false;cal.classList.remove('selecting')}
function beginSingleDay(day){if(plannerActive){applyPlanner([day]);return}openAgenda(day)}
cal.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const b=e.target.closest('.day[data-date]');if(!b)return;
 stopSelection();activePointer=e.pointerId;downX=e.clientX;downY=e.clientY;
 pendingDate=b.dataset.date;gestureMoved=false;longPress=false;
 holdTimer=setTimeout(()=>{
  if(activePointer!==e.pointerId||gestureMoved)return;
  longPress=true;dragging=true;selectionStart=pendingDate;selectionEnd=pendingDate;
  cal.classList.add('selecting');updateSelection();
  if(navigator.vibrate)navigator.vibrate(15);
  try{cal.setPointerCapture(e.pointerId)}catch{}
 },200);
});
cal.addEventListener('pointermove',e=>{
 if(e.pointerId!==activePointer)return;
 if(!longPress){
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>9){gestureMoved=true;clearHold()}
  return;
 }
 e.preventDefault();
 const el=document.elementFromPoint(e.clientX,e.clientY),b=el&&el.closest('.day[data-date]');
 if(b&&b.dataset.date!==selectionEnd){selectionEnd=b.dataset.date;updateSelection()}
});
cal.addEventListener('pointerup',e=>{
 if(e.pointerId!==activePointer)return;
 const wasLong=longPress,wasMoved=gestureMoved,day=pendingDate;
 if(cal.hasPointerCapture?.(e.pointerId)){try{cal.releasePointerCapture(e.pointerId)}catch{}}
 stopSelection();
 if(wasLong){
  // The click synthesized after pointerup must not close the newly opened modal.
  blockSyntheticClickUntil=performance.now()+120;
  if(plannerActive)applyPlanner(daysBetween(selectionStart,selectionEnd));else openEditor();
 }else if(!wasMoved&&Math.hypot(e.clientX-downX,e.clientY-downY)<9){
  blockSyntheticClickUntil=performance.now()+120;
  beginSingleDay(day);
 }
});
cal.addEventListener('pointercancel',()=>{stopSelection();selectionStart='';selectionEnd='';updateSelection()});
// One gesture is handled exactly once. Cancel its follow-up synthetic click at capture phase.
document.addEventListener('click',e=>{
 if(performance.now()<blockSyntheticClickUntil&&e.isTrusted){
  e.preventDefault();e.stopImmediatePropagation();blockSyntheticClickUntil=0;
 }
},true);
// Keyboard accessibility and browsers without Pointer Events.
cal.addEventListener('click',e=>{
 const b=e.target.closest('.day[data-date]');if(!b)return;
 if(!$('modalBackdrop').classList.contains('hidden'))return;
 if(e.detail!==0&&window.PointerEvent)return;
 stopSelection();beginSingleDay(b.dataset.date);
});
const shiftNames={'':'Einträge löschen / frei lassen',F:'Frühdienst',S:'Spätdienst',N:'Nachtdienst',U:'Urlaub',K:'Krank',T:'Fortbildung',A:'Überstundenabbau',X:'Sonstiger Dienst'};
function setSelectedShift(v){document.querySelectorAll('[data-shift]').forEach(b=>{if(b.dataset.shift)b.textContent=shiftTitle(b.dataset.shift)});selectedShift=v;$('shiftLabel').textContent=v?shiftTitle(v):shiftNames[''];document.querySelectorAll('[data-shift]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shift===v)))}
$('shiftTrigger').onclick=()=>{const menu=$('shiftChoices'),open=menu.classList.toggle('hidden')===false;$('shiftTrigger').setAttribute('aria-expanded',String(open))};
$('shiftChoices').addEventListener('click',e=>{const b=e.target.closest('[data-shift]');if(!b)return;setSelectedShift(b.dataset.shift);$('shiftChoices').classList.add('hidden');$('shiftTrigger').setAttribute('aria-expanded','false');$('shiftTrigger').focus({preventScroll:true})});
$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop')){$('cancel').click()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modalBackdrop').classList.contains('hidden')){$('cancel').click()}});

function tab(which){const sections={plan:'plan',hours:'hoursPanel',share:'sharePanel',templates:'templatesPanel',settings:'settings'};for(const [id,section] of Object.entries(sections))$(section).classList.toggle('hidden',which!==id);for(const [id,button] of Object.entries({plan:'tabPlan',hours:'tabHours',share:'tabShare',templates:'tabTemplates',settings:'tabSettings'}))$(button).className=which===id?'active':'secondary';if(which==='plan')requestAnimationFrame(()=>{const sc=$('monthScroll'),root=$('calendar');if(sc.clientHeight>0){root.style.setProperty('--month-height',sc.clientHeight+'px');scrollToMonth(shown,false)}updateVisibleMonth()});if(which==='hours')renderStatsOnly()}
$('tabPlan').onclick=()=>tab('plan');$('tabHours').onclick=()=>tab('hours');$('tabShare').onclick=()=>tab('share');$('tabTemplates').onclick=()=>tab('templates');$('tabSettings').onclick=()=>tab('settings');$('jumpToday').onclick=()=>{shown=new Date();shown.setDate(1);scrollToMonth(shown,true)};
$('monthScroll').addEventListener('scroll',()=>{clearTimeout(scrollSyncTimer);scrollSyncTimer=setTimeout(updateVisibleMonth,55)},{passive:true});
// Preserve existing shift template editor, but display it in its own tab.
const templateCard=$('templateFields').closest('.card');$('templatesPanel').append(templateCard);
// The existing pay panel is displayed inside Auswertung, not as a separate tab.
$('hoursPanel').append($('payPanel'));$('payPanel').classList.remove('hidden');

function syncSchivioDashboard(){
 const y=shown.getFullYear(),m=shown.getMonth(),t=monthTarget(y,m),v=monthStats(y,m),saldo=displaySaldo(y,m),total=carryAt(y,m);
 const set=(id,value)=>{const node=$(id);if(node)node.textContent=value};
 set('schRingTarget',t?fmtHours(t.target)+' h':'–');
 set('schRingWork',fmtHours(v.worked)+' h');
 set('schRingBalance',total?displaySaldoText(total.sum):'–');
 set('schRingPayout',fmtHours(Number(data.hourPayouts?.[monthKey(y,m)]||0))+' h');
 set('schRingAdjust',fmtHours(Number(data.adjustments?.[monthKey(y,m)]||0))+' h');
 set('schPlanned',fmtHours(v.worked)+' h');
 set('schMonth',displaySaldoText(saldo));
 set('schTotal',total?displaySaldoText(total.sum):'–');
}
$('saveManualTarget').onclick=()=>{const raw=$('manualTarget').value.trim().replace(',','.');const k=monthKey(shown.getFullYear(),shown.getMonth());if(raw===''){delete data.monthTargets[k]}else{const n=Number(raw);if(!Number.isFinite(n)||n<0||n>300){$('targetStatus').textContent='Bitte 0 bis 300 Stunden eingeben.';return}data.monthTargets[k]=n}persist();render();renderStatsOnly();syncSchivioDashboard();$('targetStatus').textContent='Monatssoll gespeichert.';};
$('savePaidHours').onclick=()=>{const n=Number($('paidHours').value.replace(',','.'));if(!Number.isFinite(n)||n<0||n>500){$('payoutStatus').textContent='Bitte 0 bis 500 Stunden eingeben.';return}const k=monthKey(shown.getFullYear(),shown.getMonth());if(n===0)delete data.hourPayouts[k];else data.hourPayouts[k]=n;persist();render();$('payoutStatus').textContent='Ausgezahlte Stunden gespeichert.'};
$('saveOpening').onclick=()=>{const v=Number($('openingBalance').value);if(!Number.isFinite(v)||Math.abs(v)>1000){alert('Startguthaben muss zwischen -1000 und 1000 Stunden liegen.');return}data.openingBalance=v;persist();render()};$('saveAdjust').onclick=()=>{const value=Number($('adjustHours').value.replace(',','.'));if(!Number.isFinite(value)||Math.abs(value)>500){$('adjustStatus').textContent='Bitte eine gültige Zahl zwischen -500 und 500 eingeben.';return}data.adjustments[dateKey(shown.getFullYear(),shown.getMonth(),1).slice(0,7)]=value;persist();render();$('adjustStatus').textContent='Korrektur gespeichert.'};
$('save').onclick=()=>{if(!selectionStart)return;const s=selectedShift;for(const k of daysBetween(selectionStart,selectionEnd)){if(s)data.shifts[k]=s;else delete data.shifts[k]}persist();closeEditor();selectionStart='';selectionEnd='';render()};$('cancel').onclick=()=>{closeEditor();selectionStart='';selectionEnd='';render()};
function populateProfile(){if(data.profile?.tariff){const t=String(data.profile.tariff).toLowerCase();data.profile.tariff=(t.includes('ärzte')||t.includes('aerzte'))?((t.includes('tdl')||t.includes('uni'))?'TV-Ärzte/TdL':'TV-Ärzte/VKA'):t.includes('tvöd')?'TVöD-P':t.includes('caritas')?'AVR Caritas':t.includes('bat-kf')?'BAT-KF':(t.includes('avr dd')||t.includes('avr-dd'))?'AVR DD':t.includes('dwbo')?(t.includes('ost')?'AVR DWBO Ost':'AVR DWBO West'):(t.includes('ktd')||t.includes('nordkirche'))?'KTD':t.includes('mitteldeutsch')?'AVR Mitteldeutschland':(t.includes('tv dn')||t.includes('niedersachsen'))?'TV DN':t.includes('bayern')?'AVR Bayern':t.includes('württemberg')?((/\biv\b/.test(t))?'AVR Württemberg IV':'AVR Württemberg I'):t.includes('diakonie')?'AVR Diakonie':t.includes('tv-l')?'TV-L':t.includes('drk')?'DRK':t.includes('beamt')?'Beamte':t.includes('individ')?'Individuell':data.profile.tariff}if(data.profile&&!(Number(data.profile.fulltime)>0)&&Number(data.setupOptions?.fulltime)>0)data.profile.fulltime=String(data.setupOptions.fulltime);for(const id of ['tariff','group','level','weekly','fulltime','state','workdays'])$(id).value=data.profile[id]??(id==='state'?'NW':id==='workdays'?'5':'')}populateProfile();$('saveSettings').onclick=()=>{const weekly=$('weekly').value;if(weekly&&(Number(weekly)<=0||Number(weekly)>60)){alert('Bitte gültige Wochenstunden angeben.');return}const ftv=$('fulltime').value;if(ftv&&(Number(ftv)<30||Number(ftv)>45)){alert('Bitte gültige tarifliche Vollzeit (30–45 Std.) angeben.');return}for(const id of ['tariff','group','level','weekly','fulltime','state','workdays'])data.profile[id]=$(id).value;if(data.setupOptions){const w=data.setupOptions;w.tariff=data.profile.tariff;w.group=data.profile.group;w.level=data.profile.level;w.region=data.profile.state;w.fulltime=Number(data.profile.fulltime)>0?Number(data.profile.fulltime):null;if(Number(data.profile.weekly)>0){w.hoursMode='weekly';w.hoursValue=Number(data.profile.weekly);delete data.profile.fixedMonthlyTarget}}persist();render();alert('Profil lokal gespeichert. Sollstunden aktualisiert.')};
function renderTemplates(){
 const root=$('templateFields');root.replaceChildren();
 for(const type of types){
  const item=document.createElement('article');item.className='shift-template-item';
  const head=document.createElement('div');head.className='shift-template-head';
  const mark=document.createElement('span');mark.className='shift-template-mark';mark.style.background=shiftColor(type);
  const info=document.createElement('div');info.className='shift-template-info';
  const title=document.createElement('strong');title.textContent=shiftTitle(type);
  const detail=document.createElement('small');const t=data.templates[type];detail.textContent=t.start+'–'+t.end+' Uhr · '+t.break+' Min. Pause';
  info.append(title,detail);
  const edit=document.createElement('button');edit.type='button';edit.className='secondary shift-template-edit';edit.textContent='✎ Bearbeiten';edit.setAttribute('aria-expanded','false');
  head.append(mark,info,edit);item.append(head);
  const fields=document.createElement('div');fields.className='shift-template-fields';fields.hidden=true;
  const nameWrap=document.createElement('label');nameWrap.className='shift-meta-name';nameWrap.textContent='Name / Emoji';
  const name=document.createElement('input');name.id='tpl_'+type+'_name';name.maxLength=40;name.value=shiftTitle(type);nameWrap.append(name);fields.append(nameWrap);
  const colorWrap=document.createElement('label');colorWrap.className='shift-meta-color';colorWrap.textContent='Dienstfarbe';
  const color=document.createElement('input');color.id='tpl_'+type+'_color';color.type='color';color.value=shiftColor(type);colorWrap.append(color);fields.append(colorWrap);
  const grid=document.createElement('div');grid.className='template-grid';
  for(const [field,label,inputType] of [['start','Beginn','time'],['end','Ende','time'],['break','Pause (Min.)','number']]){
   const wrapper=document.createElement('div'),lab=document.createElement('label'),inp=document.createElement('input');lab.textContent=label;inp.id='tpl_'+type+'_'+field;inp.type=inputType;inp.value=t[field];
   if(inputType==='number'){inp.min=0;inp.max=180;inp.step=1}lab.htmlFor=inp.id;wrapper.append(lab,inp);grid.append(wrapper)
  }fields.append(grid);
  const save=document.createElement('button');save.type='button';save.textContent='Änderungen speichern';save.className='shift-template-save';
  save.onclick=()=>{const next={start:$('tpl_'+type+'_start').value,end:$('tpl_'+type+'_end').value,break:Number($('tpl_'+type+'_break').value)};const newName=name.value.trim();
   if(!newName||!Number.isFinite(duration(next))||duration(next)<=0){$('templateStatus').textContent='Bitte Name, Zeiten und Pause prüfen.';return}
   data.templates[type]=next;data.shiftMeta[type]={name:newName,color:color.value};persist();render();renderPlannerItems();renderTemplates();$('templateStatus').textContent=newName+' gespeichert.';
  };fields.append(save);item.append(fields);
  edit.onclick=()=>{const wasOpen=!fields.hidden;root.querySelectorAll('.shift-template-fields').forEach(el=>el.hidden=true);root.querySelectorAll('.shift-template-edit').forEach(el=>el.setAttribute('aria-expanded','false'));fields.hidden=wasOpen;edit.setAttribute('aria-expanded',String(!wasOpen));if(!wasOpen)name.focus()};
  root.append(item)
 }
}renderTemplates();
$('saveHours').onclick=()=>{const updated={},meta={...data.shiftMeta};for(const type of types){const t={start:$('tpl_'+type+'_start').value,end:$('tpl_'+type+'_end').value,break:Number($('tpl_'+type+'_break').value)};const h=duration(t),name=$('tpl_'+type+'_name').value.trim();if(!Number.isFinite(h)||h<=0||!name){$('templateStatus').textContent='Bitte Namen, Zeiten und Pause bei '+labels[type]+' prüfen.';return}updated[type]=t;meta[type]={name,color:$('tpl_'+type+'_color').value}}data.templates=updated;data.shiftMeta=meta;persist();render();renderPlannerItems();$('templateStatus').textContent='Schichtvorlagen gespeichert. Bestehende Einträge aktualisiert.'};
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify({version:10,bonusPreview:data.bonusPreview||{},salaryAllowances:data.salaryAllowances||{},setupOptions:data.setupOptions||{},setupWizardDone:!!data.setupWizardDone,monthTargets:data.monthTargets||{},hourPayouts:data.hourPayouts||{},shiftMeta:data.shiftMeta||{},customShifts:data.customShifts||{},shifts:data.shifts,profile:data.profile,templates:data.templates,adjustments:data.adjustments,openingBalance:data.openingBalance,completedMonths:data.completedMonths},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Schivio-Backup-'+dateKey(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())+'.json';document.body.appendChild(a);a.click();a.remove();$('backupStatus').textContent='Backup-Datei wurde zum Download angeboten.';setTimeout(()=>URL.revokeObjectURL(url),30000)};
$('importButton').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2000000)throw Error('Datei zu groß');const obj=JSON.parse(await f.text());if(!obj||typeof obj.shifts!=='object'||Array.isArray(obj.shifts))throw Error('Ungültiges Schivio-Backup');if(!confirm('Alle aktuellen Dienste und Einstellungen durch dieses Backup ersetzen?'))return;data.shifts=obj.shifts;data.bonusPreview=obj.bonusPreview||{};data.salaryAllowances=obj.salaryAllowances||{};data.setupOptions=obj.setupOptions||data.setupOptions||{};data.setupWizardDone=!!(obj.setupWizardDone||data.setupWizardDone);data.monthTargets=(obj.monthTargets&&typeof obj.monthTargets==='object'&&!Array.isArray(obj.monthTargets))?obj.monthTargets:{};data.hourPayouts=(obj.hourPayouts&&typeof obj.hourPayouts==='object'&&!Array.isArray(obj.hourPayouts))?obj.hourPayouts:{};data.customShifts=obj.customShifts||{};data.shiftMeta=obj.shiftMeta||{};data.profile=obj.profile||{};data.templates=(obj.templates&&typeof obj.templates==='object')?obj.templates:{};migrate();data.adjustments=(obj.adjustments&&typeof obj.adjustments==='object'&&!Array.isArray(obj.adjustments))?obj.adjustments:{};data.openingBalance=Number.isFinite(Number(obj.openingBalance))?Number(obj.openingBalance):0;data.plannerOrder=Array.isArray(obj.plannerOrder)?obj.plannerOrder:[];data.palette=obj.palette||data.palette;data.shiftIntensity=obj.shiftIntensity||'vivid';applyPalette(data.palette);updateIntensityUI();data.completedMonths=(obj.completedMonths&&typeof obj.completedMonths==='object'&&!Array.isArray(obj.completedMonths))?obj.completedMonths:{};persist();populateProfile();renderTemplates();renderCustomShifts();renderPlannerItems();render();$('backupStatus').textContent='Backup erfolgreich importiert.'}catch(err){$('backupStatus').textContent='Import fehlgeschlagen: '+err.message}finally{e.target.value=''}};

// v0.9.3: all data remains in the existing local storage key.
data.customShifts||={};data.shiftMeta||={};
let plannerActive=false,plannerShift='F';
function applyPlanner(keys){if(!keys?.length)return;for(const k of keys){if(plannerShift)data.shifts[k]=plannerShift;else delete data.shifts[k]}persist();selectionStart='';selectionEnd='';updateSelection();render()}
function orderedPlannerCodes(){const all=['F','S','N','X','U','T','A',...Object.keys(data.customShifts)];const saved=Array.isArray(data.plannerOrder)?data.plannerOrder:[];return [...saved.filter(c=>all.includes(c)),...all.filter(c=>!saved.includes(c))]}
function movePlannerCode(from,to){if(!from||!to||from===to)return;const arr=orderedPlannerCodes();const a=arr.indexOf(from),b=arr.indexOf(to);if(a<0||b<0)return;arr.splice(a,1);arr.splice(b,0,from);data.plannerOrder=arr;persist();renderPlannerItems()}
let suppressPlannerClick=false;
function renderPlannerItems(){const root=$('plannerItems');root.replaceChildren();const entries=orderedPlannerCodes().map(id=>[id,shiftTitle(id)]).concat([['','✕ Löschen']]);for(const [id,name] of entries){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.code=id;b.className=id===plannerShift?'active':'';if(id)b.style.borderLeft='5px solid '+displayShiftColor(shiftColor(id));b.onclick=e=>{if(suppressPlannerClick){e.preventDefault();return}plannerShift=id;renderPlannerItems()};if(id){
 /* v1.0.29: Langes Drücken + Ziehen sortiert Schichten (Touch & Maus). */
 let timer=null,started=false,x0=0,y0=0,lastX=0,raf=0;
 const clear=()=>{clearTimeout(timer);timer=null};
 const autoScroll=()=>{if(!started)return;const r=root.getBoundingClientRect(),edge=40;if(lastX<r.left+edge)root.scrollLeft-=8;else if(lastX>r.right-edge)root.scrollLeft+=8;moveTo(lastX);raf=requestAnimationFrame(autoScroll)};
 let grab=0,tx=0;
 const ease='cubic-bezier(.2,.85,.25,1)';
 const natLeft=()=>b.getBoundingClientRect().left-tx;
 const follow=x=>{tx=x-grab-natLeft();b.style.transform='translateX('+tx+'px) scale(1.08)'};
 const moveTo=x=>{const list=[...root.querySelectorAll('button[data-code]:not([data-code=""])')].filter(o=>o!==b);let before=null;for(const o of list){const r=o.getBoundingClientRect();const mid=r.left+r.width/2;if(x<mid){before=o;break}}const del=root.querySelector('button[data-code=""]');const ref=before||del;
  if(ref!==b.nextSibling){const others=[...root.querySelectorAll('button[data-code]')].filter(o=>o!==b);const first=new Map(others.map(o=>[o,o.getBoundingClientRect().left]));root.insertBefore(b,ref);
   others.forEach(o=>{const dx=first.get(o)-o.getBoundingClientRect().left;if(Math.abs(dx)<1)return;o.style.transition='none';o.style.transform='translateX('+dx+'px)';void o.offsetWidth;o.style.transition='transform .3s '+ease;o.style.transform=''});if(navigator.vibrate)navigator.vibrate(6)}
  follow(x)};
 const begin=()=>{const r=b.getBoundingClientRect();grab=x0-r.left;tx=0;started=true;b.classList.add('reordering');b.style.transition='transform .18s '+ease+',box-shadow .2s';b.style.transform='scale(1.08)';document.body.classList.add('planner-reordering');if(navigator.vibrate)navigator.vibrate(18);raf=requestAnimationFrame(autoScroll)};
 const end=commit=>{clear();cancelAnimationFrame(raf);document.body.classList.remove('planner-reordering');if(!started){b.classList.remove('reordering');return}started=false;suppressPlannerClick=true;setTimeout(()=>{suppressPlannerClick=false},150);b.style.transition='transform .28s '+ease+',box-shadow .2s';b.style.transform='';tx=0;if(commit){const order=[...root.querySelectorAll('button[data-code]')].map(x=>x.dataset.code).filter(Boolean);data.plannerOrder=order;persist()}setTimeout(()=>{b.classList.remove('reordering');renderPlannerItems()},290)};
 b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;x0=lastX=e.clientX;y0=e.clientY;started=false;clear();timer=setTimeout(begin,400)});
 b.addEventListener('pointermove',e=>{lastX=e.clientX;if(!started){if(Math.abs(e.clientX-x0)>10||Math.abs(e.clientY-y0)>10)clear();return}e.preventDefault()});
 // Nach dem langen Drücken das Scrollen der Leiste blockieren, sonst bricht der Browser die Geste ab.
 b.addEventListener('touchmove',e=>{if(started){e.preventDefault();lastX=e.touches[0].clientX}},{passive:false});
 b.addEventListener('pointerup',()=>end(true));
 b.addEventListener('touchend',()=>end(true));
 b.addEventListener('pointercancel',()=>{if(!started)clear()});
 b.addEventListener('touchcancel',()=>end(true));
 b.addEventListener('contextmenu',e=>e.preventDefault());
}root.append(b)}}
function setPlanner(on){plannerActive=on;$('plannerBar').classList.toggle('hidden',!on);$('togglePlanner').classList.toggle('on',on);$('togglePlanner').setAttribute('aria-pressed',String(on));$('togglePlanner').textContent=on?'✓':'✎';$('togglePlanner').setAttribute('aria-label',on?'Planungsmodus beenden':'Planungsmodus öffnen');renderPlannerItems();requestAnimationFrame(()=>{const root=$('calendar');if($('monthScroll').clientHeight>0)root.style.setProperty('--month-height',$('monthScroll').clientHeight+'px');scrollToMonth(shown,false)})}
$('togglePlanner').onclick=()=>setPlanner(!plannerActive);$('plannerDone').onclick=()=>setPlanner(false);
function openAgenda(day){const dt=new Date(day+'T12:00:00');$('agendaTitle').textContent=dt.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const root=$('agendaItems');root.replaceChildren();const code=data.shifts[day];if(code){const tmpl=data.templates[code]||data.customShifts[code];const item=document.createElement('div');item.className='agenda-row';const time=document.createElement('span');time.className='agenda-time';time.textContent=tmpl?tmpl.start:'Ganztägig';const content=document.createElement('div');content.className='agenda-content';content.style.borderColor=shiftColor(code);const name=document.createElement('strong');name.textContent=shiftTitle(code);const detail=document.createElement('small');detail.textContent=tmpl?tmpl.start+'–'+tmpl.end+' Uhr'+(tmpl.bd?.stage==='RB'?' · Rufbereitschaft':' · Pause '+tmpl.break+' Min.'):'Ganztägig';content.append(name,detail);item.append(time,content);root.append(item);if(tmpl?.bd?.stage==='RB'){const w=document.createElement('label');w.className='rb-work';w.textContent='Einsatzzeit in der Rufbereitschaft (Std., inkl. Wegezeit; jeder Einsatz auf volle Stunden aufgerundet)';const inp=document.createElement('input');inp.type='number';inp.min='0';inp.max='24';inp.step='1';inp.inputMode='numeric';inp.id='rbWorkInput';inp.value=data.rbWork?.[day]||'';inp.placeholder='0';inp.onchange=()=>{const v=Math.max(0,Math.min(24,Math.ceil(Number(inp.value)||0)));data.rbWork=data.rbWork||{};if(v)data.rbWork[day]=v;else delete data.rbWork[day];inp.value=v||'';persist();render()};w.append(inp);root.append(w)}}else{const note=document.createElement('p');note.className='note';note.textContent='Keine Einträge für diesen Tag.';root.append(note)}$('agendaPlan').onclick=()=>{closeAgenda();setPlanner(true)};$('agendaBackdrop').classList.remove('hidden');document.body.classList.add('modal-open')}
function closeAgenda(){$('agendaBackdrop').classList.add('hidden');document.body.classList.remove('modal-open')}
$('agendaClose').onclick=closeAgenda;$('agendaBackdrop').onclick=e=>{if(e.target===$('agendaBackdrop'))closeAgenda()};
function renderCustomShifts(){const root=$('customShiftList');root.replaceChildren();for(const [id,shift] of Object.entries(data.customShifts)){const row=document.createElement('div');row.className='history-row';const label=document.createElement('div');const name=document.createElement('strong');name.textContent=shift.name;name.style.borderLeft='4px solid '+shift.color;name.style.paddingLeft='8px';const times=document.createElement('small');times.textContent=shift.start+'–'+shift.end+' · '+shift.break+' Min. Pause'+(shift.bd?.stage==='RB'?' · Rufbereitschaft':shift.bd?.stage?' · Bereitschaftsdienst Stufe '+shift.bd.stage+(shift.bd.from?' ab '+shift.bd.from:''):'');label.append(name,times);const edit=document.createElement('button');edit.className='secondary';edit.textContent='Bearbeiten';edit.onclick=()=>{const form=document.createElement('div');form.className='custom-edit-form';for(const [field,caption,type] of [['name','Name / Emoji','text'],['start','Beginn','time'],['end','Ende','time'],['break','Pause (Min.)','number'],['color','Farbe','color']]){const wrap=document.createElement('label');wrap.textContent=caption;const input=document.createElement('input');input.type=type;input.dataset.field=field;input.value=shift[field];if(field==='name')input.maxLength=40;if(field==='break'){input.min=0;input.max=180}wrap.append(input);form.append(wrap)}{const w1=document.createElement('label');w1.textContent='Art';const sel=document.createElement('select');sel.dataset.field='bdStage';sel.innerHTML='<option value="">Normale Arbeitszeit</option><option value="I">Bereitschaftsdienst Stufe I (Krankenhaus)</option><option value="II">Bereitschaftsdienst Stufe II (Krankenhaus)</option><option value="III">Bereitschaftsdienst Stufe III (Krankenhaus)</option><option value="A">Bereitschaftsdienst Stufe A (Heim/TV-L)</option><option value="B">Bereitschaftsdienst Stufe B (Heim/TV-L)</option><option value="C">Bereitschaftsdienst Stufe C (Heim/TV-L)</option><option value="D">Bereitschaftsdienst Stufe D (Heim/TV-L)</option><option value="RB">Rufbereitschaft</option>';sel.value=shift.bd?.stage||'';w1.append(sel);const w2=document.createElement('label');w2.textContent='Bereitschaft ab (leer = ganze Schicht)';const bf=document.createElement('input');bf.type='time';bf.dataset.field='bdFrom';bf.value=shift.bd?.from||'';w2.append(bf);form.append(w1,w2)}const save=document.createElement('button');save.textContent='Änderungen speichern';save.onclick=()=>{const next={};form.querySelectorAll('input').forEach(input=>next[input.dataset.field]=input.dataset.field==='break'?Number(input.value):input.value);const bdS=form.querySelector('select[data-field="bdStage"]').value;if(bdS)next.bd={stage:bdS,from:next.bdFrom||''};delete next.bdFrom;next.name=next.name.trim();if(!next.name||!Number.isFinite(duration(next))){alert('Bitte Name, Uhrzeiten und Pause prüfen.');return}data.customShifts[id]=next;persist();renderCustomShifts();renderPlannerItems();render()};const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Abbrechen';cancel.onclick=()=>renderCustomShifts();form.append(save,cancel);row.replaceWith(form)};const del=document.createElement('button');del.className='secondary';del.textContent='Entfernen';del.onclick=()=>{if(Object.values(data.shifts).includes(id)){alert('Diese Schicht ist bereits im Kalender eingetragen. Entferne zunächst ihre Einträge.');return}delete data.customShifts[id];persist();renderCustomShifts();renderPlannerItems()};const actions=document.createElement('div');actions.className='shift-actions';actions.append(edit,del);row.append(label,actions);root.append(row)}}
$('addCustomShift').onclick=()=>{const name=$('customName').value.trim(),t={start:$('customStart').value,end:$('customEnd').value,break:Number($('customBreak').value),color:$('customColor').value};if(!name||!Number.isFinite(duration(t))){$('customStatus').textContent='Bitte Namen, gültige Uhrzeiten und Pausenzeit angeben.';return}const id='C'+Date.now().toString(36);const bdS=$('customBd').value;data.customShifts[id]={name,...t,...(bdS?{bd:{stage:bdS,from:$('customBdFrom').value||''}}:{})};$('customBd').value='';$('customBdFrom').value='';persist();$('customName').value='';$('customStatus').textContent='Schicht hinzugefügt.';renderCustomShifts();renderPlannerItems()};
renderCustomShifts();renderPlannerItems();updateIntensityUI();

render();
