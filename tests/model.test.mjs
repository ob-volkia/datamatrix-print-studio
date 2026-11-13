import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseInput,DEFAULTS as D,layout,rangeOf,numberFor,digitsFor} from '../src/model.js';
const code=i=>`010460123456789021${String(i).padStart(6,'0')}\x1d93aB;\",^`;
const parse=s=>parseInput(new TextEncoder().encode(s));
test('punctuation and byte separator remain data',()=>{let c=code(1);let r=parse(c+'\r\n'+code(2)+'\r\n');assert.equal(r.errorCount,0);assert.equal(r.codes[0],c);assert.equal(r.count,2);});
test('internal blank lines do not shift row numbers',()=>{let r=parse(code(1)+'\n\n'+code(2)+'\n');assert.equal(r.count,3);assert.match(r.errors.join(),/Строка 2/);});
test('duplicates include source row numbers',()=>{let r=parse(code(1)+'\n'+code(1));assert.match(r.errors.join(),/Строки 1 и 2/);});
test('empty file and headers are refused',()=>{assert.ok(parse('').errorCount);assert.ok(parse('code\n'+code(1)).errorCount);});
test('100000 limit and BOM',()=>{assert.equal(parse('\ufeff'+code(1)).errorCount,0);assert.ok(parse(Array(100002).fill(code(1)).join('\n')).errorCount);});
test('format considers final number of entire party',()=>{assert.equal(numberFor({...D,start:95000},10000,0),'095000');assert.equal(numberFor({...D,start:95000},10000,9999),'104999');assert.equal(numberFor({...D,digits:1},100000,99999),'100000');});
test('range keeps original numbering',()=>{let r=rangeOf(501,1000,20000);assert.equal(r.count,500);assert.equal(numberFor(D,20000,r.from),'00501');assert.throws(()=>rangeOf(2,1,5));});
test('A4 fits 7 columns × 10 rows at default dimensions',()=>{let g=layout({...D,mode:'a4'},26);assert.equal(g.columns,7);assert.equal(g.rows,10);assert.equal(g.perPage,70);});
test('overflow never shrinks the barcode',()=>{assert.throws(()=>layout({...D,side:25},26));assert.throws(()=>layout({...D,mode:'a4',width:220},26));});
test('number-free code is centered both ways',()=>{let g=layout({...D,number:false},26);assert.equal(g.x,5);assert.equal(g.y,5);});
test('rounded border and edge thickness remain within label',()=>{assert.throws(()=>layout({...D,rounded:true,radius:20},26));assert.throws(()=>layout({...D,stroke:10,inset:12},26));});

test('border stroke cannot be clipped by page edge',()=>{assert.throws(()=>layout({...D,inset:0},26),/край холста/);});
