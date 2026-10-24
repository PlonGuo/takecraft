import {expect,test} from 'vitest';
import {fixture} from '../fixtures/project.js';
import {validateProject} from '../../src/project/validate.js';
import {compileProject} from '../../src/project/compile.js';
import {prepareAssets} from '../../src/project/assets.js';
import {openScene} from '../../src/render/browser.js';

test('Motion actions preserve pixels and the same surface across random seeks',async()=>{
 const v=validateProject({...fixture(),duration:8,actors:[{id:'box',type:'surface',x:300,y:300,width:500,height:250,radius:24},{id:'label',parent:'box',type:'text',text:'持续存在的对象',x:30,y:30,width:400,height:80,fontSize:32}],actions:[
  {type:'enter',targets:['box'],at:0,duration:.8,style:'playful'},
  {type:'morph',actor:'box',at:1,duration:1.2,to:{x:600,y:320,width:700,height:300,radius:80}},
  {type:'focus',actor:'box',at:3,duration:.9,zoom:1.12},
  {type:'focus',at:5,duration:.6,zoom:1},
  {type:'exit',targets:['box'],at:6,duration:.8},
 ]});expect(v.issues).toEqual([]);
 const a=await prepareAssets(v.project!,process.cwd()),s=await openScene(compileProject(v.project!,a),a);
 try{
  await s.page.evaluate(()=>{(window as any).savedSurface=document.querySelector('[data-actor="box"]');});
  const reference=new Map<number,Buffer>();for(const time of [.2,.9,2.4,3.5,5.7]){await s.seek(time);reference.set(time,await s.page.screenshot());}
  for(const time of [5.7,.2,3.5,.9,2.4]){await s.seek(time);expect(await s.page.screenshot()).toEqual(reference.get(time));}
  expect(await s.page.evaluate(()=>(window as any).savedSurface===document.querySelector('[data-actor="box"]'))).toBe(true);
  expect((await s.inspect(7)).boxes.box.opacity).toBe(0);
 }finally{await s.close();}
});
