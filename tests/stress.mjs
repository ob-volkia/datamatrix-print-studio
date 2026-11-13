import {DEFAULTS,parseInput,rangeOf} from '../src/model.js';import {generatePDF} from '../src/pdf.js';import fs from 'node:fs/promises';
const codes=Array.from({length:100000},(_,i)=>`010460123456789021${String(i+1).padStart(6,'0')}\x1d93ABCD`);
const parsed=parseInput(new TextEncoder().encode(codes.join('\r\n')+'\r\n'));
if(parsed.errorCount)throw Error('Stress input invalid');
const started=Date.now(),font=await fs.readFile('public/fonts/LiberationSans-Bold.ttf');
const blob=await generatePDF(codes,{...DEFAULTS},rangeOf(1,codes.length,codes.length),font,(n)=>{if(n%10000===1)console.log(n,'codes',Math.round((Date.now()-started)/1000),'seconds');});
await fs.writeFile('tmp/stress-100000.pdf',new Uint8Array(await blob.arrayBuffer()));
console.log(JSON.stringify({count:codes.length,bytes:blob.size,seconds:(Date.now()-started)/1000,rssMB:process.memoryUsage().rss/1024**2}));
