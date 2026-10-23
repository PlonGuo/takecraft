import {expect,test} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../fixtures/project.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {compileProject} from '../../src/project/compile.js';
import {mixAudio} from '../../src/audio/mix.js';
import {verifyArtifacts} from '../../src/quality/verify.js';
import {run,probe} from '../../src/render/process.js';
const t=compileProject(ProjectSchema.parse({...fixture(),duration:1,audio:{events:[{time:.2,kind:'land'}]}}),{items:{},fonts:[]});
test('mixes full-length audio, checks encoded AAC peak and refuses invalid media',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-quality-'));try{
 const audio=await mixAudio(t,{items:{},fonts:[]},dir);expect(Number((await probe(audio!.path)).format.duration)).toBeCloseTo(1,2);
 const video=join(dir,'v.mp4');await run('ffmpeg',['-v','error','-f','lavfi','-i','color=c=white:s=1920x1080:r=30:d=1','-i',audio!.path,'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-t','1',video]);
 const q=await verifyArtifacts({video,timeline:t});expect(q.status).toBe('passed');expect(Number(q.checks.peakDb)).toBeLessThanOrEqual(-3);
 const wrong={...t,canvas:{width:1280,height:720}} as any;expect((await verifyArtifacts({video,timeline:wrong})).issues.map(i=>i.code)).toContain('VIDEO_SPEC');
 const silent=join(dir,'silent.mp4');await run('ffmpeg',['-v','error','-i',video,'-an','-c:v','copy',silent]);
 expect((await verifyArtifacts({video:silent,timeline:t})).issues.map(i=>i.code)).toContain('AUDIO_MISSING');
 expect((await verifyArtifacts({video:silent,timeline:{...t,audio:{events:[],clips:[]}}})).status).toBe('passed');
 const loud=join(dir,'loud.mp4');await run('ffmpeg',['-v','error','-i',video,'-f','lavfi','-i','sine=frequency=440:duration=1','-map','0:v','-map','1:a','-c:v','copy','-af','volume=9','-c:a','aac',loud]);
 expect((await verifyArtifacts({video:loud,timeline:t})).issues.map(i=>i.code)).toContain('AUDIO_PEAK');
 await writeFile(video,'corrupt');expect((await verifyArtifacts({video,timeline:t})).status).toBe('failed');
 }finally{await rm(dir,{recursive:true,force:true});}
});
