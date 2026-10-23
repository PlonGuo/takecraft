import {expect,test} from 'vitest';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
import {prepareAssets} from '../../src/project/assets.js';
import {compileProject} from '../../src/project/compile.js';
import {createPreview} from '../../src/render/preview.js';
import {openScene} from '../../src/render/browser.js';
test('exports a portable preview and real milestone stills',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'takecraft preview '));
 try {const p=ProjectSchema.parse({...fixture(),beats:[{time:5,label:'middle'}]});const a=await prepareAssets(p,dir);const r=await createPreview(compileProject(p,a),a,dir);
 expect((await readFile(r.html.path,'utf8'))).toContain('data:font/woff2;base64,');expect(r.stills).toHaveLength(3);expect(r.stills.every(f=>f.bytes>10000)).toBe(true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('uses the same static image in browser rendering and portable preview',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'takecraft animated image '));
 try{
  await writeFile(join(dir,'motion.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"><animate attributeName="fill" values="red;blue;red" dur="0.7s" repeatCount="indefinite"/></rect></svg>');
  const p=ProjectSchema.parse({...fixture(),assets:{shot:{type:'image',path:'motion.svg'}},actors:[{id:'shot',type:'image',asset:'shot',width:100,height:100}]});
  const a=await prepareAssets(p,dir),t=compileProject(p,a),s=await openScene(t,a);
  let imageBytes:string;
  try{
   const image=await s.page.evaluate(async()=>{const r=await fetch(document.querySelector('img')!.src);const bytes=new Uint8Array(await r.arrayBuffer());return {type:r.headers.get('content-type'),data:btoa(String.fromCharCode(...bytes))};});
   expect(image.type).toBe('image/png');imageBytes=image.data;
   await s.seek(2);const frame=await s.page.screenshot();await s.seek(10);await s.seek(2);expect(await s.page.screenshot()).toEqual(frame);
  }finally{await s.close();}
  const preview=await createPreview(t,a,join(dir,'preview'));
  expect(await readFile(preview.html.path,'utf8')).toContain('data:image/png;base64,'+imageBytes!);
 }finally{await rm(dir,{recursive:true,force:true});}
});
