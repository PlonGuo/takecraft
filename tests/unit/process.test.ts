import {expect,test} from 'vitest';
import {run} from '../../src/render/process.js';
test('preserves argument boundaries and Chinese text without a shell',async()=>{
  const r=await run(process.execPath,['-e','process.stdout.write(process.argv[1])','中文 $() a b']);expect(r.stdout).toBe('中文 $() a b');
});
test('reports nonzero exit and stderr',async()=>{
  await expect(run(process.execPath,['-e','process.stderr.write("broken");process.exit(7)'])).rejects.toThrow(/7.*broken/s);
});
test('reports missing executable',async()=>{await expect(run('takecraft-missing-binary',[])).rejects.toMatchObject({issues:[expect.objectContaining({code:'TOOL_MISSING'})]});});
