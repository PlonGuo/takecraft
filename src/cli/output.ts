import {TakecraftError,type Issue} from '../project/types.js';

export function failure(error:unknown){
 const issues:Issue[]=error instanceof TakecraftError?error.issues:[{code:'COMMAND_FAILED',path:'command',message:error instanceof Error?error.message:String(error),severity:'error'}];
 return {data:{status:'failed',issues},exitCode:error instanceof TakecraftError?error.exitCode:1};
}
export function output(value:unknown,json:boolean){process.stdout.write(JSON.stringify(value,null,json?undefined:2)+'\n');}
