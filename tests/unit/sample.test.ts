import {expect,test} from 'vitest';
import {sample} from '../../src/runtime/sample.js';
import {TrackSchema} from '../../src/project/schema.js';
const tracks=[TrackSchema.parse({actor:'a',property:'x',start:1,end:2,from:0,to:100,ease:'linear'})];
test.each([[0,9],[1,0],[1.5,50],[2,100],[8,100]])('samples t=%s independently of playback order', (t,v)=>{expect(sample(9,tracks,t)).toBe(v);});

test('Motion spring has controlled overshoot and exact endpoints',()=>{
 const springTrack=TrackSchema.parse({actor:'a',property:'x',start:0,end:1,from:0,to:100,ease:{type:'spring',bounce:.32}});
 expect(sample(0,[springTrack],.5)).toBeGreaterThan(100);
 expect(sample(0,[springTrack],0)).toBe(0);expect(sample(0,[springTrack],1)).toBe(100);
 const reference=[0,.1,.3,.5,.8,1].map(t=>sample(0,[springTrack],t));
 expect([1,.8,.5,.3,.1,0].map(t=>sample(0,[springTrack],t)).reverse()).toEqual(reference);
});
