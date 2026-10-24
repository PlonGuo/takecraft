import assert from 'node:assert/strict';
const stable=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function compareVersions(a,b){
 assert(stable.test(a)&&stable.test(b),'Only stable MAJOR.MINOR.PATCH versions can be released');
 const left=a.split('.').map(BigInt),right=b.split('.').map(BigInt);
 for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]>right[i]?1:-1;
 return 0;
}
export function releaseDecision(before,after,files){
 const order=compareVersions(after,before);assert(order>=0,'Version cannot decrease');
 if(order>0)return 'publish';
 const documentation=file=>file.startsWith('docs/')||file.startsWith('tests/')||['README.md','CHANGELOG.md','AGENTS.md','.gitignore'].includes(file);
 assert(files.every(documentation),'Production changes require a new version');return 'skip';
}
export function assertSamePackage(expected,actual){
 for(const field of ['version','sourceCommit','contentHash'])assert.equal(actual?.[field],expected[field],`Published package ${field} differs; use a new version`);
}
export const shouldAdvance=(current,next)=>current===null||compareVersions(next,current)>0;
