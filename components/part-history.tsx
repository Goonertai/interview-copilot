import type {HistoryTurn} from '../lib/conversation-context';
import type {CompletedPart} from '../lib/conversation';
import AnswerContent from './answer-content';
function Turns({turns}:{turns:HistoryTurn[]}){
  return <>{turns.map((turn,i)=><details key={i} className="history-turn"><summary>{i+1}. {turn.question.slice(0,100)}</summary><p className="history-question">{turn.question}</p><h4>Your spoken answer</h4><div className="history-answer">{turn.answerSource==='candidate'?(turn.answer||'No spoken answer was captured.'):'No candidate transcript was recorded for this earlier turn.'}</div>{(turn.suggestedAnswer||turn.answerSource!=='candidate')&&<details className="saved-suggestion"><summary>AI suggestion{turn.suggestionComplete===false?' · partial':''}</summary><div className="history-answer"><AnswerContent text={turn.suggestedAnswer??turn.answer}/></div></details>}</details>)}</>;
}
export default function PartHistory({history,completedParts}:{history:HistoryTurn[];completedParts:CompletedPart[]}){
 return <>{history.length>0&&<details className="topic-history"><summary>This Part · {history.length} saved answers</summary><Turns turns={history}/></details>}{completedParts.length>0&&<details className="topic-history"><summary>Earlier Parts · {completedParts.length} · review only</summary>{completedParts.map(part=><details key={part.number}><summary>Part {part.number} · {part.history.length} answers</summary><Turns turns={part.history}/></details>)}</details>}</>;
}
