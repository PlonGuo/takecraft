import {chromium,type Page,type Browser} from 'playwright';
import {existsSync} from 'node:fs';
import {fail,type Timeline,type AssetManifest,type FrameInspection} from '../project/types.js';
import {serveScene} from './serve.js';
export type SceneSession={page:Page;seek(t:number):Promise<void>;inspect(t:number):Promise<FrameInspection>;close():Promise<void>};
export function browserOptions(executablePath?:string){
  if(executablePath)return {executablePath};
  // Use full Chromium's unified headless renderer, matching the Chrome fallback.
  // Headless Shell can rasterize cached shadows differently after random seeks.
  if(existsSync(chromium.executablePath()))return {channel:'chromium'};
  if(process.platform==='darwin'&&existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))return {channel:'chrome'};
  fail('BROWSER_MISSING','browser','Run pnpm exec playwright install chromium, or pass --browser /path/to/chrome',2);
}
export async function browserVersion(executablePath?:string){const b=await chromium.launch({headless:true,...browserOptions(executablePath)});try{return b.version();}finally{await b.close();}}
export async function openScene(t:Timeline,a:AssetManifest,executablePath?:string):Promise<SceneSession>{
  const server=await serveScene(t,a);let browser:Browser|undefined;
  try{
    browser=await chromium.launch({headless:true,...browserOptions(executablePath)});
    const page=await browser.newPage({viewport:t.canvas,deviceScaleFactor:1});const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>route.request().url().startsWith(server.url)?route.continue():route.abort());
    await page.goto(server.url);await page.evaluate(()=>window.tcReady);
    return {page,async seek(time){await page.evaluate(t=>window.tc.seek(t),time);if(errors.length)throw new Error(errors.join('\n'));},async inspect(time){return page.evaluate(t=>window.tc.inspect(t),time);},async close(){try{await browser!.close();}finally{await server.close();}}};
  }catch(e){await browser?.close();await server.close();throw e;}
}
