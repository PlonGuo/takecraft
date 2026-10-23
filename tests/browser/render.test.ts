import {test,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../fixtures/project.js';
import {ProjectSchema} from '../../src/project/schema.js';
import {compileProject} from '../../src/project/compile.js';
import {prepareAssets} from '../../src/project/assets.js';
import {renderFrames} from '../../src/render/frames.js';
test('frame inspection rejects overflowing text instead of encoding it',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tc-frame-'));try{const p:any=fixture();p.duration=1;p.actors[0].width=20;const project=ProjectSchema.parse(p);const a=await prepareAssets(project,dir);
 await expect(renderFrames({timeline:compileProject(project,a),assets:a,directory:dir})).rejects.toThrow(/Text exceeds/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
