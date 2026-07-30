import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('.open-next');
const dist = resolve('dist');
const server = resolve(dist, 'server');

await rm(dist, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(source, server, { recursive: true });
await rename(resolve(server, 'worker.js'), resolve(server, 'index.js'));

// Sites serves static files from dist/assets while the worker keeps its own
// sibling copy for relative imports and OpenNext's ASSETS binding.
await cp(resolve(source, 'assets'), resolve(dist, 'assets'), { recursive: true });
