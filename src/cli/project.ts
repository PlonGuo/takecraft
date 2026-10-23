import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fail,TakecraftError} from '../project/types.js';
import {validateProject} from '../project/validate.js';
import {prepareAssets} from '../project/assets.js';
import {compileProject} from '../project/compile.js';

export async function loadProject(path:string){
 path=resolve(path);let input:unknown;
 try{input=JSON.parse(await readFile(path,'utf8'));}catch(e){fail('PROJECT_READ',path,e instanceof Error?e.message:String(e),2);}
 const result=validateProject(input);if(!result.project)throw new TakecraftError(result.issues,2);
 const assets=await prepareAssets(result.project,dirname(path));
 return {project:result.project,assets,timeline:compileProject(result.project,assets)};
}
