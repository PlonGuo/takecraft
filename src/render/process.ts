import {spawn} from 'node:child_process';
import {fail,TakecraftError} from '../project/types.js';
export async function run(cmd:string,args:string[],timeout=120000):Promise<{stdout:string;stderr:string}>{
  return new Promise((resolve,reject)=>{
    const child=spawn(cmd,args,{stdio:['ignore','pipe','pipe'],shell:false});let stdout='',stderr='',timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeout);
    child.stdout.on('data',b=>{stdout=(stdout+b).slice(-4_000_000);});child.stderr.on('data',b=>{stderr=(stderr+b).slice(-4_000_000);});
    child.on('error',e=>{clearTimeout(timer);reject(new TakecraftError([{code:'TOOL_MISSING',path:cmd,message:e.message,severity:'error'}]));});
    child.on('close',code=>{clearTimeout(timer);if(code!==0||timedOut)reject(new TakecraftError([{code:timedOut?'TOOL_TIMEOUT':'TOOL_FAILED',path:cmd,message:`Exit ${code}: ${stderr.slice(-6000)}`,severity:'error'}]));else resolve({stdout,stderr});});
  });
}
export async function probe(path:string){
  const r=await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',path]);
  try{return JSON.parse(r.stdout) as {format:{duration?:string};streams:Array<{codec_type:string;codec_name:string;width?:number;height?:number;r_frame_rate?:string;nb_frames?:string;duration?:string}>};}catch{fail('MEDIA_INVALID',path,'Invalid ffprobe output');}
}
