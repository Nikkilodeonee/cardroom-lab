import {RANKS,shoeStats} from './engine.mjs';
import {localOrigin,listVisionModels,advanceScreenshotRound} from './screenshot.mjs?v=2.2.0';
import {LiveTracker,startLedger,validateLedger,tableSignature,projectLedger,readLiveTable} from './live-tracker.mjs?v=2.2.0';
import {CaptureSession} from './capture-session.mjs?v=2.2.0';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createLiveMonitor({getState,saveConnection,onApply,toast}){
 const root=document.createElement('dialog');root.id='live-modal';root.className='live-modal';root.setAttribute('aria-labelledby','live-title');
 root.innerHTML=`<div class="live-head"><div><p class="eyebrow">YOUR TABLE · IN REAL TIME</p><h2 id="live-title">Live table monitor</h2><p>Share your game. Keep the count.</p></div><button type="button" class="icon-btn" data-live="close" aria-label="Close live monitor">✕</button></div>
 <div class="live-layout"><section><div class="live-preview"><video muted playsinline aria-label="Shared game preview"></video><div class="live-empty"><span>▣</span><strong>Your game goes here</strong><p>Choose a game tab or window using Share & monitor below.</p></div><div class="live-crop" aria-label="Capture area"><span>READING AREA</span></div></div><div class="live-source">No screen shared · audio is always off</div>
 <div class="live-crop-controls"><span>Read area <small>Drag over the preview, or enter percentages.</small></span>${[['x','Left',0],['y','Top',0],['w','Width',100],['h','Height',100]].map(([k,label,v])=>`<label>${label}<input type="number" class="form-control" data-crop="${k}" aria-label="Live crop ${label.toLowerCase()} percent" min="${k==='w'||k==='h'?5:0}" max="100" value="${v}"></label>`).join('')}<button type="button" class="btn btn-sm" data-live="whole">Whole image</button></div>
 <div class="live-status" role="status" aria-live="polite"><span class="live-dot"></span><div><strong data-live-label>Ready when you are</strong><p data-live-message>Visible cards are confirmed across two reads before counting.</p></div></div>
 <div class="live-metrics"><div><small>COUNTED IN SHOE</small><strong data-live-count>—</strong></div><div><small>RUNNING COUNT</small><strong data-live-running>—</strong></div><div><small>TABLE ROUND</small><strong data-live-round>—</strong></div><div><small>LAST READ</small><strong data-live-time>—</strong></div></div>
 <div class="live-table"><div class="lab-row between"><h3>Tracked on this table</h3><span class="tiny muted">Stable reads only</span></div><div data-live-cards class="live-card-list"><p class="muted">Cards will appear here after recognition.</p></div></div></section>
 <aside class="live-settings"><label>Game<select class="form-select" data-config="game"><option value="blackjack">Blackjack · shoe tracking</option><option value="poker">Texas Hold’em · current hand</option></select></label>
 <label>When sharing starts<select class="form-select" data-config="mode"><option value="continue">Continue the current table / resume</option><option value="next">Next round in the same shoe</option><option value="fresh">Fresh shuffled shoe</option></select></label><p class="tiny muted">Continue preserves your existing count. For a new game or a shuffle, choose Fresh shuffled shoe. Poker starts a new deck each hand.</p>
 <label>Local vision endpoint<input class="form-control" data-config="endpoint" aria-label="Live vision endpoint" placeholder="http://127.0.0.1:11434"></label><label>Installed vision model<input class="form-control" data-config="model" aria-label="Live vision model" placeholder="Your Ollama vision model" list="live-models"></label><datalist id="live-models"></datalist><button type="button" class="btn btn-sm" data-live="models">Find vision models</button>
 <label>Delay after each read<select class="form-select" data-config="delay"><option value="2000">2 seconds</option><option value="5000">5 seconds</option><option value="10000">10 seconds</option></select></label><label class="live-check"><input type="checkbox" data-config="analyze" checked> Recalculate odds when cards change</label>
 <label class="live-check"><input type="checkbox" data-config="peek"> Blackjack: US peek rules, dealer blackjack ruled out</label><p class="tiny muted">The chart and count always update. Automatic action EV needs this confirmation and stops when the dealer reveals more cards.</p><div class="live-explainer"><strong>One card. One count.</strong><p>Repeating frames do not add cards again. A confirmed clear table or changed hand number begins the next round automatically.</p><p>If a round changes without a clear interval, use Next round. Use Fresh shoe after a shuffle.</p><p>Only exposed, readable cards can be counted. Unseen cards and automatic shuffles cannot be inferred. Keep the game visible; the browser may throttle background tabs.</p></div>
 <details><summary>Connect local vision</summary><p class="tiny muted">Install Ollama and a model with vision support, then enter its installed name above. Allow this app’s origin in OLLAMA_ORIGINS and restart Ollama. Your browser may also ask for local network access. Frames go only to this local endpoint; they are never recorded or uploaded to the Site.</p></details>
 </aside></div><div class="live-footer"><span class="tiny muted">No recording · screen frames stay out of saved data</span><div><button type="button" class="btn" data-live="next" disabled>Next round</button><button type="button" class="btn" data-live="fresh" disabled>Fresh shoe</button><button type="button" class="btn" data-live="pause" disabled>Pause reading</button><button type="button" class="btn btn-outline-danger" data-live="stop" disabled>Stop sharing</button><button type="button" class="btn btn-primary" data-live="start">Share & monitor</button></div></div>`;
 const dock=document.createElement('section');dock.className='live-dock';dock.hidden=true;dock.setAttribute('aria-label','Active screen sharing');
 dock.innerHTML='<span class="live-dot"></span><div><strong>Screen is shared</strong><small data-dock-message>Preparing live monitor…</small></div><button type="button" class="btn btn-sm" data-live="open">View table</button><button type="button" class="btn btn-sm" data-live="pause">Pause</button><button type="button" class="btn btn-sm btn-outline-danger" data-live="stop">Stop sharing</button>';
 document.body.append(root,dock);
 const $=s=>root.querySelector(s),video=$('video'),canvas=document.createElement('canvas');
 let tracker=null,config=null,crop={x:0,y:0,w:100,h:100},drag=null,lastRead='',dims='',revision=0,modelAbort=null,firstApply=true;
 const labels={choosing:'Choose a sharing source',connecting:'Connecting local vision',reading:'Reading the table',retry:'Connection interrupted',error:'Could not start',paused:'Recognition paused',waiting:'Monitoring',stopped:'Screen sharing is off',confirming:'Confirming cards',updated:'Table updated',round:'Next round detected',unchanged:'Watching the table',uncertain:'Waiting for a clear read',blocked:'Check the table'};
 function status(type,message){$('[data-live-label]').textContent=labels[type]||type;$('[data-live-message]').textContent=message;root.dataset.status=type;dock.dataset.status=type;dock.querySelector('[data-dock-message]').textContent=message;sync();}
 function sync(){
  const active=session.active,ready=active&&!!session.stream&&!!tracker;
  dock.hidden=!active;document.body.classList.toggle('has-live-dock',active);
  for(const name of ['stop','pause','next','fresh'])$(`[data-live="${name}"]`).disabled=name==='stop'?!active:!ready;
  $('[data-live="start"]').disabled=active;$('[data-live="start"]').textContent=active?'Screen shared':'Share & monitor';
  for(const input of root.querySelectorAll('[data-config]'))input.disabled=active;
  $('[data-live="models"]').disabled=active;
  for(const b of [root.querySelector('[data-live="pause"]'),dock.querySelector('[data-live="pause"]')])b.textContent=session.paused?'Resume reading':'Pause reading';
  root.classList.toggle('is-sharing',!!session.stream);
 }
 function drawCrop(){const e=$('.live-crop');e.style.cssText=`left:${crop.x}%;top:${crop.y}%;width:${crop.w}%;height:${crop.h}%`;for(const [k,v]of Object.entries(crop))$(`[data-crop="${k}"]`).value=Math.round(v);}
 function clearFrame(){video.pause();video.srcObject=null;canvas.width=0;canvas.height=0;$('.live-source').textContent='No screen shared · audio is always off';dims='';}
 function updateCards(){
  if(!tracker)return;const d=tracker.data,s=getState(),count=d.base.length+d.past.length+d.tracks.length;
  $('[data-live-count]').textContent=config.game==='blackjack'?count:d.tracks.length;
  $('[data-live-running]').textContent=config.game==='blackjack'?shoeStats(s.rules.decks,[...d.base,...d.past,...d.tracks.map(c=>RANKS.indexOf(c.rank))]).running:'—';
  $('[data-live-round]').textContent=d.round+1;$('[data-live-time]').textContent=lastRead||'—';
  const suits={s:'♠',h:'♥',d:'♦',c:'♣'};
  $('[data-live-cards]').innerHTML=d.tracks.length?['hero','dealer','board','opponent','other'].map(zone=>{const cs=d.tracks.filter(c=>c.zone===zone);return cs.length?`<div><small>${({hero:'Your active hand',dealer:'Dealer',board:'Community',opponent:'Opponent',other:'Other exposed'})[zone]}</small><span>${cs.map(c=>`<b class="live-card ${c.suit==='h'||c.suit==='d'?'red':''}">${escape(c.rank)}<i>${suits[c.suit]||'♠'}</i></b>`).join('')}</span></div>`:'';}).join(''):'<p class="muted">Waiting for visible cards in the next deal.</p>';
 }
 async function checkModel(signal){const r=await fetch(localOrigin(config.endpoint)+'/api/show',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({model:config.model})});if(!r.ok)throw new Error('Could not load this Ollama model. Check its installed name and allowed origins.');const d=await r.json();if(!Array.isArray(d.capabilities)||!d.capabilities.includes('vision'))throw new Error('Choose an installed model that supports vision.');}
 const session=new CaptureSession({getDisplayMedia:options=>{
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getDisplayMedia)throw new Error('Screen sharing needs a supported desktop browser over HTTPS or localhost. Open this app in Chrome or Edge.');
  return navigator.mediaDevices.getDisplayMedia(options);
 },prepare:async(stream,signal)=>{
  video.srcObject=stream;await video.play();if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(video.videoWidth&&video.videoHeight)preview.style.aspectRatio=video.videoWidth+'/'+video.videoHeight;
  $('.live-source').textContent=(stream.getVideoTracks()[0].label||'Selected game window')+' · audio off';sync();
  const timeout=setTimeout(()=>session.abort?.abort(),20000);try{await checkModel(signal);}finally{clearTimeout(timeout);}
 },read:async(signal)=>{
  const track=session.stream?.getVideoTracks()[0];if(!track||track.muted||!video.videoWidth||video.readyState<2)throw new Error('The shared game is unavailable. Keep its window visible.');
  const size=video.videoWidth+'x'+video.videoHeight;if(dims&&dims!==size){dims=size;preview.style.aspectRatio=video.videoWidth+'/'+video.videoHeight;session.pause();tracker.resetCandidate();status('paused','The shared image size changed. Check the capture area and resume reading.');throw new Error('The shared image size changed.');}dims=size;
  const w=video.videoWidth*crop.w/100,h=video.videoHeight*crop.h/100,scale=Math.min(1,1920/Math.max(w,h));canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  canvas.getContext('2d').drawImage(video,video.videoWidth*crop.x/100,video.videoHeight*crop.y/100,w,h,0,0,canvas.width,canvas.height);
  const frameRevision=revision,base64=canvas.toDataURL('image/jpeg',.92).split(',')[1];const read=await readLiveTable({...config,base64,signal});return {read,frameRevision};
 },onRead:({read,frameRevision})=>{
  if(frameRevision!==revision)return;lastRead=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const result=tracker.feed(read,getState());
  if(result.state){if(result.status==='round'||firstApply&&config.mode!=='continue')result.state.screenshots=advanceScreenshotRound(result.state.screenshots,firstApply&&config.mode==='fresh'||getState().rules.mode==='shuffle'&&result.status==='round');firstApply=false;onApply(result,config.analyze&&(config.game!=='blackjack'||config.peek));}
  status(result.status,result.message);updateCards();
 },onStatus:status,onStop:()=>{clearFrame();sync();}});
 function round(fresh){
  if(!tracker||!session.stream)return;session.invalidate();revision++;tracker.nextRound(fresh,true);const result=projectLedger(getState(),tracker.data);result.state.screenshots=advanceScreenshotRound(result.state.screenshots,fresh||getState().rules.mode==='shuffle');firstApply=false;onApply(result,false);status('waiting',fresh?'Fresh shoe · count reset. Waiting for the next clear deal.':'Next round · prior exposed cards retained. Waiting for the next deal.');updateCards();
 }
 function handle(e){const action=e.target.closest('[data-live]')?.dataset.live;if(!action)return;
  if(action==='close'){root.close();return;}if(action==='open'){root.showModal();return;}if(action==='stop'){session.stop();modelAbort?.abort();return;}
  if(action==='pause'){session.pause();tracker?.resetCandidate();return;}if(action==='next'||action==='fresh'){round(action==='fresh');return;}
  if(action==='whole'){if(session.active&&!session.paused){toast('Pause reading before changing the capture area.');return;}crop={x:0,y:0,w:100,h:100};revision++;tracker?.resetCandidate();dims='';drawCrop();return;}
  if(action==='models'){findModels();return;}
  if(action==='start'){
   try{
    const s=getState();config={game:$('[data-config="game"]').value,mode:$('[data-config="mode"]').value,endpoint:localOrigin($('[data-config="endpoint"]').value),model:$('[data-config="model"]').value.trim(),analyze:$('[data-config="analyze"]').checked,peek:$('[data-config="peek"]').checked};
    if(!config.model||config.model.length>120)throw new Error('Enter an installed Ollama vision model, or use Find vision models.');
    let ledger=startLedger(s,config.game,config.mode);const saved=s.liveTracking;
    if(config.mode==='continue'&&saved?.signature===tableSignature(s,config.game)&&saved.ledger.game===config.game)ledger=validateLedger(saved.ledger,s.rules.decks);
    modelAbort?.abort();tracker=new LiveTracker(ledger,{decks:s.rules.decks,shuffleEachRound:s.rules.mode==='shuffle'});session.delay=+$('[data-config="delay"]').value;saveConnection(config);lastRead='';revision++;dims='';firstApply=true;
    // No asynchronous work before start: browsers require the original button activation.
    session.start();updateCards();
   }catch(error){status('error',error.message);}return;
  }
 }
 async function findModels(){const button=$('[data-live="models"]');button.disabled=true;modelAbort?.abort();modelAbort=new AbortController();const timeout=setTimeout(()=>modelAbort.abort(),20000);try{const names=await listVisionModels({endpoint:$('[data-config="endpoint"]').value,signal:modelAbort.signal});$('#live-models').innerHTML=names.map(n=>`<option value="${escape(n)}"></option>`).join('');if(names.length&&!$('[data-config="model"]').value)$('[data-config="model"]').value=names[0];status('waiting',names.length?`Vision models: ${names.join(', ')}`:'No vision models found. Install a vision-capable model in Ollama.');}catch(e){status('error',e.name==='AbortError'?'Model search timed out. Check Ollama.':e.message);}finally{clearTimeout(timeout);button.disabled=session.active;}}
 root.addEventListener('click',handle);dock.addEventListener('click',handle);
 root.addEventListener('close',()=>{modelAbort?.abort();});
 root.addEventListener('input',e=>{if(!e.target.dataset.crop)return;if(session.active&&!session.paused){drawCrop();toast('Pause reading before changing the capture area.');return;}const k=e.target.dataset.crop,v=+e.target.value;if(!Number.isFinite(v))return;crop[k]=Math.max(k==='w'||k==='h'?5:0,Math.min(100,v));crop.x=Math.min(crop.x,100-crop.w);crop.y=Math.min(crop.y,100-crop.h);revision++;tracker?.resetCandidate();dims='';drawCrop();});
 const preview=$('.live-preview');preview.addEventListener('pointerdown',e=>{if(!session.stream||(session.active&&!session.paused)){if(session.stream)toast('Pause reading to select the capture area.');return;}const r=preview.getBoundingClientRect();drag={x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))};preview.setPointerCapture(e.pointerId);});
 preview.addEventListener('pointermove',e=>{if(!drag)return;const r=preview.getBoundingClientRect(),x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));crop={x:Math.min(drag.x,x),y:Math.min(drag.y,y),w:Math.max(5,Math.abs(x-drag.x)),h:Math.max(5,Math.abs(y-drag.y))};crop.w=Math.min(crop.w,100-crop.x);crop.h=Math.min(crop.h,100-crop.y);drawCrop();});
 preview.addEventListener('pointerup',()=>{if(drag){drag=null;revision++;tracker.resetCandidate();dims='';}});
 window.addEventListener('pagehide',()=>{session.stop();modelAbort?.abort();});
 drawCrop();
 return {isActive:()=>session.active,open(game='blackjack'){if(!session.active){const s=getState();$('[data-config="game"]').value=game;$('[data-config="endpoint"]').value=s.ai.endpoint;$('[data-config="model"]').value=s.ai.visionModel||'';}if(!root.open)root.showModal();},stop:()=>session.stop(),close:()=>root.close()};
}
