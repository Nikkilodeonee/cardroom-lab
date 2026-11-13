let sources=[],type='window',selected=null;
const $=s=>document.querySelector(s);
function render(){
 const list=sources.filter(s=>s.screen===(type==='screen'));$('#sources').replaceChildren();
 for(const source of list){
  const b=document.createElement('button');b.className='source';b.type='button';b.setAttribute('aria-pressed',String(source.id===selected));b.setAttribute('aria-label',source.name);
  const image=document.createElement('img');image.src=source.thumbnail;image.alt='';const name=document.createElement('span');name.textContent=source.name;b.append(image,name);
  b.addEventListener('click',()=>{selected=source.id;render();});$('#sources').append(b);
 }
 $('#share').disabled=!selected;$('#share').textContent=type==='screen'?'Share selected screen':'Share selected window';
 $('#status').textContent=list.length?`${list.length} ${type==='screen'?'screen':'window'}${list.length===1?'':'s'} available. Select the game you want to monitor.`:'No sources found. Open your game, keep its window visible, then refresh.';
}
async function refresh(){selected=null;$('#refresh').disabled=true;$('#status').textContent='Finding open windows…';try{sources=await window.cardroomPicker.list();render();}catch(e){$('#status').textContent='Could not list windows. Cancel, then try sharing again.';}finally{$('#refresh').disabled=false;}}
document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;selected=null;document.querySelectorAll('[data-type]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));render();}));
$('#refresh').addEventListener('click',refresh);$('#cancel').addEventListener('click',()=>window.cardroomPicker.cancel());$('#share').addEventListener('click',()=>{if(selected)window.cardroomPicker.select(selected);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.cardroomPicker.cancel();});
refresh();
