import type {Artifact} from '../project/types.js';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {artifact,atomicJSON} from '../project/hash.js';
export type CacheEntry={artifacts:Artifact[];files:Artifact[];data:unknown};
export async function readCache(root:string,key:string):Promise<CacheEntry|null>{
 try{const e=JSON.parse(await readFile(join(root,'cache',key+'.json'),'utf8')) as CacheEntry;
 if(!Array.isArray(e.files)||!e.files.length||!Array.isArray(e.artifacts))return null;
 for(const file of [...e.files,...e.artifacts]){const actual=await artifact(file.path);if(actual.sha256!==file.sha256||actual.bytes!==file.bytes)return null;}return e;
 }catch{return null;}
}
export async function saveCache(root:string,key:string,entry:CacheEntry):Promise<void>{await atomicJSON(join(root,'cache',key+'.json'),entry);}
