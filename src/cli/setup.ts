import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {doctor,type DoctorResult} from './doctor.js';
import {run} from '../render/process.js';

const require=createRequire(import.meta.url);
export async function setup(browser?:string):Promise<DoctorResult>{
 const result=await doctor(browser);
 // A custom browser is a user's choice; system dependencies need their own fix.
 if(browser||result.checks.some(c=>c.name!=='browser'&&c.status==='failed')||result.status==='succeeded')return result;
 try{
  process.stderr.write('[takecraft] Preparing Chromium; this may download browser files.\n');
  const cli=join(dirname(require.resolve('playwright/package.json')),'cli.js');
  await run(process.execPath,[cli,'install','chromium'],600000);
 }catch(error){
  return {...result,status:'failed',checks:[...result.checks,{name:'browser-install',status:'failed',detail:error instanceof Error?error.message:String(error)}]};
 }
 return doctor();
}
