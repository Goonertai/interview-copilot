import OpenAI from 'openai';
import {instructions, validateInput} from '../../../lib/answer';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error: 'Cross-origin request denied.'}, {status: 403});
  if (Number(request.headers.get('content-length') || 0) > 220000) return Response.json({error: 'Request too large.'}, {status: 413});
  let input;
  try {const raw = await request.text(); if(raw.length > 60000) throw new Error('Request too large.'); input = validateInput(JSON.parse(raw));}
  catch(e) {return Response.json({error: e instanceof Error ? e.message : 'Invalid request.'}, {status: 400});}
  if (!process.env.OPENAI_API_KEY) return Response.json({error: 'Set OPENAI_API_KEY in .env.local, then restart the app.'}, {status: 503});
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 0});
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort(), {once: true});
  try {
    const upstream = await client.responses.create({model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', instructions, input: JSON.stringify(input), max_output_tokens: 600, store: false, stream: true}, {signal: abort.signal});
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        try {
          let completed = false;
          for await (const event of upstream) {
            if(event.type === 'response.output_text.delta') send({delta: event.delta});
            if(event.type === 'error' || event.type === 'response.failed' || event.type === 'response.incomplete') throw new Error('Generation interrupted. Please retry.');
            if(event.type === 'response.completed') completed = true;
          }
          if(!completed) throw new Error('Generation interrupted. Please retry.');
          send({done: true});
        } catch {if (!abort.signal.aborted) send({error: 'Generation interrupted. Please retry.'});}
        finally {controller.close();}
      },
      cancel() {abort.abort();}
    });
    return new Response(stream, {headers: {'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering':'no'}});
  } catch(e) {
    const status = e instanceof OpenAI.APIError ? e.status : undefined;
    return Response.json({error: status === 401 ? 'API key rejected. Check .env.local.' : status === 429 ? 'API quota or rate limit reached. Check billing or retry later.' : 'Could not reach OpenAI. Check your connection and model configuration.'}, {status: 502});
  }
}
