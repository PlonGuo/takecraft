import {expect,test} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import sharp from 'sharp';
import {brief} from '../fixtures/brief.js';
import {cli} from '../helpers/cli.js';

test('composes from a short brief, copies relative assets, and refuses overwrites',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tc compose ')),source=join(root,'中文 需求'),target=join(root,'我的 视频');
 try{
  await mkdir(source);const bytes=await sharp({create:{width:300,height:200,channels:3,background:'#347c66'}}).png().toBuffer();await writeFile(join(source,'画面.png'),bytes);
  const input=join(source,'brief.json');await writeFile(input,JSON.stringify({...brief,screenshot:'画面.png'}));
  const result=await cli(['compose',input,target,'--theme','midnight','--json']);expect(result.code,result.stderr+result.stdout).toBe(0);expect(result.data.theme).toBe('midnight');expect(result.stdout.length).toBeLessThan(1500);
  const contents=await readFile(result.data.projectPath,'utf8'),project=JSON.parse(contents);
  expect(project.tracks).toEqual([]);expect(project.actions.length).toBeGreaterThan(5);expect(isAbsolute(project.assets.screenshot.path)).toBe(false);
  expect(await readFile(join(target,project.assets.screenshot.path))).toEqual(bytes);
  expect((await cli(['validate',result.data.projectPath,'--json'])).code).toBe(0);
  expect((await cli(['compose',input,target,'--json'])).code).toBe(2);expect(await readFile(result.data.projectPath,'utf8')).toBe(contents);
  const bad=join(root,'bad');await writeFile(input,JSON.stringify({...brief,screenshot:'missing.png'}));
  expect((await cli(['compose',input,bad,'--json'])).code).toBe(2);await expect(access(bad)).rejects.toThrow();
 }finally{await rm(root,{recursive:true,force:true});}
});
