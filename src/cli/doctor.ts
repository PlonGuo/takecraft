import {run} from '../render/process.js';
import {browserVersion} from '../render/browser.js';
import {version} from './version.js';

export type DoctorResult={status:'succeeded'|'failed';version:string;checks:Array<{name:string;status:'passed'|'failed';detail:string}>};
export async function doctor(browser?:string):Promise<DoctorResult>{
 const checks:Array<{name:string;status:'passed'|'failed';detail:string}>=[];
 const check=async(name:string,fn:()=>Promise<string>,hint:string)=>{
  try{checks.push({name,status:'passed',detail:await fn()});}
  catch(e){checks.push({name,status:'failed',detail:`${e instanceof Error?e.message.split('\n')[0]:e}. ${hint}`});}
 };
 await check('node',async()=>{const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||major===22&&minor<20)throw new Error('Node >=22.20 required');return process.versions.node;},'Use Node.js 22.20 or newer.');
 const ffmpegHint=process.platform==='darwin'?'Install FFmpeg (brew install ffmpeg if Homebrew is available); ensure ffmpeg and ffprobe are on PATH.':'Install FFmpeg using your system package manager; ensure ffmpeg and ffprobe are on PATH.';
 for(const tool of ['ffmpeg','ffprobe'])await check(tool,async()=>(await run(tool,['-version'])).stdout.split('\n')[0],ffmpegHint);
 await check('browser',()=>browserVersion(browser),'Run takecraft setup or use --browser /path/to/chrome.');
 return {status:checks.every(c=>c.status==='passed')?'succeeded':'failed',version,checks};
}
