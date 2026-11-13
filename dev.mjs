import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const content=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(content);
}catch{res.writeHead(404).end('Not found');}});server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
