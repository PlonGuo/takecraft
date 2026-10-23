import {expect,test} from 'vitest';
import {fixture} from '../fixtures/project.js';
import {validateProject} from '../../src/project/validate.js';
import {compileProject} from '../../src/project/compile.js';
import {cameraAt} from '../../src/runtime/camera.js';
const box={id:'box',type:'surface',x:100,y:100,width:400,height:100};
const make=(actions:unknown[],extra:Record<string,unknown>={})=>({...fixture(),actors:[box],actions,...extra});
function compile(input:unknown){const v=validateProject(input);expect(v.issues).toEqual([]);return compileProject(v.project!,{items:{},fonts:[]});}
test('enter hides before its start and staggers complete poses',()=>{
 const t=compile(make([{type:'enter',targets:['box','second'],at:1,duration:1,stagger:.2}],{actors:[box,{...box,id:'second',y:300}]}));
 expect(t.actors.map(a=>a.opacity)).toEqual([0,0]);
 expect(t.tracks.find(k=>k.actor==='box'&&k.property==='y')).toMatchObject({from:132,to:100,start:1,end:2});
 expect(t.tracks.find(k=>k.actor==='second'&&k.property==='opacity')?.end).toBeCloseTo(2.2);
});
test('morph and re-entry retain the layout without rewriting earlier initial states',()=>{
 const t=compile(make([{type:'enter',targets:['box'],at:0,duration:1},{type:'morph',actor:'box',at:1,duration:1,to:{x:500,width:900}},{type:'exit',targets:['box'],at:3,duration:.5},{type:'enter',targets:['box'],at:5,duration:1}]));
 expect(t.actors[0]).toMatchObject({opacity:0,y:132,x:100});
 expect(t.tracks.find(k=>k.start===5&&k.property==='x')?.to).toBe(500);
 expect(t.tracks.find(k=>k.start===5&&k.property==='opacity')?.to).toBe(1);
 expect(t.tracks.find(k=>k.start===5&&k.property==='y')?.to).toBe(100);
 expect(t.tracks.filter(k=>k.property==='width')[0]).toMatchObject({from:400,to:900});
});
test('enter and reveal can run together and repeated validation does not expand twice',()=>{
 const input=make([{type:'enter',targets:['title'],at:0,duration:1},{type:'reveal',actor:'title',at:0,duration:1}],{actors:fixture().actors});
 const first=validateProject(input);expect(first.issues).toEqual([]);expect(first.project!.tracks).toEqual([]);
 const second=validateProject(first.project);expect(second).toEqual(first);
 const t=compile(first.project);expect(t.tracks.filter(k=>k.property==='reveal')).toHaveLength(1);
});
test.each([
 {actions:[{type:'morph',actor:'missing',at:0,duration:1,to:{x:1}}],extra:{},code:'ACTION_TARGET'},
 {actions:[{type:'reveal',actor:'box',at:0,duration:1}],extra:{},code:'ACTION_TARGET'},
 {actions:[{type:'enter',targets:['box','box'],at:0,duration:1}],extra:{},code:'ACTION_TARGET'},
 {actions:[{type:'enter',targets:['box','second'],at:14,duration:1,stagger:.2}],extra:{actors:[box,{...box,id:'second'}]},code:'ACTION_TIME'},
 {actions:[{type:'morph',actor:'box',at:1,duration:1,to:{x:100}}],extra:{tracks:[{actor:'box',property:'x',start:.5,end:2,from:100,to:200}]},code:'ACTION_CONFLICT'},
 {actions:[{type:'focus',at:1,duration:2,zoom:1.2},{type:'focus',at:2,duration:1,zoom:1}],extra:{},code:'ACTION_CONFLICT'},
 {actions:[{type:'focus',actor:'box',at:1,duration:1,zoom:1.2}],extra:{actors:[{id:'parent',type:'surface'},{...box,parent:'parent'}]},code:'ACTION_TARGET'},
 {actions:[{type:'focus',at:1,duration:1,zoom:1.2}],extra:{camera:[{time:0,x:960,y:540,zoom:1}]},code:'ACTION_CONFLICT'},
])('rejects invalid action with field location: $code',({actions,extra,code})=>{
 expect(validateProject(make(actions,extra)).issues).toContainEqual(expect.objectContaining({code,path:expect.stringMatching(/^actions\.\d/)}));
});
test('focus holds until its start and targets the current root-object center',()=>{
 const t=compile(make([{type:'morph',actor:'box',at:0,duration:1,to:{x:300,width:600}},{type:'focus',actor:'box',at:5,duration:1,zoom:1.2},{type:'focus',at:6,duration:1,zoom:1}]));
 expect(cameraAt(t,4)).toMatchObject({x:960,y:540,zoom:1});
 expect(cameraAt(t,6)).toMatchObject({x:600,y:150,zoom:1.2});
 expect(cameraAt(t,7)).toMatchObject({x:960,y:540,zoom:1});
 expect(new Set(t.camera.map(k=>k.time)).size).toBe(t.camera.length);
});
test.each(['enter','exit'] as const)('staggered %s samples after intervening morph regardless of declaration order',type=>{
 const actions=[{type,targets:['box','second'],at:0,duration:1,stagger:4,offset:{x:50,y:0,scale:1,rotation:0}},{type:'morph',actor:'second',at:2,duration:1,to:{x:500}}];
 for(const order of [actions,[...actions].reverse()]){
  const t=compile(make(order,{actors:[box,{...box,id:'second'}]}));
  expect(t.tracks.find(k=>k.actor==='second'&&k.property==='x'&&k.start===2)).toMatchObject({from:100,to:500});
  expect(t.tracks.find(k=>k.actor==='second'&&k.property==='x'&&k.start===4)).toMatchObject(type==='enter'?{from:550,to:500}:{from:500,to:550});
 }
});
