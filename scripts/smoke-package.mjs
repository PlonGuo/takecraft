import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const exec=promisify(execFile),archive=resolve(process.argv[2]);
const root=await mkdtemp(join(tmpdir(),'takecraft-smoke-'));
try{
 await writeFile(join(root,'package.json'),'{"private":true}');
 await exec('npm',['install','--omit=dev','--no-audit','--no-fund',archive],{cwd:root,timeout:120000,maxBuffer:4*2**20});
 const bin=join(root,'node_modules/.bin/takecraft'),cwd=join(root,'作品 空间');await mkdir(cwd);
 const run=async(...args)=>JSON.parse((await exec(bin,[...args,'--json'],{cwd,timeout:120000,maxBuffer:4*2**20})).stdout);
 assert.equal((await run('setup')).status,'succeeded');
 assert.equal((await run('doctor')).status,'succeeded');
 const brief=join(root,'node_modules/takecraft/examples/product-launch-v2/brief.json');
 const project=await run('compose',brief,'film');
 const result=await run('build',project.projectPath,'--no-preview');
 assert.equal(result.status,'succeeded');assert.equal(result.captures,450);
 const quality=JSON.parse(await readFile(result.artifacts.quality.path,'utf8'));assert.equal(quality.checks.fullDecode,true);
 console.log(JSON.stringify({status:'passed',version:(await run('version')).version,captures:result.captures}));
}finally{await rm(root,{recursive:true,force:true});}
