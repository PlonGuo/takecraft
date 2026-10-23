import {test,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {artifact} from '../../src/project/hash.js';
import {readCache,saveCache} from '../../src/pipeline/cache.js';
import {retryBrowser} from '../../src/pipeline/retry.js';
import {visualKey} from '../../src/pipeline/fingerprint.js';
import {fixture} from '../fixtures/project.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {compileProject} from '../../src/project/compile.js';
test('cache verifies actual artifact bytes and refuses corrupt files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-cache-'));try{const path=join(dir,'a');await writeFile(path,'first');const a=await artifact(path);await saveCache(dir,'key',{artifacts:[a],files:[a],data:{frameCount:30}});
 expect((await readCache(dir,'key'))?.data).toEqual({frameCount:30});await writeFile(path,'other');expect(await readCache(dir,'key')).toBeNull();expect(await readCache(dir,'other-input')).toBeNull();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('only transient browser closure retries, at most twice',async()=>{
 let n=0;expect(await retryBrowser(async()=>{if(n++<2)throw new Error('Target page, context or browser has been closed');return 7;})).toBe(7);expect(n).toBe(3);
 n=0;await expect(retryBrowser(async()=>{n++;throw new Error('Target page, context or browser has been closed');})).rejects.toThrow();expect(n).toBe(3);
 n=0;await expect(retryBrowser(async()=>{n++;throw new Error('Missing image');})).rejects.toThrow();expect(n).toBe(1);
});
test('visual fingerprint tracks content, fonts, engine and browser, but excludes audio',()=>{
 const t=compileProject(ProjectSchema.parse(fixture()),{items:{},fonts:[]});const a:any={items:{shot:{type:'image',sha256:'image1'}},fonts:[{sha256:'font1'}]};
 const key=()=>visualKey(t,a,'runtime1','chrome1','ffmpeg1'),old=key();
 t.audio.events.push({time:1,kind:'click',gain:.5});expect(key()).toBe(old);
 t.actors[0].text='改名';expect(key()).not.toBe(old);t.actors[0].text='你好 <世界>';
 a.items.shot.sha256='image2';expect(key()).not.toBe(old);a.items.shot.sha256='image1';
 a.items.shot.image={sha256:'normalized-image'};expect(key()).not.toBe(old);delete a.items.shot.image;
 a.fonts[0].sha256='font2';expect(key()).not.toBe(old);a.fonts[0].sha256='font1';
 expect(visualKey(t,a,'runtime2','chrome1','ffmpeg1')).not.toBe(old);expect(visualKey(t,a,'runtime1','chrome2','ffmpeg1')).not.toBe(old);
});
