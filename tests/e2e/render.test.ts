import {test,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
import {prepareAssets} from '../../src/project/assets.js';
import {compileProject} from '../../src/project/compile.js';
import {renderFrames} from '../../src/render/frames.js';
import {encodeVideo} from '../../src/render/encode.js';
import {probe,run} from '../../src/render/process.js';
test('renders all 30 ready frames and encodes a decodable 1080p30 second',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'takecraft 成片 '));
 try{const p=ProjectSchema.parse({...fixture(),duration:1});const a=await prepareAssets(p,dir);let captures=0;
 const f=await renderFrames({timeline:compileProject(p,a),assets:a,directory:join(dir,'帧'),onCapture:()=>captures++});
 expect(captures).toBe(30);expect(f.paths).toHaveLength(30);expect(f.paths[29]).toMatch(/000029.png$/);
 const v=await encodeVideo(f,join(dir,'视频.mp4'));const info=await probe(v.path);const stream=info.streams.find(s=>s.codec_type==='video')!;
 expect([stream.width,stream.height,stream.r_frame_rate]).toEqual([1920,1080,'30/1']);expect(Number(info.format.duration)).toBeCloseTo(1,2);
 await run('ffmpeg',['-v','error','-xerror','-i',v.path,'-f','null','-']);
 }finally{await rm(dir,{recursive:true,force:true});}
});
