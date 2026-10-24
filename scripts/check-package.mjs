#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const runtime=JSON.parse(await readFile(new URL('../skills/takecraft/runtime.json',import.meta.url),'utf8'));
assert.equal(runtime.package,pkg.name);assert.equal(runtime.version,pkg.version);assert.equal(runtime.protocol,1);
assert.equal(pkg.private,undefined);assert.equal(pkg.license,'MIT');
if(process.argv[2]){
 const archive=resolve(process.argv[2]);
 const files=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
 for(const file of files)assert.match(file,/^package\/(?:bin\/|dist\/|recipes\/|skills\/takecraft\/|examples\/product-launch-v2\/brief\.json$|package\.json$|README\.md$|LICENSE$|CHANGELOG\.md$)/,`Unexpected packed file: ${file}`);
 for(const file of ['bin/takecraft.mjs','dist/cli/index.js','dist/build-info.json','skills/takecraft/runtime.json','skills/takecraft/scripts/run.mjs','LICENSE'])assert(files.includes('package/'+file),`Missing ${file}`);
 const dir=await mkdtemp(join(tmpdir(),'takecraft-check-'));
 try{
  execFileSync('tar',['-xzf',archive,'-C',dir]);
  const packed=JSON.parse(await readFile(join(dir,'package/package.json'),'utf8'));
  const info=JSON.parse(await readFile(join(dir,'package/dist/build-info.json'),'utf8'));
  const skill=JSON.parse(await readFile(join(dir,'package/skills/takecraft/runtime.json'),'utf8'));
  assert.equal(packed.version,pkg.version);assert.deepEqual(skill,runtime);assert.equal(info.version,pkg.version);
  assert.match(info.dependencies,/^[a-f0-9]{64}$/);
 }finally{await rm(dir,{recursive:true,force:true});}
}
console.log(`Package/Skill ${pkg.version}: checks passed`);
