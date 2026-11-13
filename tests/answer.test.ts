import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateInput, buildInstructions} from '../lib/answer';
import {POST} from '../app/api/answer/route';
test('validates and trims input with backward-compatible answer defaults',()=>assert.deepEqual(validateInput({question:' hello ',background:' resume '}),{question:'hello',background:'resume',targetRole:'',jobDescription:'',ieltsLevel:6.5,answerStyle:'natural',questionType:'general',codingLanguage:'Python'}));
test('validates optional role, JD, language level and style',()=>{
 const base={question:'q',background:'b'};
 const input=validateInput({...base,targetRole:' Backend Engineer ',jobDescription:' Kafka and SQL ',ieltsLevel:5,answerStyle:'concise'});
 assert.equal(input.targetRole,'Backend Engineer');assert.equal(input.jobDescription,'Kafka and SQL');
 const prompt=buildInstructions(input);
 assert.match(prompt,/IELTS 5/);assert.match(prompt,/common vocabulary/);assert.match(prompt,/60–100 words/);assert.match(prompt,/not candidate experience/);
 assert.match(buildInstructions(validateInput({...base,ieltsLevel:9,answerStyle:'professional'})),/precise nuanced vocabulary/);
 for(const extra of [{targetRole:1},{targetRole:'x'.repeat(301)},{jobDescription:null},{jobDescription:'x'.repeat(20001)},{ieltsLevel:4.5},{ieltsLevel:9.5},{ieltsLevel:6.3},{ieltsLevel:'6.5'},{ieltsLevel:NaN},{answerStyle:'invented'},{answerStyle:'toString'}])assert.throws(()=>validateInput({...base,...extra}));
});
test('rejects missing, malformed and oversized input',()=>{for(const x of [null,{}, {question:1,background:'b'},{question:' ',background:'b'},{question:'q',background:''},{question:'q'.repeat(12001),background:'b'},{question:'q',background:'b'.repeat(40001)}])assert.throws(()=>validateInput(x));});
test('API rejects cross-origin and malformed requests before generation',async()=>{assert.equal((await POST(new Request('http://localhost/api/answer',{method:'POST',headers:{origin:'https://example.com'},body:'{}'}))).status,403);assert.equal((await POST(new Request('http://localhost/api/answer',{method:'POST',body:'bad'}))).status,400);});
test('API explains missing server key',async()=>{const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const response=await POST(new Request('http://localhost/api/answer',{method:'POST',body:JSON.stringify({question:'q',background:'b'})}));assert.equal(response.status,503);}finally{if(key)process.env.OPENAI_API_KEY=key;}});
test('accepts same-origin and local loopback aliases, including alternate ports',async()=>{
 for(const [target,origin] of [
  ['http://127.0.0.1:3000','http://localhost:3000'],
  ['http://localhost:3000','http://127.0.0.1:3000'],
  ['http://127.0.0.1:3001','http://localhost:3001'],
  ['http://[::1]:3000','http://localhost:3000'],
  ['http://127.0.0.1:3000','http://127.0.0.1:3000']
 ]) {
  // A malformed body reaches input validation only if the origin guard passes.
  assert.equal((await POST(new Request(target+'/api/answer',{method:'POST',headers:{origin,'sec-fetch-site':'same-origin'},body:'bad'}))).status,400,origin);
 }
});
test('still blocks foreign hosts, ports, schemes and malformed origins',async()=>{
 for(const origin of ['https://example.com','http://localhost:3001','https://localhost:3000','http://localhost.evil.test:3000','null','bad','http://localhost:3000/path']) {
  assert.equal((await POST(new Request('http://127.0.0.1:3000/api/answer',{method:'POST',headers:{origin},body:'bad'}))).status,403,origin);
 }
 assert.equal((await POST(new Request('http://127.0.0.1:3000/api/answer',{method:'POST',headers:{origin:'http://127.0.0.1:3000','sec-fetch-site':'cross-site'},body:'bad'}))).status,403);
});
test('streams answer deltas and completion from mocked OpenAI',async()=>{
 const original=globalThis.fetch, key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 let sent:any;
 globalThis.fetch=async(_url,init)=>{sent=JSON.parse(init?.body as string);return new Response([
  {type:'response.output_text.delta',delta:'Hello '},
  {type:'response.output_text.delta',delta:'world.'},
  {type:'response.completed',response:{id:'resp_test',status:'completed'}}
 ].map(event=>'data: '+JSON.stringify(event)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}});};
 try{const response=await POST(new Request('http://localhost/api/answer',{method:'POST',body:JSON.stringify({question:'Introduce yourself',background:'Software developer',targetRole:'Backend Engineer',jobDescription:'Build reliable Kafka services',ieltsLevel:7.5,answerStyle:'star'})}));assert.equal(response.status,200);const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));assert.equal(events.filter(e=>e.delta).map(e=>e.delta).join(''),'Hello world.');assert.equal(events.at(-1).done,true);assert.equal(sent.store,false);assert.equal(sent.stream,true);assert.match(sent.input,/Software developer/);const payload=JSON.parse(sent.input);assert.equal(payload.targetRole,'Backend Engineer');assert.equal(payload.jobDescription,'Build reliable Kafka services');assert.equal(payload.ieltsLevel,7.5);assert.equal(payload.answerStyle,'star');assert.match(sent.instructions,/IELTS 7.5/);assert.match(sent.instructions,/personal action and result/);}
 finally{globalThis.fetch=original;if(key)process.env.OPENAI_API_KEY=key;else delete process.env.OPENAI_API_KEY;}
});
