export type HistoryTurn = {question: string; answer: string};
export const MAX_HISTORY_TURNS = 12;
export const MAX_HISTORY_CHARS = 120000;

export function validateHistory(value: unknown): HistoryTurn[] {
  if (!Array.isArray(value) || value.length > MAX_HISTORY_TURNS) throw new Error('A topic can contain up to 12 completed answers. Click Next Question to start a new topic.');
  let total=0;
  return value.map(turn=>{
    if(!turn || typeof turn!=='object' || typeof turn.question!=='string' || typeof turn.answer!=='string' || !turn.question.trim() || !turn.answer.trim() || turn.question.length>12000 || turn.answer.length>120000) throw new Error('Invalid question history.');
    total+=turn.question.length+turn.answer.length;
    if(total>MAX_HISTORY_CHARS)throw new Error('This topic has reached its context limit. Click Next Question to start a new topic.');
    return {question:turn.question.trim(),answer:turn.answer.trim()};
  });
}

export function canAddTurn(history: HistoryTurn[]) {
  return history.length<MAX_HISTORY_TURNS && history.reduce((sum,turn)=>sum+turn.question.length+turn.answer.length,0)<MAX_HISTORY_CHARS;
}
