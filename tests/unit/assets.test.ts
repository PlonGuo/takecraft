import {afterEach,expect,test} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {prepareAssets} from '../../src/project/assets.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
const dirs:string[]=[];
afterEach(async()=>{await Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true})));});
async function temp(){const d=await mkdtemp(join(tmpdir(),'takecraft 素材 '));dirs.push(d);return d;}
test('replacing an image at the same Chinese path changes its content identity',async()=>{
  const d=await temp(),file=join(d,'图片.png');
  const p=ProjectSchema.parse({...fixture(),assets:{shot:{type:'image',path:'图片.png'}}});
  await sharp({create:{width:20,height:10,channels:3,background:'#ff0000'}}).png().toFile(file);
  const a=await prepareAssets(p,d);
  await sharp({create:{width:20,height:10,channels:3,background:'#0000ff'}}).png().toFile(file);
  const b=await prepareAssets(p,d);
  expect(a.items.shot.width).toBe(20);expect(a.items.shot.sha256).not.toBe(b.items.shot.sha256);
  expect(a.fonts.length).toBeGreaterThan(0);
});
test.each(['missing.png','bad.png'])('rejects missing or corrupt %s',async name=>{
  const d=await temp();await writeFile(join(d,'bad.png'),'not an image');
  const p=ProjectSchema.parse({...fixture(),assets:{shot:{path:name,type:'image'}}});
  await expect(prepareAssets(p,d)).rejects.toMatchObject({issues:[expect.objectContaining({path:'assets.shot'})]});
});
test('reports missing glyphs instead of falling back to a machine font',async()=>{
  const p:any=fixture();p.actors[0].text='\uE000';
  await expect(prepareAssets(ProjectSchema.parse(p),await temp())).rejects.toMatchObject({issues:[expect.objectContaining({code:'FONT_GLYPH_MISSING'})]});
});
