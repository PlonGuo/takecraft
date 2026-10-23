import type {AssetManifest,Timeline,FrameManifest} from '../project/types.js';
import {TakecraftError} from '../project/types.js';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {hash,stable,atomicJSON} from '../project/hash.js';
import {openScene} from './browser.js';
export type RenderInput={timeline:Timeline;assets:AssetManifest;directory:string;browser?:string;onCapture?:(frame:number)=>void};
export async function renderFrames(input:RenderInput):Promise<FrameManifest>{
 const {timeline:t,assets:a}=input,directory=resolve(input.directory);await mkdir(directory,{recursive:true});
 const session=await openScene(t,a,input.browser),paths:string[]=[];
 try{for(let frame=0;frame<t.frameCount;frame++){
  const inspection=await session.inspect(frame/t.fps);if(inspection.issues.length)throw new TakecraftError(inspection.issues);
  const path=join(directory,String(frame).padStart(6,'0')+'.png');await session.page.screenshot({path,animations:'disabled'});paths.push(path);input.onCapture?.(frame);
 }}finally{await session.close();}
 // Prepared images hold PNG bytes in memory; hash their identity, not millions
 // of individual byte keys through the JSON serializer.
 const assets={...a,items:Object.fromEntries(Object.entries(a.items).map(([id,{image,...item}])=>[id,{...item,renderSha256:image?.sha256}]))};
 const manifest={directory,paths,width:t.canvas.width,height:t.canvas.height,fps:t.fps,frameCount:t.frameCount,fingerprint:hash(stable({t,a:assets})),lastTime:(t.frameCount-1)/t.fps};
 await atomicJSON(join(directory,'frames.json'),manifest);return manifest;
}
