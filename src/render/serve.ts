import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import type {AssetManifest,Timeline} from '../project/types.js';
import type {RuntimeResources} from '../runtime/index.js';
export async function runtimeBundle(){
  const js=fileURLToPath(new URL('../runtime/browser-entry.js',import.meta.url));
  const entry=existsSync(js)?js:js.replace(/\.js$/,'.ts');
  const result=await build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',minify:true});return result.outputFiles[0].text;
}
export function sceneHTML(timeline:Timeline,resources:RuntimeResources,script:string,preview=false,inline=false){
  const data=JSON.stringify({timeline,resources,preview}).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Takecraft preview</title><style>html,body{margin:0;background:#151b19}#viewport{transform-origin:top left}#controls{position:fixed;bottom:0;left:0;right:0;height:64px;display:flex;align-items:center;gap:20px;padding:0 28px;color:white;font:14px system-ui;background:#151b19}#controls input{flex:1}button{padding:9px 16px;border:0;border-radius:6px}</style><div id="viewport"><div id="stage"></div></div><script id="tc-data" type="application/json">${data}</script>${inline?`<script>${script.replace(/<\/script/gi,'<\\/script')}</script>`:`<script src="${script}"></script>`}</html>`;
}
export async function serveScene(t:Timeline,a:AssetManifest){
  const routes=new Map<string,{body:Buffer|string;type:string}>();
  const resources:RuntimeResources={images:{},fonts:[]};
  for(const [id,item] of Object.entries(a.items)){if(item.type!=='image')continue;const url='/asset/'+encodeURIComponent(id);routes.set(url,{body:await readFile(item.path),type:item.mime});resources.images[id]=url;}
  for(const [i,font] of a.fonts.entries()){const url='/font/'+i;routes.set(url,{body:await readFile(font.path),type:font.mime});resources.fonts.push({url,unicodeRange:font.unicodeRange});}
  routes.set('/runtime.js',{body:await runtimeBundle(),type:'text/javascript'});routes.set('/',{body:sceneHTML(t,resources,'/runtime.js'),type:'text/html; charset=utf-8'});
  const server=createServer((req,res)=>{const entry=routes.get(req.url??'');if(!entry||!['GET','HEAD'].includes(req.method??'')){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':entry.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:entry.body);});
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const address=server.address();if(!address||typeof address==='string')throw new Error('No local server address');
  return {url:`http://127.0.0.1:${address.port}/`,close:()=>new Promise<void>((resolve,reject)=>{server.closeAllConnections();server.close(e=>e?reject(e):resolve());})};
}
