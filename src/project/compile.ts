import {fail,TakecraftError,type Project,type AssetManifest,type Timeline} from './types.js';
import {validateProject} from './validate.js';
export function compileProject(p:Project,a:AssetManifest):Timeline{
  const result=validateProject(p);if(!result.project)throw new TakecraftError(result.issues,2);
  for(const [i,clip] of p.audio.clips.entries()){
    const duration=a.items[clip.asset]?.duration;
    if(duration===undefined)fail('ASSET_INVALID',`audio.clips.${i}`,'Audio duration was not measured',2);
    if(clip.kind==='narration'&&duration>clip.end-clip.start+1e-6)fail('NARRATION_TOO_LONG',`audio.clips.${i}`,'Narration exceeds its allocated interval; extend the interval or replace the audio',2);
  }
  return {...structuredClone(result.project),tracks:[...result.project.tracks].sort((a,b)=>a.start-b.start),frameCount:Math.round(p.duration*p.fps)};
}
