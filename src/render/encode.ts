import type {FrameManifest,Artifact} from '../project/types.js';
import {mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {artifact} from '../project/hash.js';
import {run} from './process.js';
export async function encodeVideo(frames:FrameManifest,output:string):Promise<Artifact>{
 output=resolve(output);await mkdir(dirname(output),{recursive:true});
 await run('ffmpeg',['-v','error','-nostdin','-y','-framerate',String(frames.fps),'-start_number','0','-i',join(frames.directory,'%06d.png'),'-frames:v',String(frames.frameCount),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],600000);
 return artifact(output);
}
