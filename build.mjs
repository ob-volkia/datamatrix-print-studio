import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.rm('dist',{recursive:true,force:true});await fs.mkdir('dist',{recursive:true});await fs.cp('public','dist',{recursive:true});
await build({entryPoints:['src/app.js','src/worker.js'],outdir:'dist/assets',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{global:'globalThis'},logLevel:'info'});
await fs.copyFile('index.html','dist/index.html');await fs.copyFile('src/style.css','dist/assets/style.css');
