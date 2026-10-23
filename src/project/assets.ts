import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import sharp from 'sharp';
import {openSync} from 'fontkit';
import {hash} from './hash.js';
import {fail,type Project,type AssetManifest,type FontRecord} from './types.js';
import {probe} from '../render/process.js';
const require=createRequire(import.meta.url);
function fontChars(path:string):Set<number>{
  const f=openSync(path);if(!('characterSet' in f))fail('FONT_INVALID',path,'Font collections are not supported; use TTF/OTF/WOFF2');
  return new Set(f.characterSet);
}
function covers(range:string,cp:number){return range.split(',').some(s=>{const [a,b]=s.trim().replace(/^U\+/i,'').split('-');return cp>=parseInt(a,16)&&cp<=parseInt(b??a,16);});}
export async function prepareAssets(p:Project,dir:string):Promise<AssetManifest>{
  const manifest:AssetManifest={items:{},fonts:[]};
  for(const [id,a] of Object.entries(p.assets)){
    try{
      if(/^[a-z]+:\/\//i.test(a.path))fail('ASSET_LOCAL_ONLY',`assets.${id}`,'Download and explicitly reference a local asset');
      const path=await realpath(resolve(dir,a.path));if(!(await stat(path)).isFile())throw new Error('Not a file');
      const bytes=await readFile(path);const entry={path,type:a.type,sha256:hash(bytes),mime:'application/octet-stream'};
      if(a.type==='image'){
        const info=await sharp(bytes).metadata();if(!info.width||!info.height)throw new Error('Missing image dimensions');
        manifest.items[id]={...entry,width:info.width,height:info.height,mime:info.format==='svg'?'image/svg+xml':`image/${info.format==='jpg'?'jpeg':info.format}`};
      }else if(a.type==='audio'){
        const info=await probe(path),duration=Number(info.format.duration);
        if(!info.streams.some(s=>s.codec_type==='audio')||!Number.isFinite(duration)||duration<=0)throw new Error('No valid audio stream');
        manifest.items[id]={...entry,duration,mime:'application/octet-stream'};
      }else{fontChars(path);manifest.items[id]=entry;}
    }catch(e){fail('ASSET_INVALID',`assets.${id}`,`${a.path}: ${e instanceof Error?e.message:String(e)}`,2);}
  }
  const characters=new Set([...p.actors.map(a=>a.text??'').join('')+p.captions.map(c=>c.text).join('')].filter(c=>!/[\n\r\t]/.test(c)).map(c=>c.codePointAt(0)!));
  const covered=new Set<number>();
  if(p.theme.font){
    const entry=manifest.items[p.theme.font];if(!entry)fail('ASSET_MISSING','theme.font','Font does not exist');
    manifest.fonts.push(entry);fontChars(entry.path).forEach(c=>covered.add(c));
  }else{
    const cssPath=require.resolve('@fontsource/noto-sans-sc/400.css');
    const css=await readFile(cssPath,'utf8');
    for(const block of css.split('@font-face')){
      const relative=block.match(/url\((\.\/[^)]+\.woff2)\)/)?.[1],range=block.match(/unicode-range:\s*([^;]+);/)?.[1];
      if(!relative||!range||![...characters].some(c=>covers(range,c)))continue;
      const path=resolve(dirname(cssPath),relative),bytes=await readFile(path);
      manifest.fonts.push({path,sha256:hash(bytes),type:'font',mime:'font/woff2',unicodeRange:range});
      fontChars(path).forEach(c=>covered.add(c));
    }
  }
  const missing=[...characters].filter(c=>!covered.has(c));
  if(missing.length)fail('FONT_GLYPH_MISSING','theme.font',`Missing glyphs: ${missing.slice(0,16).map(c=>String.fromCodePoint(c)+' U+'+c.toString(16).toUpperCase()).join(', ')}`,2);
  return manifest;
}
