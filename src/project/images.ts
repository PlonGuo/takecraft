import sharp from 'sharp';
import {hash} from './hash.js';
import {fail,type AssetRecord} from './types.js';

export async function prepareImage(bytes:Buffer){
  // Image assets are stills. Decode once so SVG/GIF/APNG cannot run a second clock.
  const {data,info}=await sharp(bytes,{animated:false,page:0,pages:1}).rotate().png().toBuffer({resolveWithObject:true});
  return {width:info.width,height:info.height,mime:'image/png',image:{png:data,sha256:hash(data)}};
}

export function imageResource(item:AssetRecord){
  if(!item.image)fail('IMAGE_UNPREPARED',item.path,'Prepare image assets before rendering');
  return {body:Buffer.from(item.image.png),type:'image/png'};
}
