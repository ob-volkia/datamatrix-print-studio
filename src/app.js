import {DEFAULTS,MM,layout,numberFor,rangeOf,resizeCanvas} from './model.js';
import {svgPath} from './barcode.js';
const $=id=>document.getElementById(id),keys=Object.keys(DEFAULTS),booleans=['number','frame','rounded','lockAspect'];
let settings={...DEFAULTS},worker,file,count=0,valid=false,busy=false,previewID=0,timer,url,font,restoring=false;
try{const saved=JSON.parse(localStorage.getItem('dm-layout-v1')||'{}');for(const k of keys)if(k!=='start'&&k in saved&&typeof saved[k]===typeof DEFAULTS[k])settings[k]=saved[k];}catch{}
let aspectRatio=settings.width/settings.height;
function save(){const {start,...safe}=settings;try{localStorage.setItem('dm-layout-v1',JSON.stringify(safe));}catch{}}
function clearPreview(message){
 $('label-preview').className='label-placeholder';$('label-preview').textContent=message;
 $('sheet-preview').textContent=message;
}
function showError(message){$('errors').hidden=!message;$('errors').textContent=message||'';if(message)clearPreview('Предпросмотр недоступен. Проверьте параметры.');}
function clearResult(){if(url)URL.revokeObjectURL(url);url=null;$('result').hidden=true;$('result').replaceChildren();}
function paintInputs(){for(const k of keys){const el=$(k);if(!el||k==='mode')continue;if(booleans.includes(k))el.checked=settings[k];else el.value=settings[k];}}
function controls(){
 $('a4-settings').hidden=settings.mode!=='a4';$('sheet-card').hidden=settings.mode!=='a4';$('previews').classList.toggle('a4',settings.mode==='a4');
 $('number-settings').hidden=!settings.number;$('frame-settings').hidden=!settings.frame;$('radius-field').hidden=!settings.rounded;$('round-hint').hidden=!(settings.rounded&&!settings.frame);
 for(const b of document.querySelectorAll('[data-mode]')){b.classList.toggle('active',b.dataset.mode===settings.mode);b.disabled=busy;}
 for(const k of keys){if($(k)&&k!=='mode')$(k).disabled=busy;}
 $('file').disabled=busy;$('reset').disabled=busy;$('all').disabled=busy||!count;
 $('from').disabled=$('to').disabled=busy||!count||$('all').checked;
 $('row').disabled=busy||!count;$('previous').disabled=$('next').disabled=busy||!count;
 $('export').disabled=busy||!valid||!count||!font;
 $('label-size').textContent=`${settings.width} × ${settings.height} мм`;$('code-size').textContent=`Код ${settings.side} × ${settings.side} мм`;
}
function summary(){
 const r=rangeOf(+$('from').value,+$('to').value,count);
 const g=layout(settings,144,numberFor(settings,count,count-1));
 $('export-count').textContent=r.count.toLocaleString('ru-RU')+' этикеток';
 $('export-pages').textContent=Math.ceil(r.count/g.perPage).toLocaleString('ru-RU')+' страниц PDF';
 $('number-summary').textContent=settings.number?`Номера: ${numberFor(settings,count,r.from)} — ${numberFor(settings,count,r.to-1)} · порядок строк сохранён`:'Без порядковых номеров';
 $('sheet-layout').textContent=`${g.columns} × ${g.rows} · ${g.perPage} этикеток / лист`;
 return r;
}
function requestPreview(){
 valid=false;clearResult();controls();previewID++;clearTimeout(timer);
 if(!count)return;
 clearPreview('Обновление предпросмотра…');
 try{summary();}catch(e){showError(e.message);return;}
 showError('');const id=previewID;
 timer=setTimeout(()=>worker.postMessage({type:'preview',id,settings,index:Math.min(count-1,Math.max(0,+$('row').value-1)),from:+$('from').value,to:+$('to').value}),150);
}
function labelBody(m,g,number){
 let frame='';
 if(settings.frame)frame=`<rect x="${settings.inset}" y="${settings.inset}" width="${settings.width-2*settings.inset}" height="${settings.height-2*settings.inset}" rx="${settings.rounded?settings.radius:0}" fill="none" stroke="black" stroke-width="${settings.stroke/MM}"/>`;
 const path=svgPath(m);
 return `${frame}<svg x="${g.x}" y="${g.y}" width="${settings.side}" height="${settings.side}" viewBox="0 0 ${m.size} ${m.size}" shape-rendering="crispEdges"><path fill="black" d="${path}"/></svg>${settings.number?`<text x="${settings.width/2}" y="${g.baseline}" text-anchor="middle" font-family="LabelFont" font-size="${settings.font/MM}">${number}</text>`:''}`;
}
function renderPreview(m){
 $('label-preview').className='';$('label-preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${settings.width} ${settings.height}" role="img" aria-label="Этикетка, строка ${m.index+1}"><rect width="100%" height="100%" fill="white"/>${labelBody(m.matrix,m.g,m.number)}</svg>`;
 if(settings.mode==='a4'){
  let body='';m.tiles.forEach((t,i)=>{const x=settings.margin+(i%m.g.columns)*(settings.width+settings.gap),y=settings.margin+Math.floor(i/m.g.columns)*(settings.height+settings.gap);body+=`<g transform="translate(${x} ${y})">${labelBody(t.matrix,t.g,t.number)}</g>`;});
  $('sheet-preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" role="img" aria-label="Предпросмотр листа А4"><rect width="210" height="297" fill="white"/>${body}</svg>`;
 }
}
function startWorker(){
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data:m})=>{
  if(m.type==='loaded'){
   busy=false;$('progress-panel').hidden=true;
   if(m.errorCount){count=0;valid=false;showError(`Файл не принят. Ошибок: ${m.errorCount}.\n${m.errors.join('\n')}`);$('file-title').textContent='Проверьте файл кодов';$('file-subtitle').textContent='Исправьте перечисленные строки и выберите файл снова.';controls();return;}
   count=m.count;$('file-title').textContent=file.name;$('file-subtitle').textContent=`${count.toLocaleString('ru-RU')} уникальных кодов · служебные символы сохранены`;
   if(!restoring){$('from').value=1;$('to').value=count;$('all').checked=true;$('row').value=1;}
   restoring=false;$('row').max=count;$('row-total').textContent='/ '+count.toLocaleString('ru-RU');requestPreview();
  }else if(m.type==='preview'&&m.id===previewID){
   try{renderPreview(m);summary();valid=true;showError('');}catch(e){valid=false;showError(e.message);}controls();
  }else if(m.type==='progress'){
   $('progress').value=m.current/m.total*100;$('progress-text').textContent=`Сгенерировано ${m.current.toLocaleString('ru-RU')} из ${m.total.toLocaleString('ru-RU')} · ${Math.round(m.current/m.total*100)}%`;
  }else if(m.type==='done'){
   busy=false;$('progress-panel').hidden=true;url=URL.createObjectURL(m.blob);
   const a=document.createElement('a');a.href=url;a.download=`${file.name.replace(/\.csv$/i,'')}_${$('from').value}-${$('to').value}_${settings.mode}.pdf`;a.textContent='Скачать PDF ↓';
   $('result').hidden=false;$('result').textContent=`PDF готов · ${m.blob.size<1048576?Math.ceil(m.blob.size/1024)+' КБ':(m.blob.size/1024/1024).toLocaleString('ru-RU',{maximumFractionDigits:1})+' МБ'}`;$('result').append(a);controls();a.click();
  }else if(m.type==='error'&&(m.id==null||m.id===previewID)){
   busy=false;valid=false;$('progress-panel').hidden=true;showError(m.message);controls();
  }
 };
 worker.onerror=()=>{busy=false;valid=false;showError('Ошибка обработки. Обновите страницу и выберите файл заново. Если ошибка повторяется на большой партии, попробуйте меньший диапазон.');$('progress-panel').hidden=true;controls();};
}
function loadFile(f){
 if(busy||!f)return;
 if(f.size>160*1024*1024){showError('Файл больше 160 МБ. Разделите партию на несколько файлов.');return;}
 worker.terminate();startWorker();file=f;count=0;valid=false;busy=true;settings.start=1;$('start').value=1;clearResult();showError('');
 $('label-preview').className='label-placeholder';$('label-preview').innerHTML='<span>▦</span><p>Проверка нового файла…</p>';$('sheet-preview').replaceChildren();$('export-count').textContent='— этикеток';$('export-pages').textContent='Проверка файла';$('row-total').textContent='/ —';
 $('file-title').textContent='Проверка файла…';$('file-subtitle').textContent='Пустые строки, повторы и формат данных';controls();
 worker.postMessage({type:'load',file:f});
}
for(const k of keys){
 const el=$(k);if(!el||k==='mode')continue;
 const update=()=>{
  const value=booleans.includes(k)?el.checked:['position'].includes(k)?el.value:Number(el.value);
  if(k==='width'||k==='height'){
   settings=resizeCanvas(settings,k,value,aspectRatio);
   const other=k==='width'?'height':'width';$(other).value=settings[other];
  }else settings[k]=value;
  if(k==='lockAspect'&&value)aspectRatio=settings.width/settings.height;
  save();requestPreview();controls();
 };
 el.addEventListener('change',update);if(el.type==='number')el.addEventListener('input',update);
}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{settings.mode=b.dataset.mode;save();requestPreview();controls();};
$('file').onchange=e=>{loadFile(e.target.files[0]);e.target.value='';};
for(const type of ['dragover','dragenter'])$('dropzone').addEventListener(type,e=>{e.preventDefault();if(!busy)$('dropzone').classList.add('drag');});
for(const type of ['dragleave','drop'])$('dropzone').addEventListener(type,e=>{e.preventDefault();$('dropzone').classList.remove('drag');if(type==='drop')loadFile(e.dataTransfer.files[0]);});
$('row').onchange=()=>{const value=+$('row').value;if(!Number.isInteger(value)||value<1||value>count){showError('Номер строки должен быть от 1 до '+count+'.');valid=false;controls();return;}requestPreview();};
$('previous').onclick=()=>{if(+$('row').value>1){$('row').value--;requestPreview();}};
$('next').onclick=()=>{if(+$('row').value<count){$('row').value++;requestPreview();}};
for(const id of ['from','to']){$(id).onchange=requestPreview;$(id).oninput=requestPreview;}
$('all').onchange=()=>{if($('all').checked){$('from').value=1;$('to').value=count;}requestPreview();controls();};
$('reset').onclick=()=>{settings={...DEFAULTS};aspectRatio=1;save();paintInputs();requestPreview();controls();};
$('export').onclick=async()=>{
 try{summary();if(!valid||busy||!font)return;clearResult();showError('');busy=true;controls();$('progress-panel').hidden=false;$('progress').value=0;$('progress-text').textContent='Подготовка PDF…';
  worker.postMessage({type:'generate',settings,from:+$('from').value,to:+$('to').value,font});
 }catch(e){busy=false;showError(e.message);controls();}
};
$('cancel').onclick=()=>{
 worker.terminate();busy=false;valid=false;previewID++;$('progress-panel').hidden=true;clearResult();
 $('result').hidden=false;$('result').textContent='Генерация отменена. Файл PDF не создан. Данные перечитываются локально.';
 startWorker();if(file){restoring=true;busy=true;controls();worker.postMessage({type:'load',file});}
};
window.addEventListener('beforeunload',()=>{if(url)URL.revokeObjectURL(url);worker.terminate();});
startWorker();paintInputs();controls();
fetch(new URL('../fonts/LiberationSans-Bold.ttf',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();}).then(b=>{font=b;controls();}).catch(()=>showError('Не удалось загрузить встроенный шрифт приложения. Обновите страницу.'));
