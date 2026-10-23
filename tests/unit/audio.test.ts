import {expect,test} from 'vitest';
import {fixture} from '../fixtures/project.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {compileProject} from '../../src/project/compile.js';
import {synthesize} from '../../src/audio/sfx.js';
const timeline=()=>compileProject(ProjectSchema.parse({...fixture(),duration:1,audio:{events:[{time:.5,kind:'click'}]}}),{items:{},fonts:[]});
test('sound synthesis is deterministic and places events after silence',()=>{
 const t=timeline(),a=synthesize(t);expect(a).toEqual(synthesize(t));expect(a.toString('ascii',0,4)).toBe('RIFF');expect(a.length).toBe(44+48000*4);
 expect(a.subarray(44,44+24000*4).every(v=>v===0)).toBe(true);expect(a.subarray(44+24000*4).some(v=>v!==0)).toBe(true);
});
test.each([-1,1])('sound synthesis rejects event at %s',time=>{const t=timeline();t.audio.events[0].time=time;expect(()=>synthesize(t)).toThrow(/time/);});
