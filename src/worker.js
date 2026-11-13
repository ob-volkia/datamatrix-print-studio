import {parseInput,rangeOf,layout,numberFor} from './model.js';
import {matrixFor} from './barcode.js';
import {generatePDF} from './pdf.js';
let codes=[],font;
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='load'){
   const result=parseInput(await m.file.arrayBuffer());codes=result.errorCount?[]:result.codes;
   self.postMessage({type:'loaded',count:result.count,errors:result.errors,errorCount:result.errorCount});
  }else if(m.type==='preview'){
   if(!codes.length)return;
   const matrix=matrixFor(codes[m.index]);const last=numberFor(m.settings,codes.length,codes.length-1);
   const g=layout(m.settings,matrix.size,last);
   const range=rangeOf(m.from,m.to,codes.length);
   const sheetStart=range.from+Math.floor(Math.max(0,m.index-range.from)/g.perPage)*g.perPage;
   const tiles=[];
   if(m.settings.mode==='a4')for(let i=sheetStart;i<Math.min(range.to,sheetStart+g.perPage);i++){
    const mat=matrixFor(codes[i]);const geom=layout(m.settings,mat.size,last);tiles.push({matrix:mat,g:geom,number:numberFor(m.settings,codes.length,i)});
   }
   self.postMessage({type:'preview',id:m.id,index:m.index,matrix,g,number:numberFor(m.settings,codes.length,m.index),tiles,sheetStart});
  }else if(m.type==='generate'){
   font=m.font;const range=rangeOf(m.from,m.to,codes.length);
   const blob=await generatePDF(codes,m.settings,range,font,(current,total)=>self.postMessage({type:'progress',current,total}));
   self.postMessage({type:'done',blob});
  }
 }catch(e){self.postMessage({type:'error',id:m.id,message:e.message||'Не удалось обработать файл. Проверьте параметры.'});}
};
