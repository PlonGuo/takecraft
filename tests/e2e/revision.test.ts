import {expect,test} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fixture} from '../fixtures/project.js';
import {cli,cliEntry} from '../helpers/cli.js';
import {run} from '../../src/render/process.js';

test('music-only revision takes no screenshots, content replacement invalidates visuals, failures preserve last success',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-revision-')),path=join(dir,'project.json'),p:any={...fixture(),duration:1};
 try{
  const shot=join(dir,'画面.svg'),music=join(dir,'音乐.wav');
  await writeFile(shot,'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#00ff00"/></svg>');
  const tone=async(frequency:number)=>run('ffmpeg',['-v','error','-y','-f','lavfi','-i',`sine=frequency=${frequency}:duration=1`,'-c:a','pcm_s16le',music]);await tone(330);
  p.assets={shot:{type:'image',path:'画面.svg'},music:{type:'audio',path:'音乐.wav'}};p.actors.push({id:'shot',type:'image',asset:'shot',x:1500,y:200,width:100,height:100});p.audio={clips:[{asset:'music',kind:'music',start:0,end:1}]};
  const save=()=>writeFile(path,JSON.stringify(p));await save();
  const build=()=>cli(['build',path,'--no-preview','--resume','--json']);
  const first=await build();expect(first.code,first.stdout).toBe(0);expect(first.data.captures).toBe(30);
  const captureLog=join(dirname(first.data.reportPath),'captures.jsonl');expect((await readFile(captureLog,'utf8')).trim().split('\n')).toHaveLength(30);
  await tone(550);const musicOnly=await build();expect(musicOnly.code,musicOnly.stdout).toBe(0);expect(musicOnly.data.captures).toBe(0);expect(musicOnly.data.stages.render.status).toBe('cached');expect(await readdir(dirname(musicOnly.data.reportPath))).not.toContain('frames');expect(await readdir(dirname(musicOnly.data.reportPath))).not.toContain('captures.jsonl');
  await writeFile(shot,(await readFile(shot,'utf8')).replace('#00ff00','#ff0000'));const changed=await build();expect(changed.code,changed.stdout).toBe(0);expect(changed.data.captures).toBe(30);
  const previous=await readFile(changed.data.artifacts.video.path);p.assets.shot.path='不存在.png';await save();const missing=await build();expect(missing.code).toBe(2);expect(missing.data.issues[0].code).toBe('ASSET_INVALID');
  const status=await cli(['status',dir,'--json']);expect(status.data.lastSuccess.runId).toBe(changed.data.runId);expect(await readFile(changed.data.artifacts.video.path)).toEqual(previous);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a killed CLI resumes only verified complete stages and new text cannot reuse old frames',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-interrupt-')),path=join(dir,'project.json'),p:any={...fixture(),duration:1,audio:{events:[{time:.2,kind:'click'}]}};
 try{
  await writeFile(path,JSON.stringify(p));
  await new Promise<void>((resolve,reject)=>{
   const child=spawn(process.execPath,['--import','tsx',cliEntry,'build',path,'--no-preview','--json'],{stdio:['ignore','pipe','pipe']});let log='',killed=false;
   const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Build did not reach audio stage: '+log));},30000);
   child.stderr.on('data',b=>{log+=b;if(!killed&&log.includes('[takecraft] audio')){killed=true;child.kill('SIGKILL');}});
   child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',()=>{clearTimeout(timer);if(killed)resolve();else reject(new Error('Build exited before interruption: '+log));});
  });
  const interrupted=await cli(['status',dir,'--json']);expect(interrupted.data.latest.status).toBe('interrupted');
  const resumed=await cli(['build',path,'--no-preview','--resume','--json']);expect(resumed.code,resumed.stdout).toBe(0);expect(resumed.data.stages.render.status).toBe('cached');expect(resumed.data.captures).toBe(0);
  p.actors[0].text='恢复后的新标题';await writeFile(path,JSON.stringify(p));
  const changed=await cli(['build',path,'--no-preview','--resume','--json']);expect(changed.code,changed.stdout).toBe(0);expect(changed.data.captures).toBe(30);
  await rm(changed.data.stages.render.artifacts[0].path);const repair=await cli(['build',path,'--no-preview','--resume','--json']);expect(repair.code,repair.stdout).toBe(0);expect(repair.data.captures).toBe(30);
 }finally{await rm(dir,{recursive:true,force:true});}
});
