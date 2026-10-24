import {z} from 'zod';
import {ThemeIdSchema} from '../themes/registry.js';
import {MotionStyleSchema} from '../motion/schema.js';
const text=(max:number)=>z.string().max(max).regex(/^[^\r\n\u2028\u2029]*$/,'Use a single paragraph without hard line breaks; layout wraps automatically').refine(s=>s.trim().length>0,'Text must not be blank');
export const BriefSchema=z.object({
 id:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),brand:text(20),headline:text(24),tagline:text(36),
 features:z.array(z.object({title:text(16),detail:text(48)}).strict()).min(2).max(3),cta:text(24),
 theme:ThemeIdSchema.default('paper'),style:MotionStyleSchema.optional(),
 screenshot:text(4096).optional(),music:text(4096).optional(),
}).strict();
export type Brief=z.infer<typeof BriefSchema>;
export const briefJSONSchema=()=>z.toJSONSchema(BriefSchema,{io:'input'});
