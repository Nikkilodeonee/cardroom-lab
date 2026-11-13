import path from 'node:path';
export const ORIGIN='cardroom://app';
export const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
export function isAppUrl(input){try{const u=new URL(input);return u.protocol==='cardroom:'&&u.hostname==='app'&&!u.username&&!u.password&&!u.port;}catch{return false;}}
export function externalUrl(input){try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function assetPath(input,distRoot,desktopRoot){
 if(!isAppUrl(input))throw new Error('Unknown application origin.');
 const u=new URL(input),rel=decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html';
 if(rel.includes('\\')||rel.includes('\0')||rel.split('/').some(p=>p==='..'||p==='.')||/^[A-Za-z]:/.test(rel))throw new Error('Invalid asset path.');
 const picker=new Set(['__desktop/source-picker.html','__desktop/source-picker.css','__desktop/source-picker.mjs']);
 const root=picker.has(rel)?desktopRoot:distRoot,name=picker.has(rel)?rel.slice('__desktop/'.length):rel;
 if(rel.startsWith('__desktop/')&&!picker.has(rel))throw new Error('Unknown desktop asset.');
 const file=path.resolve(root,name),base=path.resolve(root);
 if(!file.startsWith(base+path.sep)||!['.html','.css','.mjs','.js','.svg','.json','.webmanifest','.png','.ico'].includes(path.extname(file)))throw new Error('Unknown application asset.');
 return file;
}
export function modelRequest(input){
 if(!input||typeof input.id!=='string'||!/^[\w-]{1,80}$/.test(input.id)||typeof input.url!=='string')throw new Error('Invalid local model request.');
 const u=new URL(input.url),allowed=new Set(['/api/tags','/api/show','/api/chat']);
 if(!['http:','https:'].includes(u.protocol)||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||!allowed.has(u.pathname))throw new Error('Only local Ollama card and model APIs are allowed.');
 const method=input.method||'GET';if(method!=='GET'&&method!=='POST'||method==='GET'&&u.pathname!=='/api/tags'||method==='POST'&&u.pathname==='/api/tags')throw new Error('Unsupported local model method.');
 if(method==='GET'&&input.body!==undefined)throw new Error('A model list request cannot include a body.');
 if(input.body!==undefined&&(typeof input.body!=='string'||Buffer.byteLength(input.body)>24*1024*1024))throw new Error('Local model request is too large.');
 if(method==='POST'){const body=JSON.parse(input.body);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid local model payload.');}
 return {id:input.id,url:u.href,method,body:input.body};
}
