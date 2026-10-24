#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {dirname,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {realpath} from 'node:fs/promises';
import {fail} from '../project/types.js';
import {projectJSONSchema} from '../project/schema.js';
import {listComponents,describeComponent} from '../components/registry.js';
import {createPreview} from '../render/preview.js';
import {buildProject} from '../pipeline/build.js';
import {readStatus} from '../pipeline/state.js';
import {loadProject} from './project.js';
import {initProject} from './init.js';
import {doctor} from './doctor.js';
import {setup} from './setup.js';
import {versionInfo} from './version.js';
import {failure,output} from './output.js';
import {composeProject} from './compose.js';
import {listActions,describeAction} from '../motion/registry.js';
import {listThemes,describeTheme} from '../themes/registry.js';
import {briefJSONSchema} from '../recipes/brief.js';

const recipes=[{id:'product-launch',description:'原始 15 秒产品片，使用 init 初始化清单'},{id:'product-launch-v2',description:'品牌文案与功能点自动编排，使用 compose 生成完整动作项目'}];
const briefExample={id:'demo',brand:'轻舟',headline:'让灵感，顺流成章。',tagline:'从一闪而过，到下一步行动。',features:[{title:'记录灵感',detail:'留住每个好想法。'},{title:'开始创作',detail:'把想法变成下一步。'}],cta:'开始创作',theme:'paper'};

const commands:Record<string,{args:number;options:string[]}>={
 help:{args:0,options:[]},doctor:{args:0,options:['browser']},setup:{args:0,options:['browser']},version:{args:0,options:[]},catalog:{args:0,options:['summary','kind']},
 compose:{args:2,options:['theme']},
 describe:{args:1,options:[]},init:{args:1,options:['recipe']},validate:{args:1,options:[]},
 preview:{args:1,options:['browser']},build:{args:1,options:['browser','profile','resume','no-preview']},status:{args:1,options:[]},
};
export async function execute(args:string[]):Promise<{data:unknown;exitCode:number}>{
 try{
  let parsed:ReturnType<typeof parseArgs>;
  try{parsed=parseArgs({args,allowPositionals:true,strict:true,options:{json:{type:'boolean'},help:{type:'boolean',short:'h'},browser:{type:'string'},recipe:{type:'string'},profile:{type:'string'},kind:{type:'string'},theme:{type:'string'},summary:{type:'boolean'},resume:{type:'boolean'},'no-preview':{type:'boolean'}}});}
  catch(e){fail('ARGUMENT_INVALID','command',e instanceof Error?e.message:String(e),2);}
  const {values,positionals}=parsed,command=values.help?'help':positionals[0]??'help',config=Object.hasOwn(commands,command)?commands[command]:undefined;
  if(!config)fail('COMMAND_UNKNOWN','command',`Unknown command: ${command}`,2);
  if(command!=='help'&&positionals.length!==config.args+1)fail('ARGUMENT_INVALID',command,`${command} requires ${config.args} positional argument(s). Run takecraft --help.`,2);
  for(const key of Object.keys(values))if(!['json','help'].includes(key)&&!config.options.includes(key))fail('ARGUMENT_INVALID',key,`--${key} is not supported by ${command}`,2);
  const browser=values.browser as string|undefined,path=positionals[1];let data:unknown;
  switch(command){
   case 'help':data={status:'succeeded',usage:['setup [--browser PATH]','version','doctor [--browser PATH]','catalog [--kind components|actions|themes|recipes|all] --summary','describe TYPE | project | brief | action:NAME | theme:NAME | recipe:product-launch-v2','init DIRECTORY [--recipe product-launch]','compose BRIEF.json DIRECTORY [--theme NAME]','validate PROJECT.json','preview PROJECT.json [--browser PATH]','build PROJECT.json [--profile draft] [--resume] [--no-preview] [--browser PATH]','status DIRECTORY'],options:'Use --json for one JSON result on stdout; progress goes to stderr.'};break;
   case 'version':data=versionInfo();break;
   case 'setup':
   case 'doctor':{const result=await (command==='setup'?setup:doctor)(browser);return {data:result,exitCode:result.status==='succeeded'?0:1};}
   case 'catalog':{
    const kind=values.kind??'components';if(!['components','actions','themes','recipes','all'].includes(String(kind)))fail('CATALOG_KIND','kind',`Unknown catalog kind: ${kind}`,2);
    const selected=(name:string)=>kind===name||kind==='all';data={status:'succeeded',...(selected('components')?{components:listComponents()}:{}),...(selected('actions')?{actions:listActions()}:{}),...(selected('themes')?{themes:listThemes()}:{}),...(selected('recipes')?{recipes}: {})};break;
   }
   case 'describe':{
    if(path==='project'){data={status:'succeeded',schema:projectJSONSchema()};break;}
    if(path==='brief'||path==='recipe:product-launch-v2'){data={status:'succeeded',schema:briefJSONSchema(),example:briefExample,recipe:'product-launch-v2'};break;}
    if(path.startsWith('action:')){const name=path.slice(7);if(!listActions().some(a=>a.type===name))fail('ACTION_UNKNOWN','type',`Unknown action: ${name}`,2);data={status:'succeeded',...describeAction(name)};break;}
    if(path.startsWith('theme:')){const name=path.slice(6);if(!listThemes().some(t=>t.id===name))fail('THEME_UNKNOWN','theme',`Unknown theme: ${name}`,2);data={status:'succeeded',...describeTheme(name)};break;}
    if(!listComponents().some(c=>c.type===path))fail('COMPONENT_UNKNOWN','type',`Unknown component: ${path}. Use catalog --summary.`,2);
    data={status:'succeeded',...describeComponent(path)};break;
   }
   case 'init':data=await initProject(path,values.recipe as string|undefined);break;
   case 'compose':data=await composeProject(path,positionals[2],values.theme as string|undefined);break;
   case 'validate':{const {timeline,assets}=await loadProject(path);data={status:'succeeded',projectPath:resolve(path),frameCount:timeline.frameCount,duration:timeline.duration,assets:Object.keys(assets.items).length,issues:[]};break;}
   case 'preview':{
    const {timeline,assets}=await loadProject(path),directory=join(dirname(resolve(path)),'.takecraft','previews',randomUUID());
    const artifacts=await createPreview(timeline,assets,directory,browser);data={status:'succeeded',artifacts};break;
   }
   case 'build':{
    const result=await buildProject(path,{browser,profile:values.profile as string|undefined,resume:!!values.resume,preview:!values['no-preview'],onProgress:stage=>process.stderr.write(`[takecraft] ${stage}\n`)});
    return {data:result,exitCode:result.status==='succeeded'?0:result.exitCode??1};
   }
   case 'status':data={status:'succeeded',...await readStatus(resolve(path))};break;
  }
  return {data,exitCode:0};
 }catch(e){return failure(e);}
}
if(process.argv[1]&&await realpath(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await execute(process.argv.slice(2));output(result.data,process.argv.includes('--json'));process.exitCode=result.exitCode;
}
