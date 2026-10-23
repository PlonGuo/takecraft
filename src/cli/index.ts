#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {dirname,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fail} from '../project/types.js';
import {projectJSONSchema} from '../project/schema.js';
import {listComponents,describeComponent} from '../components/registry.js';
import {createPreview} from '../render/preview.js';
import {buildProject} from '../pipeline/build.js';
import {readStatus} from '../pipeline/state.js';
import {loadProject} from './project.js';
import {initProject} from './init.js';
import {doctor} from './doctor.js';
import {failure,output} from './output.js';

const commands:Record<string,{args:number;options:string[]}>={
 help:{args:0,options:[]},doctor:{args:0,options:['browser']},catalog:{args:0,options:['summary']},
 describe:{args:1,options:[]},init:{args:1,options:['recipe']},validate:{args:1,options:[]},
 preview:{args:1,options:['browser']},build:{args:1,options:['browser','profile','resume','no-preview']},status:{args:1,options:[]},
};
export async function execute(args:string[]):Promise<{data:unknown;exitCode:number}>{
 try{
  let parsed:ReturnType<typeof parseArgs>;
  try{parsed=parseArgs({args,allowPositionals:true,strict:true,options:{json:{type:'boolean'},help:{type:'boolean',short:'h'},browser:{type:'string'},recipe:{type:'string'},profile:{type:'string'},summary:{type:'boolean'},resume:{type:'boolean'},'no-preview':{type:'boolean'}}});}
  catch(e){fail('ARGUMENT_INVALID','command',e instanceof Error?e.message:String(e),2);}
  const {values,positionals}=parsed,command=values.help?'help':positionals[0]??'help',config=Object.hasOwn(commands,command)?commands[command]:undefined;
  if(!config)fail('COMMAND_UNKNOWN','command',`Unknown command: ${command}`,2);
  if(command!=='help'&&positionals.length!==config.args+1)fail('ARGUMENT_INVALID',command,`${command} requires ${config.args} positional argument(s). Run takecraft --help.`,2);
  for(const key of Object.keys(values))if(!['json','help'].includes(key)&&!config.options.includes(key))fail('ARGUMENT_INVALID',key,`--${key} is not supported by ${command}`,2);
  const browser=values.browser as string|undefined,path=positionals[1];let data:unknown;
  switch(command){
   case 'help':data={status:'succeeded',usage:['doctor [--browser PATH]','catalog --summary','describe TYPE | project','init DIRECTORY [--recipe product-launch]','validate PROJECT.json','preview PROJECT.json [--browser PATH]','build PROJECT.json [--profile draft] [--resume] [--no-preview] [--browser PATH]','status DIRECTORY'],options:'Use --json for one JSON result on stdout; progress goes to stderr.'};break;
   case 'doctor':{const result=await doctor(browser);return {data:result,exitCode:result.status==='succeeded'?0:1};}
   case 'catalog':data={status:'succeeded',components:listComponents()};break;
   case 'describe':{
    if(path==='project'){data={status:'succeeded',schema:projectJSONSchema()};break;}
    if(!listComponents().some(c=>c.type===path))fail('COMPONENT_UNKNOWN','type',`Unknown component: ${path}. Use catalog --summary.`,2);
    data={status:'succeeded',...describeComponent(path)};break;
   }
   case 'init':data=await initProject(path,values.recipe as string|undefined);break;
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
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await execute(process.argv.slice(2));output(result.data,process.argv.includes('--json'));process.exitCode=result.exitCode;
}
