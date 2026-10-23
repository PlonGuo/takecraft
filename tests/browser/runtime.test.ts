import {afterEach,expect,test} from 'vitest';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
import {prepareAssets} from '../../src/project/assets.js';
import {compileProject} from '../../src/project/compile.js';
import {openScene,type SceneSession} from '../../src/render/browser.js';
const sessions:SceneSession[]=[];
afterEach(async()=>{for(const s of sessions.splice(0))await s.close();});
async function scene(p:any=fixture()){
  p=ProjectSchema.parse(p);const assets=await prepareAssets(p,process.cwd());
  const s=await openScene(compileProject(p,assets),assets);sessions.push(s);return s;
}
test('random seek reproduces identical pixels and retains actor identity',async()=>{
  const p:any=fixture();p.tracks=[{actor:'title',property:'x',start:0,end:10,from:200,to:400}];
  const s=await scene(p);await s.seek(2);const a=await s.page.screenshot();
  await s.page.evaluate(()=>{(window as any).saved=document.querySelector('[data-actor="title"]');});
  await s.seek(10);await s.seek(2);expect(await s.page.screenshot()).toEqual(a);
  expect(await s.page.evaluate(()=>(window as any).saved===document.querySelector('[data-actor="title"]'))).toBe(true);
  expect(await s.page.locator('[data-actor="title"]').textContent()).toBe('你好 <世界>');
});
test('reports long Chinese text overflow and required actor leaving frame',async()=>{
  const p:any=fixture();p.actors[0].width=60;p.actors[0].height=30;p.actors[0].x=-100;
  p.checks.inFrame=[{actor:'title',start:0,end:15}];const s=await scene(p);const report=await s.inspect(1);
  expect(report.issues.map(i=>i.code)).toContain('TEXT_OVERFLOW');expect(report.issues.map(i=>i.code)).toContain('OUT_OF_FRAME');
});
test('missing decoded image rejects scene readiness',async()=>{
  const p:any=fixture();p.actors=[{id:'shot',type:'image',asset:'shot'}];p.assets={shot:{type:'image',path:'none.png'}};
  const t=compileProject(ProjectSchema.parse(p),{items:{},fonts:[]});
  await expect(openScene(t,{items:{shot:{path:'/nonexistent/takecraft.png',type:'image',mime:'image/png',sha256:'bad'}},fonts:[]})).rejects.toThrow();
});
