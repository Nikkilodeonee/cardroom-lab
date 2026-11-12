// A single serial recognition loop. Ownership of the stream ends on Stop, browser Stop,
// source replacement, or page exit. Late permission/model results cannot restart it.
export class CaptureSession{
 constructor({getDisplayMedia,prepare,read,onRead,onStatus=()=>{},onStop=()=>{},delay=2500,schedule=setTimeout,cancel=clearTimeout}){Object.assign(this,{getDisplayMedia,prepare,read,onRead,onStatus,onStop,delay,schedule,cancel});this.active=false;this.generation=0;this.revision=0;this.timer=null;this.stream=null;this.abort=null;this.paused=false;}
 async start(){
  if(this.active)return;this.active=true;this.paused=false;const id=++this.generation;this.onStatus('choosing','Choose the game tab or window in your browser.');
  try{
   // This call happens synchronously inside the original click, before any await.
   const stream=await this.getDisplayMedia({video:{frameRate:{ideal:2,max:5}},audio:false,selfBrowserSurface:'exclude',systemAudio:'exclude',surfaceSwitching:'exclude'});
   if(!this.active||id!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;const track=stream.getVideoTracks()[0];if(!track)throw new Error('No screen video was shared.');
   track.addEventListener('ended',()=>{if(id===this.generation)this.stop('Screen sharing ended in the browser.');},{once:true});
   this.abort=new AbortController();this.onStatus('connecting','Preparing the live preview and local vision model…');
   await this.prepare(stream,this.abort.signal);
   if(this.active&&id===this.generation)this.tick(id);
  }catch(e){if(id===this.generation){this.onStatus('error',e.name==='NotAllowedError'?'Screen sharing was cancelled or denied.':e.message);this.stop('',true);}}
 }
 async tick(id=this.generation){
  if(!this.active||id!==this.generation)return;
  if(!this.paused){
   const revision=this.revision,abort=new AbortController();this.abort=abort;const timeout=this.schedule(()=>abort.abort(),90000);
   try{this.onStatus('reading','Reading visible cards…');const result=await this.read(abort.signal);if(this.active&&id===this.generation&&revision===this.revision&&!this.paused)this.onRead(result);}
   catch(e){if(this.active&&id===this.generation&&revision===this.revision&&!this.paused)this.onStatus('retry',e.name==='AbortError'?'The model timed out. Retrying; counts are held.':e.message+' Retrying; counts are held.');}
   finally{this.cancel(timeout);}
  }
  if(this.active&&id===this.generation)this.timer=this.schedule(()=>this.tick(id),this.delay);
 }
 invalidate(){this.revision++;this.abort?.abort();}
 pause(){this.paused=!this.paused;this.invalidate();this.onStatus(this.paused?'paused':'waiting',this.paused?'Recognition paused · screen is still shared.':'Recognition resumed.');}
 stop(message='Screen sharing stopped.',preserveStatus=false){
  this.active=false;this.generation++;this.cancel(this.timer);this.timer=null;this.abort?.abort();this.abort=null;
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.paused=false;this.onStop();if(!preserveStatus)this.onStatus('stopped',message);
 }
}
