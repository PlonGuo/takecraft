import type {BuildResult} from '../project/types.js';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJSON} from '../project/hash.js';
import {hasActiveLock} from './lock.js';
async function read(path:string):Promise<BuildResult|null>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
export async function readStatus(projectDir:string){
 const root=join(projectDir,'.takecraft'),latest=await read(join(root,'latest.json'));
 if(latest?.status==='running'&&!await hasActiveLock(root)){
  latest.status='interrupted';latest.issues.push({code:'BUILD_INTERRUPTED',path:latest.reportPath,message:'Build process is no longer running. Build again with --resume to reuse verified completed stages.',severity:'error'});
 }
 return {latest,lastSuccess:await read(join(root,'last-success.json'))};
}
export async function saveState(root:string,result:BuildResult){await atomicJSON(result.reportPath,result);await atomicJSON(join(root,'latest.json'),result);if(result.status==='succeeded')await atomicJSON(join(root,'last-success.json'),result);}
