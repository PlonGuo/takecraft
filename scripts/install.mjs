#!/usr/bin/env node
import {mkdir,mkdtemp,readFile,writeFile,lstat,readlink,symlink,rename,rm,readdir,chmod,realpath} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';

const exec=promisify(execFile),repo='PlonGuo/takecraft',validVersion=/^v\d+\.\d+\.\d+$/;
async function exists(path){try{return await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function command(file,args,cwd){
 try{return (await exec(file,args,{cwd,maxBuffer:8*1024*1024})).stdout;}
 catch(e){throw new Error(`${file} ${args.join(' ')} failed: ${[e.stdout,e.stderr].filter(Boolean).join('\n')||e.message}`);}
}
async function request(url){const response=await fetch(url,{headers:{'User-Agent':'takecraft-installer'}});if(!response.ok)throw new Error(`Download failed (${response.status}): ${url}`);return response;}
async function latest(){return (await (await request(`https://api.github.com/repos/${repo}/releases/latest`)).json()).tag_name;}
async function download(version,directory){
 const archive=join(directory,'.source.tar.gz');
 await writeFile(archive,new Uint8Array(await (await request(`https://api.github.com/repos/${repo}/tarball/${version}`)).arrayBuffer()));
 await command('tar',['-xzf',archive,'--strip-components','1','-C',directory]);
 await rm(archive);
}
async function managedLink(path,target){
 const info=await exists(path);
 if(info&&(!info.isSymbolicLink()||resolve(dirname(path),await readlink(path))!==target))throw new Error(`Refusing to replace an existing file or independent Skill: ${path}`);
}
async function linkIfMissing(path,target){await mkdir(dirname(path),{recursive:true});try{await symlink(target,path);}catch(e){if(e.code!=='EEXIST')throw e;await managedLink(path,target);}}
async function switchCurrent(path,target){
 const pending=path+`.${process.pid}.pending`;
 try{await symlink(target,pending);await rename(pending,path);}finally{await rm(pending,{force:true});}
}
async function prepareSkillRuntime(release,version,run){
 const manifestPath=join(release,'skills/takecraft/runtime.json');
 if(!(await exists(manifestPath)))return; // Pre-npm releases use the source launcher.
 const runtime=JSON.parse(await readFile(manifestPath,'utf8'));
 if(runtime.package!=='takecraft'||runtime.version!==version.slice(1)||runtime.protocol!==1)throw new Error('Skill runtime does not match the requested release');
 const entry=join(release,'skills/takecraft/scripts/run.mjs');
 const actual=JSON.parse(await run(process.execPath,[entry,'version','--json'],release));
 if(actual.version!==runtime.version||actual.protocol!==runtime.protocol)throw new Error('Skill resolved an unexpected runtime version');
 await run(process.execPath,[entry,'setup','--json'],release);
 await run(process.execPath,[entry,'doctor','--json'],release);
}

// Dependency hooks let lifecycle tests use real temporary directories without
// downloading dependencies or touching a developer's installed Skill.
export async function install(options={},hooks={}){
 const root=resolve(options.root??join(homedir(),'.local/share/takecraft'));
 const skill=join(resolve(options.skillDir??join(process.env.CODEX_HOME??join(homedir(),'.codex'),'skills')),'takecraft');
 if(skill===root||skill.startsWith(root+sep)||root.startsWith(skill+sep))throw new Error('Installation and Skill paths must not overlap');
 const run=hooks.command??command,fetchSource=hooks.download??download;
 const version=options.version??await (hooks.latest??latest)();
 if(!validVersion.test(version))throw new Error(`Expected a stable tag such as v0.1.0, received: ${version}`);
 const current=join(root,'current'),skillTarget=join(current,'skills/takecraft'),bin=join(root,'bin/takecraft');
 await managedLink(skill,skillTarget);await managedLink(bin,join(current,'scripts/run.mjs'));
 await mkdir(root,{recursive:true});
 const marker=join(root,'.takecraft-install.json');
 if(!(await exists(marker))&&(await readdir(root)).length)throw new Error(`Installation directory is not owned by Takecraft: ${root}`);
 const lock=join(root,'.install-lock');
 try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw new Error(`Another install is active. If it was interrupted, remove this lock after checking no installer is running: ${lock}`);throw e;}
 let stage,createdRelease=false,activated=false,release;
 try{
  if(await exists(marker)){const owned=JSON.parse(await readFile(marker,'utf8'));if(owned.format!==1||owned.repository!==repo)throw new Error('Unsupported installation layout');}
  else await writeFile(marker,JSON.stringify({format:1,repository:repo}));
  const oldInfo=await exists(current);
  if(oldInfo&&!oldInfo.isSymbolicLink())throw new Error(`Expected managed current symlink: ${current}`);
  const previous=oldInfo?resolve(root,await readlink(current)):null;
  if(previous&&dirname(previous)!==join(root,'releases'))throw new Error('Current version points outside managed releases');
  await mkdir(join(root,'releases'),{recursive:true});
  release=join(root,'releases',version);
  if(await exists(release)){
   if(JSON.parse(await readFile(join(release,'.takecraft-release.json'),'utf8')).version!==version)throw new Error('Existing release is not managed by this installer');
   await run(process.execPath,[join(release,'scripts/run.mjs'),'doctor','--json'],release);
  }else{
   process.stderr.write(`[takecraft] Preparing ${version}\n`);
   stage=await mkdtemp(join(root,'.staging-'));
   await fetchSource(version,stage);
   const pkg=JSON.parse(await readFile(join(stage,'package.json'),'utf8'));
   if(pkg.name!=='takecraft'||`v${pkg.version}`!==version)throw new Error('Downloaded source version does not match the requested release');
   await readFile(join(stage,'skills/takecraft/SKILL.md'));
   await run('pnpm',['install','--frozen-lockfile'],stage);
   // Use an available local browser first; provision Chromium only if needed.
   try{await run(process.execPath,[join(stage,'scripts/run.mjs'),'doctor','--json'],stage);}
   catch{await run('pnpm',['exec','playwright','install','chromium'],stage);await run(process.execPath,[join(stage,'scripts/run.mjs'),'doctor','--json'],stage);}
   await chmod(join(stage,'scripts/run.mjs'),0o755);
   await writeFile(join(stage,'.takecraft-release.json'),JSON.stringify({version}));
   await rename(stage,release);stage=undefined;createdRelease=true;
  }
  // Prepare the exact engine used by standalone Skills before reporting success.
  // Failed npm preparation leaves the previous current pointer intact.
  await prepareSkillRuntime(release,version,run);
  // Stable links resolve through the same current pointer, coupling Skill/code.
  await linkIfMissing(skill,skillTarget);await linkIfMissing(bin,join(current,'scripts/run.mjs'));
  await switchCurrent(current,release);activated=true;
  // Keep current plus one rollback version, prune only installer-owned releases.
  for(const name of previous===release?[]:await readdir(join(root,'releases'))){
   const path=join(root,'releases',name);
   if(path===release||path===previous||!validVersion.test(name))continue;
   try{if(JSON.parse(await readFile(join(path,'.takecraft-release.json'),'utf8')).version===name)await rm(path,{recursive:true});}catch(e){process.stderr.write(`[takecraft] Kept old directory ${path}: ${e.message}\n`);}
  }
  return {status:'succeeded',version,root,command:bin,skill,previous:previous===release?null:previous};
 }finally{
  if(stage)await rm(stage,{recursive:true,force:true});
  if(createdRelease&&!activated)await rm(release,{recursive:true,force:true});
  await rm(lock,{recursive:true,force:true});
 }
}

if(process.argv[1]&&await realpath(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const {values}=parseArgs({options:{version:{type:'string'},root:{type:'string'},'skill-dir':{type:'string'},help:{type:'boolean'}}});
  if(values.help)console.log('Takecraft installer: [--version v0.1.0] [--root PATH] [--skill-dir PATH]. Repeat to update. Requires Node >=22.12, pnpm 10, FFmpeg.');
  else{
   if(!['darwin','linux'].includes(process.platform))throw new Error('This installer currently supports macOS and Linux');
   const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||major===22&&minor<12)throw new Error('Install Node.js >=22.12 first');
   if(!(await command('pnpm',['--version'])).startsWith('10.'))throw new Error('Install pnpm 10 first');
   for(const tool of ['ffmpeg','ffprobe'])await command(tool,['-version']);
   console.log(JSON.stringify(await install({version:values.version,root:values.root,skillDir:values['skill-dir']})));
  }
 }catch(e){process.stderr.write(`[takecraft] ${e.message}\n`);process.exitCode=1;}
}
