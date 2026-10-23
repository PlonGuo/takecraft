import type {Artifact,AssetManifest,Timeline} from '../project/types.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {artifact} from '../project/hash.js';
import {openScene} from './browser.js';
import {runtimeBundle,sceneHTML} from './serve.js';
import type {RuntimeResources} from '../runtime/index.js';
import {imageResource} from '../project/images.js';
export async function createPreview(t:Timeline,a:AssetManifest,outDir:string,browser?:string):Promise<{html:Artifact;stills:Artifact[]}>{
 outDir=resolve(outDir);await mkdir(outDir,{recursive:true});
 const resources:RuntimeResources={images:{},fonts:[]};
 const uri=async(f:{path:string;mime:string})=>`data:${f.mime};base64,${(await readFile(f.path)).toString('base64')}`;
 for(const [id,item] of Object.entries(a.items))if(item.type==='image'){const image=imageResource(item);resources.images[id]=`data:${image.type};base64,${image.body.toString('base64')}`;}
 for(const f of a.fonts)resources.fonts.push({url:await uri(f),unicodeRange:f.unicodeRange});
 const path=join(outDir,'preview.html');await writeFile(path,sceneHTML(t,resources,await runtimeBundle(),true,true));
 const s=await openScene(t,a,browser),stills:Artifact[]=[];
 try{for(const time of [...new Set([0,...t.beats.map(b=>b.time),t.duration-1/t.fps])].sort((x,y)=>x-y)){
 await s.seek(time);const file=join(outDir,`still-${String(Math.round(time*t.fps)).padStart(6,'0')}.png`);await s.page.screenshot({path:file});stills.push(await artifact(file));
 }}finally{await s.close();}return {html:await artifact(path),stills};
}
