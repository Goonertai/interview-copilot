import {getApiKey} from '../lib/server-config';

try {
  getApiKey();
  console.log('PASS: API key configuration found. The key is hidden. This does not verify OpenAI authentication or billing.');
} catch(e) {
  console.error(e instanceof Error ? e.message : 'Check .env.local configuration.');
  process.exitCode = 1;
}
