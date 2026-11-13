import bwip from 'bwip-js/browser';
export function matrixFor(code){
 // Raw Data Matrix ASCII codewords prevent user punctuation from becoming escapes.
 // 232 is the leading FNC1; digit pairs use standard ASCII-mode compression.
 const words=[232];
 for(let i=0;i<code.length;i++){
  const c=code.charCodeAt(i),next=code.charCodeAt(i+1);
  if(c>=48&&c<=57&&next>=48&&next<=57){words.push(130+(c-48)*10+next-48);i++;}
  else words.push(c+1);
 }
 const [raw]=bwip.raw({bcid:'datamatrix',text:words.map(n=>'^'+n.toString().padStart(3,'0')).join(''),raw:true});
 if(!raw||raw.pixx!==raw.pixy)throw Error('Не удалось создать квадратный Data Matrix.');
 return {size:raw.pixx,pixels:Uint8Array.from(raw.pixs)};
}
export function runs(matrix,callback){
 for(let y=0;y<matrix.size;y++)for(let x=0;x<matrix.size;){
  if(!matrix.pixels[y*matrix.size+x]){x++;continue;}
  let end=x+1;while(end<matrix.size&&matrix.pixels[y*matrix.size+end])end++;
  callback(x,y,end-x);x=end;
 }
}
export function svgPath(matrix){let path='';runs(matrix,(x,y,w)=>path+=`M${x} ${y}h${w}v1h-${w}z`);return path;}
