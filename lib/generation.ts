import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildInstructions, type AnswerInput} from './answer';
import {matchSystemDesignCases} from './system-design-cases';

const documents = new Map<string,string>();
function readDocument(kind: 'prompt' | 'case', filename: string) {
  const path = kind === 'prompt' ? join(process.cwd(),'prompts',filename)
    : join(process.cwd(),'knowledge','system-design',filename);
  if (!documents.has(path)) documents.set(path,readFileSync(path,'utf8'));
  return documents.get(path)!;
}

export function buildGenerationPlan(input: AnswerInput) {
  const technical = input.questionType !== 'general';
  const references = input.questionType === 'system_design' ? matchSystemDesignCases(input.question) : [];
  const format = input.questionType === 'coding' ? readDocument('prompt','coding-amazon.md')
    : input.questionType === 'system_design' ? readDocument('prompt','system-design.md') : '';
  return {
    model: technical ? 'gpt-6.1-sol' : 'gpt-6-luna',
    reasoning: {effort: technical ? 'medium' as const : 'none' as const},
    max_output_tokens: technical ? 25000 : 900,
    instructions: buildInstructions(input) + (format ? '\n\nTechnical answer format:\n'+format : ''),
    input: JSON.stringify({...input,referenceCases: references.map(entry => ({
      id:entry.id,title:entry.title,example:readDocument('case',entry.file)
    }))}),
    metadata: {questionType:input.questionType,model:technical?'gpt-6.1-sol':'gpt-6-luna',references:references.map(({id,title})=>({id,title}))}
  };
}
