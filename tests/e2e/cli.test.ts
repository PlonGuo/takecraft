import {expect,test} from 'vitest';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cli} from '../helpers/cli.js';

test('initializes and validates Chinese paths, refuses overwrites and preserves actionable errors',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tc-cli-')),dir=join(root,'我的 视频');
 try{
  const init=await cli(['init',dir,'--recipe','product-launch','--json']);expect(init.code).toBe(0);expect(init.data.projectPath).toBe(join(dir,'project.json'));
  const original=await readFile(init.data.projectPath,'utf8');
  expect((await cli(['init',dir,'--json'])).code).toBe(2);expect(await readFile(init.data.projectPath,'utf8')).toBe(original);
  const valid=await cli(['validate',init.data.projectPath,'--json']);expect(valid.code).toBe(0);expect(valid.data.frameCount).toBe(450);
  const invalid=JSON.parse(original);invalid.title=' ';await writeFile(init.data.projectPath,JSON.stringify(invalid));
  const broken=await cli(['validate',init.data.projectPath,'--json']);expect(broken.code).toBe(2);expect(broken.data.issues.some((v:any)=>v.path==='title')).toBe(true);
  const status=await cli(['status',dir,'--json']);expect(status.code).toBe(0);expect(status.data.latest).toBeNull();
 }finally{await rm(root,{recursive:true,force:true});}
});
test('doctor checks actual browser and media tools and reports a missing explicit browser',async()=>{
 const good=await cli(['doctor','--json']);expect(good.code).toBe(0);expect(good.data.checks.every((v:any)=>v.status==='passed')).toBe(true);
 const bad=await cli(['doctor','--browser','/nonexistent/takecraft-browser','--json']);expect(bad.code).toBe(1);expect(bad.data.checks.find((v:any)=>v.name==='browser').status).toBe('failed');
});
