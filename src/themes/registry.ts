import {z} from 'zod';
export const ThemeIdSchema=z.enum(['paper','midnight','editorial']);
export type ThemeId=z.infer<typeof ThemeIdSchema>;
const themes={
 paper:{id:'paper',name:'纸间 · Paper',description:'温暖纸色、柔和表面与横向卡片',layout:'grid',motion:'calm',background:'#f4f1e9',ink:'#183e34',accent:'#347c66',muted:'#6c7f74',surface:'#ffffff',card:'#edf2e8',line:'#dce4da',inverse:'#ffffff',radius:24,logoRadius:56,borderWidth:1,shadow:'float',cardShadow:'soft',headlineSize:88,align:'center',letterSpacing:-1,window:{x:220,y:250,width:1480,height:680}},
 midnight:{id:'midnight',name:'夜航 · Midnight',description:'深色科技、明亮强调色与纵向功能列表',layout:'list',motion:'snappy',background:'#080f1c',ink:'#eff6ff',accent:'#6be6cf',muted:'#91a7bd',surface:'#142236',card:'#1d3047',line:'#30475f',inverse:'#0a1823',radius:18,logoRadius:48,borderWidth:1,shadow:'glow',cardShadow:'none',headlineSize:82,align:'left',letterSpacing:-1,window:{x:200,y:230,width:1520,height:720}},
 editorial:{id:'editorial',name:'构想 · Editorial',description:'大字海报、利落构图与硬边投影',layout:'poster',motion:'playful',background:'#f6e851',ink:'#17191b',accent:'#fa5d3b',muted:'#56532b',surface:'#fffdf1',card:'#fffdf1',line:'#17191b',inverse:'#17191b',radius:4,logoRadius:18,borderWidth:2,shadow:'hard',cardShadow:'none',headlineSize:110,align:'left',letterSpacing:-3,window:{x:160,y:260,width:1600,height:650}},
} as const;
export type Theme=typeof themes[ThemeId];
export const listThemes=()=>Object.values(themes).map(({id,name,description})=>({id,name,description,version:1}));
export function getTheme(id:ThemeId):Theme{return themes[id];}
export function describeTheme(id:string){
 const parsed=ThemeIdSchema.safeParse(id);if(!parsed.success)throw new Error(`Unknown theme: ${id}`);
 return {...getTheme(parsed.data),schema:z.toJSONSchema(ThemeIdSchema),example:{theme:id}};
}
