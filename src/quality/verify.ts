import type {Timeline,QualityReport} from '../project/types.js';
import {probe,run} from '../render/process.js';
import {peakDb} from './media.js';
export type VerifyInput={video:string;timeline:Timeline};
export async function verifyArtifacts({video,timeline:t}:VerifyInput):Promise<QualityReport>{
 const issues:QualityReport['issues']=[],checks:QualityReport['checks']={};
 const issue=(code:string,message:string)=>issues.push({code,path:video,message,severity:'error'});
 try{
  const info=await probe(video),v=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
  checks.media=info;const rate=v?.r_frame_rate?.split('/').map(Number)??[];
  if(!v||v.width!==t.canvas.width||v.height!==t.canvas.height||rate[0]/rate[1]!==t.fps||Number(v.nb_frames)!==t.frameCount||v.codec_name!=='h264')issue('VIDEO_SPEC','Unexpected dimensions, frame rate, frame count or codec');
  if(Math.abs(Number(info.format.duration)-t.duration)>1/t.fps||!Number.isFinite(Number(info.format.duration)))issue('VIDEO_DURATION','Video duration differs from timeline');
  const required=t.audio.clips.length>0||t.audio.events.length>0;
  if(required&&!audio)issue('AUDIO_MISSING','Expected an audio track');
  if(audio){const peak=await peakDb(video);checks.peakDb=Number.isFinite(peak)?peak:null;if(peak>-3)issue('AUDIO_PEAK',`Encoded audio peak ${peak} dBFS exceeds -3 dBFS`);if(Math.abs(Number(audio.duration)-t.duration)>.05)issue('AUDIO_DURATION','Audio duration differs from timeline');}
  await run('ffmpeg',['-v','error','-nostdin','-xerror','-i',video,'-f','null','-']);checks.fullDecode=true;
 }catch(e){issue('MEDIA_INVALID',e instanceof Error?e.message:String(e));}
 return {status:issues.length?'failed':'passed',issues,checks};
}
