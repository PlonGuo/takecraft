import type {Timeline,Artifact} from '../project/types.js';
import {TakecraftError} from '../project/types.js';
import {validateProject} from '../project/validate.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {artifact} from '../project/hash.js';
export function timestamp(time:number){const n=Math.round(time*1000);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;}
export async function writeSubtitles(t:Timeline,outDir:string):Promise<Artifact|null>{
 const {frameCount,...project}=t;const v=validateProject(project);if(v.issues.length)throw new TakecraftError(v.issues,2);
 if(!t.captions.length)return null;await mkdir(outDir,{recursive:true});const path=resolve(join(outDir,'captions.srt'));
 await writeFile(path,t.captions.map((c,i)=>`${i+1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text.replace(/\r\n?/g,'\n')}\n\n`).join(''));return artifact(path);
}
