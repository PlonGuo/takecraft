import {afterAll,beforeAll,expect,test} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,realpath,cp,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer,type Server} from 'node:http';
import {createHash} from 'node:crypto';
const exec=promisify(execFile);
let root:string,cwd:string,launcher:string,env:NodeJS.ProcessEnv,server:Server;
let currentVersion:string,nextVersion:string,publishNext=false;
beforeAll(async()=>{
 root=await mkdtemp(join(tmpdir(),'takecraft-skill-'));cwd=join(root,'调用 空间');
 const pkg=join(root,'package');await mkdir(pkg);await mkdir(cwd);
 const manifest=JSON.parse(await readFile('package.json','utf8'));
 currentVersion=manifest.version;const parts=currentVersion.split('.');nextVersion=`${parts[0]}.${parts[1]}.${Number(parts[2])+1}`;
 const archives=new Map<string,Buffer>();
 for(const version of [currentVersion,nextVersion]){
 await writeFile(join(pkg,'package.json'),JSON.stringify({name:'takecraft',version,bin:{takecraft:'bin.mjs'},type:'module'}));
 await writeFile(join(pkg,'bin.mjs'),`#!/usr/bin/env node
import {writeFileSync} from 'node:fs';
if(process.env.TAKECRAFT_CALLER_CWD)process.chdir(process.env.TAKECRAFT_CALLER_CWD);
const args=process.argv.slice(2);
if(args[0]==='wait'){console.log('READY');process.on('SIGTERM',()=>{writeFileSync(args[1],'stopped');process.exit(143)});setInterval(()=>{},1000);}
else{console.log(JSON.stringify({version:${JSON.stringify(version)},cwd:process.cwd(),args}));process.exitCode=args[0]==='fail'?2:0;}
`);await chmod(join(pkg,'bin.mjs'),0o755);
 const archive=join(root,'fixture.tgz');await exec('tar',['-czf',archive,'package'],{cwd:root});
 archives.set(version,await readFile(archive));
 }let url='';
 server=createServer((req,res)=>{
  if(req.method==='POST'){res.setHeader('content-type','application/json');res.end('{}');return;}
  if(req.url==='/npm'){res.statusCode=404;res.end('{}');return;}
  if(req.url?.endsWith('.tgz')){res.end(archives.get(req.url.slice(1,-4)));return;}
  const versions=publishNext?[currentVersion,nextVersion]:[currentVersion];
  res.setHeader('cache-control','max-age=0, must-revalidate');
  res.setHeader('content-type','application/json');res.end(JSON.stringify({name:'takecraft','dist-tags':{latest:versions.at(-1)},versions:Object.fromEntries(versions.map(version=>[version,{name:'takecraft',version,bin:{takecraft:'bin.mjs'},dist:{tarball:`${url}/${version}.tgz`,integrity:'sha512-'+createHash('sha512').update(archives.get(version)!).digest('base64')}}]))}));
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${(server.address() as any).port}`;
 const skill=join(root,'独立 Skill');await cp(resolve('skills/takecraft'),skill,{recursive:true});launcher=join(skill,'scripts/run.mjs');
 // A project dependency with even the SAME version must not substitute the registry package.
 await mkdir(join(cwd,'node_modules/takecraft'),{recursive:true});await mkdir(join(cwd,'node_modules/.bin'));
 await writeFile(join(cwd,'package.json'),JSON.stringify({dependencies:{takecraft:manifest.version}}));
 await writeFile(join(cwd,'node_modules/takecraft/package.json'),JSON.stringify({name:'takecraft',version:manifest.version,bin:{takecraft:'bin.mjs'}}));
 const fake=join(cwd,'node_modules/.bin/takecraft');await writeFile(fake,'#!/bin/sh\necho WRONG\n');await chmod(fake,0o755);
 env={...process.env,PATH:join(cwd,'node_modules/.bin')+':'+process.env.PATH,npm_config_registry:url,npm_config_cache:join(root,'cache'),npm_config_fetch_retries:'0',npm_config_fetch_timeout:'2000'};
});
afterAll(async()=>{if(server)await new Promise<void>(r=>server.close(()=>r()));if(root)await rm(root,{recursive:true,force:true});});
test('copied Skill uses exact registry package, literal arguments and caller directory',async()=>{
 const args=['中文 空格','$(touch SHOULD_NOT_EXIST)','--json'];
 const result=await exec(process.execPath,[launcher,...args],{cwd,env});
 expect(JSON.parse(result.stdout)).toMatchObject({cwd:await realpath(cwd),args});
 await expect(exec(process.execPath,[launcher,'fail'],{cwd,env})).rejects.toMatchObject({code:2});
});
test('cached exact package works offline; missing cache reports failure',async()=>{
 await exec(process.execPath,[launcher,'version'],{cwd,env});
 expect(JSON.parse((await exec(process.execPath,[launcher,'version'],{cwd,env:{...env,npm_config_offline:'true'}})).stdout)).toHaveProperty('version');
 await expect(exec(process.execPath,[launcher,'version'],{cwd,env:{...env,npm_config_offline:'true',npm_config_cache:join(root,'empty-cache')}})).rejects.toMatchObject({code:1});
});
test('termination reaches the actual tool and returns nonzero',async()=>{
 const marker=join(root,'stopped');const child=spawn(process.execPath,[launcher,'wait',marker],{cwd,env});
 const ended=new Promise<number|null>(r=>child.once('exit',r));
 try{await new Promise<void>((done,reject)=>{const timer=setTimeout(()=>reject(new Error('tool did not start')),15000);child.stdout.on('data',data=>{if(String(data).includes('READY')){clearTimeout(timer);done();}});child.once('error',reject);});
 child.kill('SIGTERM');expect(await ended).not.toBe(0);expect(await readFile(marker,'utf8')).toBe('stopped');
 }finally{child.kill('SIGKILL');}
});
test('upgrading Skill refreshes cached registry metadata for the new exact version',async()=>{
 // Cache the old registry response, then publish a new version and update only the Skill.
 await exec(process.execPath,[launcher,'version'],{cwd,env});
 publishNext=true;
 const runtime=resolve(launcher,'../../runtime.json');
 try{
  await writeFile(runtime,JSON.stringify({package:'takecraft',version:nextVersion,protocol:1}));
  const result=await exec(process.execPath,[launcher,'version'],{cwd,env});
  expect(JSON.parse(result.stdout)).toMatchObject({version:nextVersion,cwd:await realpath(cwd)});
 }finally{
  publishNext=false;
  await writeFile(runtime,JSON.stringify({package:'takecraft',version:currentVersion,protocol:1}));
 }
});
