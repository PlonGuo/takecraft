import {run} from '../render/process.js';
export async function peakDb(path:string){const {stderr}=await run('ffmpeg',['-hide_banner','-nostdin','-i',path,'-vn','-af','volumedetect','-f','null','-']);const m=/max_volume: (-?[\d.]+|-inf) dB/.exec(stderr);if(!m)throw new Error('Cannot measure audio peak');return m[1]==='-inf'?-Infinity:Number(m[1]);}
