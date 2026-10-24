import {mkdir,cp,rm,readdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail} from '../project/types.js';

export async function initProject(directory:string,recipe='product-launch'){
 if(recipe!=='product-launch')fail('RECIPE_UNKNOWN','recipe',`Unknown recipe: ${recipe}`,2);
 const target=resolve(directory),source=fileURLToPath(new URL('../../recipes/product-launch/',import.meta.url));
 await mkdir(dirname(target),{recursive:true});
 try{await mkdir(target);}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')fail('PROJECT_EXISTS',target,'Choose a new directory; existing projects are never overwritten.',2);throw e;}
 // Reserve the destination atomically, then copy its children. Newer Node
 // versions reject cp(source, target, errorOnExist) even for an empty target.
 try{for(const name of await readdir(source))await cp(join(source,name),join(target,name),{recursive:true,errorOnExist:true,force:false});}
 catch(e){await rm(target,{recursive:true,force:true});throw e;}
 return {status:'succeeded',projectPath:join(target,'project.json'),recipe};
}
