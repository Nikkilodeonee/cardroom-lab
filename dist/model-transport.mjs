// Web builds use fetch. The installed desktop build uses a narrow, cancellable
// localhost-only bridge, so users do not need to configure browser CORS permissions.
export async function localModelFetch(url,options={}){
 const desktop=globalThis.cardroomDesktop;if(!desktop?.requestModel)return globalThis.fetch(url,options);
 const signal=options.signal;if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const id=crypto.randomUUID();let rejectAbort;
 const aborted=new Promise((_,reject)=>{rejectAbort=reject;});
 const abort=()=>{desktop.cancelModel(id);rejectAbort(new DOMException('Aborted','AbortError'));};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  const d=await Promise.race([desktop.requestModel({id,url:String(url),method:options.method||'GET',...(options.body===undefined?{}:{body:options.body})}),aborted]);
  if(d.error)throw new Error(d.error);
  return new Response(d.text,{status:d.status,headers:{'Content-Type':'application/json'}});
 }finally{signal?.removeEventListener('abort',abort);}
}
