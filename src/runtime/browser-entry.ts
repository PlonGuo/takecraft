import {createRuntime,type RuntimeResources} from './index.js';
import type {Timeline,Runtime} from '../project/types.js';
declare global {interface Window {tc:Runtime;tcReady:Promise<void>}}
const data=JSON.parse(document.getElementById('tc-data')!.textContent!) as {timeline:Timeline;resources:RuntimeResources;preview:boolean};
window.tc=createRuntime(document.getElementById('stage')!,data.timeline,data.resources);
window.tcReady=window.tc.ready();
// Retain the rejected promise for the renderer while preventing an unhandled rejection in a preview.
window.tcReady.catch(error=>{const e=document.createElement('pre');e.textContent=String(error);document.body.append(e);});
if(data.preview){
  const controls=document.createElement('div');controls.id='controls';
  const button=document.createElement('button');button.textContent='播放 / 暂停';const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max=String(data.timeline.duration-1/data.timeline.fps);slider.step=String(1/data.timeline.fps);slider.value='0';
  const clock=document.createElement('span');controls.append(button,slider,clock);document.body.append(controls);
  let playing=false,origin=0,time=0;
  function resize(){const scale=Math.min(innerWidth/data.timeline.canvas.width,(innerHeight-72)/data.timeline.canvas.height);document.getElementById('viewport')!.style.transform=`scale(${Math.max(.05,scale)})`;}
  addEventListener('resize',resize);resize();
  button.onclick=()=>{playing=!playing;origin=performance.now()-time*1000;};
  slider.oninput=()=>{playing=false;time=Number(slider.value);void window.tc.seek(time);};
  async function loop(){if(playing){time=((performance.now()-origin)/1000)%data.timeline.duration;await window.tc.seek(time);slider.value=String(time);}clock.textContent=time.toFixed(2)+' s';requestAnimationFrame(()=>void loop());}
  void window.tcReady.then(()=>loop());
}
