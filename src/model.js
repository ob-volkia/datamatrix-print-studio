export const DEFAULTS = Object.freeze({width:25,height:25,side:15,font:7,number:true,position:'bottom',start:1,digits:0,frame:true,stroke:.4,inset:1,rounded:false,radius:1.3,mode:'label',margin:5,gap:2});
export const MM=72/25.4;
export function parseInput(buffer) {
 const bytes=new Uint8Array(buffer);let offset=0;
 if(bytes[0]===239&&bytes[1]===187&&bytes[2]===191)offset=3;
 const errors=[],rows=[];let begin=offset;
 for(let i=offset;i<=bytes.length;i++){
  if(i!==bytes.length&&bytes[i]!==10&&bytes[i]!==13)continue;
  rows.push(bytes.subarray(begin,i));if(bytes[i]===13&&bytes[i+1]===10)i++;begin=i+1;
 }
 if(rows.length&&rows.at(-1).length===0)rows.pop();
 if(!rows.length)errors.push('Файл пуст.');
 if(rows.length>100000)return {codes:[],errors:['В файле больше 100 000 строк. Разделите партию.'],errorCount:1,count:rows.length};
 const codes=[],seen=new Map();
 rows.forEach((r,i)=>{
  const line=i+1;
  if(!r.length){errors.push(`Строка ${line}: пустая строка.`);codes.push('');return;}
  if(r.some(b=>b!==29&&(b<32||b>126))){errors.push(`Строка ${line}: неподдерживаемые символы или кодировка. Нужен исходный файл кодов без преобразований.`);codes.push('');return;}
  if(r.length>1500){errors.push(`Строка ${line}: код слишком длинный.`);codes.push('');return;}
  const code=String.fromCharCode(...r);
  if(!/^01\d{14}21/.test(code)||!code.includes('\x1d'))errors.push(`Строка ${line}: ожидается код маркировки, как в образце, без заголовков и столбцов.`);
  if(seen.has(code))errors.push(`Строки ${seen.get(code)} и ${line}: одинаковые коды.`);else seen.set(code,line);
  codes.push(code);
 });
 return {codes,errors:errors.slice(0,100),errorCount:errors.length,count:rows.length};
}
export function digitsFor(s,count){return s.digits||Math.max(5,String(s.start+count-1).length);}
export function numberFor(s,count,index){return String(s.start+index).padStart(digitsFor(s,count),'0');}
export function validateSettings(s){
 for(const [key,min,max] of [['width',5,1000],['height',5,1000],['side',3,500],['font',3,72],['stroke',.1,10],['inset',0,100],['radius',0,100],['margin',0,100],['gap',0,100]]){
  if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`Параметр «${({width:'Ширина',height:'Высота',side:'Сторона кода',font:'Шрифт',stroke:'Толщина рамки',inset:'Отступ рамки',radius:'Радиус',margin:'Поля А4',gap:'Промежутки'})[key]}»: допустимо ${min}–${max}.`);
 }
 if(!Number.isSafeInteger(s.start)||s.start<1||s.start>999999999)throw Error('Начальный номер: целое число от 1 до 999 999 999.');
 if(!Number.isInteger(s.digits)||s.digits<0||s.digits>12)throw Error('Количество цифр: Авто или от 1 до 12.');
 if(!['top','bottom'].includes(s.position)||!['label','a4'].includes(s.mode))throw Error('Неизвестный режим макета.');
}
export function layout(s,modules=26,lastNumber='00001'){
 validateSettings(s);
 const quiet=Math.max(.5,s.side/modules); // At least one clear module on every side.
 const stroke=s.stroke/MM;
 if(s.frame&&s.inset<stroke/2)throw Error('Отступ рамки слишком мал: линия выходит за край холста. Увеличьте отступ или уменьшите толщину.');
 const edge=s.frame?s.inset+stroke/2:0;
 // Keep contents away from the curved corner as well as the straight border.
 const curve=s.frame&&s.rounded?s.radius*(1-Math.SQRT1_2):0;
 const available=edge+curve;
 if(s.frame&&(s.inset*2+stroke>=Math.min(s.width,s.height)))throw Error('Рамка не помещается на холсте.');
 if(s.frame&&s.rounded&&s.radius*2>Math.min(s.width,s.height)-2*s.inset)throw Error('Радиус скругления слишком большой для рамки.');
 const fontMm=s.font/MM,inkH=fontMm*.73;
 const groupHeight=s.side+quiet*2+(s.number?1+inkH:0);
 const numWidth=lastNumber.length*fontMm*.557;
 if(s.side+2*quiet> s.width-2*available||groupHeight>s.height-2*available||s.number&&numWidth>s.width-2*available)
  throw Error('Код, номер и защитные отступы не помещаются. Увеличьте холст или уменьшите код / шрифт.');
 const top=(s.height-groupHeight)/2;
 const codeY=top+quiet+(s.number&&s.position==='top'?inkH+1:0);
 const baseline=s.position==='top'?top+inkH:codeY+s.side+quiet+1+inkH;
 const columns=Math.floor((210-2*s.margin+s.gap)/(s.width+s.gap));
 const rows=Math.floor((297-2*s.margin+s.gap)/(s.height+s.gap));
 if(s.mode==='a4'&&(columns<1||rows<1))throw Error('Этикетка не помещается на А4 с заданными полями.');
 return {x:(s.width-s.side)/2,y:codeY,quiet,baseline,columns,rows,perPage:s.mode==='a4'?columns*rows:1};
}
export function rangeOf(from,to,count){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>count)throw Error('Диапазон должен быть в пределах файла: от 1 до '+count+'.');
 return {from:from-1,to,count:to-from+1};
}
