import {app,BrowserWindow,protocol,session,desktopCapturer,ipcMain,Menu,shell,dialog,nativeTheme} from 'electron';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ORIGIN,CSP,isAppUrl,externalUrl,assetPath,modelRequest} from './policy.mjs';
const desktopRoot=path.dirname(fileURLToPath(import.meta.url)),distRoot=path.join(desktopRoot,'../dist');
const requests=new Map();let mainWindow=null,pickerWindow=null,pendingCapture=null,closing=false;
const qaData=process.argv.find(x=>x.startsWith('--cardroom-qa-data='));
if(qaData&&!app.isPackaged)app.setPath('userData',path.resolve(qaData.slice('--cardroom-qa-data='.length)));
app.setAppUserModelId('com.nikkilodeonee.cardroomlab');
protocol.registerSchemesAsPrivileged([{scheme:'cardroom',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
 app.whenReady().then(start).catch(e=>{dialog.showErrorBox('Cardroom Lab could not start',e.message);app.quit();});
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{closing=true;cancelCapture();for(const c of requests.values())c.abort();});
function trusted(event,window){return !!window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&isAppUrl(event.senderFrame.url);}
function safeWindow(window){
 window.webContents.setWindowOpenHandler(({url})=>{const link=externalUrl(url);if(link)shell.openExternal(link);return {action:'deny'};});
 window.webContents.on('will-navigate',(e,url)=>{if(!isAppUrl(url)){e.preventDefault();const link=externalUrl(url);if(link)shell.openExternal(link);}});
 window.webContents.on('will-attach-webview',e=>e.preventDefault());
}
function cancelCapture(){const pending=pendingCapture;pendingCapture=null;if(pending){try{pending.callback(null);}catch{}}if(pickerWindow&&!pickerWindow.isDestroyed())pickerWindow.close();pickerWindow=null;}
async function chooseCapture(request,callback){
 if(closing||pendingCapture||!mainWindow||request.frame!==mainWindow.webContents.mainFrame||!isAppUrl(request.securityOrigin)||!request.userGesture||!request.videoRequested||request.audioRequested){callback(null);return;}
 pendingCapture={callback,sources:new Map()};
 pickerWindow=new BrowserWindow({parent:mainWindow,modal:true,width:940,height:690,minWidth:680,minHeight:500,title:'Choose your game — Cardroom Lab',backgroundColor:'#10251b',autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(desktopRoot,'picker-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 pickerWindow.setMenu(null);safeWindow(pickerWindow);
 pickerWindow.on('closed',()=>{pickerWindow=null;if(pendingCapture){const p=pendingCapture;pendingCapture=null;try{p.callback(null);}catch{}}});
 pickerWindow.once('ready-to-show',()=>pickerWindow?.show());
 try{await pickerWindow.loadURL(ORIGIN+'/__desktop/source-picker.html');}catch{cancelCapture();}
}
async function start(){
 nativeTheme.themeSource='dark';
 protocol.handle('cardroom',async request=>{
  try{
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
   const file=assetPath(request.url,distRoot,desktopRoot),data=await readFile(file),mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ico':'image/x-icon'};
   return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':mime[path.extname(file)],'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
  }catch{return new Response('Not found',{status:404});}
 });
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===mainWindow?.webContents&&permission==='display-capture'));
 session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>contents===mainWindow?.webContents&&permission==='display-capture'&&isAppUrl(origin));
 session.defaultSession.setDisplayMediaRequestHandler(chooseCapture);
 ipcMain.handle('cardroom:sources',async event=>{
  if(!trusted(event,pickerWindow)||!pendingCapture)throw new Error('No active screen-sharing request.');
  const sources=await desktopCapturer.getSources({types:['window','screen'],thumbnailSize:{width:320,height:200},fetchWindowIcons:false});
  if(!pendingCapture||!trusted(event,pickerWindow))return [];
  const exclude=new Set([mainWindow?.getMediaSourceId(),pickerWindow?.getMediaSourceId()]);
  const visible=sources.filter(s=>!exclude.has(s.id));pendingCapture.sources=new Map(visible.map(s=>[s.id,s]));
  return visible.map(s=>({id:s.id,name:s.name,screen:s.id.startsWith('screen:'),thumbnail:s.thumbnail.toDataURL()}));
 });
 ipcMain.on('cardroom:source-select',(event,id)=>{
  if(!trusted(event,pickerWindow)||!pendingCapture)return;
  const source=pendingCapture.sources.get(id),pending=pendingCapture;pendingCapture=null;
  try{pending.callback(source?{video:source}:null);}catch{}
  pickerWindow?.close();pickerWindow=null;
 });
 ipcMain.handle('cardroom:model',async(event,payload)=>{
  if(!trusted(event,mainWindow))return {error:'Only Cardroom Lab can use the local model connection.'};
  let id;try{
   const request=modelRequest(payload);id=request.id;if(requests.has(id)||requests.size>=4)throw new Error('Too many local model requests.');
   const controller=new AbortController();requests.set(id,controller);const timeout=setTimeout(()=>controller.abort(),95000);
   try{
    const response=await fetch(request.url,{method:request.method,body:request.body,headers:{'Content-Type':'application/json'},signal:controller.signal,redirect:'error'});
    const reader=response.body?.getReader(),parts=[];let size=0;
    if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){controller.abort();throw new Error('Local model response is too large.');}parts.push(Buffer.from(value));}
    return {status:response.status,text:Buffer.concat(parts).toString('utf8')};
   }finally{clearTimeout(timeout);requests.delete(id);}
  }catch(e){return {error:e.name==='AbortError'?'Local model request cancelled or timed out.':e.cause?.code==='ECONNREFUSED'?'Ollama is not running. Start Ollama and choose an installed vision model.':e.message};}
 });
 ipcMain.on('cardroom:model-cancel',(event,id)=>{if(trusted(event,mainWindow)&&typeof id==='string')requests.get(id)?.abort();});
 mainWindow=new BrowserWindow({width:1400,height:950,minWidth:900,minHeight:650,title:'Cardroom Lab',backgroundColor:'#10251b',icon:path.join(desktopRoot,'assets/icon.ico'),show:false,webPreferences:{preload:path.join(desktopRoot,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,webviewTag:false,spellcheck:false,backgroundThrottling:false}});
 safeWindow(mainWindow);mainWindow.webContents.on('page-title-updated',e=>{e.preventDefault();mainWindow.setTitle(`Cardroom Lab ${app.getVersion()}`);});
 mainWindow.webContents.on('will-prevent-unload',event=>{const leave=dialog.showMessageBoxSync(mainWindow,{type:'question',title:'Close Cardroom Lab?',message:'Close the app and stop this session?',detail:'Screen sharing and any unfinished practice round will stop. Saved cards and journal entries are kept.',buttons:['Keep open','Close app'],defaultId:0,cancelId:0});if(leave===1)event.preventDefault();});
 mainWindow.once('ready-to-show',()=>mainWindow?.show());
 mainWindow.on('closed',()=>{mainWindow=null;cancelCapture();for(const c of requests.values())c.abort();});
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'File',submenu:[{label:'Close',role:'close'}]},
  {label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},
  {label:'Help',submenu:[{label:'About Cardroom Lab',click:()=>dialog.showMessageBox(mainWindow,{type:'info',title:'Cardroom Lab',message:`Cardroom Lab ${app.getVersion()}`,detail:'Blackjack and poker practice · Felt Edition\n\nThe desktop runtime and calculators are included. Automatic card recognition needs a separate Ollama vision model.\n\nYour desktop data is saved on this PC. Use Export / Import backup to transfer data from the website.'})},{label:'Get Ollama',click:()=>shell.openExternal('https://ollama.com/download/windows')},{label:'Private GitHub repository',click:()=>shell.openExternal('https://github.com/Nikkilodeonee/cardroom-lab')}]}
 ]));
 session.defaultSession.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'Save Cardroom Lab export',defaultPath:path.join(app.getPath('downloads'),item.getFilename())}));
 await mainWindow.loadURL(ORIGIN+'/index.html');
}
