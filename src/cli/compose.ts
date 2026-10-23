import {readFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {dirname,resolve,join,extname} from 'node:path';
import {BriefSchema} from '../recipes/brief.js';
import {composeProductLaunch} from '../recipes/product-launch.js';
import {validateProject} from '../project/validate.js';
import {prepareAssets} from '../project/assets.js';
import {compileProject} from '../project/compile.js';
import {atomicJSON,hash} from '../project/hash.js';
import {fail,TakecraftError} from '../project/types.js';

export async function composeProject(briefPath:string,directory:string,theme?:string){
 const source=resolve(briefPath),target=resolve(directory);let input:unknown;
 try{input=JSON.parse(await readFile(source,'utf8'));}catch(e){fail('BRIEF_READ',source,e instanceof Error?e.message:String(e),2);}
 if(theme!==undefined&&input&&typeof input==='object'&&!Array.isArray(input))input={...input,theme};
 const parsed=BriefSchema.safeParse(input);
 if(!parsed.success)throw new TakecraftError(parsed.error.issues.map(e=>({code:'BRIEF_INVALID',path:e.path.join('.')||'brief',message:e.message,severity:'error'})),2);
 const brief=parsed.data,project=composeProductLaunch(brief),validation=validateProject(project);
 if(validation.issues.length)throw new TakecraftError(validation.issues,2);
 // Validate every source before creating an output directory, so failed input
 // leaves no half-created project and never touches a previous success.
 const assets=await prepareAssets(project,dirname(source));
 const timeline=compileProject(project,assets);
 await mkdir(dirname(target),{recursive:true});
 try{await mkdir(target);}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')fail('PROJECT_EXISTS',target,'Choose a new directory; existing projects are never overwritten.',2);throw e;}
 try{
  for(const [id,item] of Object.entries(assets.items)){
   await mkdir(join(target,'assets'),{recursive:true});
   const relative=join('assets',id+extname(item.path).toLowerCase()),destination=join(target,relative);
   await copyFile(item.path,destination);
   if(hash(await readFile(destination))!==item.sha256)fail('ASSET_CHANGED',`assets.${id}`,'Source changed while composing; retry with stable local files',2);
   project.assets[id].path=relative;
   if(id==='screenshot')brief.screenshot=relative;
   if(id==='music')brief.music=relative;
  }
  const projectPath=join(target,'project.json'),savedBrief=join(target,'brief.json');
  await atomicJSON(projectPath,project);await atomicJSON(savedBrief,brief);
  return {status:'succeeded',projectPath,briefPath:savedBrief,theme:brief.theme,recipe:'product-launch-v2',statistics:{briefBytes:Buffer.byteLength(JSON.stringify(brief)),projectBytes:Buffer.byteLength(JSON.stringify(project)),actions:project.actions.length,expandedTracks:timeline.tracks.length}};
 }catch(e){await rm(target,{recursive:true,force:true});throw e;}
}
