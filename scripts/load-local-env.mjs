import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const localEnv = resolve('.env.local');
if (existsSync(localEnv)) loadEnvFile(localEnv);
