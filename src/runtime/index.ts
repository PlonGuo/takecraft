import type {Timeline,Runtime,FrameInspection} from '../project/types.js';
import {properties} from '../project/schema.js';
import {sample} from './sample.js';
import {cameraAt} from './camera.js';
import {createActor} from '../components/registry.js';
export type RuntimeResources={images:Record<string,string>;fonts:Array<{url:string;unicodeRange?:string}>};
export function createRuntime(root:HTMLElement,t:Timeline,resources:RuntimeResources={images:{},fonts:[]}):Runtime{
  root.replaceChildren();Object.assign(root.style,{position:'relative',width:t.canvas.width+'px',height:t.canvas.height+'px',overflow:'hidden',background:t.theme.background});
  const world=document.createElement('div');Object.assign(world.style,{position:'absolute',inset:'0',transformOrigin:'0 0'});root.append(world);
  const elements=new Map(t.actors.map(a=>[a.id,createActor(a,t.theme.ink,t.theme.accent)]));
  for(const a of t.actors)(a.parent?elements.get(a.parent)!:world).append(elements.get(a.id)!);
  const fontFaces:FontFace[]=[];
  const loaded=(async()=>{
    await Promise.all(resources.fonts.map(async f=>{const face=new FontFace('Takecraft',`url("${f.url}")`,f.unicodeRange?{unicodeRange:f.unicodeRange}:{});fontFaces.push(face);document.fonts.add(face);await face.load();}));
    await Promise.all(t.actors.filter(a=>a.type==='image').map(async a=>{const img=elements.get(a.id)! as HTMLImageElement;const url=resources.images[a.asset!];if(!url)throw new Error(`Missing image: ${a.asset}`);img.src=url;await img.decode();}));
    await document.fonts.ready;
  })();
  async function seek(seconds:number){
    await loaded;if(!Number.isFinite(seconds)||seconds<0||seconds>t.duration)throw new Error('seek time is out of range');
    for(const a of t.actors){
      const s={...a};for(const property of properties)s[property]=sample(a[property],t.tracks.filter(k=>k.actor===a.id&&k.property===property),seconds);
      const el=elements.get(a.id)!;
      Object.assign(el.style,{width:Math.max(1,s.width)+'px',height:Math.max(1,s.height)+'px',opacity:String(Math.max(0,Math.min(1,s.opacity))),borderRadius:Math.max(0,s.radius)+'px',padding:a.padding+'px',transform:`translate(${s.x}px,${s.y}px) rotate(${s.rotation}deg) scale(${Math.max(.001,s.scale)})`});
      if(a.type==='text')el.textContent=[...a.text!].slice(0,Math.ceil([...a.text!].length*Math.max(0,Math.min(1,s.reveal)))).join('');
    }
    const c=cameraAt(t,seconds);world.style.transform=`translate(${t.canvas.width/2}px,${t.canvas.height/2}px) rotate(${-c.rotation}deg) scale(${c.zoom}) translate(${-c.x}px,${-c.y}px)`;
  }
  async function inspect(seconds:number):Promise<FrameInspection>{
    await seek(seconds);const boxes:FrameInspection['boxes']={},issues:FrameInspection['issues']=[],rr=root.getBoundingClientRect(),ratio=rr.width/t.canvas.width;
    for(const a of t.actors){
      const el=elements.get(a.id)!,r=el.getBoundingClientRect();let opacity=1,node:HTMLElement|null=el;
      while(node&&node!==root){opacity*=Number(getComputedStyle(node).opacity);node=node.parentElement;}
      const b={x:(r.x-rr.x)/ratio,y:(r.y-rr.y)/ratio,width:r.width/ratio,height:r.height/ratio,opacity,overflow:a.type==='text'&&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)};boxes[a.id]=b;
      if(b.overflow&&opacity>.01)issues.push({code:'TEXT_OVERFLOW',path:`actors.${a.id}`,message:`Text exceeds its box at ${seconds.toFixed(3)}s`,severity:'error'});
      if(t.checks.inFrame.some(k=>k.actor===a.id&&seconds>=k.start&&seconds<k.end)&&(opacity<.01||b.x<-.5||b.y<-.5||b.x+b.width>t.canvas.width+.5||b.y+b.height>t.canvas.height+.5))issues.push({code:'OUT_OF_FRAME',path:`actors.${a.id}`,message:`Required object leaves frame at ${seconds.toFixed(3)}s`,severity:'error'});
    }
    return {time:seconds,boxes,issues};
  }
  return {ready:async()=>{await loaded;await seek(0);},seek,inspect,dispose(){fontFaces.forEach(f=>document.fonts.delete(f));root.replaceChildren();}};
}
