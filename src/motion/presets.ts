import type {Actor,Project,Track,Issue,Timeline} from '../project/types.js';
import {sample} from '../runtime/sample.js';
import {cameraAt} from '../runtime/camera.js';
import {motionEase} from './schema.js';
import {stagger} from 'motion';

export function expandActions(p:Project){
  const actors=structuredClone(p.actors),tracks=structuredClone(p.tracks),camera=structuredClone(p.camera),issues:Issue[]=[];
  const original=new Map(p.actors.map(a=>[a.id,a])),mutable=new Map(actors.map(a=>[a.id,a]));
  const exits=new Set<Track>(),focusIntervals:Array<{start:number;end:number}>=[];
  const addIssue=(code:string,index:number,message:string)=>issues.push({code,path:`actions.${index}`,message,severity:'error'});
  function state(actor:Actor,property:Track['property'],time:number,rest=false){
    const initial=rest?original.get(actor.id)![property]:actor[property];
    return sample(initial,tracks.filter(t=>t.actor===actor.id&&t.property===property&&(!rest||!exits.has(t))).sort((a,b)=>a.start-b.start),time);
  }
  function add(track:Track,index:number,initialize=false,exit=false){
    if(tracks.some(t=>t.actor===track.actor&&t.property===track.property&&t.start<track.end&&track.start<t.end))
      addIssue('ACTION_CONFLICT',index,`${track.actor}.${track.property} overlaps another action or track`);
    if(initialize&&!tracks.some(t=>t.actor===track.actor&&t.property===track.property&&t.start<=track.start))mutable.get(track.actor)![track.property]=track.from;
    tracks.push(track);if(exit)exits.add(track);
  }
  // A group's later targets can begin after another action. Schedule each
  // target first so its pose is sampled from the actual preceding history.
  const scheduled:Array<{action:Project['actions'][number];index:number}>=[];
  p.actions.forEach((action,index)=>{
    if(action.type!=='enter'&&action.type!=='exit'){scheduled.push({action,index});return;}
    if(new Set(action.targets).size!==action.targets.length){addIssue('ACTION_TARGET',index,'Targets must not contain duplicates');return;}
    const delay=stagger(action.stagger);
    action.targets.forEach((id,i)=>scheduled.push({index,action:{...action,targets:[id],at:action.at+delay(i,action.targets.length),stagger:0}}));
  });
  for(const {action,index} of scheduled.sort((a,b)=>a.action.at-b.action.at)){
    const end=action.at+action.duration,ease=motionEase(action.style);
    if(end>p.duration+1e-9){addIssue('ACTION_TIME',index,'Action ends after the video');continue;}
    if(action.type==='focus'){
      const actor=action.actor?mutable.get(action.actor):undefined;
      if(action.actor&&(!actor||actor.parent)){addIssue('ACTION_TARGET',index,'Focus requires an existing root actor');continue;}
      if(p.camera.length||focusIntervals.some(t=>t.start<end&&action.at<t.end)){addIssue('ACTION_CONFLICT',index,'Focus overlaps another focus or authored camera keys');continue;}
      const current=cameraAt({...p,camera,frameCount:0} as Timeline,action.at);
      if(!camera.some(k=>k.time===action.at))camera.push({...current,time:action.at,ease:'linear'});
      camera.push({time:end,x:actor?state(actor,'x',action.at)+state(actor,'width',action.at)/2:p.canvas.width/2,y:actor?state(actor,'y',action.at)+state(actor,'height',action.at)/2:p.canvas.height/2,zoom:action.zoom,rotation:0,ease});
      focusIntervals.push({start:action.at,end});continue;
    }
    if(action.type==='morph'||action.type==='reveal'){
      const actor=mutable.get(action.actor);
      if(!actor||action.type==='reveal'&&actor.type!=='text'){addIssue('ACTION_TARGET',index,'Action target is missing or has an incompatible type');continue;}
      if(action.type==='reveal')add({actor:actor.id,property:'reveal',start:action.at,end,from:0,to:1,ease:'linear'},index,true);
      else for(const [key,to] of Object.entries(action.to)){const property=key as Track['property'];add({actor:actor.id,property,start:action.at,end,from:state(actor,property,action.at),to,ease},index);}
      continue;
    }
    action.targets.forEach(id=>{
      const actor=mutable.get(id),start=action.at,finish=start+action.duration;
      if(!actor){addIssue('ACTION_TARGET',index,`Unknown actor: ${id}`);return;}
      if(finish>p.duration+1e-9){addIssue('ACTION_TIME',index,`Staggered target ${id} ends after the video`);return;}
      const entering=action.type==='enter';
      for(const property of ['opacity','x','y','scale','rotation'] as const){
        const current=state(actor,property,start),rest=property==='opacity'?original.get(id)!.opacity:state(actor,property,start,true);
        const shift=property==='opacity'?0:action.offset[property];
        const displaced=property==='opacity'?0:property==='scale'?(entering?rest:current)*shift:(entering?rest:current)+shift;
        add({actor:id,property,start,end:finish,from:entering?displaced:current,to:entering?rest:displaced,ease},index,entering,!entering);
      }
    });
  }
  return {actors,tracks:tracks.sort((a,b)=>a.start-b.start),camera:camera.sort((a,b)=>a.time-b.time),issues};
}
