(function(){
const get=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n);
const labels=[['wechsel','Wechselschichtzulage'],['schicht','Schichtzulage'],['pflege1','Pflegezulage I'],['pflege2','Pflegezulage II'],['leistung','Leistungszulage'],['stelle','Stellenzulage'],['sonstige','Sonstige Zulage']];
const dash=document.querySelector('#hoursPanel .sch-dashboard');if(!dash)return;
const summary=document.createElement('div');summary.id='salarySummary';
summary.innerHTML='<h3>Gehaltsübersicht</h3><div id="salarySummaryLines"></div><div class="salary-total"><span>Voraussichtliches Brutto</span><strong id="salarySummaryTotal">–</strong></div><p id="salarySummaryNote" class="salary-note"></p><button class="secondary salary-action" id="salaryDetailsOpen" type="button">Zulagen & Zuschläge ansehen · Einstellungen</button>';
const tariff=get('tariffExplanation');if(tariff)tariff.insertAdjacentElement('afterend',summary);else dash.append(summary);
const sheet=document.createElement('div');sheet.id='salarySheet';sheet.hidden=true;
sheet.innerHTML='<div class="salary-modal" role="dialog" aria-modal="true" aria-labelledby="salarySheetTitle"><h2 id="salarySheetTitle">Zulagen & Zuschläge</h2><p>Schivio berechnet dein Grundentgelt aus deinem Tarifprofil. Weitere Bestandteile sind optional und müssen nur einmal hinterlegt werden.</p><div id="salarySheetBreakdown"></div><p id="salarySheetNotes" class="salary-note"></p><div id="paySettings"></div><h3>Feste Zulagen (monatlich)</h3><div id="salaryAllowances"></div><p>Trage nur Beträge ein, die laut deiner Abrechnung tatsächlich monatlich zustehen. Teilzeitkürzung und tarifliche Voraussetzungen sind bei diesen individuellen Beträgen nicht automatisch geprüft.</p><button hidden id="salaryToBonus" type="button"></button><div class="salary-buttons"><button class="secondary" id="salaryCancel" type="button">Schließen</button><button id="salarySave" type="button">Speichern</button></div></div>';
document.body.append(sheet);
const allowances=get('salaryAllowances');
labels.forEach(([key,label])=>{const line=document.createElement('label');line.className='salary-allowance';line.innerHTML='<input type="checkbox" data-allow-on="'+key+'"><span></span><input type="text" data-allow-value="'+key+'" inputmode="decimal" placeholder="0,00 €">';line.querySelector('span').textContent=label;line.querySelector('[data-allow-on]').style.display='none';const amount=line.querySelector('[data-allow-value]'),toggle=line.querySelector('[data-allow-on]');amount.addEventListener('input',()=>{if(amount.value.trim()!==''&&Number(amount.value.trim().replace(',','.'))>0)toggle.checked=true});allowances.append(line)});
function close(){sheet.hidden=true}function open(){const cfg=data.salaryAllowances||{};labels.forEach(([k])=>{const obj=cfg[k]||{};sheet.querySelector('[data-allow-on="'+k+'"]').checked=!!obj.enabled;sheet.querySelector('[data-allow-value="'+k+'"]').value=obj.value??''});sheet.hidden=false;renderBreakdown()}
get('salaryDetailsOpen').onclick=open;get('salaryCancel').onclick=close;sheet.addEventListener('click',e=>{if(e.target===sheet)close()});get('salaryToBonus').onclick=()=>{close();get('bonusPreview')?.scrollIntoView({behavior:'smooth',block:'start'})};
get('salarySave').onclick=()=>{
 const next={};
 for(const [k] of labels){
  const field=sheet.querySelector('[data-allow-value="'+k+'"]');
  const raw=field.value.trim().replace(/\s/g,'').replace(/€/g,'').replace(',','.');
  // Empty fields are always zero; never block the entire form because a toggle was checked.
  const amount=raw===''?0:Number(raw);
  if(!Number.isFinite(amount)||amount<0||amount>3000){
   alert('Ungültiger Zulagenbetrag. Bitte nur Zahlen zwischen 0 und 3000 eingeben.');
   field.focus();return;
  }
  next[k]={enabled:amount>0,value:amount};
 }
 const previous=data.salaryAllowances;
 data.salaryAllowances=next;
 if(!persist()){data.salaryAllowances=previous;return}
 close();refresh();
 // Verify persistence and show an explicit result rather than silently failing.
 try{
  const saved=JSON.parse(localStorage.getItem(key)||'{}').salaryAllowances||{};
  const ok=labels.every(([k])=>saved[k]&&saved[k].value===next[k].value);
  if(!ok)alert('Die Zulagen konnten nicht vollständig gespeichert werden.');
 }catch(e){alert('Die Speicherung konnte nicht überprüft werden.')}
};

const center=document.querySelector('.sch-wheel-center');center.setAttribute('role','button');center.setAttribute('tabindex','0');center.setAttribute('aria-label','Gehaltsdetails öffnen');center.addEventListener('click',open);center.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
function moneyText(t){if(!t||!t.includes('€'))return null;const m=t.match(/([\d.]+,\d{2})\s*€/);return m?Number(m[1].replace(/\./g,'').replace(',','.')):null}
function base(){
 const w=data.setupOptions||{},profile=data.profile||{};
 const tariff=profile.tariff||w.tariff||'',group=profile.group||w.group||'',level=profile.level||w.level||'';
 // Read the tariff module's dedicated base value, never the wheel center,
 // because the wheel center is overwritten with the allowance-inclusive total.
 const el=get('tariffBaseValue');
 if(el?.dataset.baseAmount!==undefined){
  const n=Number(el.dataset.baseAmount);return Number.isFinite(n)?n:null;
 }
 return null;
}

function fixed(){let sum=0;const cfg=data.salaryAllowances||{};for(const [k] of labels){if(cfg[k]?.enabled)sum+=Number(cfg[k].value)||0}return Math.round(sum*100)/100}
function variable(){const cfg=data.bonusPreview||{};if(!Number.isFinite(Number(cfg.Hourly))||Number(cfg.Hourly)<=0)return null;
 const rows=[...document.querySelectorAll('#bonusRows .bonus-row')];let sum=0,count=0;
 for(const row of rows){if(!/^(Nacht|Sonntag|Feiertag):/.test(row.textContent))continue;const v=moneyText(row.querySelector('strong')?.textContent);if(v!==null){sum+=v;count++}}
 return count===3?Math.round(sum*100)/100:null;
}
function addLine(parent,label,value){const line=document.createElement('div');line.className='salary-line';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=value;line.append(a,b);parent.append(line)}
function payResult(){return SchivioPay.compute(shown.getFullYear(),shown.getMonth())}
function renderBreakdown(){const box=get('salarySheetBreakdown');box.replaceChildren();const r=payResult(),b=base(),f=fixed(),z=r.zuschlag;
 addLine(box,'Grundentgelt',b===null?'Noch nicht verfügbar':euro(b));addLine(box,'Feste Zulagen',euro(f));
 if(z){for(const l of z.lines)addLine(box,l.label+' · '+l.rateText+' · '+l.hours.toLocaleString('de-DE',{maximumFractionDigits:2})+' Std.',euro(l.euro))}
 else addLine(box,'Zeitzuschläge','Noch nicht berechenbar');
 if(b!==null)addLine(box,'Brutto-Prognose '+shown.toLocaleDateString('de-DE',{month:'long'}),euro(b+f+(z?z.total:0)));
 const n=get('salarySheetNotes');if(n)n.textContent=(r.base===null&&r.reason?r.reason+' ':'')+r.notes.join(' ')}
function setCenter(eyebrowText,amountText,infoText){const e=get('wheelEyebrow'),a=get('wheelAmount'),i=get('wheelInfo');if(e)e.textContent=eyebrowText;if(a)a.textContent=amountText;if(i)i.textContent=infoText}
function refresh(){const enabled=!!data.setupOptions?.salaryEnabled;summary.hidden=!enabled;if(!enabled){setCenter('Gehaltsprognose','–','Deaktiviert · Mehr → Einrichtung');return}
 const r=payResult(),b=base(),f=fixed(),v=r.zuschlag?r.zuschlag.total:null,hasAll=v!==null;
 const lines=get('salarySummaryLines');lines.replaceChildren();addLine(lines,'Grundentgelt',b===null?'–':euro(b));addLine(lines,'Feste Zulagen',euro(f));addLine(lines,'Zeitzuschläge',v===null?'Noch offen':euro(v));
 get('salarySummaryTotal').textContent=b===null?'–':euro(b+f+(v||0))+(hasAll?'':' +');
 get('salarySummaryNote').textContent=b===null?(r.reason||'Tarifprofil vervollständigen.'):hasAll?'Prognose aus deinen eingetragenen Diensten. Zeitzuschläge werden meist erst im übernächsten Monat ausgezahlt. Ohne Jahressonderzahlung, Überstunden und Rufbereitschaft; Bereitschaftsdienst nur bei den Ärzte-Tarifen. Keine verbindliche Abrechnung.':(r.reason||'Zwischensumme ohne Zuschläge.');
 if(b!==null)setCenter(hasAll?'Brutto · Prognose':'Brutto · Zwischensumme',euro(b+f+(v||0)),hasAll?'inkl. Zuschläge · Details':'Zuschläge noch offen · Details');
 else setCenter('Tarifliches Grundentgelt','–',get('tariffBaseInfo')?.textContent||'Tarifprofil einrichten');
 renderBreakdown();
}
const oldRender=render;render=function(){oldRender();refresh()};const oldStats=renderStatsOnly;renderStatsOnly=function(){oldStats();refresh()};
get('bonusSave')?.addEventListener('click',()=>queueMicrotask(refresh));
refresh();
})();
