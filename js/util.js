/* v1.1.1: Gemeinsame kleine Hilfsfunktionen für alle Module (vorher in bis zu 14 Dateien einzeln kopiert).
   Datumsschlüssel immer als 'JJJJ-MM-TT' in Ortszeit; Mittag (12 Uhr), damit die Zeitumstellung nie einen Tag verschiebt. */
window.SU=(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const el=html=>{const t=document.createElement('template');t.innerHTML=String(html).trim();return t.content.firstElementChild};
 const pad2=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
 const toDate=k=>new Date(k+'T12:00:00');
 const addDays=(k,n)=>{const t=toDate(k);t.setDate(t.getDate()+n);return key(t)};
 const today=()=>key(new Date());
 return Object.freeze({esc,el,pad2,key,toDate,addDays,today})
})();
