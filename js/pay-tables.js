(function(){
const P_TABLE={"P5": [2907.18, 3146.33, 3216.62, 3334.09, 3422.22, 3629.25], "P6": [3012.49, 3187.41, 3363.47, 3737.95, 3833.41, 4013.41], "P7": [null, 3510.3, 3701.21, 3998.33, 4149.59, 4305.4], "P8": [null, 3701.21, 3862.8, 4075.58, 4247.92, 4488.98], "P9": [null, 3992.39, 4184.4, 4312.38, 4558.59, 4662.42], "P10": [null, 4184.4, 4312.38, 4675.42, 4850.63, 4960.96], "P11": [null, 4419.71, 4557.3, 4901.27, 5129.69, 5233.54], "P12": [null, 4657.22, 4802.61, 5166.04, 5389.29, 5493.13], "P13": [null, 4894.78, 5047.94, 5430.82, 5707.28, 5778.68], "P14": [null, 5013.53, 5170.59, 5563.22, 6096.68, 6194.02], "P15": [null, 5132.29, 5293.23, 5695.6, 6177.16, 6361.06], "P16": [null, 5240.04, 5415.9, 5983.76, 6645.71, 6937.7]};
const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
function refreshTariff(){
 const value=document.getElementById('tariffBaseValue'),info=document.getElementById('tariffBaseInfo'),expl=document.getElementById('tariffExplanation');
 if(!value||!info||!expl)return;
 const r=SchivioPay.compute(shown.getFullYear(),shown.getMonth());
 value.textContent='–';delete value.dataset.baseAmount;expl.hidden=!r.enabled;expl.replaceChildren();
 if(!r.enabled){info.textContent='Gehaltsprognose deaktiviert';return}
 const head=document.createElement('strong'),p=document.createElement('p');expl.append(head,p);
 if(r.base===null){info.textContent='Tarifdaten prüfen';head.textContent='Gehalt noch nicht berechenbar';p.textContent=r.reason;return}
 value.textContent=euro(r.base);value.dataset.baseAmount=String(r.base);info.textContent=r.info;
 head.textContent=r.tariff?.name||'Gehalt';
 p.textContent=r.table?('Tabellenentgelt '+euro(r.table.amount)+' (gültig '+r.table.period+')'+(r.part<1?', anteilig '+(Math.round(r.part*1000)/10).toLocaleString('de-DE')+' %':'')+'. '+r.notes.join(' ')):r.notes.join(' ');
 if(r.table?.source){const a=document.createElement('a');a.href=r.table.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Quelle der Entgelttabelle';expl.append(a)}
}
const originalRenderStats=renderStatsOnly;
renderStatsOnly=function(){originalRenderStats();refreshTariff()};
const originalRender=render;
render=function(){originalRender();refreshTariff()};
refreshTariff();
})();
