import {expect,test} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir,access,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {brief} from '../fixtures/brief.js';
const exec=promisify(execFile);

test('published tarball works outside source with production dependencies and symlinked CLI',async()=>{
 const root=await mkdtemp(join(tmpdir(),'takecraft-package-'));
 try{
  await exec('pnpm',['build'],{cwd:process.cwd()});
  await exec('pnpm',['pack','--pack-destination',root],{cwd:process.cwd()});
  const archive=join(root,(await readdir(root)).find(f=>f.endsWith('.tgz'))!);
  await exec(process.execPath,['scripts/check-package.mjs',archive]);
  const files=(await exec('tar',['-tzf',archive])).stdout;
  expect(files).not.toContain('package/src/');expect(files).not.toContain('package/tests/');
  expect(files).not.toMatch(/\.mp4\n/);expect(files).toContain('package/LICENSE');
  const installed=join(root,'installed'),cwd=join(root,'调用 空间');
  await mkdir(installed);await mkdir(cwd);
  await writeFile(join(installed,'package.json'),JSON.stringify({private:true}));
  await exec('npm',['install','--omit=dev','--no-audit','--no-fund',archive],{cwd:installed,timeout:120000,maxBuffer:4*1024*1024});
  await expect(access(join(installed,'node_modules/tsx'))).rejects.toThrow();
  const bin=join(installed,'node_modules/.bin/takecraft');
  const run=async(args:string[])=>{
   try{return JSON.parse((await exec(bin,[...args,'--json'],{cwd,timeout:120000,maxBuffer:4*1024*1024})).stdout);}
   catch(error){const e=error as Error&{stdout?:string;stderr?:string};e.message+='\n'+e.stdout+'\n'+e.stderr;throw e;}
  };
  expect(await run(['version'])).toMatchObject({version:'0.2.0'});
  // The standalone Skill resolves npm in isolation; relative paths still belong to the caller.
  const restored=JSON.parse((await exec(bin,['init','入口 目录','--json'],{cwd:root,env:{...process.env,TAKECRAFT_CALLER_CWD:cwd}})).stdout);
  expect(restored.status).toBe('succeeded');await access(join(cwd,'入口 目录/project.json'));
  expect(await run(['setup'])).toMatchObject({status:'succeeded'});
  expect(await run(['doctor'])).toMatchObject({status:'succeeded'});
  expect(await run(['init','原始 配方'])).toMatchObject({status:'succeeded'});
  await writeFile(join(cwd,'brief.json'),JSON.stringify(brief));
  const composed=await run(['compose','brief.json','产品 视频']);
  expect(await realpath(composed.projectPath)).toBe(await realpath(join(cwd,'产品 视频/project.json')));
  expect(await run(['preview',composed.projectPath])).toMatchObject({status:'succeeded'});
  const result=await run(['build',composed.projectPath,'--no-preview']);
  expect(result).toMatchObject({status:'succeeded',captures:450});
  expect(JSON.parse(await readFile(result.artifacts.quality.path,'utf8'))).toMatchObject({status:'passed',checks:{fullDecode:true}});
  const media=JSON.parse((await exec('ffprobe',['-v','error','-show_format','-show_streams','-of','json',result.artifacts.video.path])).stdout);
  expect(Number(media.format.duration)).toBe(15);
  expect(media.streams.find((s:any)=>s.codec_type==='video')).toMatchObject({width:1920,height:1080});
  await expect(run(['compose','brief.json','产品 视频'])).rejects.toMatchObject({code:2});
 }finally{await rm(root,{recursive:true,force:true});}
},240000);
