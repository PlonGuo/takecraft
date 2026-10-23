import type {Track,Ease} from '../project/types.js';
export function ease(u:number,kind:Ease){
  u=Math.max(0,Math.min(1,u));if(u===0||u===1)return u;
  if(kind==='linear')return u;
  if(kind==='out')return 1-(1-u)**3;
  if(kind==='spring')return 1-Math.exp(-7*u)*Math.cos(10*u);
  return u*u*(3-2*u);
}
export function sample(initial:number,tracks:Track[],t:number){
  let value=initial;
  for(const k of tracks){if(t<k.start)break;if(t>=k.end)value=k.to;else value=k.from+(k.to-k.from)*ease((t-k.start)/(k.end-k.start),k.ease);}
  return value;
}
