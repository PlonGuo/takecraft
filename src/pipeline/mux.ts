import {copyFile} from 'node:fs/promises';
import type {Artifact} from '../project/types.js';
import {artifact} from '../project/hash.js';
import {run} from '../render/process.js';
export async function mux(video:string,audio:string|undefined,output:string,duration:number):Promise<Artifact>{
 if(audio)await run('ffmpeg',['-v','error','-nostdin','-y','-i',video,'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',output]);else await copyFile(video,output);
 return artifact(output);
}
