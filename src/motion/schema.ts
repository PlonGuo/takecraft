import {z} from 'zod';

const number=z.number().finite(),target=z.string().min(1);
export const MotionStyleSchema=z.enum(['calm','snappy','playful']);
const common={at:number.nonnegative(),duration:number.positive().max(120),style:MotionStyleSchema.default('calm')};
const offset=z.object({x:number.default(0),y:number.default(32),scale:number.positive().default(.96),rotation:number.default(0)}).strict();
const group={...common,targets:z.array(target).min(1),stagger:number.nonnegative().default(0),offset:offset.default({x:0,y:32,scale:.96,rotation:0})};
const pose=z.object({x:number.optional(),y:number.optional(),width:number.positive().optional(),height:number.positive().optional(),scale:number.positive().optional(),rotation:number.optional(),radius:number.nonnegative().optional(),opacity:number.min(0).max(1).optional()}).strict().refine(p=>Object.keys(p).length>0,'At least one target property is required');
export const ActionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('enter'),...group}).strict(),
  z.object({type:z.literal('exit'),...group}).strict(),
  z.object({type:z.literal('morph'),...common,actor:target,to:pose}).strict(),
  z.object({type:z.literal('reveal'),...common,actor:target}).strict(),
  z.object({type:z.literal('focus'),...common,actor:target.optional(),zoom:number.min(.25).max(4)}).strict(),
]);
export type Action=z.infer<typeof ActionSchema>;
export type MotionStyle=z.infer<typeof MotionStyleSchema>;
export const motionEase=(style:MotionStyle)=>({type:'spring' as const,bounce:{calm:.06,snappy:.14,playful:.32}[style]});
