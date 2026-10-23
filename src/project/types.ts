export type { Project, Actor, Track, Ease } from './schema.js';
import type { Project } from './schema.js';
export type Issue = { code:string; path:string; message:string; severity:'error'|'warning' };
export class TakecraftError extends Error {
  constructor(public issues:Issue[], public exitCode=1) { super(issues.map(i=>`${i.path}: ${i.message}`).join('; ')); this.name='TakecraftError'; }
}
export function fail(code:string,path:string,message:string,exitCode=1):never { throw new TakecraftError([{code,path,message,severity:'error'}],exitCode); }
export type AssetRecord = {path:string;sha256:string;type:'image'|'audio'|'font';width?:number;height?:number;duration?:number;mime:string;image?:{png:Uint8Array;sha256:string}};
export type FontRecord = AssetRecord & {unicodeRange?:string};
export type AssetManifest = { items:Record<string,AssetRecord>; fonts:FontRecord[] };
export type Timeline = Project & {frameCount:number};
export type Artifact = {path:string;sha256:string;bytes:number};
export type FrameInspection = {time:number;boxes:Record<string,{x:number;y:number;width:number;height:number;opacity:number;overflow:boolean}>;issues:Issue[]};
export type Runtime = {ready():Promise<void>;seek(seconds:number):Promise<void>;inspect(seconds:number):Promise<FrameInspection>;dispose():void};
export type FrameManifest = {directory:string;paths:string[];width:number;height:number;fps:number;frameCount:number;fingerprint:string;lastTime:number};
export type QualityReport = {status:'passed'|'failed';issues:Issue[];checks:Record<string,unknown>};
export type StageResult = {status:'built'|'cached'|'not-requested';artifacts:Artifact[];milliseconds:number};
export type BuildResult = {runId:string;status:'succeeded'|'failed'|'running'|'interrupted';stages:Record<string,StageResult>;artifacts:Record<string,Artifact>;issues:Issue[];reportPath:string;captures:number;failedStage?:string;exitCode?:number};
