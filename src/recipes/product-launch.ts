import {z} from 'zod';
import {ActorSchema,ProjectSchema,type Project} from '../project/schema.js';
import {ActionSchema} from '../motion/schema.js';
import {getTheme} from '../themes/registry.js';
import type {Brief} from './brief.js';
type ActorInput=z.input<typeof ActorSchema>;
type ActionInput=z.input<typeof ActionSchema>;

// Conservative estimates choose a starting font size; the browser's actual
// overflow checks remain the final authority and never silently remove text.
function fontSize(text:string,width:number,height:number,preferred:number){
 const units=[...text].reduce((n,c)=>n+(/[\u0000-\u00ff]/.test(c)?.66:1.08),0);
 // Noto's ink can extend beyond its 1.2 line box (80px numerals measured
 // 106px high in Chromium). Leave room for that ink as well as line spacing.
 let size=preferred;while(size>18&&Math.ceil(units/(width/size))*size*1.4>height)size--;
 return size;
}
export function composeProductLaunch(brief:Brief):Project{
 const theme=getTheme(brief.theme),style=brief.style??theme.motion,window=theme.window;
 const actors:ActorInput[]=[],actions:ActionInput[]=[];
 const shape=(id:string,props:Omit<ActorInput,'id'|'type'>)=>actors.push({id,type:'shape',...props});
 const surface=(id:string,props:Omit<ActorInput,'id'|'type'>)=>actors.push({id,type:'surface',background:theme.surface,borderColor:theme.line,borderWidth:theme.borderWidth,shadow:'none',...props});
 const text=(id:string,value:string,x:number,y:number,width:number,height:number,size:number,props:Partial<ActorInput>={})=>actors.push({id,type:'text',text:value,x,y,width,height,fontSize:fontSize(value,width,height,size),color:theme.ink,...props});
 const enter=(targets:string[],at:number,duration=.7,extra:Partial<Extract<ActionInput,{type:'enter'}>>={})=>actions.push({type:'enter',targets,at,duration,style,...extra});
 const exit=(targets:string[],at:number,duration=.45)=>actions.push({type:'exit',targets,at,duration,style:'calm',offset:{x:0,y:-18,scale:1,rotation:0}});

 shape('background-mark',{x:theme.layout==='poster'?1550:1510,y:theme.layout==='list'?-170:110,width:520,height:520,radius:theme.layout==='poster'?0:260,rotation:theme.layout==='poster'?12:0,background:theme.accent,opacity:.07});
 shape('brand-rule',{x:140,y:79,width:38,height:5,background:theme.accent});
 text('brand',brief.brand,140,105,900,54,30,{fontWeight:700,letterSpacing:1});
 text('edition','01 / PRODUCT STORY',1300,111,480,42,20,{align:'right',color:theme.muted,letterSpacing:2});
 text('intro',brief.headline,theme.align==='left'?160:180,240,1560,150,theme.headlineSize,{align:theme.align,fontWeight:700,letterSpacing:theme.letterSpacing});
 text('intro-subtitle',brief.tagline,theme.align==='left'?164:260,405,1400,65,30,{align:theme.align,color:theme.muted});
 enter(['intro'],.05,.85);enter(['intro-subtitle'],.25,.75);
 surface('panel',{x:410,y:510,width:1100,height:120,radius:60,clip:true,shadow:theme.shadow});
 shape('prompt-dot',{parent:'panel',x:35,y:41,width:36,height:36,radius:18,background:theme.accent});
 text('prompt','记下一闪而过的灵感…',100,37,930,60,34,{parent:'panel',color:theme.muted});
 enter(['panel'],.3,.8,{offset:{x:0,y:42,scale:.97,rotation:0}});
 actions.push({type:'reveal',actor:'prompt',at:.75,duration:1.1});
 exit(['intro','intro-subtitle'],2);exit(['prompt','prompt-dot'],2.1,.35);
 actions.push({type:'morph',actor:'panel',at:2.55,duration:1.15,style:'calm',to:{...window,radius:theme.radius}});
 text('section-title',brief.tagline,160,112,1600,94,theme.layout==='poster'?48:44,{fontWeight:700,align:theme.align});
 // The persistent page header leaves before the product heading enters.
 exit(['brand','edition','brand-rule'],2.15,.3);enter(['section-title'],2.7,.7);
 shape('ui',{parent:'panel',x:0,y:0,width:window.width,height:window.height,background:theme.surface});
 text('app-brand',brief.brand,38,27,800,55,28,{parent:'ui',fontWeight:700});
 text('app-label',brief.screenshot?'产品画面':'演示界面',window.width-240,32,190,42,18,{parent:'ui',align:'right',color:theme.muted,letterSpacing:2});
 shape('toolbar-line',{parent:'ui',x:0,y:90,width:window.width,height:theme.borderWidth,background:theme.line});
 enter(['ui'],3.6,.6,{offset:{x:0,y:0,scale:1,rotation:0}});

 const cards:string[]=[];
 if(theme.layout!=='poster'&&!brief.screenshot){
  shape('sidebar',{parent:'ui',x:24,y:116,width:220,height:window.height-145,radius:theme.radius/2,background:theme.card});
  ['概览','灵感','下一步'].forEach((label,i)=>{
   if(i===0)shape('nav-active',{parent:'ui',x:42,y:148,width:182,height:52,radius:8,background:theme.accent,opacity:.12});
   text(`nav-${i}`,label,64,158+i*88,140,40,24,{parent:'ui',color:i===0?theme.ink:theme.muted,fontWeight:i===0?700:400});
  });
 }
 if(brief.screenshot)actors.push({id:'screenshot',type:'image',parent:'ui',asset:'screenshot',x:window.width*.49,y:128,width:window.width*.47,height:window.height-188,radius:theme.radius,fit:'contain'});
 const total=brief.features.length;
 brief.features.forEach((feature,i)=>{
  const id=`feature-${i+1}`;cards.push(id);
  const list=theme.layout==='list'||!!brief.screenshot,poster=theme.layout==='poster'&&!brief.screenshot;
  const left=brief.screenshot?42:poster?54:285,right=brief.screenshot?window.width*.46:window.width-42;
  const width=list?right-left:(right-left-(total-1)*24)/total;
  const x=list?left:left+i*(width+24),y=list?136+i*(brief.screenshot?164:155):166;
  const height=list?(brief.screenshot?142:132):poster?374:354;
  surface(id,{parent:'ui',x,y,width,height,radius:theme.radius,background:theme.card,shadow:theme.cardShadow});
  if(list){
   shape(`${id}-badge`,{parent:id,x:22,y:24,width:46,height:46,radius:12,background:theme.accent});
   text(`${id}-number`,String(i+1).padStart(2,'0'),22,34,46,36,18,{parent:id,align:'center',color:theme.inverse,fontWeight:700});
   text(`${id}-title`,feature.title,90,22,width-116,42,28,{parent:id,fontWeight:700});
   text(`${id}-detail`,feature.detail,90,72,width-116,height-80,22,{parent:id,color:theme.muted});
  }else{
   text(`${id}-number`,String(i+1).padStart(2,'0'),28,28,width-56,poster?120:100,poster?80:64,{parent:id,color:theme.accent,fontWeight:700,letterSpacing:-3});
   text(`${id}-title`,feature.title,28,145,width-56,76,poster?38:32,{parent:id,fontWeight:700});
   text(`${id}-detail`,feature.detail,28,244,width-56,height-264,24,{parent:id,color:theme.muted});
  }
 });
 if(!brief.screenshot){
  text('app-next',brief.cta,theme.layout==='poster'?56:288,window.height-94,window.width-360,58,27,{parent:'ui',color:theme.accent,fontWeight:700});
  enter(['app-next'],7.7,.65,{offset:{x:0,y:14,scale:1,rotation:0}});
 }
 enter(cards,4.05,.85,{stagger:.16,offset:{x:theme.layout==='list'?36:0,y:theme.layout==='list'?0:28,scale:theme.layout==='poster'?.96:.985,rotation:0}});
 if(brief.screenshot)enter(['screenshot'],3.9,.85,{offset:{x:24,y:0,scale:.98,rotation:0}});
 actions.push({type:'focus',actor:'panel',at:5.15,duration:1.2,zoom:theme.layout==='poster'?1.025:1.045,style:'calm'},{type:'focus',at:9.05,duration:.95,zoom:1,style:'calm'});
 exit(['ui','section-title'],9.65,.5);
 actions.push({type:'morph',actor:'panel',at:10.25,duration:1.15,style:'calm',to:{x:846,y:300,width:228,height:228,radius:theme.logoRadius}});
 shape('logo',{parent:'panel',x:69,y:69,width:90,height:90,radius:theme.layout==='poster'?8:24,background:theme.accent});
 text('logo-glyph',[...brief.brand][0],0,12,90,75,54,{parent:'logo',align:'center',color:theme.inverse,fontWeight:700});
 enter(['logo'],11.15,.7,{offset:{x:0,y:0,scale:.65,rotation:-12}});
 text('outro-brand',brief.brand,360,602,1200,118,theme.layout==='poster'?100:80,{align:'center',fontWeight:700,letterSpacing:theme.letterSpacing});
 text('outro-tagline',brief.tagline,360,747,1200,72,38,{align:'center',color:theme.muted});
 surface('cta-button',{x:660,y:862,width:600,height:78,radius:theme.layout==='poster'?4:39,background:theme.accent,borderWidth:0});
 text('cta-text',brief.cta,24,19,552,50,28,{parent:'cta-button',align:'center',color:theme.inverse,fontWeight:700});
 enter(['outro-brand'],11.45,.7);enter(['outro-tagline'],11.7,.7);enter(['cta-button'],12,.65,{offset:{x:0,y:20,scale:.98,rotation:0}});
 text('credit','TAKECRAFT / ORIGINAL MOTION STUDY',140,1003,1500,35,16,{color:theme.muted,letterSpacing:2});
 const assets:Record<string,{type:'image'|'audio';path:string}>={};
 if(brief.screenshot)assets.screenshot={type:'image',path:brief.screenshot};
 if(brief.music)assets.music={type:'audio',path:brief.music};
 return ProjectSchema.parse({schemaVersion:1,id:brief.id,title:`${brief.brand} · ${brief.headline}`,duration:15,theme:{background:theme.background,ink:theme.ink,accent:theme.accent},assets,actors,actions,tracks:[],camera:[],
  beats:[{time:1.5,label:'一句灵感'},{time:4.8,label:'展开工作台'},{time:7,label:'功能与价值'},{time:12.8,label:'品牌与行动'}],
  carries:[{time:2.55,actor:'panel'},{time:10.25,actor:'panel'}],checks:{inFrame:[{actor:'panel',start:1.2,end:15}]},
  audio:{events:[{time:.85,kind:'click',gain:.12},{time:2.55,kind:'air',gain:.16},{time:3.65,kind:'land',gain:.13},...cards.map((_,i)=>({time:4.25+i*.16,kind:'click',gain:.07})),{time:10.3,kind:'air',gain:.14},{time:11.45,kind:'land',gain:.16}],clips:brief.music?[{asset:'music',kind:'music',start:0,end:15,gain:.25,fade:.6}]:[]},
  captions:[{start:0,end:3,text:brief.headline},{start:3,end:9.5,text:brief.features.map(f=>f.title).join(' · ')},{start:9.5,end:15,text:`${brief.brand}。${brief.tagline}`}],
 });
}
