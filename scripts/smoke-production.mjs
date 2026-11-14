import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {once} from 'node:events';

// Entirely local: a fake OpenAI endpoint and a fake key; no paid API calls.
const cases=JSON.parse(readFileSync('knowledge/system-design/index.json','utf8'));
let sent;
const upstream=createServer(async(request,response)=>{
  let body='';for await(const chunk of request)body+=chunk;
  sent=JSON.parse(body);
  response.writeHead(200,{'Content-Type':'text/event-stream'});
  for(const event of [
    {type:'response.output_text.delta',delta:'## Solution\nMocked answer.'},
    {type:'response.completed',response:{id:'test',status:'completed'}}
  ])response.write('data: '+JSON.stringify(event)+'\n\n');
  response.end();
});
let app;
try {
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
  const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
    env:{...process.env,OPENAI_API_KEY:'local-smoke-test',OPENAI_BASE_URL:`http://127.0.0.1:${upstream.address().port}/v1`,NEXT_TELEMETRY_DISABLED:'1'},
    stdio:['ignore','pipe','pipe']
  });
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Next startup timeout')),15000);
    app.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready')){clearTimeout(timer);resolve();}});
    app.on('error',reject);app.on('exit',code=>{clearTimeout(timer);reject(new Error('Next exited: '+code));});
  });
  const base=`http://127.0.0.1:${port}`;
  const html=await (await fetch(base)).text();
  for(const label of ['General Question','Coding','System Design'])assert.ok(html.includes(label));
  async function generate(input) {
    const response=await fetch(base+'/api/answer',{method:'POST',headers:{'Content-Type':'application/json',origin:`http://localhost:${port}`},body:JSON.stringify(input)});
    assert.equal(response.status,200);
    const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
    assert.equal(events.at(-1).done,true);assert.ok(events.some(event=>event.delta));
    return events[0].metadata;
  }
  await generate({question:'Introduce yourself',background:'Software developer'});
  assert.equal(sent.model,'gpt-6-luna');assert.equal(sent.reasoning.effort,'none');
  await generate({question:'Return indices of two numbers that add to a target',questionType:'coding',codingLanguage:'Java'});
  assert.equal(sent.model,'gpt-6.1-sol');assert.match(sent.instructions,/Coding interview answer format/);assert.match(sent.instructions,/Implementation language: Java/);
  for(const entry of cases){
    const metadata=await generate({question:entry.sampleQuestion,questionType:'system_design'});
    assert.equal(sent.model,'gpt-6.1-sol');assert.equal(metadata.references[0].id,entry.id);
    assert.match(JSON.parse(sent.input).referenceCases[0].example,/Example architecture and data flow/);
  }
  const history=[{question:'Design a payment system',answer:'I would use payment intents.',answerSource:'candidate',suggestedAnswer:'Use a durable ledger and reconciliation.',suggestionComplete:true}];
  const followup=await generate({question:'How do we recover after a timeout?',questionType:'system_design',history});
  assert.deepEqual(JSON.parse(sent.input).history,history);assert.equal(followup.references[0].id,'payments');
  assert.match(sent.instructions,/earlier question turns in this same Part/);
  const traced=JSON.parse(readFileSync('.next/server/app/api/answer/route.js.nft.json','utf8')).files;
  for(const entry of cases)assert.ok(traced.some(file=>file.endsWith('knowledge/system-design/'+entry.file)),entry.id+' traced');
  assert.ok(!traced.some(file=>/(^|\/)\.env\.local$/.test(file)));
  console.log(`PASS: production HTTP, both model routes, Coding template, all ${cases.length} design examples, Part follow-up history with distinct actual and suggested answers and production file tracing. No paid API calls.`);
} finally {
  if(app && app.exitCode===null){app.kill();await once(app,'exit');}
  upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));
}
