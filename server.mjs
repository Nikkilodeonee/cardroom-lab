import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}let rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';let file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}});
const port=Number(process.env.PORT)||4178;server.listen(port,'127.0.0.1',()=>console.log(`Cardroom Lab: http://127.0.0.1:${port}`));
