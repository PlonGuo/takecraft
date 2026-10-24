#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Resolve dependencies beside this launcher, while relative inputs keep the
// caller's working directory. Use source so a stale dist cannot shadow edits.
const require=createRequire(import.meta.url);
try {
 const loader=pathToFileURL(require.resolve('tsx')).href;
 const entry=fileURLToPath(new URL('../src/cli/index.ts',import.meta.url));
 const child=spawn(process.execPath,['--import',loader,entry,...process.argv.slice(2)],{stdio:'inherit'});
 child.on('error',error=>{process.stderr.write(`[takecraft] ${error.message}\n`);process.exitCode=1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
 child.on('close',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:signal==='SIGTERM'?143:1);});
} catch(error) {
 process.stderr.write(`[takecraft] Cannot start: ${error.message}. Run pnpm install in the tool repository.\n`);
 process.exitCode=1;
}
