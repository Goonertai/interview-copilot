import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateInput} from '../lib/answer';
import {buildGenerationPlan} from '../lib/generation';
import {matchSystemDesignCases} from '../lib/system-design-cases';
import cases from '../knowledge/system-design/index.json';
import {POST} from '../app/api/answer/route';
import AnswerContent from '../components/answer-content';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('routes all modes independently of a legacy model setting and allows technical questions without resume',()=>{
 const previous=process.env.OPENAI_MODEL;process.env.OPENAI_MODEL='gpt-4.1-mini';
 try {
  const general=buildGenerationPlan(validateInput({question:'Introduce yourself',background:'Developer'}));
  assert.equal(general.model,'gpt-6-luna');assert.equal(general.reasoning.effort,'none');assert.equal(general.max_output_tokens,900);
  assert.throws(()=>validateInput({question:'q'}),/background/);
  for(const questionType of ['coding','system_design']) {
   const plan=buildGenerationPlan(validateInput({question:'Explain this problem',questionType,answerStyle:'concise'}));
   assert.equal(plan.model,'gpt-6.1-sol');assert.equal(plan.reasoning.effort,'medium');assert.ok(plan.max_output_tokens>=25000);
   assert.doesNotMatch(plan.instructions,/about 120–180 words/);assert.match(plan.instructions,/preserve every required technical section/);
  }
  const coding=buildGenerationPlan(validateInput({question:'Find two indices that sum to a target',questionType:'coding',codingLanguage:'Java'}));
  assert.match(coding.instructions,/Implementation language: Java/);
  for(const section of ['Clarify the problem','Baseline and bottleneck','Correctness','Implementation','Walkthrough and tests','Complexity','Follow-ups'])assert.ok(coding.instructions.includes(section));
  assert.throws(()=>validateInput({question:'q',questionType:'toString'}));
  assert.throws(()=>validateInput({question:'q',questionType:'coding',codingLanguage:'unknown'}));
 } finally {if(previous===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=previous;}
});

test('every library case retrieves itself and its Markdown is bundled as real example context',()=>{
 assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
 for(const entry of cases) {
  const matches=matchSystemDesignCases(entry.sampleQuestion);
  assert.equal(matches[0]?.id,entry.id,entry.id);
  const plan=buildGenerationPlan(validateInput({question:entry.sampleQuestion,questionType:'system_design'}));
  const references=JSON.parse(plan.input).referenceCases;
  assert.ok(references[0].example.includes('Example architecture and data flow'));
  assert.equal(references[0].example,readFileSync('knowledge/system-design/'+entry.file,'utf8'));
  assert.match(plan.instructions,/requirements differ/);
 }
});

test('retrieval handles aliases and Chinese, limits context and falls back on unseen questions',()=>{
 assert.equal(matchSystemDesignCases('Design TinyURL with expiring links')[0]?.id,'url-shortener');
 assert.equal(matchSystemDesignCases('设计一个分布式限流器')[0]?.id,'rate-limiter');
 assert.equal(matchSystemDesignCases('Design Dropbox-style file synchronization')[0]?.id,'file-storage');
 assert.equal(matchSystemDesignCases('Design a web crawler and a distributed cache with a rate limiter').length,2);
 assert.deepEqual(matchSystemDesignCases('Design a chess tournament pairing service'),[]);
 const input=validateInput({question:'Design a chess tournament pairing service',questionType:'system_design',background:'I work on Kafka ingestion',jobDescription:'Build payment systems and chat apps'});
 const plan=buildGenerationPlan(input);assert.deepEqual(plan.metadata.references,[]);assert.deepEqual(JSON.parse(plan.input).referenceCases,[]);
 const general=buildGenerationPlan(validateInput({question:'Tell me about your chat system',background:'Developer'}));assert.deepEqual(JSON.parse(general.input).referenceCases,[]);
});

test('safe answer rendering preserves code and tables without interpreting HTML',()=>{
 const html=renderToStaticMarkup(createElement(AnswerContent,{text:'## Solution\n<script>alert(1)</script>\n```python\nprint("<ok>")\n```\n| Input | Output |\n| --- | --- |\n| 1 | 2 |'}));
 assert.match(html,/<h3>Solution<\/h3>/);assert.match(html,/<pre><code>/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/<table>/);assert.match(html,/<td>2<\/td>/);
});

test('technical API sends Sol, Markdown and retrieved examples; reports partial output budget errors',async()=>{
 const original=globalThis.fetch, previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let sent:any;
 globalThis.fetch=async(_url,init)=>{
  sent=JSON.parse(init?.body as string);
  return new Response([
   {type:'response.output_text.delta',delta:'## Scope\nI would clarify consistency.'},
   {type:'response.incomplete',response:{id:'test',status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}}
  ].map(event=>'data: '+JSON.stringify(event)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}});
 };
 try {
  const response=await POST(new Request('http://localhost/api/answer',{method:'POST',body:JSON.stringify({question:'Design a payment system with idempotency',questionType:'system_design'})}));
  assert.equal(response.status,200);const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(sent.model,'gpt-6.1-sol');assert.equal(sent.reasoning.effort,'medium');assert.match(sent.instructions,/System design interview answer format/);
  assert.equal(JSON.parse(sent.input).referenceCases[0].id,'payments');assert.equal(events[0].metadata.model,'gpt-6.1-sol');assert.equal(events[0].metadata.references[0].id,'payments');
  assert.ok(events.some(e=>e.delta));assert.match(events.at(-1).error,/reasoning\/output budget/);assert.ok(!events.some(e=>e.done));
 } finally {globalThis.fetch=original;if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});
