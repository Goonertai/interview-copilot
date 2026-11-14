import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationReducer as reduce,newConversation,splitNextPartCommand} from '../lib/conversation';
import {canAddTurn,MAX_HISTORY_CHARS} from '../lib/conversation-context';
import {validateInput,buildInstructions} from '../lib/answer';
import {buildGenerationPlan} from '../lib/generation';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Home from '../app/page';
import PartHistory from '../components/part-history';

function begin(question='Design a payment system'){
 let state=newConversation();
 state=reduce(state,{type:'edit',text:question});
 return reduce(state,{type:'begin_answer',question});
}
test('Answer switches speech from interviewer question to actual candidate answer',()=>{
 let state=newConversation();
 state=reduce(state,{type:'speech',final:['Design a payment system'],interim:'with retries'});
 state=reduce(state,{type:'begin_answer',question:state.question+' '+state.interim});
 state=reduce(state,{type:'speech',final:['I would use stable idempotency keys.'],interim:'Then I would'});
 assert.equal(state.question,'Design a payment system with retries');assert.equal(state.interim,'');
 assert.equal(state.actualAnswer,'I would use stable idempotency keys.');assert.equal(state.answerInterim,'Then I would');
 state=reduce(state,{type:'edit',text:'accidental question edit'});assert.equal(state.question,'Design a payment system with retries');
 state=reduce(state,{type:'clear_interim'});assert.equal(state.actualAnswer,'I would use stable idempotency keys. Then I would');
});
test('AI completion alone does not save a spoken answer; End Answer saves both separately',()=>{
 let state=begin();
 state=reduce(state,{type:'suggestion',topicId:state.topicId,turnId:state.turnId,text:'Use a ledger and an outbox.',complete:true});
 assert.equal(state.history.length,0);assert.equal(state.actualAnswer,'');
 state=reduce(state,{type:'speech',final:['I would start with payment intents.'],interim:'and reconciliation'});
 state=reduce(state,{type:'end_answer'});
 assert.equal(state.phase,'question');assert.equal(state.question,'');assert.equal(state.actualAnswer,'');
 assert.equal(state.history[0].answer,'I would start with payment intents. and reconciliation');
 assert.equal(state.history[0].answerSource,'candidate');assert.equal(state.history[0].suggestedAnswer,'Use a ledger and an outbox.');assert.equal(state.history[0].suggestionComplete,true);
 state=reduce(state,{type:'speech',final:['What happens on a timeout?'],interim:''});
 assert.equal(state.question,'What happens on a timeout?');assert.equal(state.history.length,1);
 const plan=buildGenerationPlan(validateInput({question:state.question,questionType:'system_design',history:state.history}));
 assert.equal(plan.metadata.references[0].id,'payments');assert.equal(JSON.parse(plan.input).history[0].answerSource,'candidate');
 assert.match(plan.instructions,/must never be mistaken for what the candidate said/);
});
test('ending before generation completes saves a partial suggestion and rejects late deltas',()=>{
 let state=begin();const topicId=state.topicId,turnId=state.turnId;
 state=reduce(state,{type:'suggestion',topicId,turnId,text:'Partial suggestion'});
 state=reduce(state,{type:'edit_answer',text:'My actual answer'});
 state=reduce(state,{type:'end_answer'});
 assert.equal(state.history[0].suggestionComplete,false);assert.equal(state.history[0].answer,'My actual answer');
 state=reduce(state,{type:'begin_answer',question:'Why this approach?'});
 state=reduce(state,{type:'suggestion',topicId,turnId,text:'Late old answer',complete:true});
 assert.equal(state.suggestedAnswer,'');
});
test('Next Part closes the active answer, archives old turns, and starts an isolated Part',()=>{
 let state=begin();const oldTopic=state.topicId;
 state=reduce(state,{type:'speech',final:['A durable ledger'],interim:'with reconciliation'});
 state=reduce(state,{type:'next'});
 assert.equal(state.topicId,1);assert.equal(state.phase,'question');assert.deepEqual(state.history,[]);
 assert.equal(state.completedParts[0].number,1);assert.equal(state.completedParts[0].history[0].answer,'A durable ledger with reconciliation');
 state=reduce(state,{type:'begin_answer',question:'Tell me about a project'});
 state=reduce(state,{type:'suggestion',topicId:oldTopic,turnId:0,text:'Late previous Part'});assert.equal(state.suggestedAnswer,'');
 const input=validateInput({question:state.question,background:'Developer',history:state.history});
 assert.deepEqual(JSON.parse(buildGenerationPlan(input).input).history,[]);
});
test('next part voice command excludes the command text and ignores ordinary mentions',()=>{
 for(const text of ['next part','Next Part.',' NEXT   PART! '])assert.equal(splitNextPartCommand(text,'question').command,true);
 assert.deepEqual(splitNextPartCommand('That is my answer. Next part.','answer'),{command:true,before:'That is my answer.'});
 for(const text of ['What is the next part of this design?','I will cover this in the next part','next partition','Please compare the next part with this one'])assert.equal(splitNextPartCommand(text,'answer').command,false,text);
 assert.equal(splitNextPartCommand('That is my answer. Next part.','question').command,false);
 let state=begin();const command=splitNextPartCommand('My answer is idempotency. Next part.','answer');
 state=reduce(state,{type:'speech',final:[command.before],interim:''});state=reduce(state,{type:'next'});
 assert.equal(state.completedParts[0].history[0].answer,'My answer is idempotency.');
});
test('missing candidate speech is explicit, never replaced by the suggestion; empty ending is idempotent',()=>{
 let state=begin();state=reduce(state,{type:'suggestion',topicId:state.topicId,turnId:state.turnId,text:'AI-only text',complete:true});state=reduce(state,{type:'end_answer'});
 assert.equal(state.history[0].answer,'');assert.equal(state.history[0].suggestedAnswer,'AI-only text');
 assert.deepEqual(validateInput({question:'Why?',questionType:'coding',history:state.history}).history,state.history);
 state=reduce(state,{type:'end_answer'});assert.equal(state.history.length,1);
});
test('Part history validates sources, budgets, suggestion status and legacy requests',()=>{
 const base={question:'Why that choice?',questionType:'coding'};
 const legacy=validateInput({...base,history:[{question:' original ',answer:' previous ',role:'system'}]});
 assert.deepEqual(legacy.history,[{question:'original',answer:'previous'}]);
 assert.match(buildInstructions(legacy),/previous generated answer does not prove/);
 for(const history of [null,{},[{question:'q'}],[{question:'',answer:'a'}],[{question:'q',answer:1}],[{question:'q',answer:''}],[{question:'q',answer:'a',answerSource:'system'}],[{question:'q',answer:'a',suggestedAnswer:1}],[{question:'q',answer:'a',suggestionComplete:'yes'}],Array.from({length:31},()=>({question:'q',answer:'a'})),[{question:'q',answer:'a'.repeat(120000),suggestedAnswer:'b'.repeat(120000)}]])assert.throws(()=>validateInput({...base,history}));
 assert.equal(canAddTurn(Array.from({length:30},()=>({question:'q',answer:'a'}))),false);
 assert.equal(canAddTurn([{question:'q',answer:'a',suggestedAnswer:'b'.repeat(MAX_HISTORY_CHARS)}]),false);
});
test('initial interface uses the simple Part controls and history labels actual speech honestly',()=>{
 const page=renderToStaticMarkup(createElement(Home));
 assert.match(page,/Next Part/);assert.match(page,/Answer <span/);assert.match(page,/Part 1/);
 assert.doesNotMatch(page,/Capture Follow-up|Use Buffer as Follow-up|Discard Buffer|Next Question/);
 const history=renderToStaticMarkup(createElement(PartHistory,{history:[{question:'Question',answer:'',answerSource:'candidate',suggestedAnswer:'AI words only',suggestionComplete:false}],completedParts:[]}));
 assert.match(history,/No spoken answer was captured/);assert.match(history,/AI suggestion/);assert.match(history,/partial/);
});
