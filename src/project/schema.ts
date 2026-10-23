import { z } from 'zod';
const n = z.number().finite();
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text = z.string().refine(s => s.trim().length > 0, 'Text must not be blank');
export const properties = ['x','y','width','height','scale','rotation','opacity','radius','reveal'] as const;
export const EaseSchema = z.enum(['linear','smooth','out','spring']).default('smooth');
export const ActorSchema = z.object({
  id, type: z.enum(['text','image','surface','window','cursor','shape']), parent: id.optional(),
  text: text.optional(), asset: id.optional(), x: n.default(0), y: n.default(0),
  width: n.positive().default(400), height: n.positive().default(100), scale: n.positive().default(1),
  rotation: n.default(0), opacity: n.min(0).max(1).default(1), radius: n.min(0).default(0),
  reveal: n.min(0).max(1).default(1), color: color.optional(), background: color.optional(),
  fontSize: n.positive().default(64), fontWeight: z.union([z.literal(400),z.literal(700)]).default(400),
  align: z.enum(['left','center','right']).default('left'), padding: n.nonnegative().default(0),
  fit: z.enum(['contain','cover']).default('contain'), clip: z.boolean().default(false),
}).strict();
export const TrackSchema = z.object({
  actor: id, property: z.enum(properties), start: n.nonnegative(), end: n.nonnegative(),
  from: n, to: n, ease: EaseSchema,
}).strict();
const CameraSchema = z.object({
  time: n.nonnegative(), x: n, y: n, zoom: n.positive(), rotation: n.default(0), ease: EaseSchema,
}).strict();
export const ProjectSchema = z.object({
  schemaVersion: z.literal(1), id, title: text, duration: n.positive().max(120),
  canvas: z.object({width:z.literal(1920),height:z.literal(1080)}).default({width:1920,height:1080}), fps:z.literal(30).default(30),
  theme: z.object({ background: color, ink: color, accent: color, font: id.optional() }).strict(),
  assets: z.record(id,z.object({path:text,type:z.enum(['image','audio','font']),source:z.string().optional()}).strict()).default({}),
  actors: z.array(ActorSchema).min(1), tracks: z.array(TrackSchema).default([]), camera:z.array(CameraSchema).default([]),
  beats:z.array(z.object({time:n.nonnegative(),label:text})).default([]),
  carries:z.array(z.object({time:n.nonnegative(),actor:id})).default([]),
  audio:z.object({
    clips:z.array(z.object({asset:id,start:n.nonnegative(),end:n.positive(),gain:n.min(0).max(2).default(.5),kind:z.enum(['music','narration']),fade:n.nonnegative().default(.1)}).strict()).default([]),
    events:z.array(z.object({time:n.nonnegative(),kind:z.enum(['click','air','land']),gain:n.min(0).max(1).default(.25)}).strict()).default([]),
  }).default({clips:[],events:[]}),
  captions:z.array(z.object({start:n.nonnegative(),end:n.positive(),text})).default([]),
  checks:z.object({inFrame:z.array(z.object({actor:id,start:n.nonnegative(),end:n.positive()})).default([])}).default({inFrame:[]}),
}).strict();
export type Project = z.infer<typeof ProjectSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Ease = z.infer<typeof EaseSchema>;
export const projectJSONSchema = () => z.toJSONSchema(ProjectSchema, {io:'input'});
