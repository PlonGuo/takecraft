import {expect,test} from 'vitest';
import {mkdtemp,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {brief} from '../fixtures/brief.js';
const exec=promisify(execFile),entry=fileURLToPath(new URL('../../scripts/run.mjs',import.meta.url));
test('launcher locates its tool while preserving caller paths and exit codes',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'takecraft 调用 '));
 try{
  const run=(args:string[])=>exec(process.execPath,[entry,...args,'--json'],{cwd});
  expect(JSON.parse((await run(['catalog','--kind','actions'])).stdout).actions).toHaveLength(5);
  expect(JSON.parse((await run(['describe','brief'])).stdout).schema).toBeTruthy();
  await writeFile(join(cwd,'brief.json'),JSON.stringify(brief));
  const result=JSON.parse((await run(['compose','brief.json','我的 视频'])).stdout);
  expect(await realpath(result.projectPath)).toBe(await realpath(join(cwd,'我的 视频','project.json')));
  await expect(run(['compose','brief.json','我的 视频'])).rejects.toMatchObject({code:2});
 }finally{await rm(cwd,{recursive:true,force:true});}
});
