import type {Timeline,AssetManifest,Artifact} from '../project/types.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {synthesize} from './sfx.js';
import {artifact} from '../project/hash.js';
import {run} from '../render/process.js';
export async function mixAudio(t:Timeline,a:AssetManifest,outDir:string):Promise<Artifact|null>{
 if(!t.audio.events.length&&!t.audio.clips.length)return null;
 outDir=resolve(outDir);await mkdir(outDir,{recursive:true});const sfx=join(outDir,'sfx.wav');await writeFile(sfx,synthesize(t));
 const args=['-v','error','-nostdin','-y','-i',sfx],filters:string[]=[],labels=['[0:a]'];
 for(const [i,c] of t.audio.clips.entries()){
  args.push('-i',a.items[c.asset].path);const duration=c.end-c.start,fade=Math.min(c.fade,duration/2),label=`c${i}`;
  filters.push(`[${i+1}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=${c.gain},afade=t=in:d=${fade},afade=t=out:st=${duration-fade}:d=${fade},adelay=${Math.round(c.start*1000)}:all=1[${label}]`);labels.push(`[${label}]`);
 }
 filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad,atrim=duration=${t.duration},alimiter=limit=0.5:level=0:latency=1[out]`);
 const output=join(outDir,'mix.wav');args.push('-filter_complex',filters.join(';'),'-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s16le',output);await run('ffmpeg',args);return artifact(output);
}
