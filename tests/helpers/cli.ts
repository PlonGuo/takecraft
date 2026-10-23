import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const cliEntry=fileURLToPath(new URL('../../src/cli/index.ts',import.meta.url));
export async function cli(args:string[],timeout=180000){
 return new Promise<{code:number|null;stdout:string;stderr:string;data:any}>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx',cliEntry,...args],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>child.kill('SIGKILL'),timeout);
  child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
  child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',code=>{clearTimeout(timer);let data;try{data=JSON.parse(stdout);}catch{}resolve({code,stdout,stderr,data});});
 });
}
