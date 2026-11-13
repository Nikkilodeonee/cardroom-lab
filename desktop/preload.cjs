const {contextBridge,ipcRenderer}=require('electron');
// Only the local model protocol is exposed. No filesystem, shell, generic IPC, or Node APIs.
contextBridge.exposeInMainWorld('cardroomDesktop',Object.freeze({
 platform:process.platform,
 requestModel:payload=>ipcRenderer.invoke('cardroom:model',payload),
 cancelModel:id=>ipcRenderer.send('cardroom:model-cancel',id)
}));
