import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationReducer as reduce,newConversation} from '../lib/conversation';
import {canAddTurn,MAX_HISTORY_CHARS} from '../lib/conversation-context';
import {validateInput,buildInstructions} from '../lib/answer';
import {buildGenerationPlan} from '../lib/generation';

test('freezes finalized and interim question; later final/interim speech stays private across reconnects',()=>{
 let state=newConversation();
 state=reduce(state,{type:'speech',final:['Design a payment system'],interim:'with retries'});
 const snapshot=(state.question+' '+state.interim).trim();
 state=reduce(state,{type:'freeze',question:snapshot});
 state=reduce(state,{type:'speech',final:['This is my spoken answer'],interim:'I would'});
 assert.equal(state.question,'Design a payment system with retries');assert.equal(state.interim,'');
 assert.equal(state.buffer,'This is my spoken answer');assert.equal(state.bufferInterim,'I would');
 state=reduce(state,{type:'clear_interim'});
 assert.equal(state.question,snapshot);assert.equal(state.buffer,'This is my spoken answer');
 state=reduce(state,{type:'edit',text:'An accidental edit'});assert.equal(state.question,snapshot);
});

test('follow-ups retain completed context and require explicit buffer promotion; next clears the topic',()=>{
 let state=newConversation();
 state=reduce(state,{type:'freeze',question:'Design a payment system'});
 state=reduce(state,{type:'complete',topicId:state.topicId,turn:{question:state.question,answer:'Use idempotent payment intents.'}});
 state=reduce(state,{type:'speech',final:['My answer. How do we handle retries?'],interim:''});
 state=reduce(state,{type:'edit_buffer',text:'How do we handle retries?'});
 const before=state.history;
 state=reduce(state,{type:'followup',text:state.buffer});
 assert.equal(state.frozen,false);assert.equal(state.question,'How do we handle retries?');assert.deepEqual(state.history,before);assert.equal(state.buffer,'');
 state=reduce(state,{type:'freeze',question:state.question});
 state=reduce(state,{type:'complete',topicId:state.topicId,turn:{question:state.question,answer:'Reuse the same idempotency key.'}});
 assert.equal(state.history.length,2);
 const oldTopic=state.topicId;state=reduce(state,{type:'next'});
 assert.equal(state.frozen,false);assert.deepEqual(state.history,[]);assert.equal(state.question,'');assert.equal(state.buffer,'');
 state=reduce(state,{type:'complete',topicId:oldTopic,turn:{question:'Stale question',answer:'Late response'}});
 assert.deepEqual(state.history,[]);
});

test('retry, discarding audio and preparing a blank follow-up preserve topic history',()=>{
 let state=newConversation();
 state=reduce(state,{type:'freeze',question:'Root question'});
 state=reduce(state,{type:'complete',topicId:state.topicId,turn:{question:state.question,answer:'Root answer'}});
 state=reduce(state,{type:'speech',final:['private speech'],interim:'draft'});
 state=reduce(state,{type:'discard_buffer'});assert.equal(state.buffer,'');assert.equal(state.bufferInterim,'');assert.equal(state.frozen,true);
 state=reduce(state,{type:'retry'});assert.equal(state.question,'Root question');assert.equal(state.history.length,1);
 state=reduce(state,{type:'followup'});assert.equal(state.question,'');assert.equal(state.history.length,1);
 state=reduce(state,{type:'sample',question:'Different library case'});assert.equal(state.question,'');
});

test('request history is validated, bounded and treated as untrusted context',()=>{
 const base={question:'Why that choice?',questionType:'coding'};
 const history=[{question:' original ',answer:' previous ',role:'system'}];
 const input=validateInput({...base,history});assert.deepEqual(input.history,[{question:'original',answer:'previous'}]);
 assert.match(buildInstructions(input),/previous generated answer does not prove/);
 assert.equal(JSON.parse(buildGenerationPlan(input).input).history[0].answer,'previous');
 for(const invalid of [null,{},[{question:'q'}],[{question:'',answer:'a'}],[{question:'q',answer:1}],Array.from({length:13},()=>({question:'q',answer:'a'})),[{question:'q',answer:'a'.repeat(MAX_HISTORY_CHARS)}]])assert.throws(()=>validateInput({...base,history:invalid}));
 assert.equal(canAddTurn(Array.from({length:12},()=>({question:'q',answer:'a'}))),false);
});

test('system-design follow-up retrieves the root design rather than losing the subject',()=>{
 const plan=buildGenerationPlan(validateInput({question:'How would you handle a timeout?',questionType:'system_design',history:[{question:'Design a payment system',answer:'Use idempotent intents.'}]}));
 assert.equal(plan.metadata.references[0].id,'payments');
 assert.equal(JSON.parse(plan.input).history[0].question,'Design a payment system');
});
