import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,readdir,lstat,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertSamePackage,shouldAdvance} from './release-policy.mjs';
const exec=promisify(execFile);
const repository='PlonGuo/takecraft',registry='https://registry.npmjs.org';

export async function waitForPublished(read,{now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),timeoutMs=180000}={}){
 const deadline=now()+timeoutMs;let delay=2000;
 for(;;){
  const info=await read();if(info)return info;
  const remaining=deadline-now();
  if(remaining<=0)throw new Error('Published version not readable after registry propagation wait; rerun this release');
  await sleep(Math.min(delay,remaining));delay=Math.min(delay*2,15000);
 }
}

export async function publishRelease(expected,io){
 const existing=await io.getPackage();if(existing)assertSamePackage(expected,existing);
 const tag=await io.getTag();assert(tag===null||tag===expected.sourceCommit,'Existing Git tag points at another commit');
 if(!existing)await io.publish();
 assertSamePackage(expected,await io.verifyDownload());
 await io.smoke();
 if(shouldAdvance(await io.getNpmLatest(),expected.version))await io.promote();
 if(tag===null)await io.createTag();
 const release=await io.getRelease();
 if(!release)await io.createRelease(shouldAdvance(await io.getGithubLatest(),expected.version));
 return {status:'succeeded',version:expected.version};
}

async function request(url,{missing=false,...options}={}){
 for(let attempt=0;;attempt++){
  try{
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
   if(response.status===404&&missing)return null;
   if(!response.ok){const error=new Error(`HTTP ${response.status}: ${url}`);error.retryable=response.status>=500||response.status===429;throw error;}
   return response;
  }catch(error){if(attempt>=2||error.retryable===false)throw error;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 }
}
async function inspectArchive(archive){
 const dir=await mkdtemp(join(tmpdir(),'takecraft-release-inspect-'));
 try{
  const listing=(await exec('tar',['-tzf',archive])).stdout.trim().split('\n');
  assert(listing.every(p=>p.startsWith('package/')&&!p.split('/').includes('..')),'Unsafe package paths');
  await exec('tar',['-xzf',archive,'-C',dir]);
  const hash=createHash('sha256');
  async function walk(relative){for(const name of (await readdir(join(dir,relative))).sort()){
   const path=join(relative,name),stat=await lstat(join(dir,path));
   assert(!stat.isSymbolicLink(),'Package cannot contain symbolic links');
   if(stat.isDirectory())await walk(path);
   else {hash.update(path+'\0'+(stat.mode&0o111)+'\0');hash.update(await readFile(join(dir,path)));hash.update('\0');}
  }}
  await walk('package');
  const info=JSON.parse(await readFile(join(dir,'package/dist/build-info.json'),'utf8'));
  const pkg=JSON.parse(await readFile(join(dir,'package/package.json'),'utf8'));
  assert.equal(pkg.name,'takecraft');assert.equal(pkg.version,info.version);
  return {version:pkg.version,sourceCommit:info.sourceCommit,contentHash:hash.digest('hex')};
 }finally{await rm(dir,{recursive:true,force:true});}
}

async function main(){
 const archive=resolve(process.argv[2]??'');assert(process.argv[2],'Pass the validated .tgz path');
 const expected=await inspectArchive(archive),tag=`v${expected.version}`;
 const sha=(await exec('git',['rev-parse','HEAD'])).stdout.trim();
 assert.equal(expected.sourceCommit,sha,'Tarball must be built from the current commit');
 assert.equal((await exec('git',['status','--porcelain'])).stdout.trim(),'','Release checkout must be clean');
 await exec(process.execPath,['scripts/check-package.mjs',archive]);
 if(process.argv.includes('--dry-run')){console.log(JSON.stringify({status:'dry-run',...expected}));return;}
 assert.equal(process.env.GITHUB_REF,'refs/heads/main','Production release runs only in main Actions');
 assert.equal(process.env.GITHUB_SHA,sha);assert.equal(process.env.GITHUB_REPOSITORY,repository);
 const token=process.env.GH_TOKEN??process.env.GITHUB_TOKEN;assert(token,'GitHub token missing');
 const api=async(path,method='GET',body)=>{
  const response=await request(`https://api.github.com/repos/${repository}/${path}`,{missing:method==='GET',method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return response?response.json():null;
 };
 const metadata=async(version)=>{const r=await request(`${registry}/takecraft/${version}`,{missing:true});return r?r.json():null;};
 const workspace=await mkdtemp(join(tmpdir(),'takecraft-release-'));let downloaded;
 async function download(){
  const data=await metadata(expected.version);if(!data)return null;
  const url=new URL(data.dist.tarball);assert.equal(url.origin,registry);
  const bytes=Buffer.from(await(await request(url.href)).arrayBuffer());
  assert.equal(data.dist.integrity,'sha512-'+createHash('sha512').update(bytes).digest('base64'),'Registry integrity differs');
  downloaded=join(workspace,'download.tgz');await writeFile(downloaded,bytes);
  return inspectArchive(downloaded);
 }
 try{
  const result=await publishRelease(expected,{
   getPackage:download,
   async publish(){await exec('npm',['publish',archive,'--access','public','--tag','pending','--provenance','--registry',registry],{timeout:180000,maxBuffer:2**20});},
   verifyDownload:()=>waitForPublished(download),
   async smoke(){await exec(process.execPath,['scripts/smoke-package.mjs',downloaded],{timeout:240000,maxBuffer:4*2**20});},
   async getNpmLatest(){return (await metadata('latest'))?.version??null;},
   async promote(){await exec('npm',['dist-tag','add',`takecraft@${expected.version}`,'latest','--registry',registry]);},
   async getTag(){let ref=(await api(`git/ref/tags/${tag}`))?.object;while(ref?.type==='tag')ref=(await api(`git/tags/${ref.sha}`))?.object;return ref?.sha??null;},
   async createTag(){await api('git/refs','POST',{ref:`refs/tags/${tag}`,sha});},
   getRelease:()=>api(`releases/tags/${tag}`),
   async getGithubLatest(){return (await api('releases/latest'))?.tag_name?.replace(/^v/,'')??null;},
   async createRelease(latest){
    const changelog=await readFile('CHANGELOG.md','utf8');
    const section=changelog.split(`## ${expected.version}`)[1]?.split('\n## ')[0];assert(section,'Missing changelog');
    await api('releases','POST',{tag_name:tag,target_commitish:sha,name:`Takecraft ${tag}`,body:`## ${expected.version}${section}\n\n安装：\n\`npx --yes skills add https://github.com/${repository}/tree/${tag}/skills/takecraft --skill takecraft -a codex -g -y\`\n\nCLI：\`npx --yes takecraft@${expected.version} setup --json\`\n`,draft:false,prerelease:false,make_latest:latest?'true':'false'});
   },
  });console.log(JSON.stringify(result));
 }finally{await rm(workspace,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
