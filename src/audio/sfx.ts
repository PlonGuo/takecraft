import type {Timeline} from '../project/types.js';
import {fail} from '../project/types.js';
export const sampleRate=48000;
export function synthesize(t:Timeline):Buffer{
 const count=Math.round(t.duration*sampleRate),pcm=new Float64Array(count);let seed=17;
 for(const event of t.audio.events){
  if(!Number.isFinite(event.time)||event.time<0||event.time>=t.duration)fail('AUDIO_TIME','audio.events','Invalid event time',2);
  const length=event.kind==='click'?.07:event.kind==='air'?.6:.35,offset=Math.round(event.time*sampleRate);
  for(let i=0;i<length*sampleRate&&offset+i<count;i++){
   const s=i/sampleRate,u=s/length;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
   const wave=event.kind==='air'?noise*.25*Math.sin(Math.PI*u)**2:event.kind==='click'?(Math.sin(s*2*Math.PI*1800)+noise*.2)*Math.exp(-u*12):Math.sin(s*2*Math.PI*(100-45*u))*Math.exp(-u*6);
   pcm[offset+i]+=wave*event.gain;
  }
 }
 const bytes=Buffer.alloc(44+count*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(sampleRate,24);bytes.writeUInt32LE(sampleRate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(count*4,40);
 for(let i=0;i<count;i++){const value=Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767);bytes.writeInt16LE(value,44+i*4);bytes.writeInt16LE(value,46+i*4);}return bytes;
}
