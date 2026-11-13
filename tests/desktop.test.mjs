import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {isAppUrl,externalUrl,assetPath,modelRequest} from '../desktop/policy.mjs';
import {localModelFetch} from '../dist/model-transport.mjs';
test('desktop serves only packaged assets from its own origin',()=>{
 const dist=path.resolve('dist'),desktop=path.resolve('desktop');
 assert.equal(assetPath('cardroom://app/index.html',dist,desktop),path.join(dist,'index.html'));
 assert.equal(assetPath('cardroom://app/app.mjs?v=2.2.0',dist,desktop),path.join(dist,'app.mjs'));
 assert.equal(assetPath('cardroom://app/__desktop/source-picker.html',dist,desktop),path.join(desktop,'source-picker.html'));
 for(const input of ['https://example.org/index.html','file:///C:/Windows/win.ini','cardroom://app/%2e%2e%2fdesktop/main.mjs','cardroom://app/C:/Windows/test.svg','cardroom://app/__desktop/main.mjs','cardroom://app/%5c..%5capp.mjs'])assert.throws(()=>assetPath(input,dist,desktop));
});
test('desktop navigation never opens filesystem, command, credential-bearing or insecure links',()=>{
 assert.equal(isAppUrl('cardroom://app/#blackjack'),true);assert.equal(isAppUrl('cardroom://attacker/index.html'),false);assert.equal(isAppUrl('cardroom://user:secret@app/index.html'),false);
 assert.equal(externalUrl('https://github.com/Nikkilodeonee/cardroom-lab'),'https://github.com/Nikkilodeonee/cardroom-lab');
 for(const input of ['file:///C:/test.exe','javascript:alert(1)','cmd://test','http://example.org','https://user:secret@example.org'])assert.equal(externalUrl(input),null);
});
test('desktop model bridge permits only bounded localhost inference and discovery requests',()=>{
 const payload={id:'test-1',url:'http://127.0.0.1:11434/api/chat',method:'POST',body:JSON.stringify({model:'vision',stream:false})};
 assert.equal(modelRequest(payload).method,'POST');assert.equal(modelRequest({id:'tags',url:'http://localhost:11434/api/tags'}).method,'GET');
 for(const bad of [{url:'https://remote.example/api/chat'},{url:'http://127.0.0.1:11434/api/pull'},{url:'http://127.0.0.1:11434/api/delete'},{url:'http://127.0.0.1:11434/api/chat?redirect=1'},{url:'http://user:secret@localhost:11434/api/chat'},{method:'DELETE'},{body:'invalid JSON'},{id:'x/y'}])assert.throws(()=>modelRequest({...payload,...bad}));
 assert.throws(()=>modelRequest({id:'tags',url:'http://localhost/api/tags',body:'{}'}));
});
test('desktop model adapter preserves JSON responses and aborts the native request',async()=>{
 let sent,cancelled;globalThis.cardroomDesktop={requestModel:async p=>{sent=p;return {status:200,text:'{"models":[]}'};},cancelModel:id=>{cancelled=id;}};
 try{
  const response=await localModelFetch('http://localhost:11434/api/tags');assert.deepEqual(await response.json(),{models:[]});assert.equal(sent.method,'GET');
  let finish;globalThis.cardroomDesktop.requestModel=()=>new Promise(r=>{finish=r;});
  const controller=new AbortController(),pending=localModelFetch('http://localhost:11434/api/tags',{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.ok(cancelled);finish({status:200,text:'{}'});
 }finally{delete globalThis.cardroomDesktop;}
});
test('web model adapter retains the normal fetch path',async()=>{const previous=globalThis.fetch;let called;globalThis.fetch=async(...args)=>{called=args;return new Response('{}',{status:200});};try{const r=await localModelFetch('http://localhost:11434/api/show',{method:'POST',body:'{}'});assert.equal(r.status,200);assert.equal(called[0],'http://localhost:11434/api/show');assert.equal(called[1].body,'{}');}finally{globalThis.fetch=previous;}});
