import OpenAI from 'openai';
import {validateInput} from '../../../lib/answer';
import {buildGenerationPlan} from '../../../lib/generation';
import {getApiKey} from '../../../lib/server-config';
export const runtime = 'nodejs';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
function isAllowedOrigin(request: Request) {
  // The local server can normalize localhost to its 127.0.0.1 bind address.
  // Only treat loopback aliases as equivalent at the same protocol and port.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    if (source.origin === 'null' || source.origin !== origin) return false;
    return source.origin === target.origin || (
      loopbackHosts.has(source.hostname) && loopbackHosts.has(target.hostname) &&
      source.protocol === target.protocol && source.port === target.port
    );
  } catch {return false;}
}
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return Response.json({error: 'Cross-origin request denied. Open the app at http://127.0.0.1:3000 (or the port shown in your terminal) and retry.'}, {status: 403});
  if (Number(request.headers.get('content-length') || 0) > 360000) return Response.json({error: 'Request too large.'}, {status: 413});
  let input;
  try {const raw = await request.text(); if(raw.length > 90000) throw new Error('Request too large.'); input = validateInput(JSON.parse(raw));}
  catch(e) {return Response.json({error: e instanceof Error ? e.message : 'Invalid request.'}, {status: 400});}
  let apiKey: string;
  try {apiKey = getApiKey();}
  catch(e) {return Response.json({error: e instanceof Error ? e.message : 'Check .env.local configuration.'}, {status: 503});}
  const client = new OpenAI({apiKey, timeout: 180000, maxRetries: 0});
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort(), {once: true});
  if(request.signal.aborted)abort.abort();
  try {
    const {metadata,...plan} = buildGenerationPlan(input);
    const upstream = await client.responses.create({...plan, store: false, stream: true}, {signal: abort.signal});
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        try {
          send({metadata});
          let completed = false;
          for await (const event of upstream) {
            if(event.type === 'response.output_text.delta') send({delta: event.delta});
            if(event.type === 'response.incomplete') throw new Error(event.response.incomplete_details?.reason === 'max_output_tokens' ? 'The answer reached its reasoning/output budget. Try a narrower question. Any partial answer is shown above.' : 'Generation incomplete. Any partial answer is shown above. Please retry.');
            if(event.type === 'error' || event.type === 'response.failed') throw new Error('Generation interrupted. Any partial answer is shown above. Please retry.');
            if(event.type === 'response.completed') completed = true;
          }
          if(!completed) throw new Error('Generation interrupted. Please retry.');
          send({done: true});
        } catch(e) {if (!abort.signal.aborted) send({error: e instanceof Error ? e.message : 'Generation interrupted. Please retry.'});}
        finally {controller.close();}
      },
      cancel() {abort.abort();}
    });
    return new Response(stream, {headers: {'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering':'no'}});
  } catch(e) {
    const status = e instanceof OpenAI.APIError ? e.status : undefined;
    return Response.json({error: status === 401 ? 'API key rejected. Check .env.local.' : status === 429 ? 'API quota or rate limit reached. Check billing or retry later.' : status === 403 || status === 404 ? 'Your API project cannot access the model for this mode. Check model access: General uses gpt-6-luna; Coding and System Design use gpt-6.1-sol.' : 'Could not reach OpenAI. Check your connection and model access.'}, {status: 502});
  }
}
