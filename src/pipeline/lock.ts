import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {hostname} from 'node:os';
import {randomUUID} from 'node:crypto';
import {fail} from '../project/types.js';
type Owner={pid:number;host:string;token:string};
async function owner(path:string):Promise<Owner|null>{try{return JSON.parse(await readFile(join(path,'owner.json'),'utf8'));}catch{return null;}}
function alive(o:Owner){if(o.host!==hostname())return true;try{process.kill(o.pid,0);return true;}catch(e){return (e as NodeJS.ErrnoException).code!=='ESRCH';}}
export async function hasActiveLock(root:string):Promise<boolean>{
 const path=join(root,'lock'),o=await owner(path);if(o)return alive(o);
 try{return Date.now()-(await stat(path)).mtimeMs<60000;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}
}
export async function acquireLock(root:string):Promise<()=>Promise<void>>{
 await mkdir(root,{recursive:true});return acquireDirectory(join(root,'lock'));
}
async function acquireDirectory(path:string):Promise<()=>Promise<void>>{
 const token=randomUUID();
 try{await mkdir(path);}catch(e){
  if((e as NodeJS.ErrnoException).code==='ENOENT')fail('PROJECT_LOCKED','project','Lock ownership changed during recovery; retry the build');
  if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
  const old=await owner(path);if(old?alive(old):Date.now()-(await stat(path)).mtimeMs<60000)fail('PROJECT_LOCKED','project','Project is locked by another build');
  // Recovery owns a lock too, so another crash can be recovered using the same rules.
  const releaseRecovery=await acquireDirectory(join(path,'reclaim'));
  try{
   const current=await owner(path);
   if(current?.token!==old?.token||(current&&alive(current)))fail('PROJECT_LOCKED','project','Project is locked by another build');
   const retired=path+'.stale-'+token;await rename(path,retired);await rm(retired,{recursive:true,force:true});
  }finally{await releaseRecovery();}
  return acquireDirectory(path);
 }
 try{await writeFile(join(path,'owner.json'),JSON.stringify({pid:process.pid,host:hostname(),token}));}catch(e){await rm(path,{recursive:true,force:true});throw e;}
 return async()=>{if((await owner(path))?.token===token)await rm(path,{recursive:true,force:true});};
}
