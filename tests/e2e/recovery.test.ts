import {expect,test} from 'vitest';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fixture} from '../fixtures/project.js';
import {buildProject} from '../../src/pipeline/build.js';
import {readStatus} from '../../src/pipeline/state.js';
test('reuses visuals for audio edits, recovers corrupt cache and preserves success after failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-recovery-'));try{const path=join(dir,'project.json'),p:any={...fixture(),duration:1};const save=()=>writeFile(path,JSON.stringify(p));await save();
 const first=await buildProject(path,{preview:false});expect(first.status).toBe('succeeded');expect(first.captures).toBe(30);
 p.audio={events:[{time:.2,kind:'click'}]};await save();const music=await buildProject(path,{preview:false,resume:true});expect(music.status).toBe('succeeded');expect(music.captures).toBe(0);expect(music.stages.render.status).toBe('cached');expect(music.artifacts.video.path).not.toBe(first.artifacts.video.path);
 await writeFile(music.stages.render.artifacts[0].path,'broken');const repaired=await buildProject(path,{preview:false,resume:true});expect(repaired.status).toBe('succeeded');expect(repaired.captures).toBe(30);
 const previous=await readFile(repaired.artifacts.video.path);p.actors[0].text=' ';await save();const failed=await buildProject(path,{preview:false});expect(failed.status).toBe('failed');expect(failed.captures).toBe(0);expect(failed.failedStage).toBe('validate');expect(failed.exitCode).toBe(2);expect((await readStatus(dir)).lastSuccess?.runId).toBe(repaired.runId);expect(await readFile(repaired.artifacts.video.path)).toEqual(previous);
 }finally{await rm(dir,{recursive:true,force:true});}
});
