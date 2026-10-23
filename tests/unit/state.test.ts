import {test,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,rm,utimes} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir,hostname} from 'node:os';
import {acquireLock} from '../../src/pipeline/lock.js';
import {readStatus,saveState} from '../../src/pipeline/state.js';
import type {BuildResult} from '../../src/project/types.js';
test('concurrent and live owner locks are refused, stale owner can recover',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-lock-'));try{
 const release=await acquireLock(dir);await expect(acquireLock(dir)).rejects.toThrow(/locked/i);await release();
 await mkdir(join(dir,'lock'));await writeFile(join(dir,'lock','owner.json'),JSON.stringify({pid:2147483647,host:hostname(),token:'dead'}));
 const release2=await acquireLock(dir);await expect(acquireLock(dir)).rejects.toThrow(/locked/i);await release2();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('an interrupted recovery owner can be reclaimed without admitting concurrent builders',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-reclaim-')),lock=join(dir,'lock'),reclaim=join(lock,'reclaim');
 try{
  await mkdir(reclaim,{recursive:true});
  for(const [path,token] of [[lock,'dead-build'],[reclaim,'dead-recovery']])await writeFile(join(path,'owner.json'),JSON.stringify({pid:2147483647,host:hostname(),token}));
  const results=await Promise.allSettled([acquireLock(dir),acquireLock(dir)]);
  const winners=results.filter(r=>r.status==='fulfilled');expect(winners).toHaveLength(1);
  await expect(acquireLock(dir)).rejects.toThrow(/locked/i);
  for(const r of winners)if(r.status==='fulfilled')await r.value();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('ownerless interrupted recovery waits for the safety grace then recovers',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-reclaim-empty-')),lock=join(dir,'lock'),reclaim=join(lock,'reclaim');
 try{
  await mkdir(reclaim,{recursive:true});await writeFile(join(lock,'owner.json'),JSON.stringify({pid:2147483647,host:hostname(),token:'dead'}));
  await expect(acquireLock(dir)).rejects.toThrow(/locked/i);
  const stale=new Date(Date.now()-120000);await utimes(reclaim,stale,stale);
  const release=await acquireLock(dir);await release();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('status distinguishes an interrupted build from a live process and retains last success',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-status-')),root=join(dir,'.takecraft');
 try{
  const result:BuildResult={runId:'first',status:'succeeded',stages:{},artifacts:{},issues:[],captures:0,reportPath:join(root,'runs','first','report.json')};
  await saveState(root,result);
  const release=await acquireLock(root);
  await saveState(root,{...result,runId:'second',status:'running',reportPath:join(root,'runs','second','report.json')});
  expect((await readStatus(dir)).latest?.status).toBe('running');
  await release();
  const stopped=await readStatus(dir);
  expect(stopped.latest?.status).toBe('interrupted');
  expect(stopped.latest?.issues[0].code).toBe('BUILD_INTERRUPTED');
  expect(stopped.lastSuccess?.runId).toBe('first');
 }finally{await rm(dir,{recursive:true,force:true});}
});
