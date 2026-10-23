export async function retryBrowser<T>(fn:()=>Promise<T>):Promise<T>{
 for(let n=0;;n++){try{return await fn();}catch(e){if(n>=2||!(e instanceof Error)||!/Target (page, context or browser|closed)|browser.*(closed|disconnected)|Page crashed/i.test(e.message))throw e;}}
}
