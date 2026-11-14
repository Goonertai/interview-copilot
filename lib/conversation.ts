import type {HistoryTurn} from './conversation-context';

export type Conversation = {
  topicId: number;
  question: string;
  interim: string;
  buffer: string;
  bufferInterim: string;
  frozen: boolean;
  history: HistoryTurn[];
};
export function newConversation(topicId=0): Conversation {
  return {topicId,question:'',interim:'',buffer:'',bufferInterim:'',frozen:false,history:[]};
}
export type ConversationAction =
  | {type:'edit'; text:string}
  | {type:'speech'; final:string[]; interim:string}
  | {type:'edit_buffer'; text:string}
  | {type:'clear_interim'}
  | {type:'freeze'; question:string}
  | {type:'complete'; topicId:number; turn:HistoryTurn}
  | {type:'followup'; text?:string}
  | {type:'discard_buffer'}
  | {type:'retry'}
  | {type:'sample'; question:string}
  | {type:'next'};

export function conversationReducer(state:Conversation, action:ConversationAction):Conversation {
  switch(action.type){
    case 'edit':return state.frozen?state:{...state,question:action.text.slice(0,12000)};
    case 'speech':{
      const text=action.final.join(' ').trim();
      return state.frozen ? {...state,buffer:(state.buffer+' '+text).trim().slice(-12000),bufferInterim:action.interim.slice(-12000)}
        : {...state,question:(state.question+' '+text).trim().slice(0,12000),interim:action.interim.slice(0,12000)};
    }
    case 'edit_buffer':return {...state,buffer:action.text.slice(0,12000)};
    case 'clear_interim':return {...state,interim:'',bufferInterim:''};
    case 'freeze':return {...state,question:action.question,interim:'',bufferInterim:'',frozen:true};
    case 'complete':return action.topicId!==state.topicId ? state : {...state,history:[...state.history,action.turn]};
    case 'followup':return {...state,question:action.text??'',interim:'',buffer:'',bufferInterim:'',frozen:false};
    case 'discard_buffer':return {...state,buffer:'',bufferInterim:''};
    case 'retry':return {...state,frozen:false,interim:''};
    case 'sample':return state.frozen||state.history.length?state:{...state,question:action.question,interim:'',buffer:'',bufferInterim:''};
    case 'next':return newConversation(state.topicId+1);
  }
}
