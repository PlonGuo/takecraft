import type {Timeline} from '../project/types.js';
import {ease} from './sample.js';
export function cameraAt(t:Timeline,time:number){
  const keys=t.camera,base={time:0,x:t.canvas.width/2,y:t.canvas.height/2,zoom:1,rotation:0,ease:'smooth' as const};
  let a: Timeline['camera'][number]=base;
  for(const b of keys){if(time>=b.time){a=b;continue;}const u=ease((time-a.time)/(b.time-a.time),b.ease);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,zoom:Math.exp(Math.log(a.zoom)+(Math.log(b.zoom)-Math.log(a.zoom))*u),rotation:a.rotation+(b.rotation-a.rotation)*u};}
  return a;
}
