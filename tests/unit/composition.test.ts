import {expect,test} from 'vitest';
import {BriefSchema} from '../../src/recipes/brief.js';
import {composeProductLaunch} from '../../src/recipes/product-launch.js';
import {listThemes} from '../../src/themes/registry.js';
import {validateProject} from '../../src/project/validate.js';
import {compileProject} from '../../src/project/compile.js';
import {brief} from '../fixtures/brief.js';
test('three themes produce valid, distinct layouts from one short brief',()=>{
 const projects=listThemes().map(theme=>composeProductLaunch(BriefSchema.parse({...brief,theme:theme.id})));
 expect(projects).toHaveLength(3);
 for(const p of projects){expect(validateProject(p).issues).toEqual([]);expect(p.tracks).toEqual([]);expect(p.actions.length).toBeGreaterThan(5);expect(compileProject(p,{items:{},fonts:[]}).tracks.length).toBeGreaterThan(30);}
 expect(new Set(projects.map(p=>p.theme.background)).size).toBe(3);
 expect(new Set(projects.map(p=>JSON.stringify(p.actors.filter(a=>a.id.startsWith('feature-')).map(a=>[a.x,a.y,a.width,a.height])))).size).toBe(3);
 expect(new Set(projects.map(p=>p.actors.find(a=>a.id==='intro')!.fontSize)).size).toBeGreaterThan(1);
});
test('brief rejects blank, excessive and unsupported input with field paths',()=>{
 expect(BriefSchema.safeParse({...brief,headline:' '}).success).toBe(false);
 expect(BriefSchema.safeParse({...brief,headline:'字'.repeat(200)}).success).toBe(false);
 expect(BriefSchema.safeParse({...brief,theme:'unknown'}).success).toBe(false);
 expect(BriefSchema.safeParse({...brief,features:[]}).success).toBe(false);
});
test('two features and optional screenshot remain explicit editable data',()=>{
 const p=composeProductLaunch(BriefSchema.parse({...brief,headline:'你好 <世界>',features:brief.features.slice(0,2),screenshot:'assets/截图.png'}));
 expect(p.actors.find(a=>a.id==='intro')?.text).toBe('你好 <世界>');
 expect(p.assets.screenshot.path).toBe('assets/截图.png');expect(p.actors.some(a=>a.type==='image'&&a.asset==='screenshot')).toBe(true);
 expect(p.actions.some(a=>a.type==='morph')).toBe(true);
});
test.each(['\n','\r','\u2028','\u2029'])('brief rejects hard line breaks with a field error (%j)',newline=>{
 const result=BriefSchema.safeParse({...brief,headline:`第一行${newline}第二行`});
 expect(result.success).toBe(false);
 if(!result.success)expect(result.error.issues).toContainEqual(expect.objectContaining({path:['headline']}));
});
