import type {HistoryTurn} from './conversation-context';

export type CompletedPart = {number:number; history:HistoryTurn[]};
export type Conversation = {
  topicId:number;
  turnId:number;
  phase:'question'|'answer';
  question:string;
  interim:string;
  actualAnswer:string;
  answerInterim:string;
  suggestedAnswer:string;
  suggestionComplete:boolean;
  history:HistoryTurn[];
  completedParts:CompletedPart[];
};
export function newConversation(topicId=0,completedParts:CompletedPart[]=[]):Conversation {
  return {topicId,turnId:0,phase:'question',question:'',interim:'',actualAnswer:'',answerInterim:'',suggestedAnswer:'',suggestionComplete:false,history:[],completedParts};
}
export type ConversationAction =
  | {type:'edit';text:string}
  | {type:'edit_answer';text:string}
  | {type:'speech';final:string[];interim:string}
  | {type:'clear_interim'}
  | {type:'begin_answer';question:string}
  | {type:'suggestion';topicId:number;turnId:number;text:string;complete?:boolean}
  | {type:'end_answer'}
  | {type:'sample';question:string}
  | {type:'next'};

function finishAnswer(state:Conversation):Conversation {
  if(state.phase!=='answer')return state;
  const turn:HistoryTurn={
    question:state.question,
    answer:(state.actualAnswer+' '+state.answerInterim).trim(),
    answerSource:'candidate',
    suggestedAnswer:state.suggestedAnswer,
    suggestionComplete:state.suggestionComplete
  };
  return {...state,turnId:state.turnId+1,phase:'question',question:'',interim:'',actualAnswer:'',answerInterim:'',suggestedAnswer:'',suggestionComplete:false,history:[...state.history,turn]};
}
export function conversationReducer(state:Conversation,action:ConversationAction):Conversation {
  switch(action.type){
    case 'edit':return state.phase==='question'?{...state,question:action.text.slice(0,12000)}:state;
    case 'edit_answer':return state.phase==='answer'?{...state,actualAnswer:action.text.slice(0,40000)}:state;
    case 'speech':{
      const text=action.final.join(' ').trim();
      return state.phase==='answer'
        ? {...state,actualAnswer:(state.actualAnswer+' '+text).trim().slice(0,40000),answerInterim:action.interim.slice(0,40000)}
        : {...state,question:(state.question+' '+text).trim().slice(0,12000),interim:action.interim.slice(0,12000)};
    }
    case 'clear_interim':{
      // Preserve unfinished recognition before a reconnect or manual pause.
      return state.phase==='answer'
        ? {...state,actualAnswer:(state.actualAnswer+' '+state.answerInterim).trim().slice(0,40000),answerInterim:''}
        : {...state,question:(state.question+' '+state.interim).trim().slice(0,12000),interim:''};
    }
    case 'begin_answer':return state.phase==='answer'?state:{...state,phase:'answer',question:action.question,interim:'',actualAnswer:'',answerInterim:'',suggestedAnswer:'',suggestionComplete:false};
    case 'suggestion':return state.phase!=='answer'||action.topicId!==state.topicId||action.turnId!==state.turnId?state:{...state,suggestedAnswer:action.text,suggestionComplete:action.complete??false};
    case 'end_answer':return finishAnswer(state);
    case 'sample':return state.phase==='answer'||state.history.length?state:{...state,question:action.question,interim:''};
    case 'next':{
      const finished=finishAnswer(state);
      const archive=finished.history.length?[...finished.completedParts,{number:state.topicId+1,history:finished.history}]:finished.completedParts;
      return newConversation(state.topicId+1,archive);
    }
  }
}

// Only finalized commands trigger navigation. Do not match incidental mentions
// such as "the next part of the design". A command appended to an answer needs
// an explicit sentence boundary; otherwise say "next part" as a separate phrase.
export function splitNextPartCommand(text:string,phase:Conversation['phase']):{command:boolean;before:string} {
  if(/^\s*next\s+part[.!?,]*\s*$/i.test(text))return {command:true,before:''};
  if(phase==='answer'){
    const match=text.match(/^([\s\S]*?[.!?])\s+next\s+part[.!?,]*\s*$/i);
    if(match)return {command:true,before:match[1].trim()};
  }
  return {command:false,before:text};
}
