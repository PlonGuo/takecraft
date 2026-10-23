import {expect,test} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../fixtures/project.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {compileProject} from '../../src/project/compile.js';
import {writeSubtitles} from '../../src/audio/subtitles.js';
test('exports exact millisecond SRT times and multiline Chinese text',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-srt-'));try{const t=compileProject(ProjectSchema.parse({...fixture(),captions:[{start:1.25,end:2.5,text:'你好\n世界'}]}),{items:{},fonts:[]});
 const a=await writeSubtitles(t,dir);expect(await readFile(a!.path,'utf8')).toBe('1\n00:00:01,250 --> 00:00:02,500\n你好\n世界\n\n');
 t.captions[0].end=20;await expect(writeSubtitles(t,dir)).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true});}
});
