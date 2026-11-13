import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseEnv} from 'node:util';

// Server only: never return the key in an API response or diagnostic output.
export function getApiKey(root = process.cwd(), env: Record<string, string | undefined> = process.env): string {
  const configured = env.OPENAI_API_KEY?.trim();
  if (configured) return configured;

  // Runtime-only local configuration must never be copied into a production bundle.
  const file = join(/*turbopackIgnore: true*/ root, '.env.local');
  if (!existsSync(file)) {
    for (const name of ['.env.local.txt', '.env local', 'env.local']) {
      if (existsSync(join(/*turbopackIgnore: true*/ root, name))) throw new Error(`Found ${name}. Rename it to exactly .env.local in the folder containing package.json, then retry.`);
    }
    throw new Error('No API key loaded. Create .env.local beside package.json (not inside app), add OPENAI_API_KEY=your-key, save, and retry.');
  }

  let raw: Buffer;
  try {raw = readFileSync(file);}
  catch {throw new Error('Cannot read .env.local. Check the file permissions and retry.');}
  if (raw.includes(0)) throw new Error('Save .env.local with UTF-8 encoding, then retry. UTF-16 is not supported.');
  let key: string | undefined;
  try {key = parseEnv(raw.toString('utf8').replace(/^\uFEFF/, '')).OPENAI_API_KEY?.trim();}
  catch {throw new Error('Invalid .env.local format. Use OPENAI_API_KEY=your-key on one line and save as UTF-8.');}
  if (!key) throw new Error('.env.local has no non-empty OPENAI_API_KEY. Use OPENAI_API_KEY=your-key on one line, save the file, and retry.');
  return key;
}
