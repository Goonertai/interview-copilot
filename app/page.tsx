"use client";
import {useEffect, useRef, useState} from 'react';
import {answerStyles, questionTypes, codingLanguages, type AnswerStyle, type QuestionType, type CodingLanguage} from '../lib/answer';
import {matchSystemDesignCases} from '../lib/system-design-cases';
import designCases from '../knowledge/system-design/index.json';
import AnswerContent from '../components/answer-content';
import {conversationReducer, newConversation, splitNextPartCommand, type ConversationAction} from '../lib/conversation';
import {canAddTurn} from '../lib/conversation-context';
import PartHistory from '../components/part-history';
type Result = {isFinal: boolean; [index: number]: {transcript: string}};
type Recognition = {continuous: boolean; interimResults: boolean; lang: string; onstart: (()=>void)|null; onend: (()=>void)|null; onerror: ((e:{error:string})=>void)|null; onresult: ((e:{resultIndex:number; results: ArrayLike<Result>})=>void)|null; start():void; abort():void};
type SpeechWindow = Window & {SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition};
const backgroundStorageKey = 'interview-copilot.background.v1';
export default function Home() {
 const [background,setBackground]=useState('');
 const conversationRef=useRef(newConversation());
 const [conversation,setConversation]=useState(conversationRef.current);
 const {question,interim,phase,actualAnswer,answerInterim,suggestedAnswer:answer,history,completedParts}=conversation;
 function updateConversation(action:ConversationAction){
  const next=conversationReducer(conversationRef.current,action);
  conversationRef.current=next;setConversation(next);
 }
 const contextAvailable=canAddTurn(history);
 const [targetRole,setTargetRole]=useState(''), [jobDescription,setJobDescription]=useState(''), [jdFilename,setJdFilename]=useState('');
 const [ieltsLevel,setIeltsLevel]=useState(6.5), [answerStyle,setAnswerStyle]=useState<AnswerStyle>('natural');
 const [questionType,setQuestionType]=useState<QuestionType>('general'), [codingLanguage,setCodingLanguage]=useState<CodingLanguage>('Python');
 const [answerMetadata,setAnswerMetadata]=useState<{model:string; references:Array<{id:string;title:string}>}|null>(null);
 const [backgroundReady,setBackgroundReady]=useState(false), [backgroundSaveStatus,setBackgroundSaveStatus]=useState('Loading saved background…');
 const [status,setStatus]=useState('Ready'), [error,setError]=useState(''), [listening,setListening]=useState(false), [busy,setBusy]=useState(false), [supported,setSupported]=useState(true);
 const rec=useRef<Recognition|null>(null), wanted=useRef(false), timer=useRef<ReturnType<typeof setTimeout>|null>(null), generation=useRef<AbortController|null>(null), attempts=useRef(0), connectRef=useRef<(()=>void)|null>(null);
 useEffect(()=>{setSupported(Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition));return ()=>{wanted.current=false;if(timer.current)clearTimeout(timer.current);rec.current?.abort();generation.current?.abort();};},[]);
 useEffect(()=>{
  try {
   const saved=window.localStorage.getItem(backgroundStorageKey);
   if(saved && saved.length<=40000)setBackground(saved);
  } catch {setBackgroundSaveStatus('Cannot access browser storage. Background is available for this session only.');}
  setBackgroundReady(true);
 },[]);
 useEffect(()=>{
  // Wait for restore before writing; the initial empty state must not erase saved text.
  if(!backgroundReady)return;
  try {
   if(background)window.localStorage.setItem(backgroundStorageKey,background);
   else window.localStorage.removeItem(backgroundStorageKey);
   setBackgroundSaveStatus(background?'Saved on this device · Auto-save on':'No background saved');
  } catch {setBackgroundSaveStatus('Changes could not be saved. Browser storage may be blocked or full; any previous saved background may remain.');}
 },[background,backgroundReady]);
 function resetRecognitionBoundary(){
  if(timer.current){clearTimeout(timer.current);timer.current=null;}
  const previous=rec.current;rec.current=null;
  if(previous){previous.onresult=null;previous.onend=null;previous.onerror=null;previous.onstart=null;previous.abort();}
  updateConversation({type:'clear_interim'});
  if(wanted.current)connectRef.current?.();
 }
 function stop(){wanted.current=false;resetRecognitionBoundary();setListening(false);setStatus('Paused');}
 function start(){
  if(wanted.current)return;
  const Ctor=(window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  if(!Ctor){setError('Use Google Chrome on desktop, or type the question below.');return;}
  setError('');wanted.current=true;attempts.current=0;setListening(true);setStatus('Connecting…');
  function connect(){
   if(!wanted.current)return;
   const r=new Ctor!();rec.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';
   r.onstart=()=>{if(wanted.current&&rec.current===r)setStatus('Listening');};
   r.onresult=e=>{
    if(!wanted.current||rec.current!==r)return;
    attempts.current=0;let draft='';const final:string[]=[];
    for(let i=e.resultIndex;i<e.results.length;i++){
     const result=e.results[i];
     if(result.isFinal){
      const command=splitNextPartCommand(result[0].transcript,conversationRef.current.phase);
      if(command.command){
       if(command.before)final.push(command.before);
       updateConversation({type:'speech',final,interim:''});nextPart();return;
      }
      final.push(result[0].transcript);
     }else draft+=result[0].transcript;
    }
    updateConversation({type:'speech',final,interim:draft});
   };
   r.onerror=e=>{if(!wanted.current||rec.current!==r)return;if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)){stop();setError(e.error==='audio-capture'?'No microphone found. Connect a microphone and try again.':'Speech recognition unavailable or permission denied. Check Chrome microphone permissions.');}else setStatus(e.error==='no-speech'?'Waiting for speech…':'Connection interrupted…');};
   r.onend=()=>{
    if(rec.current!==r)return;
    rec.current=null;updateConversation({type:'clear_interim'});
    if(wanted.current){attempts.current++;if(attempts.current>6){stop();setError('Repeated recognition failures. Check your network and microphone, then click Start Listening.');return;}setStatus('Reconnecting…');timer.current=setTimeout(connect,Math.min(500*2**(attempts.current-1),8000));}
   };
   try{r.start();}catch{stop();setError('Could not start recognition. Please try again.');}
  }
  connectRef.current=connect;connect();
 }
 function cancelGeneration(){
  const old=generation.current;generation.current=null;old?.abort();setBusy(false);
 }
 function endAnswer(){
  if(conversationRef.current.phase!=='answer')return;
  cancelGeneration();updateConversation({type:'end_answer'});resetRecognitionBoundary();setAnswerMetadata(null);setError('');
 }
 function nextPart(){
  cancelGeneration();updateConversation({type:'next'});resetRecognitionBoundary();setAnswerMetadata(null);setError('');
 }
 async function generate(retry=false){
  const current=conversationRef.current;
  if(generation.current||(!retry&&current.phase!=='question')||(retry&&current.phase!=='answer'))return;
  if(!canAddTurn(current.history)){setError('This Part has reached its context limit. Use Next Part to begin another Part.');return;}
  const snapshot=retry?current.question:(current.question+' '+current.interim).trim();
  if(!snapshot||(questionType==='general'&&!background.trim()))return;
  if(snapshot.length>12000){setError('The question exceeds 12,000 characters. Stop listening and shorten it before answering.');return;}
  const controller=new AbortController();generation.current=controller;
  setBusy(true);setError('');setAnswerMetadata(null);
  if(!retry){
   updateConversation({type:'begin_answer',question:snapshot});
   resetRecognitionBoundary();
   if(supported&&!wanted.current)start();
  }else updateConversation({type:'suggestion',topicId:current.topicId,turnId:current.turnId,text:''});
  let answerText='';
  try{
   const response=await fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:snapshot,history:current.history,background,targetRole,jobDescription,ieltsLevel,answerStyle,questionType,codingLanguage}),signal:controller.signal});
   if(generation.current!==controller)return;
   if(!response.ok){const data=await response.json();throw new Error(data.error || 'Generation failed.');}
   if(!response.body)throw new Error('No answer stream received.');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=false;
   while(true){
    const part=await reader.read();if(generation.current!==controller)return;
    buffer+=decoder.decode(part.value,{stream:!part.done});let end;
    while((end=buffer.indexOf('\n'))>=0){
     const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;
     const event=JSON.parse(line);if(event.error)throw new Error(event.error);
     if(event.metadata)setAnswerMetadata(event.metadata);
     if(event.delta){answerText+=event.delta;updateConversation({type:'suggestion',topicId:current.topicId,turnId:current.turnId,text:answerText});}
     if(event.done)done=true;
    }
    if(part.done)break;
   }
   if(!done||!answerText.trim())throw new Error('Suggestion stream interrupted or empty. You can still finish your spoken answer, or retry the suggestion.');
   if(generation.current===controller)updateConversation({type:'suggestion',topicId:current.topicId,turnId:current.turnId,text:answerText,complete:true});
  }catch(e){if(generation.current===controller&&!controller.signal.aborted){controller.abort();setError(e instanceof Error?e.message:'Suggestion failed. Your spoken answer can still be recorded.');}}
  finally{if(generation.current===controller){setBusy(false);generation.current=null;}}
 }
 async function upload(file?:File){if(!file)return;if(!file.name.toLowerCase().endsWith('.txt')||file.size>160000){setError('Choose a TXT file under 160 KB.');return;}try{const text=await file.text();if(text.length>40000)throw new Error('Background must be under 40,000 characters.');setBackground(text);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read file.');}}
 async function uploadJD(file?:File){if(!file)return;if(!file.name.toLowerCase().endsWith('.txt')||file.size>80000){setError('Choose a JD TXT file under 80 KB, or paste the JD text.');return;}try{const text=await file.text();if(text.length>20000)throw new Error('JD must be under 20,000 characters.');setJobDescription(text);setJdFilename(file.name);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read JD file.');}}
 return <main>
  <header><a className="brand" href="/">◉ <span>Interview Copilot</span></a><span className="badge">MVP</span></header>
  <section className="intro"><p className="eyebrow">YOUR INTERVIEW WORKSPACE</p><h1>Listen. Think. Answer.</h1><p>Capture the question. Shape an answer from your experience.</p></section>
  <div className="workspace"><aside className="card background"><div className="card-heading"><span className="step">01</span><h2>Your background</h2></div><p className="muted">Paste your resume and project notes, or load a TXT file. Automatically saved in this browser for next time.</p><label className="upload">↑ Load TXT<input aria-label="Upload background TXT" type="file" accept=".txt,text/plain" disabled={!backgroundReady} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label><label htmlFor="background" className="sr-only">Resume and background</label><textarea id="background" maxLength={40000} value={background} disabled={!backgroundReady} onChange={e=>setBackground(e.target.value)} placeholder="Your role, experience, projects, and achievements…"/><div className="footnote">{background.length.toLocaleString()} / 40,000 characters</div><p className="footnote" role="status">{backgroundSaveStatus}</p><button className="text-button" disabled={!backgroundReady||!background||busy} onClick={()=>setBackground('')}>Clear saved background</button>
   <div className="job-context"><label className="field-label" htmlFor="target-role">Target role <span>目标岗位 · Optional</span></label><input id="target-role" type="text" maxLength={300} value={targetRole} disabled={busy} onChange={e=>setTargetRole(e.target.value)} placeholder="e.g. Backend Engineer · Stripe"/>
   <label className="field-label" htmlFor="job-description">Job description <span>JD · Optional</span></label><label className={'upload '+(busy?'disabled':'')}>↑ Attach JD · TXT<input aria-label="Upload JD TXT" type="file" accept=".txt,text/plain" disabled={busy} onChange={e=>{void uploadJD(e.target.files?.[0]);e.target.value='';}}/></label>
   {jdFilename&&<div className="attachment">{jdFilename}<button className="text-button" disabled={busy} onClick={()=>{setJobDescription('');setJdFilename('');}}>Remove JD</button></div>}
   <textarea id="job-description" className="jd-text" maxLength={20000} disabled={busy} value={jobDescription} onChange={e=>{setJobDescription(e.target.value);setJdFilename('');}} placeholder="Paste the job description, or attach a TXT file…"/><div className="footnote">{jobDescription.length.toLocaleString()} / 20,000 characters · Session only</div></div>
  </aside>
  <div className="main-column"><section className="card"><div className="card-heading"><span className="step">02</span><h2>{questionTypes[questionType]}</h2><span className={'status '+(listening?'active':'')}><i/>{status}</span></div><div className="question-modes" role="group" aria-label="Question type">{Object.entries(questionTypes).map(([key,label])=><button key={key} className={questionType===key?'mode-button selected':'mode-button'} disabled={busy||phase==='answer'} aria-pressed={questionType===key} onClick={()=>{setQuestionType(key as QuestionType);setError('');}}>{label}</button>)}</div>
   <p className="muted">Live Transcript · Listen on computer B, or paste the complete problem below.</p>
   <p className="mode-note">{questionType==='general'?'Luna · Short spoken answers based on your background.':questionType==='coding'?'Sol · Clarify, optimize, prove, implement and test. Background is optional. Code is not executed.':'Sol · Scope, estimates, architecture and tradeoffs. Background is optional.'}</p>
   {questionType==='coding'&&<div className="coding-language"><label className="field-label" htmlFor="coding-language">Implementation language</label><select id="coding-language" value={codingLanguage} disabled={busy||phase==='answer'} onChange={e=>setCodingLanguage(e.target.value as CodingLanguage)}>{codingLanguages.map(language=><option key={language}>{language}</option>)}</select></div>}
   {questionType==='system_design'&&<div className="design-library"><p className="footnote">{matchSystemDesignCases([history[0]?.question,question,interim].filter(Boolean).join(' ')).length ? 'Reference patterns: '+matchSystemDesignCases([history[0]?.question,question,interim].filter(Boolean).join(' ')).map(entry=>entry.title).join(' · ') : 'No close library match yet · The general design framework will apply.'}</p><details><summary>Practice case library · {designCases.length} examples</summary><p className="footnote">Choose a sample before starting a Part. Use Next Part to start another large question.</p><div className="case-list">{designCases.map(entry=><button key={entry.id} disabled={busy||phase==='answer'||history.length>0} className="text-button" onClick={()=>{updateConversation({type:'sample',question:entry.sampleQuestion});resetRecognitionBoundary();setAnswerMetadata(null);setError('');}}>{entry.title}</button>)}</div></details></div>}
<div className="part-progress"><strong>Part {conversation.topicId+1} · Question {history.length+1}</strong><span>{phase==='question'?'Listening for a question':'Recording your answer'}</span></div>
<p className="part-help">Listen → Answer → speak → End Answer. Say “next part” on its own, or click Next Part, to start a new Part.</p>
<label className="field-label" htmlFor="question">{phase==='answer'?'Current question · locked':'Current question'}</label><textarea id="question" value={question} maxLength={12000} readOnly={phase==='answer'} onChange={e=>updateConversation({type:'edit',text:e.target.value})} placeholder="The next small question appears here. You can also type or edit it."/><p className="interim" aria-live="polite">{phase==='question'?(interim||'Waiting for the interviewer’s question…'):'New speech is recorded as your answer below.'}</p>
{phase==='answer'&&<section className="spoken-answer"><label className="field-label" htmlFor="actual-answer">Your spoken answer</label><p className="footnote">This is your actual transcript, separate from the AI suggestion. Edit it if recognition needs correction.</p><textarea id="actual-answer" value={actualAnswer} maxLength={40000} onChange={e=>updateConversation({type:'edit_answer',text:e.target.value})} placeholder="Your answer is recorded here while you speak. You can also type it."/><p className="interim" aria-live="polite">{answerInterim}</p><small>Click End Answer when you finish. Recording then returns to the next small question.</small></section>}
<div className="actions part-actions">{phase==='question'?<button className="primary" onClick={()=>void generate()} disabled={busy||!contextAvailable||!(question+interim).trim()||(questionType==='general'&&!background.trim())}>Answer <span>↗</span></button>:<button className="primary" onClick={endAnswer}>End Answer <span>✓</span></button>}<button className="secondary" onClick={nextPart}>Next Part</button><button className="text-button" onClick={listening?stop:start} disabled={!supported}>{listening?'Pause Listening':'Start Listening'}</button></div>
{!contextAvailable&&<p className="notice">Part context limit reached. Use Next Part to begin another Part. Recorded turns are kept for review.</p>}
{!supported&&<p className="notice">Speech recognition is unavailable. Use desktop Chrome, or type both questions and your answers.</p>}
<PartHistory history={history} completedParts={completedParts}/>
</section>
  <section className="card answer"><div className="card-heading"><span className="step">03</span><h2>Suggested Answer</h2><span className="answer-tag">ENGLISH</span></div>
  <div className="answer-settings"><div><label className="field-label" htmlFor="ielts-level">English level · IELTS</label><select id="ielts-level" value={ieltsLevel} disabled={busy} onChange={e=>setIeltsLevel(Number(e.target.value))}>{Array.from({length:9},(_,i)=>5+i*0.5).map(level=><option key={level} value={level}>IELTS {level.toFixed(1)}</option>)}</select></div><div><label className="field-label" htmlFor="answer-style">Answer style · 语言风格</label><select id="answer-style" value={answerStyle} disabled={busy} onChange={e=>setAnswerStyle(e.target.value as AnswerStyle)}>{Object.entries(answerStyles).map(([key,style])=><option key={key} value={key}>{style.label}</option>)}</select></div></div><p className="settings-note">Applies to your next answer. IELTS adjusts explanatory English, not code or technical depth. It is not a score prediction.</p>{answerMetadata&&<p className="footnote">Model: {answerMetadata.model}{answerMetadata.references.length>0 ? ' · Reference: '+answerMetadata.references.map(entry=>entry.title).join(', ') : ''}</p>}
  {answer?<div className="answer-text" aria-live="polite" aria-busy={busy}><AnswerContent text={answer}/>{busy&&<span className="cursor"/>}</div>:<div className="empty"><span>✧</span><p>{busy?'Preparing your answer…':questionType==='general'?'Your experience, clearly expressed.':'A structured solution, step by step.'}</p><small>{questionType==='general'?'Load your background and capture a question to begin.':'Paste or capture the complete technical question to begin.'}</small></div>}{busy&&<p className="footnote">You can speak while the suggestion generates. End Answer saves your transcript and stops any remaining generation.</p>}</section></div></div>
  {error&&<div className="error" role="alert">{error}{phase==='answer'&&!busy&&<button className="text-button" onClick={()=>void generate(true)}>Retry suggestion</button>}</div>}
  <footer>When you click Answer, your background, role, JD and current Part’s earlier questions, spoken answers and AI suggestions are sent to OpenAI. Earlier Parts are kept only for review in this tab and are excluded from the next Part’s context. Speech recognition may use Chrome’s online service. Use where assistance and recording are permitted.</footer>
 </main>;
}
