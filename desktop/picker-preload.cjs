const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cardroomPicker',Object.freeze({
 list:()=>ipcRenderer.invoke('cardroom:sources'),
 select:id=>ipcRenderer.send('cardroom:source-select',id),
 cancel:()=>ipcRenderer.send('cardroom:source-select',null)
}));
