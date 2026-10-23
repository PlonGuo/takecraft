import { expect, test } from 'vitest';
import { validateProject } from '../../src/project/validate.js';
import { fixture } from '../fixtures/project.js';
test('preserves Chinese and literal markup', () => {
  const r = validateProject(fixture());
  expect(r.issues).toEqual([]); expect(r.project?.actors[0].text).toBe('你好 <世界>');
});
test.each([
  ['blank title', (p: any) => { p.title = '   '; }],
  ['duplicate id', (p: any) => { p.actors.push({...p.actors[0]}); }],
  ['missing asset', (p: any) => { p.actors[0].asset = 'absent'; }],
  ['unknown target', (p: any) => { p.tracks = [{actor:'absent', property:'x', start:0,end:1,from:0,to:1}]; }],
  ['nonfinite time', (p: any) => { p.duration = Infinity; }],
  ['conflicting tracks', (p: any) => { p.tracks = [0,.5].map(start => ({actor:'title',property:'x',start,end:2,from:0,to:10})); }],
  ['unknown component', (p: any) => { p.actors[0].type = 'script'; }],
  ['fractional frame duration', (p: any) => { p.duration = 1.01; }],
  ['duplicate caption interval', (p: any) => { p.captions=[{start:0,end:2,text:'一'},{start:1,end:3,text:'二'}]; }],
])('rejects %s with actionable paths', (_, mutate) => {
  const p=fixture(); mutate(p); const r=validateProject(p);
  expect(r.project).toBeUndefined(); expect(r.issues.length).toBeGreaterThan(0);
  expect(r.issues[0].path).toBeTruthy();
});
test('allows tracks to share a boundary', () => {
  const p:any=fixture(); p.tracks=[{actor:'title',property:'x',start:0,end:1,from:0,to:10},{actor:'title',property:'x',start:1,end:2,from:10,to:20}];
  expect(validateProject(p).issues).toEqual([]);
});
test.each(['text','image','cursor'])('rejects %s as a parent instead of silently losing children',type=>{
 const p:any=fixture();p.assets={shot:{type:'image',path:'shot.png'}};
 p.actors=[{id:'parent',type,text:'父对象',asset:type==='image'?'shot':undefined},{id:'child',type:'text',text:'子对象',parent:'parent'}];
 expect(validateProject(p).issues).toContainEqual(expect.objectContaining({code:'PARENT_TYPE',path:'actors.1.parent'}));
});
test.each(['surface','window','shape'])('allows %s to carry child objects',type=>{
 const p:any=fixture();p.actors=[{id:'parent',type},{id:'child',type:'text',text:'子对象',parent:'parent'}];expect(validateProject(p).issues).toEqual([]);
});
