import {expect,test} from 'vitest';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {cli} from '../helpers/cli.js';
import {probe} from '../../src/render/process.js';

test('public CLI produces and revises a real 15-second 1080p30 product film',async()=>{
 const artifacts=resolve('artifacts');await mkdir(artifacts,{recursive:true});
 const root=await mkdtemp(join(artifacts,'acceptance-')),dir=join(root,'轻舟 产品片'),path=join(dir,'project.json');
 const outputs:Record<string,number>={};
 async function command(name:string,args:string[]){const r=await cli([...args,'--json']);outputs[name]=Buffer.byteLength(r.stdout);await writeFile(join(root,name+'.stdout.json'),r.stdout);await writeFile(join(root,name+'.stderr.log'),r.stderr);expect(r.code,r.stdout+r.stderr).toBe(0);return r.data;}
 await command('init',['init',dir]);await command('validate',['validate',path]);
 const preview=await command('preview',['preview',path]);expect(preview.artifacts.stills.length).toBeGreaterThanOrEqual(5);
 const first=await command('build',['build',path]);expect(first.status).toBe('succeeded');expect(first.captures).toBe(450);
 const frames=JSON.parse(await readFile(first.stages.render.artifacts[1].path,'utf8'));
 expect(frames.frameCount).toBe(450);expect(frames.lastTime).toBe(449/30);
 const media=await probe(first.artifacts.video.path);expect(media.streams.find(v=>v.codec_type==='video')).toMatchObject({width:1920,height:1080,r_frame_rate:'30/1',nb_frames:'450'});expect(Number(media.format.duration)).toBe(15);expect(media.streams.some(v=>v.codec_type==='audio')).toBe(true);
 expect(JSON.parse(await readFile(first.artifacts.quality.path,'utf8'))).toMatchObject({status:'passed',checks:{fullDecode:true}});
 expect(await readFile(first.artifacts.captions.path,'utf8')).toContain('轻舟');
 const original=await readFile(first.artifacts.video.path);
 const project=JSON.parse(await readFile(path,'utf8'));project.title='拾光 · 灵感工作台';project.theme={background:'#f1f0f7',ink:'#2c3154',accent:'#5667a8'};
 for(const actor of project.actors){if(actor.text)actor.text=actor.text.replaceAll('轻舟','拾光').replaceAll('QINGZHOU','SHIGUANG');if(actor.color==='#347c66')actor.color='#5667a8';if(actor.background==='#347c66')actor.background='#5667a8';}
 for(const caption of project.captions)caption.text=caption.text.replaceAll('轻舟','拾光');
 const shot=join(dir,project.assets.screenshot.path);await writeFile(shot,(await readFile(shot,'utf8')).replaceAll('#347c66','#5667a8').replaceAll('#e4eee3','#e5e7f7'));
 await writeFile(path,JSON.stringify(project,null,2));
 const second=await command('revision',['build',path,'--resume']);expect(second.captures).toBe(450);expect(second.artifacts.video.path).not.toBe(first.artifacts.video.path);expect(await readFile(first.artifacts.video.path)).toEqual(original);
 const status=await command('status',['status',dir]);expect(status.lastSuccess.runId).toBe(second.runId);
 const evidence={root,project:path,first,second,preview,stdoutBytes:outputs,agentTokens:'not measured'};
 await writeFile(join(root,'acceptance.json'),JSON.stringify(evidence,null,2));await writeFile(join(artifacts,'acceptance-latest.json'),JSON.stringify(evidence,null,2));
});
