import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
let sourceCommit=null;
try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const dependencies=createHash('sha256').update(await readFile(new URL('pnpm-lock.yaml',root))).digest('hex');
await writeFile(new URL('dist/build-info.json',root),JSON.stringify({version:pkg.version,sourceCommit,dependencies})+'\n');
