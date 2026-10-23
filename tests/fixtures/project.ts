export function fixture() {
  return {
    schemaVersion: 1, id: 'demo', title: '从想法到作品', duration: 15,
    canvas: { width: 1920, height: 1080 }, fps: 30,
    theme: { background: '#f5f2eb', ink: '#202625', accent: '#307865' },
    assets: {},
    actors: [{ id: 'title', type: 'text', text: '你好 <世界>', x: 200, y: 200, width: 1200, height: 140 }],
    tracks: [], camera: [], beats: [], carries: [],
    audio: { clips: [], events: [] }, captions: [], checks: { inFrame: [] }
  };
}
