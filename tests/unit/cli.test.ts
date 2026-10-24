import {expect,test} from 'vitest';
import {cli} from '../helpers/cli.js';

test('catalog and component descriptions expose usable registered input contracts',async()=>{
 const result=await cli(['catalog','--summary','--json']);expect(result.code).toBe(0);
 expect(result.data.components.map((v:any)=>v.type)).toContain('surface');expect(result.stdout.length).toBeLessThan(2000);
 const description=await cli(['describe','text','--json']);expect(description.code).toBe(0);
 expect(description.data.example.text.trim().length).toBeGreaterThan(0);
 expect(description.data.schema.properties.type.const).toBe('text');
 const schema=await cli(['describe','project','--json']);expect(schema.code).toBe(0);expect(schema.data.schema.properties.schemaVersion.const).toBe(1);
});
test.each([
 ['unknown'],['build'],['build','anything.json','--profile','final'],['build','anything.json','--profile','magic'],
 ['catalog','--garbage'],['describe','__proto__'],['catalog','unexpected'],['validate','anything.json','--resume'],
])('invalid command arguments fail with structured errors: %j',async(...args)=>{
 const r=await cli([...args,'--json']);expect(r.code).toBe(2);expect(r.data.status).toBe('failed');expect(r.data.issues[0].code).toBeTruthy();
});

test('discovers actions, themes and the short-brief contract without reading code',async()=>{
 const catalog=await cli(['catalog','--kind','all','--summary','--json']);expect(catalog.code).toBe(0);
 expect(catalog.data.actions.map((a:any)=>a.type)).toContain('morph');expect(catalog.data.themes.map((t:any)=>t.id)).toEqual(['paper','midnight','editorial']);expect(catalog.stdout.length).toBeLessThan(5000);
 for(const name of ['action:enter','theme:paper','brief','recipe:product-launch-v2']){const r=await cli(['describe',name,'--json']);expect(r.code,name).toBe(0);expect(r.data.schema).toBeTruthy();}
 expect((await cli(['catalog','--kind','wrong','--json'])).code).toBe(2);
 expect((await cli(['describe','action:wrong','--json'])).code).toBe(2);
});
