import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {TakecraftError,fail,type BuildResult,type Artifact} from '../project/types.js';
import {validateProject} from '../project/validate.js';
import {prepareAssets} from '../project/assets.js';
import {compileProject} from '../project/compile.js';
import {artifact,atomicJSON,hash,stable} from '../project/hash.js';
import {browserVersion} from '../render/browser.js';
import {runtimeBundle} from '../render/serve.js';
import {renderFrames} from '../render/frames.js';
import {encodeVideo} from '../render/encode.js';
import {createPreview} from '../render/preview.js';
import {run} from '../render/process.js';
import {mixAudio} from '../audio/mix.js';
import {writeSubtitles} from '../audio/subtitles.js';
import {verifyArtifacts} from '../quality/verify.js';
import {acquireLock} from './lock.js';
import {readCache,saveCache,type CacheEntry} from './cache.js';
import {saveState} from './state.js';
import {retryBrowser} from './retry.js';
import {visualKey,engineHash,dependencyHash} from './fingerprint.js';
import {mux} from './mux.js';
export type BuildOptions={profile?:string;browser?:string;resume?:boolean;preview?:boolean;onProgress?:(stage:string)=>void};
export async function buildProject(projectPath:string,options:BuildOptions={}):Promise<BuildResult>{
 if(options.profile&&options.profile!=='draft')fail('PROFILE_UNSUPPORTED','profile','M1 supports draft (1080p30) only; final is not implemented',2);
 projectPath=resolve(projectPath);const projectDir=dirname(projectPath),root=join(projectDir,'.takecraft');const release=await acquireLock(root);
 const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),out=join(root,'runs',runId);
 const result:BuildResult={runId,status:'running',stages:{},artifacts:{},issues:[],reportPath:join(out,'report.json'),captures:0};let phase='validate';
 const announce=async(name:string)=>{phase=name;options.onProgress?.(name);await saveState(root,result);};
 const stage=async(name:string,key:string,fn:()=>Promise<CacheEntry>)=>{
  await announce(name);const start=performance.now(),cached=await readCache(root,key),entry=cached??await fn();
  if(!cached)await saveCache(root,key,entry);result.stages[name]={status:cached?'cached':'built',artifacts:entry.artifacts,milliseconds:Math.round(performance.now()-start)};await saveState(root,result);return entry;
 };
 try{
  await mkdir(out,{recursive:true});await announce('validate');
  let input:unknown;try{input=JSON.parse(await readFile(projectPath,'utf8'));}catch(e){fail('PROJECT_READ',projectPath,e instanceof Error?e.message:String(e),2);}
  const v=validateProject(input);if(!v.project)throw new TakecraftError(v.issues,2);
  const assets=await prepareAssets(v.project,projectDir),t=compileProject(v.project,assets);await atomicJSON(join(out,'timeline.json'),t);
  await announce('tools');const browser=await browserVersion(options.browser),ffmpeg=(await run('ffmpeg',['-version'])).stdout.split('\n')[0];
  const visualEngine=hash(await runtimeBundle()+await dependencyHash()+await engineHash(['render/browser','render/serve','render/frames','render/encode','render/preview','project/compile','project/schema','project/validate','project/images','motion/schema','motion/presets','runtime/index','runtime/sample','runtime/camera','components/registry']));
  const vk=visualKey(t,assets,visualEngine,browser,ffmpeg);
  const render=await stage('render','visual-'+vk,async()=>{
   const frames=await retryBrowser(()=>renderFrames({timeline:t,assets,directory:join(out,'frames'),browser:options.browser,onCapture:frame=>{result.captures++;appendFileSync(join(out,'captures.jsonl'),JSON.stringify({frame,time:frame/t.fps})+'\n');}}));
   const video=await encodeVideo(frames,join(out,'silent.mp4')),manifest=await artifact(join(frames.directory,'frames.json')),files:Artifact[]=[video,manifest];for(const path of frames.paths)files.push(await artifact(path));
   return {artifacts:[video,manifest],files,data:{frameCount:frames.frameCount,lastTime:frames.lastTime}};
  });
  const audioKey=hash(stable({audio:t.audio,duration:t.duration,assets:Object.fromEntries(Object.entries(assets.items).filter(([,a])=>a.type==='audio').map(([k,a])=>[k,a.sha256])),engine:await engineHash(['audio/mix','audio/sfx','render/process']),ffmpeg}));
  let audio:Artifact|undefined;
  if(t.audio.clips.length||t.audio.events.length){const entry=await stage('audio','audio-'+audioKey,async()=>{const a=(await mixAudio(t,assets,join(out,'audio')))!;return {artifacts:[a],files:[a],data:null};});audio=entry.artifacts[0];result.artifacts.audio=audio;}
  else result.stages.audio={status:'not-requested',artifacts:[],milliseconds:0};
  await announce('subtitles');const captions=await writeSubtitles(t,out);result.stages.subtitles={status:captions?'built':'not-requested',artifacts:captions?[captions]:[],milliseconds:0};if(captions)result.artifacts.captions=captions;
  if(options.preview!==false){const preview=await stage('preview','preview-'+hash(stable({vk,beats:t.beats})),async()=>{const p=await createPreview(t,assets,join(out,'preview'),options.browser);return {artifacts:[p.html,...p.stills],files:[p.html,...p.stills],data:null};});result.artifacts.preview=preview.artifacts[0];}
  else result.stages.preview={status:'not-requested',artifacts:[],milliseconds:0};
  await announce('mux');const video=await mux(render.artifacts[0].path,audio?.path,join(out,'video.mp4'),t.duration);result.stages.mux={status:'built',artifacts:[video],milliseconds:0};
  await announce('verify');const quality=await verifyArtifacts({video:video.path,timeline:t});const qualityPath=join(out,'quality.json');await atomicJSON(qualityPath,quality);result.artifacts.quality=await artifact(qualityPath);
  if(quality.status==='failed')throw new TakecraftError(quality.issues);result.artifacts.video=video;result.status='succeeded';
 }catch(e){result.status='failed';result.failedStage=phase;result.exitCode=e instanceof TakecraftError?e.exitCode:1;result.issues=e instanceof TakecraftError?e.issues:[{code:'BUILD_FAILED',path:phase,message:e instanceof Error?e.message:String(e),severity:'error'}];await writeFile(join(out,'failure.log'),e instanceof Error?e.stack??e.message:String(e));}
 finally{try{await saveState(root,result);}finally{await release();}}
 return result;
}
