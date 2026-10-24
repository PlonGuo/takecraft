#!/usr/bin/env node
import {execute} from '../dist/cli/index.js';
import {output} from '../dist/cli/output.js';
const args=process.argv.slice(2);
const result=await execute(args);
output(result.data,args.includes('--json'));
process.exitCode=result.exitCode;
