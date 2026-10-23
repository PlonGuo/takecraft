import {z} from 'zod';
import {ActorSchema,type Actor} from '../project/schema.js';
const definitions={text:'中文文字与标题，支持打字揭示',image:'本地图片，contain 或 cover',surface:'持续存在的可变形容器',window:'带标题栏的产品窗口',cursor:'指针图形',shape:'矩形或圆角图形'};
export const listComponents=()=>Object.entries(definitions).map(([type,description])=>({type,description,version:1}));
export function describeComponent(type:string){
  if(!(type in definitions))throw new Error(`Unknown component: ${type}`);
  return {...listComponents().find(c=>c.type===type),schema:z.toJSONSchema(ActorSchema,{io:'input'}),example:{id:'main',type,x:300,y:250,width:800,height:400}};
}
export function createActor(a:Actor,ink:string,accent:string):HTMLElement{
  const el=document.createElement(a.type==='image'?'img':'div');el.dataset.actor=a.id;
  Object.assign(el.style,{position:'absolute',boxSizing:'border-box',transformOrigin:'50% 50%',color:a.color??ink,overflow:a.clip?'hidden':'visible'});
  if(a.type==='text')Object.assign(el.style,{whiteSpace:'pre-wrap',overflowWrap:'break-word',fontFamily:'Takecraft',fontSize:`${a.fontSize}px`,fontWeight:String(a.fontWeight),lineHeight:'1.2',textAlign:a.align});
  if(a.type==='image')Object.assign(el.style,{objectFit:a.fit});
  if(a.type==='surface'||a.type==='window')Object.assign(el.style,{background:a.background??'#ffffff',boxShadow:'0 28px 90px #182b2320',border:'1px solid #263b2c15'});
  if(a.type==='shape'||a.type==='cursor')el.style.background=a.background??accent;
  if(a.type==='cursor')el.style.clipPath='polygon(0 0, 0 90%, 26% 67%, 45% 100%, 64% 88%, 47% 55%, 85% 50%)';
  if(a.type==='window'){
    const bar=document.createElement('div');Object.assign(bar.style,{height:'42px',borderBottom:'1px solid #142b2210',display:'flex',gap:'8px',alignItems:'center',paddingLeft:'18px'});
    for(const color of ['#d89085','#e7c77f','#9ebda3']){const dot=document.createElement('span');Object.assign(dot.style,{width:'9px',height:'9px',borderRadius:'50%',background:color});bar.append(dot);}el.append(bar);
  }
  return el;
}
