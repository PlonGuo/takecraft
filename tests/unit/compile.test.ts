import {expect,test} from 'vitest';
import {compileProject} from '../../src/project/compile.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
test('compiles exact 450-frame duration without changing authored time',()=>{
  const t=compileProject(ProjectSchema.parse(fixture()),{items:{},fonts:[]});
  expect(t.frameCount).toBe(450);expect(t.duration).toBe(15);
});
test('rejects narration that cannot fit its allocated interval',()=>{
  const p=ProjectSchema.parse({...fixture(),assets:{vo:{path:'vo.wav',type:'audio'}},audio:{clips:[{asset:'vo',kind:'narration',start:0,end:2}]}});
  expect(()=>compileProject(p,{items:{vo:{path:'vo.wav',type:'audio',duration:3,mime:'audio/wav',sha256:'x'}},fonts:[]})).toThrow('Narration');
});
