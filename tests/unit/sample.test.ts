import {expect,test} from 'vitest';
import {sample} from '../../src/runtime/sample.js';
import {TrackSchema} from '../../src/project/schema.js';
const tracks=[TrackSchema.parse({actor:'a',property:'x',start:1,end:2,from:0,to:100,ease:'linear'})];
test.each([[0,9],[1,0],[1.5,50],[2,100],[8,100]])('samples t=%s independently of playback order', (t,v)=>{expect(sample(9,tracks,t)).toBe(v);});
