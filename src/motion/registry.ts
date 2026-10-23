import {z} from 'zod';
import {ActionSchema} from './schema.js';

const definitions={
  enter:{description:'按声明顺序入场，可设置错峰和相对位移；入场前隐藏',example:{type:'enter',targets:['card-one','card-two'],at:1,duration:.8,stagger:.12,style:'calm'}},
  exit:{description:'从当前状态退场，完成后保持隐藏',example:{type:'exit',targets:['card-one'],at:8,duration:.5}},
  morph:{description:'同一对象从当前姿态变形到目标姿态',example:{type:'morph',actor:'panel',at:2,duration:1,to:{width:1320,height:680,radius:28}}},
  reveal:{description:'文字逐字揭示，可与入场同时使用',example:{type:'reveal',actor:'title',at:.2,duration:1}},
  focus:{description:'镜头聚焦根对象或画布中心，不与手写镜头混用',example:{type:'focus',actor:'panel',at:5,duration:1,zoom:1.1}},
};
export const listActions=()=>Object.entries(definitions).map(([type,d])=>({type,description:d.description,version:1}));
export function describeAction(name:string){
  const schema=ActionSchema.options.find(s=>s.shape.type.value===name);
  if(!schema)throw new Error(`Unknown action: ${name}`);
  return {type:name,...definitions[name as keyof typeof definitions],schema:z.toJSONSchema(schema,{io:'input'})};
}
