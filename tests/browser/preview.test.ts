import {expect,test} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectSchema} from '../../src/project/schema.js';
import {fixture} from '../fixtures/project.js';
import {prepareAssets} from '../../src/project/assets.js';
import {compileProject} from '../../src/project/compile.js';
import {createPreview} from '../../src/render/preview.js';
test('exports a portable preview and real milestone stills',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'takecraft preview '));
 try {const p=ProjectSchema.parse({...fixture(),beats:[{time:5,label:'middle'}]});const a=await prepareAssets(p,dir);const r=await createPreview(compileProject(p,a),a,dir);
 expect((await readFile(r.html.path,'utf8'))).toContain('data:font/woff2;base64,');expect(r.stills).toHaveLength(3);expect(r.stills.every(f=>f.bytes>10000)).toBe(true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
