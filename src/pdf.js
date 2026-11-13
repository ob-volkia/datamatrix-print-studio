import {zlibSync} from 'fflate';
import {MM,layout,numberFor} from './model.js';
import {matrixFor,runs} from './barcode.js';
import fontMetrics from './fontmetrics.js';
const encoder=new TextEncoder();const ascii=s=>encoder.encode(s);
const num=n=>Number(n.toFixed(4)).toString();
// Keep only compressed bytes and a compact xref table, rather than page objects.
class PDFWriter{
 constructor(){this.parts=[];this.batch=new Uint8Array(4*1024*1024);this.used=0;this.position=0;this.offsets=[0];this.append(ascii('%PDF-1.7\n'));this.append(Uint8Array.of(37,226,227,207,211,10));}
 append(bytes){let from=0;while(from<bytes.length){const n=Math.min(bytes.length-from,this.batch.length-this.used);this.batch.set(bytes.subarray(from,from+n),this.used);this.used+=n;this.position+=n;from+=n;if(this.used===this.batch.length){this.parts.push(this.batch);this.batch=new Uint8Array(4*1024*1024);this.used=0;}}}
 object(id,body){this.offsets[id]=this.position;this.append(ascii(`${id} 0 obj\n${body}\nendobj\n`));}
 stream(id,bytes,extra=''){const compressed=zlibSync(bytes,{level:6});this.offsets[id]=this.position;this.append(ascii(`${id} 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode ${extra} >>\nstream\n`));this.append(compressed);this.append(ascii('\nendstream\nendobj\n'));}
 finish(){const at=this.position;let xref=`xref\n0 ${this.offsets.length}\n0000000000 65535 f \n`;for(let i=1;i<this.offsets.length;i++)xref+=`${String(this.offsets[i]).padStart(10,'0')} 00000 n \n`;this.append(ascii(xref+`trailer\n<< /Size ${this.offsets.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${at}\n%%EOF\n`));if(this.used)this.parts.push(this.batch.slice(0,this.used));return new Blob(this.parts,{type:'application/pdf'});}
}
function roundRect(x,y,w,h,r){
 if(!r)return `${num(x)} ${num(y)} ${num(w)} ${num(h)} re S\n`;
 const k=r*.5522847498307936,n=num;
 return `${n(x+r)} ${n(y)} m ${n(x+w-r)} ${n(y)} l ${n(x+w-r+k)} ${n(y)} ${n(x+w)} ${n(y+r-k)} ${n(x+w)} ${n(y+r)} c ${n(x+w)} ${n(y+h-r)} l ${n(x+w)} ${n(y+h-r+k)} ${n(x+w-r+k)} ${n(y+h)} ${n(x+w-r)} ${n(y+h)} c ${n(x+r)} ${n(y+h)} l ${n(x+r-k)} ${n(y+h)} ${n(x)} ${n(y+h-r+k)} ${n(x)} ${n(y+h-r)} c ${n(x)} ${n(y+r)} l ${n(x)} ${n(y+r-k)} ${n(x+r-k)} ${n(y)} ${n(x+r)} ${n(y)} c h S\n`;
}
export async function generatePDF(codes,s,range,fontBytes,progress=()=>{}){
 const last=numberFor(s,codes.length,codes.length-1),geometry=layout(s,144,last);
 const perPage=geometry.perPage,pageWidth=(s.mode==='a4'?210:s.width)*MM,pageHeight=(s.mode==='a4'?297:s.height)*MM;
 const writer=new PDFWriter();const kids=[];let pageIndex=0,content='';
 const m=fontMetrics;
 writer.object(3,`<< /Type /Font /Subtype /TrueType /BaseFont /${m.name} /Encoding /WinAnsiEncoding /FirstChar 48 /LastChar 57 /Widths [${m.widths.join(' ')}] /FontDescriptor 4 0 R >>`);
 writer.object(4,`<< /Type /FontDescriptor /FontName /${m.name} /Flags 32 /FontBBox [${m.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${m.ascent} /Descent ${m.descent} /CapHeight ${m.capHeight} /StemV 120 /FontFile2 5 0 R >>`);
 const font=new Uint8Array(fontBytes);writer.stream(5,font,`/Length1 ${font.byteLength}`);writer.object(6,'<< /Title (Data Matrix Print Studio) /Creator (Data Matrix Print Studio) >>');
 const flush=()=>{
  const pageID=7+pageIndex*2,streamID=pageID+1;kids.push(pageID+' 0 R');
  writer.object(pageID,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageWidth)} ${num(pageHeight)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamID} 0 R >>`);
  writer.stream(streamID,ascii(content+'Q\n'));pageIndex++;content='';
 };
 for(let i=range.from;i<range.to;i++){
  const slot=(i-range.from)%perPage;
  if(slot===0)content=`q 1 0 0 -1 0 ${num(pageHeight)} cm 0 g 0 G\n`;
  let matrix;try{matrix=matrixFor(codes[i]);}catch{throw Error(`Строка ${i+1}: невозможно сгенерировать Data Matrix.`);}
  const label=numberFor(s,codes.length,i),g=layout(s,matrix.size,last);
  const ox=(s.mode==='a4'?s.margin+(slot%g.columns)*(s.width+s.gap):0)*MM;
  const oy=(s.mode==='a4'?s.margin+Math.floor(slot/g.columns)*(s.height+s.gap):0)*MM;
  content+=`q 1 0 0 1 ${num(ox)} ${num(oy)} cm\n`;
  if(s.frame)content+=`${num(s.stroke)} w\n`+roundRect(s.inset*MM,s.inset*MM,(s.width-2*s.inset)*MM,(s.height-2*s.inset)*MM,s.rounded?s.radius*MM:0);
  const cell=s.side*MM/matrix.size;
  runs(matrix,(x,y,w)=>content+=`${num(g.x*MM+x*cell)} ${num(g.y*MM+y*cell)} ${num(w*cell)} ${num(cell)} re\n`);content+='f\n';
  if(s.number){const width=Array.from(label,c=>m.widths[c.charCodeAt(0)-48]).reduce((a,b)=>a+b,0)*s.font/1000;content+=`BT /F1 ${num(s.font)} Tf 1 0 0 -1 ${num((s.width*MM-width)/2)} ${num(g.baseline*MM)} Tm (${label}) Tj ET\n`;}
  content+='Q\n';
  if(slot===perPage-1||i+1===range.to)flush();
  if((i-range.from)%100===0||i+1===range.to){progress(i-range.from+1,range.count,writer.position);await new Promise(r=>setTimeout(r,0));}
 }
 writer.object(2,`<< /Type /Pages /Count ${pageIndex} /Kids [${kids.join(' ')}] >>`);writer.object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 return writer.finish();
}
