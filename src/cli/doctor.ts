import {run} from '../render/process.js';
import {browserVersion} from '../render/browser.js';

export async function doctor(browser?:string){
 const checks:Array<{name:string;status:'passed'|'failed';detail:string}>=[];
 const check=async(name:string,fn:()=>Promise<string>,hint:string)=>{
  try{checks.push({name,status:'passed',detail:await fn()});}
  catch(e){checks.push({name,status:'failed',detail:`${e instanceof Error?e.message.split('\n')[0]:e}. ${hint}`});}
 };
 await check('node',async()=>{const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||major===22&&minor<12)throw new Error('Node >=22.12 required');return process.versions.node;},'Use Node.js 22.12 or newer.');
 for(const tool of ['ffmpeg','ffprobe'])await check(tool,async()=>(await run(tool,['-version'])).stdout.split('\n')[0],'Install FFmpeg and make both ffmpeg and ffprobe available on PATH.');
 await check('browser',()=>browserVersion(browser),'Run pnpm exec playwright install chromium or use --browser /path/to/chrome.');
 return {status:checks.every(c=>c.status==='passed')?'succeeded':'failed',checks};
}
