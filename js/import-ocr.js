/* Dienstplan-Import · Teil 1: Text lesen
   - PDF: pdf.js liegt in der App (vendor/pdfjs). Text und Position kommen direkt aus dem PDF.
   - Foto: Texterkennung (tesseract.js) wird beim ersten Foto geladen (ca. 5 MB).
     Das Foto selbst verlässt das Handy dabei nie – erkannt wird im Browser.
   Stellt bereit: SchivioImportLib.ocr = { readPdf, loadImage, recognize, end, onProgress } */
(function(){
 const L=window.SchivioImportLib=window.SchivioImportLib||{};
 const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
 const PDF_BASE='vendor/pdfjs/';
 const MAX_PDF_PAGES=4;        // bei mehrseitigen PDFs die Seite mit dem meisten Text nehmen
 const RENDER_LONG_SIDE=3000;  // PDF-Seite wird für die Anzeige in dieser Größe gezeichnet
 const MIN_PDF_WORDS=8;        // weniger Text → wohl ein gescanntes PDF, dann Texterkennung

 /* ---------- PDF ---------- */
 let pdfjs=null;
 async function loadPdf(){if(pdfjs)return pdfjs;const base=new URL(PDF_BASE,location.href).href;pdfjs=await import(base+'pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return pdfjs}
 /* Liefert {kind:'pdf', img, w, h, words} oder bei gescannten PDFs {scanned:true, canvas} */
 async function readPdf(file){
  let lib;try{lib=await loadPdf()}catch(x){throw new Error('Der PDF-Leser konnte nicht geladen werden. Bitte die App einmal neu laden.')}
  const doc=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
  try{
   let best=null;
   for(let p=1;p<=Math.min(doc.numPages,MAX_PDF_PAGES);p++){const page=await doc.getPage(p);const tc=await page.getTextContent();if(!best||tc.items.length>best.tc.items.length)best={page,tc}}
   const base=best.page.getViewport({scale:1});
   const scale=Math.min(4,Math.max(1.5,RENDER_LONG_SIDE/Math.max(base.width,base.height)));
   const vp=best.page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
   const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);
   await best.page.render({canvasContext:g,canvas,viewport:vp}).promise;
   const words=[];
   for(const it of best.tc.items){
    const s=(it.str||'').trim();if(!s)continue;
    const m=lib.Util.transform(vp.transform,it.transform);const h=Math.hypot(m[2],m[3])||10;const x=m[4],y=m[5]-h;const w=(it.width||s.length*h*.5)*scale;
    const raw=it.str;for(const p of raw.matchAll(/\S+/g))words.push({t:p[0],x:x+w*p.index/raw.length,y,w:w*p[0].length/raw.length,h})}
   if(words.length<MIN_PDF_WORDS)return {scanned:true,canvas};
   return {kind:'pdf',img:canvas.toDataURL('image/jpeg',.82),w:canvas.width,h:canvas.height,words}}
  finally{try{doc.destroy()}catch(x){}}}

 /* ---------- Foto laden ---------- */
 const MAX_PHOTO_SIDE=3600;
 function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();
  i.onload=()=>{URL.revokeObjectURL(u);const k=Math.min(1,MAX_PHOTO_SIDE/Math.max(i.width,i.height));const c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);
   const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);res(c)};
  i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Das Bild konnte nicht geöffnet werden.'))};i.src=u})}

 /* ---------- Texterkennung ---------- */
 let tessP=null,worker=null,workerP=null,showProgress=false;
 const api={onProgress:null};
 function loadTess(){return tessP||(tessP=new Promise((res,rej)=>{if(window.Tesseract)return res(window.Tesseract);
  const s=document.createElement('script');s.src=TESSERACT_URL;s.crossOrigin='anonymous';
  s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Texterkennung nicht verfügbar.'));
  s.onerror=()=>{tessP=null;s.remove();rej(new Error('Die Texterkennung konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.'))};
  document.head.append(s)}))}
 async function getWorker(){if(worker)return worker;if(workerP)return workerP;
  workerP=(async()=>{const T=await loadTess();
   const w=await T.createWorker('deu',1,{logger:m=>{if(showProgress&&m&&m.status==='recognizing text'&&api.onProgress)api.onProgress(Math.round((m.progress||0)*100))}});worker=w;return w})();
  try{return await workerP}finally{workerP=null}}
 /* params: Tesseract-Einstellungen (psm, whitelist) · minConf: Mindest-Sicherheit · progress: Prozent melden */
 async function recognize(canvas,{psm='6',whitelist='',minConf=20,progress=false}={}){
  const w=await getWorker();
  try{await w.setParameters({tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1',tessedit_char_whitelist:whitelist})}catch(x){}
  showProgress=progress;
  try{const {data:r}=await w.recognize(canvas);
   return (r.words||[]).filter(o=>o.text&&o.text.trim()&&o.confidence>minConf).map(o=>({t:o.text.trim(),x:o.bbox.x0,y:o.bbox.y0,w:o.bbox.x1-o.bbox.x0,h:o.bbox.y1-o.bbox.y0,c:o.confidence}))}
  finally{showProgress=false}}
 /* Texterkennung beenden und Speicher freigeben */
 function end(){const w=worker;worker=null;if(w)try{w.terminate()}catch(x){}}

 L.ocr=Object.assign(api,{readPdf,loadImage,recognize,end});
})();
