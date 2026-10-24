import {expect,test} from 'vitest';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {brief} from '../fixtures/brief.js';
import {BriefSchema} from '../../src/recipes/brief.js';
import {composeProductLaunch} from '../../src/recipes/product-launch.js';
import {prepareAssets} from '../../src/project/assets.js';
import {compileProject} from '../../src/project/compile.js';
import {openScene} from '../../src/render/browser.js';

for(const theme of ['paper','midnight','editorial'] as const){
 test.each([false,true])(`${theme} is readable at beats and transition midpoints (maximum text=%s)`,async(maximum)=>{
  const content=maximum?{...brief,brand:'舟'.repeat(20),headline:'灵'.repeat(24),tagline:'光'.repeat(36),cta:'始'.repeat(24),features:brief.features.map(()=>({title:'想'.repeat(16),detail:'创'.repeat(48)}))}:brief;
  const p=composeProductLaunch(BriefSchema.parse({...content,theme})),a=await prepareAssets(p,process.cwd()),s=await openScene(compileProject(p,a),a);
  try{
   for(const t of [0,.5,1.6,2.9,3.75,4.4,6.3,9.9,10.8,11.5,12.8,14.9])expect((await s.inspect(t)).issues,`${theme} at ${t}`).toEqual([]);
   if(!maximum){const dir=resolve('artifacts/theme-previews');await mkdir(dir,{recursive:true});for(const [label,t] of [['intro',1.6],['middle',6.8],['outro',12.8]] as const){await s.seek(t);await s.page.screenshot({path:resolve(dir,`${theme}-${label}.png`)});}}
  }finally{await s.close();}
 });
}
