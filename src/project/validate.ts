import {ProjectSchema,type Project} from './schema.js';
import type {Issue} from './types.js';
export function validateProject(input:unknown):{project?:Project;issues:Issue[]} {
  const parsed=ProjectSchema.safeParse(input);
  if(!parsed.success) return {issues:parsed.error.issues.map(e=>({code:'SCHEMA_INVALID',path:e.path.join('.')||'project',message:e.message,severity:'error'}))};
  const p=parsed.data,issues:Issue[]=[];
  const add=(code:string,path:string,message:string)=>issues.push({code,path,message,severity:'error'});
  const ids=new Set<string>();
  if(Math.abs(p.duration*p.fps-Math.round(p.duration*p.fps))>1e-6) add('DURATION_NOT_FRAME_ALIGNED','duration','Duration must be an exact number of frames');
  const interval=(start:number,end:number,path:string)=>{if(end<=start||end>p.duration) add('TIME_RANGE',path,'Interval must have start < end <= duration');};
  p.actors.forEach((a,i)=>{
    if(ids.has(a.id)) add('DUPLICATE_ID',`actors.${i}.id`,a.id); ids.add(a.id);
    if(a.asset&&!p.assets[a.asset])add('ASSET_MISSING',`actors.${i}.asset`,a.asset);
    if(a.asset&&p.assets[a.asset]&&p.assets[a.asset].type!=='image')add('ASSET_TYPE',`actors.${i}.asset`,'Visual actors require an image asset');
    if(a.type==='text'&&!a.text)add('TEXT_REQUIRED',`actors.${i}.text`,'Text is required');
    if(a.type==='image'&&!a.asset)add('ASSET_REQUIRED',`actors.${i}.asset`,'Image asset is required');
  });
  const actorMap=new Map(p.actors.map(a=>[a.id,a]));
  p.actors.forEach((a,i)=>{
    const container=a.parent?actorMap.get(a.parent):undefined;
    if(container&&!['surface','window','shape'].includes(container.type))add('PARENT_TYPE',`actors.${i}.parent`,'Parent must be a surface, window or shape container');
    const visited=new Set([a.id]); let parent=a.parent;
    while(parent){if(visited.has(parent)){add('PARENT_CYCLE',`actors.${i}.parent`,parent);break;} visited.add(parent);const v=actorMap.get(parent);if(!v){add('UNKNOWN_ACTOR',`actors.${i}.parent`,parent);break;}parent=v.parent;}
  });
  p.tracks.forEach((t,i)=>{
    interval(t.start,t.end,`tracks.${i}`);
    if(!ids.has(t.actor))add('UNKNOWN_ACTOR',`tracks.${i}.actor`,t.actor);
    if(['width','height','scale'].includes(t.property)&&(t.from<=0||t.to<=0))add('PROPERTY_RANGE',`tracks.${i}`,'Size must remain positive');
    if(['opacity','reveal'].includes(t.property)&&[t.from,t.to].some(v=>v<0||v>1))add('PROPERTY_RANGE',`tracks.${i}`,'Opacity/reveal must be between 0 and 1');
    if(t.property==='radius'&&(t.from<0||t.to<0))add('PROPERTY_RANGE',`tracks.${i}`,'Radius must be nonnegative');
    if(p.tracks.slice(0,i).some(o=>o.actor===t.actor&&o.property===t.property&&o.start<t.end&&t.start<o.end))add('TRACK_CONFLICT',`tracks.${i}`,'Two tracks control the same property simultaneously');
  });
  p.camera.forEach((k,i)=>{if(k.time>p.duration||i>0&&k.time<=p.camera[i-1].time)add('CAMERA_TIME',`camera.${i}`,'Camera times must be ordered and within duration');});
  for(const [name,values] of [['beats',p.beats],['carries',p.carries],['events',p.audio.events]] as const) values.forEach((v,i)=>{if(v.time>=p.duration)add('TIME_RANGE',`${name}.${i}`,'Event must occur before duration');});
  p.carries.forEach((v,i)=>{if(!ids.has(v.actor))add('UNKNOWN_ACTOR',`carries.${i}`,v.actor);});
  p.checks.inFrame.forEach((v,i)=>{interval(v.start,v.end,`checks.inFrame.${i}`);if(!ids.has(v.actor))add('UNKNOWN_ACTOR',`checks.inFrame.${i}`,v.actor);});
  p.audio.clips.forEach((c,i)=>{interval(c.start,c.end,`audio.clips.${i}`);if(p.assets[c.asset]?.type!=='audio')add('ASSET_TYPE',`audio.clips.${i}.asset`,'Audio asset required');});
  p.captions.forEach((c,i)=>{interval(c.start,c.end,`captions.${i}`);if(p.captions.slice(0,i).some(o=>o.start<c.end&&c.start<o.end))add('CAPTION_OVERLAP',`captions.${i}`,'Captions overlap');});
  if(p.theme.font&&p.assets[p.theme.font]?.type!=='font')add('ASSET_TYPE','theme.font','Font asset required');
  return issues.length?{issues}:{project:p,issues};
}
