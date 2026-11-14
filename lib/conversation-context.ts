export type HistoryTurn = {
  question:string;
  answer:string;
  answerSource?:'candidate'|'suggested';
  suggestedAnswer?:string;
  suggestionComplete?:boolean;
};
export const MAX_HISTORY_TURNS=30;
export const MAX_HISTORY_CHARS=240000;
export function historySize(history:HistoryTurn[]){
  return history.reduce((sum,turn)=>sum+turn.question.length+turn.answer.length+(turn.suggestedAnswer?.length??0),0);
}
export function validateHistory(value:unknown):HistoryTurn[]{
  if(!Array.isArray(value)||value.length>MAX_HISTORY_TURNS)throw new Error('A Part can contain up to 30 answers. Use Next Part to begin another Part.');
  const result:HistoryTurn[]=value.map(turn=>{
    if(!turn||typeof turn!=='object'||typeof turn.question!=='string'||typeof turn.answer!=='string'||!turn.question.trim()||turn.question.length>12000||turn.answer.length>120000)throw new Error('Invalid Part history.');
    if(turn.answerSource!==undefined&&!['candidate','suggested'].includes(turn.answerSource))throw new Error('Invalid answer source.');
    if(!turn.answer.trim()&&turn.answerSource!=='candidate')throw new Error('Invalid Part history.');
    if(turn.suggestedAnswer!==undefined&&(typeof turn.suggestedAnswer!=='string'||turn.suggestedAnswer.length>120000))throw new Error('Invalid suggested answer history.');
    if(turn.suggestionComplete!==undefined&&typeof turn.suggestionComplete!=='boolean')throw new Error('Invalid suggestion status.');
    return {
      question:turn.question.trim(),answer:turn.answer.trim(),
      ...(turn.answerSource!==undefined?{answerSource:turn.answerSource}:{}),
      ...(turn.suggestedAnswer!==undefined?{suggestedAnswer:turn.suggestedAnswer.trim()}:{}),
      ...(turn.suggestionComplete!==undefined?{suggestionComplete:turn.suggestionComplete}:{})
    };
  });
  if(historySize(result)>MAX_HISTORY_CHARS)throw new Error('This Part has reached its context limit. Use Next Part to begin another Part.');
  return result;
}
export function canAddTurn(history:HistoryTurn[]){return history.length<MAX_HISTORY_TURNS&&historySize(history)<MAX_HISTORY_CHARS;}
