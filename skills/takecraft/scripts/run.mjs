#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let directory;
try {
 const runtime=JSON.parse(await readFile(new URL('../runtime.json',import.meta.url),'utf8'));
 if(runtime.package!=='takecraft'||!/^\d+\.\d+\.\d+$/.test(runtime.version)||runtime.protocol!==1)throw new Error('Invalid Skill runtime manifest');
 // npm exec accepts local packages, including an altered package with the same
 // version. Resolve from an empty project and let the CLI restore caller cwd.
 directory=await mkdtemp(join(tmpdir(),'takecraft-exec-'));
 await writeFile(join(directory,'package.json'),'{"private":true}\n');
 const child=spawn('npm',['exec','--yes','--prefix',directory,'--workspaces=false',`--package=${runtime.package}@${runtime.version}`,'--','takecraft',...process.argv.slice(2)],{
  cwd:directory,stdio:'inherit',detached:process.platform!=='win32',env:{...process.env,TAKECRAFT_CALLER_CWD:process.cwd()},
 });
 let interrupted;
 const handlers=new Map(['SIGINT','SIGTERM'].map(signal=>[signal,()=>{
  interrupted=signal;
  try{process.platform==='win32'?child.kill(signal):process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}
 }]));
 for(const [signal,handler] of handlers)process.on(signal,handler);
 try{process.exitCode=await new Promise((done,reject)=>{
  child.once('error',reject);
  child.once('close',(code,signal)=>done(interrupted==='SIGINT'||signal==='SIGINT'?130:interrupted==='SIGTERM'||signal==='SIGTERM'?143:code??1));
 });}finally{for(const [signal,handler] of handlers)process.off(signal,handler);}
 if(process.exitCode!==0)process.stderr.write(`[takecraft] ${runtime.package}@${runtime.version} exited ${process.exitCode}. Check the error above; use the same Skill version when retrying.\n`);
} catch(error) {
 process.stderr.write(`[takecraft] Cannot start: ${error.message}. Node.js >=22.20 and npm are required.\n`);
 process.exitCode=1;
} finally {
 if(directory)await rm(directory,{recursive:true,force:true});
}
