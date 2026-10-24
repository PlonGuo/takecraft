import {expect,test} from 'vitest';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {cli} from '../helpers/cli.js';
import {brief} from '../fixtures/brief.js';
import {probe} from '../../src/render/process.js';

test('short brief produces a complete Motion film through the public CLI',async()=>{
 await mkdir(resolve('artifacts'),{recursive:true});
 const root=await mkdtemp(resolve('artifacts/motion-acceptance-')),dir=join(root,'作品'),input=join(root,'brief.json');
 await writeFile(input,JSON.stringify(brief));
 async function run(name:string,args:string[]){const r=await cli([...args,'--json']);await writeFile(join(root,name+'.json'),r.stdout);expect(r.code,r.stdout+r.stderr).toBe(0);return r.data;}
 const composed=await run('compose',['compose',input,dir]);
 const p=JSON.parse(await readFile(composed.projectPath,'utf8'));expect(p.tracks).toEqual([]);
 expect(composed.statistics.expandedTracks).toBeGreaterThan(30);
 await run('preview',['preview',composed.projectPath]);
 const first=await run('build',['build',composed.projectPath,'--no-preview']);expect(first.captures).toBe(450);
 const media=await probe(first.artifacts.video.path);
 expect(media.streams.find(s=>s.codec_type==='video')).toMatchObject({width:1920,height:1080,nb_frames:'450',r_frame_rate:'30/1'});
 expect(Number(media.format.duration)).toBe(15);expect(media.streams.some(s=>s.codec_type==='audio')).toBe(true);
 expect(JSON.parse(await readFile(first.artifacts.quality.path,'utf8'))).toMatchObject({status:'passed',checks:{fullDecode:true}});
 const original=await readFile(first.artifacts.video.path),cached=await run('cached',['build',composed.projectPath,'--resume','--no-preview']);
 expect(cached.captures).toBe(0);expect(await readFile(first.artifacts.video.path)).toEqual(original);
 expect((await run('status',['status',dir])).lastSuccess.runId).toBe(cached.runId);
});
