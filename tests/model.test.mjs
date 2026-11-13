import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseInput,DEFAULTS as D,layout,rangeOf,numberFor,digitsFor,MM,resizeCanvas} from '../src/model.js';
const code=i=>`010460123456789021${String(i).padStart(6,'0')}\x1d93aB;\",^`;
const parse=s=>parseInput(new TextEncoder().encode(s));
test('punctuation and byte separator remain data',()=>{let c=code(1);let r=parse(c+'\r\n'+code(2)+'\r\n');assert.equal(r.errorCount,0);assert.equal(r.codes[0],c);assert.equal(r.count,2);});
test('internal blank lines do not shift row numbers',()=>{let r=parse(code(1)+'\n\n'+code(2)+'\n');assert.equal(r.count,3);assert.match(r.errors.join(),/Строка 2/);});
test('duplicates include source row numbers',()=>{let r=parse(code(1)+'\n'+code(1));assert.match(r.errors.join(),/Строки 1 и 2/);});
test('empty file and headers are refused',()=>{assert.ok(parse('').errorCount);assert.ok(parse('code\n'+code(1)).errorCount);});
test('100000 limit and BOM',()=>{assert.equal(parse('\ufeff'+code(1)).errorCount,0);assert.ok(parse(Array(100002).fill(code(1)).join('\n')).errorCount);});
test('format considers final number of entire party',()=>{assert.equal(numberFor({...D,start:95000},10000,0),'095000');assert.equal(numberFor({...D,start:95000},10000,9999),'104999');assert.equal(numberFor({...D,digits:1},100000,99999),'100000');});
test('range keeps original numbering',()=>{let r=rangeOf(501,1000,20000);assert.equal(r.count,500);assert.equal(numberFor(D,20000,r.from),'00501');assert.throws(()=>rangeOf(2,1,5));});
test('A4 fits 9 columns × 13 rows at default dimensions',()=>{let g=layout({...D,mode:'a4'},26);assert.equal(g.columns,9);assert.equal(g.rows,13);assert.equal(g.perPage,117);});
test('overflow never shrinks the barcode',()=>{assert.throws(()=>layout({...D,side:25},26));assert.throws(()=>layout({...D,mode:'a4',width:220},26));});
test('number-free code is centered both ways',()=>{let g=layout({...D,number:false},26);assert.equal(g.x,2.5);assert.equal(g.y,2.5);});
test('rounded border and edge thickness remain within label',()=>{assert.throws(()=>layout({...D,frame:true,rounded:true,radius:20},26));assert.throws(()=>layout({...D,frame:true,stroke:10,inset:12},26));});

test('border stroke cannot be clipped by page edge',()=>{assert.throws(()=>layout({...D,frame:true,inset:0},26),/край холста/);});

test('number ink is centered between matrix and border, above and below',()=>{
 for(const position of ['top','bottom'])for(const font of [3,5,7,12]){
  const g=layout({...D,width:25,height:25,frame:true,position,font},22);
  assert.ok(Math.abs((g.numberTop+g.numberBottom)/2-(g.bandTop+g.bandBottom)/2)<1e-10);
  assert.ok(g.numberTop-g.bandTop>=g.quiet-1e-9);
  assert.ok(g.bandBottom-g.numberBottom>=g.quiet-1e-9);
 }
});
test('compact screenshot layout fits without shrinking the 15mm code',()=>{
 const s={...D,width:20,height:20,side:15,font:5,frame:true,inset:.6};
 for(const modules of [20,22,26]){
  const g=layout(s,modules);
  assert.ok(g.y>=s.inset+s.stroke/MM/2+g.quiet-1e-9);
  assert.ok(Math.abs((g.numberTop-g.bandTop)-(g.bandBottom-g.numberBottom))<1e-10);
 }
});
test('top and bottom layouts are mirror images',()=>{
 const a=layout(D,22),b=layout({...D,position:'top'},22);
 assert.ok(Math.abs(a.y+b.y+D.side-D.height)<1e-10);
 assert.ok(Math.abs(a.numberTop+b.numberBottom-D.height)<1e-10);
});


test('aspect lock preserves current ratio in either direction',()=>{
 const s={...D,width:30,height:20,lockAspect:true};
 let a=resizeCanvas(s,'width',45,1.5);assert.equal(a.height,30);
 a=resizeCanvas(a,'height',24,1.5);assert.equal(a.width,36);
 assert.equal(a.side,s.side);
});
test('unlocked canvas dimensions remain independent',()=>{
 assert.equal(resizeCanvas({...D,width:30,height:20,lockAspect:false},'width',45).height,20);
});
test('aspect lock tolerates an empty edit and does not silently clamp dimensions',()=>{
 const s={...D,width:30,height:20,lockAspect:true};
 assert.equal(resizeCanvas(s,'width',0,1.5).height,20);
 const a=resizeCanvas(s,'height',1000,1.5);assert.equal(a.width,1500);assert.throws(()=>layout(a));
});
