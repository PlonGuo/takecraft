import {beforeEach,expect,test,vi} from 'vitest';
const state=vi.hoisted(()=>({browser:false,ffmpeg:true,downloads:0,downloadError:false}));
vi.mock('../../src/render/browser.js',async original=>({...await original<any>(),browserVersion:async()=>{
 if(!state.browser)throw Error('browser missing');return 'test-browser';
}}));
vi.mock('../../src/render/process.js',async original=>({...await original<any>(),run:async(cmd:string,args:string[])=>{
 if(args.includes('install')){state.downloads++;if(state.downloadError)throw Error('browser download interrupted');state.browser=true;}
 if(cmd==='ffmpeg'&&!state.ffmpeg)throw Error('ffmpeg missing');
 return {stdout:'available',stderr:''};
}}));
import {execute} from '../../src/cli/index.js';
beforeEach(()=>Object.assign(state,{browser:false,ffmpeg:true,downloads:0,downloadError:false}));

test('setup prepares a missing browser, checks the result, and is repeatable',async()=>{
 const first=await execute(['setup','--json']);expect(first.exitCode).toBe(0);
 expect(first.data).toMatchObject({status:'succeeded',version:'0.2.0'});
 expect(state.downloads).toBe(1);
 expect((await execute(['setup','--json'])).exitCode).toBe(0);expect(state.downloads).toBe(1);
});
test('missing system tools stay actionable and do not trigger unrelated downloads',async()=>{
 state.ffmpeg=false;
 const result=await execute(['setup','--json']);expect(result.exitCode).toBe(1);
 expect(result.data).toMatchObject({status:'failed',checks:expect.arrayContaining([expect.objectContaining({name:'ffmpeg',status:'failed',detail:expect.stringContaining('FFmpeg')})])});
 expect(state.downloads).toBe(0);
});
test('explicit invalid browser is reported without replacing it',async()=>{
 const result=await execute(['setup','--browser','/missing/browser','--json']);
 expect(result.exitCode).toBe(1);expect(state.downloads).toBe(0);
});
test('failed browser download keeps a useful failure result',async()=>{
 state.downloadError=true;
 const result=await execute(['setup','--json']);expect(result.exitCode).toBe(1);
 expect(JSON.stringify(result.data)).toContain('browser download interrupted');
});
test('version can be queried without a browser or ffmpeg',async()=>{
 state.ffmpeg=false;
 expect(await execute(['version','--json'])).toMatchObject({exitCode:0,data:{status:'succeeded',name:'takecraft',version:'0.2.0',verifiedPlatforms:['darwin']}});
});
