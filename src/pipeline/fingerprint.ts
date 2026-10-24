import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {hash,stable} from '../project/hash.js';
import type {Timeline,AssetManifest} from '../project/types.js';
export async function dependencyHash(){
 const metadata=new URL('../build-info.json',import.meta.url);
 if(existsSync(metadata))return JSON.parse(await readFile(metadata,'utf8')).dependencies as string;
 return hash(await readFile(new URL('../../pnpm-lock.yaml',import.meta.url),'utf8'));
}
export async function engineHash(files:string[]){const data=[];for(const name of files){let path=fileURLToPath(new URL('../'+name+'.js',import.meta.url));if(!existsSync(path))path=path.replace(/\.js$/,'.ts');data.push(await readFile(path,'utf8'));}return hash(data.join('\n'));}
export function visualKey(t:Timeline,a:AssetManifest,engine:string,browser:string,encoder:string){
 const {actors,tracks,camera,canvas,duration,fps,theme,checks}=t;
 return hash(stable({actors,tracks,camera,canvas,duration,fps,theme,checks,engine,browser,encoder,platform:process.platform,arch:process.arch,assets:Object.fromEntries(Object.entries(a.items).filter(([,v])=>v.type!=='audio').map(([k,v])=>[k,{source:v.sha256,image:v.image?.sha256}])),fonts:a.fonts.map(f=>({sha256:f.sha256,range:f.unicodeRange}))}));
}
