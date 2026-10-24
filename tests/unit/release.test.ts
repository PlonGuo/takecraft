import {expect,test} from 'vitest';
// Release scripts are also used directly by Node in CI.
// @ts-expect-error JavaScript release module
import {compareVersions,releaseDecision,assertSamePackage,shouldAdvance} from '../../scripts/release-policy.mjs';
// @ts-expect-error JavaScript release module
import {publishRelease} from '../../scripts/release.mjs';
test('version policy handles numeric ordering and prevents unversioned runtime changes',()=>{
 expect(compareVersions('1.10.0','1.9.9')).toBe(1);
 expect(releaseDecision('0.1.1','0.2.0',['src/cli/index.ts'])).toBe('publish');
 expect(releaseDecision('0.2.0','0.2.0',['README.md','docs/try-it.md'])).toBe('skip');
 for(const file of ['src/foo.ts','skills/takecraft/runtime.json','package.json','pnpm-lock.yaml','scripts/build-metadata.mjs','.github/workflows/release.yml'])expect(()=>releaseDecision('0.2.0','0.2.0',[file])).toThrow(/version/i);
 expect(()=>releaseDecision('0.2.0','0.1.9',['README.md'])).toThrow();
 expect(()=>compareVersions('0.2.0-beta.1','0.2.0')).toThrow();
});
test('published versions must have identical content and source commit',()=>{
 const expected={version:'0.2.0',sourceCommit:'abc',contentHash:'123'};
 expect(()=>assertSamePackage(expected,{...expected})).not.toThrow();
 expect(()=>assertSamePackage(expected,{...expected,sourceCommit:'def'})).toThrow();
 expect(()=>assertSamePackage(expected,{...expected,contentHash:'456'})).toThrow();
});
test('latest pointers never move to an older or equal version',()=>{
 expect(shouldAdvance('0.3.0','0.2.0')).toBe(false);
 expect(shouldAdvance('0.2.0','0.2.0')).toBe(false);
 expect(shouldAdvance(null,'0.2.0')).toBe(true);
});
function fixture(){
 const state:any={published:null,npmLatest:'0.1.1',githubLatest:'0.1.1',tag:null,release:null,failDownload:false,failRelease:false,calls:[]};
 const expected={version:'0.2.0',sourceCommit:'abc',contentHash:'123'};
 const io={
  async getPackage(){return state.published;},async publish(){state.calls.push('publish-pending');state.published={...expected};},
  async verifyDownload(){state.calls.push('verify');if(state.failDownload)throw new Error('download failed');return state.published;},
  async smoke(){state.calls.push('smoke');},
  async getNpmLatest(){return state.npmLatest;},async promote(){state.calls.push('promote');state.npmLatest=expected.version;},
  async getTag(){return state.tag;},async createTag(){state.calls.push('tag');state.tag=expected.sourceCommit;},
  async getRelease(){return state.release;},async getGithubLatest(){return state.githubLatest;},
  async createRelease(latest:boolean){state.calls.push('release');if(state.failRelease)throw new Error('GitHub unavailable');state.release={tag_name:'v0.2.0'};if(latest)state.githubLatest=expected.version;},
 };
 return {state,expected,io};
}
test('verification failure leaves latest and GitHub untouched, retry resumes same package',async()=>{
 const {state,expected,io}=fixture();state.failDownload=true;
 await expect(publishRelease(expected,io)).rejects.toThrow('download failed');
 expect(state.npmLatest).toBe('0.1.1');expect(state.tag).toBeNull();
 state.failDownload=false;await publishRelease(expected,io);
 expect(state.calls.filter((x:string)=>x==='publish-pending')).toHaveLength(1);
 expect(state.npmLatest).toBe('0.2.0');expect(state.githubLatest).toBe('0.2.0');
});
test('old failed job can complete after newer release without rolling latest back',async()=>{
 const {state,expected,io}=fixture();state.failRelease=true;
 await expect(publishRelease(expected,io)).rejects.toThrow('GitHub unavailable');
 state.failRelease=false;state.npmLatest=state.githubLatest='0.3.0';await publishRelease(expected,io);
 expect(state.npmLatest).toBe('0.3.0');expect(state.githubLatest).toBe('0.3.0');expect(state.release).not.toBeNull();
});
test('conflicting immutable package or tag stops release',async()=>{
 const {state,expected,io}=fixture();state.published={...expected,sourceCommit:'wrong'};
 await expect(publishRelease(expected,io)).rejects.toThrow();expect(state.calls).toEqual([]);
 state.published={...expected};state.tag='wrong';await expect(publishRelease(expected,io)).rejects.toThrow(/tag/i);
});
