import {expect,test} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,readlink,rm,lstat,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {install,command}=await import(pathToFileURL(resolve('scripts/install.mjs')).href);
test('runs the CLI through a symlinked directory, as with macOS temporary paths',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'takecraft-entry-'));
 try{
  await symlink(resolve('scripts'),join(temp,'scripts'));
  expect(await command(process.execPath,[join(temp,'scripts/install.mjs'),'--help'])).toContain('Takecraft installer:');
 }finally{await rm(temp,{recursive:true,force:true});}
});
async function fixture(){
 const temp=await mkdtemp(join(tmpdir(),'takecraft install ')),root=join(temp,'工具'),skillDir=join(temp,'skills');
 const calls:string[]=[];
 const hooks={async download(version:string,stage:string){await mkdir(join(stage,'scripts'),{recursive:true});await mkdir(join(stage,'skills/takecraft'),{recursive:true});await writeFile(join(stage,'package.json'),JSON.stringify({name:'takecraft',version:version.slice(1)}));await writeFile(join(stage,'scripts/run.mjs'),'#!/usr/bin/env node\nconsole.log("ready")');await writeFile(join(stage,'skills/takecraft/SKILL.md'),version);},async command(cmd:string,args:string[]){calls.push([cmd,...args].join(' '));return '{}';}};
 return {temp,root,skillDir,calls,hooks,options:{root,skillDir,version:'v0.1.0'}};
}
test('installs and upgrades code and Skill together, repeats retain rollback version',async()=>{
 const f=await fixture();try{
  const first=await install(f.options,f.hooks);expect(first.version).toBe('v0.1.0');expect(await readFile(join(f.skillDir,'takecraft/SKILL.md'),'utf8')).toBe('v0.1.0');
  expect((await lstat(join(f.root,'bin/takecraft'))).isSymbolicLink()).toBe(true);
  await install({...f.options,version:'v0.2.0'},f.hooks);expect(await readFile(join(f.skillDir,'takecraft/SKILL.md'),'utf8')).toBe('v0.2.0');
  const installs=f.calls.filter(c=>c.includes('install --frozen-lockfile')).length;
  await install({...f.options,version:'v0.2.0'},f.hooks);expect(f.calls.filter(c=>c.includes('install --frozen-lockfile'))).toHaveLength(installs);
  expect(await readdir(join(f.root,'releases'))).toEqual(['v0.1.0','v0.2.0']);
  await install({...f.options,version:'v0.3.0'},f.hooks);expect(await readdir(join(f.root,'releases'))).toEqual(['v0.2.0','v0.3.0']);
 }finally{await rm(f.temp,{recursive:true,force:true});}
});
test('failed dependencies or doctor preserve current release and remove staging',async()=>{
 const f=await fixture();try{
  await install(f.options,f.hooks);const old=await readlink(join(f.root,'current'));
  for(const failAt of ['pnpm','doctor']){
   await expect(install({...f.options,version:'v0.2.0'},{...f.hooks,command:async(cmd:string,args:string[])=>{if(failAt==='pnpm'&&cmd==='pnpm'||failAt==='doctor'&&args.includes('doctor'))throw Error('injected failure');return '{}';}})).rejects.toThrow('injected failure');
   expect(await readlink(join(f.root,'current'))).toBe(old);expect(await readFile(join(f.skillDir,'takecraft/SKILL.md'),'utf8')).toBe('v0.1.0');
   expect((await readdir(f.root)).some(n=>n.startsWith('.staging')||n==='.install-lock')).toBe(false);
  }
 }finally{await rm(f.temp,{recursive:true,force:true});}
});
test('protects independent Skills, unowned directories, and active install lock',async()=>{
 const f=await fixture();try{
  await mkdir(join(f.skillDir,'takecraft'),{recursive:true});await writeFile(join(f.skillDir,'takecraft/custom'),'keep');
  await expect(install(f.options,f.hooks)).rejects.toThrow('Refusing');expect(await readFile(join(f.skillDir,'takecraft/custom'),'utf8')).toBe('keep');
  await rm(f.skillDir,{recursive:true});await mkdir(f.root);await writeFile(join(f.root,'custom'),'keep');
  await expect(install(f.options,f.hooks)).rejects.toThrow('not owned');await rm(f.root,{recursive:true});
  await install(f.options,f.hooks);await mkdir(join(f.root,'.install-lock'));
  await expect(install({...f.options,version:'v0.2.0'},f.hooks)).rejects.toThrow('Another install');expect((await lstat(join(f.root,'.install-lock'))).isDirectory()).toBe(true);
 }finally{await rm(f.temp,{recursive:true,force:true});}
});
test('rejects mismatched source version and unstable/traversing tag inputs',async()=>{
 const f=await fixture();try{
  await expect(install(f.options,{...f.hooks,download:(_v:string,s:string)=>f.hooks.download('v9.0.0',s)})).rejects.toThrow('version does not match');
  for(const version of ['main','../../outside','v0.1.0-beta'])await expect(install({...f.options,version},f.hooks)).rejects.toThrow('stable tag');
  await expect(lstat(join(f.root,'current'))).rejects.toThrow();
 }finally{await rm(f.temp,{recursive:true,force:true});}
});
test('preserves stdout diagnostics from a failing doctor process',async()=>{
 await expect(command(process.execPath,['-e','console.log(JSON.stringify({status:"failed",checks:[{name:"browser",detail:"Missing libnss3.so"}]}));process.exit(1)'])).rejects.toThrow('Missing libnss3.so');
});
test('rejects overlapping install and Skill paths before creating directories',async()=>{
 const f=await fixture();try{
  await expect(install({...f.options,skillDir:join(f.root,'current')},f.hooks)).rejects.toThrow('must not overlap');
  await expect(lstat(f.root)).rejects.toThrow();
 }finally{await rm(f.temp,{recursive:true,force:true});}
});
