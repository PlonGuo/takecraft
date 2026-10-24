import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')) as {name:string;version:string};
export const version=pkg.version;
export function versionInfo(){return {status:'succeeded',name:pkg.name,version,protocol:1,verifiedPlatforms:['darwin']};}
