import {createHash} from 'node:crypto';
import {readFile,stat,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {Artifact} from './types.js';
export const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export function stable(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';
  return JSON.stringify(value);
}
export async function artifact(path:string):Promise<Artifact>{return {path,sha256:hash(await readFile(path)),bytes:(await stat(path)).size};}
export async function atomicJSON(path:string,data:unknown){await mkdir(dirname(path),{recursive:true});const temp=path+'.'+process.pid+'.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,path);}
