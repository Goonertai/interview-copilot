"use client";
import {useEffect, useRef, useState} from 'react';
import {answerStyles, type AnswerStyle} from '../lib/answer';
type Result = {isFinal: boolean; [index: number]: {transcript: string}};
type Recognition = {continuous: boolean; interimResults: boolean; lang: string; onstart: (()=>void)|null; onend: (()=>void)|null; onerror: ((e:{error:string})=>void)|null; onresult: ((e:{resultIndex:number; results: ArrayLike<Result>})=>void)|null; start():void; abort():void};
type SpeechWindow = Window & {SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition};
export default function Home() {
 const [background,setBackground]=useState(''), [question,setQuestion]=useState(''), [interim,setInterim]=useState(''), [answer,setAnswer]=useState('');
 const [targetRole,setTargetRole]=useState(''), [jobDescription,setJobDescription]=useState(''), [jdFilename,setJdFilename]=useState('');
 const [ieltsLevel,setIeltsLevel]=useState(6.5), [answerStyle,setAnswerStyle]=useState<AnswerStyle>('natural');
 const [status,setStatus]=useState('Ready'), [error,setError]=useState(''), [listening,setListening]=useState(false), [busy,setBusy]=useState(false), [supported,setSupported]=useState(true);
 const rec=useRef<Recognition|null>(null), wanted=useRef(false), timer=useRef<ReturnType<typeof setTimeout>|null>(null), generation=useRef<AbortController|null>(null), interimRef=useRef(''), attempts=useRef(0);
 useEffect(()=>{setSupported(Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition));return ()=>{wanted.current=false;if(timer.current)clearTimeout(timer.current);rec.current?.abort();generation.current?.abort();};},[]);
 function stop(){wanted.current=false;if(timer.current)clearTimeout(timer.current);rec.current?.abort();setListening(false);setStatus('Paused');setInterim('');interimRef.current='';}
 function start(){
  if(wanted.current)return;
  const Ctor=(window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  if(!Ctor){setError('Use Google Chrome on desktop, or type the question below.');return;}
  setError('');wanted.current=true;attempts.current=0;setListening(true);setStatus('Connecting…');
  function connect(){
   if(!wanted.current)return;
   const r=new Ctor!();rec.current=r;r.continuous=true;r.interimResults=true;r.lang='en-US';
   r.onstart=()=>{if(wanted.current)setStatus('Listening');};
   r.onresult=e=>{attempts.current=0;let draft='';for(let i=e.resultIndex;i<e.results.length;i++){const result=e.results[i];if(result.isFinal)setQuestion(q=>(q+' '+result[0].transcript).trim().slice(-12000));else draft+=result[0].transcript;}interimRef.current=draft;setInterim(draft);};
   r.onerror=e=>{if(!wanted.current)return;if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)){stop();setError(e.error==='audio-capture'?'No microphone found. Connect a microphone and try again.':'Speech recognition unavailable or permission denied. Check Chrome microphone permissions.');}else setStatus(e.error==='no-speech'?'Waiting for speech…':'Connection interrupted…');};
   r.onend=()=>{setInterim('');interimRef.current='';if(wanted.current){attempts.current++;if(attempts.current>6){stop();setError('Repeated recognition failures. Check your network and microphone, then click Start Listening.');return;}setStatus('Reconnecting…');timer.current=setTimeout(connect,Math.min(500*2**(attempts.current-1),8000));}};
   try{r.start();}catch{stop();setError('Could not start recognition. Please try again.');}
  }connect();
 }
 async function generate(){
  if(busy)return;
  const snapshot=(question+' '+interimRef.current).trim();if(!snapshot || !background.trim())return;
  setBusy(true);setError('');setAnswer('');const controller=new AbortController();generation.current=controller;
  try{
   const response=await fetch('/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:snapshot,background,targetRole,jobDescription,ieltsLevel,answerStyle}),signal:controller.signal});
   if(!response.ok){const data=await response.json();throw new Error(data.error || 'Generation failed.');}
   if(!response.body)throw new Error('No answer stream received.');
   const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=false;
   while(true){const part=await reader.read();buffer+=decoder.decode(part.value,{stream:!part.done});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line)continue;const event=JSON.parse(line);if(event.error)throw new Error(event.error);if(event.delta)setAnswer(a=>a+event.delta);if(event.done)done=true;}if(part.done)break;}
   if(!done)throw new Error('Answer stream interrupted. Please retry.');
  }catch(e){if(!controller.signal.aborted){controller.abort();setError(e instanceof Error?e.message:'Generation failed.');}}finally{setBusy(false);generation.current=null;}
 }
 async function upload(file?:File){if(!file)return;if(!file.name.toLowerCase().endsWith('.txt')||file.size>160000){setError('Choose a TXT file under 160 KB.');return;}try{const text=await file.text();if(text.length>40000)throw new Error('Background must be under 40,000 characters.');setBackground(text);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read file.');}}
 async function uploadJD(file?:File){if(!file)return;if(!file.name.toLowerCase().endsWith('.txt')||file.size>80000){setError('Choose a JD TXT file under 80 KB, or paste the JD text.');return;}try{const text=await file.text();if(text.length>20000)throw new Error('JD must be under 20,000 characters.');setJobDescription(text);setJdFilename(file.name);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not read JD file.');}}
 return <main>
  <header><a className="brand" href="/">◉ <span>Interview Copilot</span></a><span className="badge">MVP</span></header>
  <section className="intro"><p className="eyebrow">YOUR INTERVIEW WORKSPACE</p><h1>Listen. Think. Answer.</h1><p>Capture the question. Shape an answer from your experience.</p></section>
  <div className="workspace"><aside className="card background"><div className="card-heading"><span className="step">01</span><h2>Your background</h2></div><p className="muted">Paste your resume and project notes, or load a TXT file.</p><label className="upload">↑ Load TXT<input aria-label="Upload background TXT" type="file" accept=".txt,text/plain" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label><label htmlFor="background" className="sr-only">Resume and background</label><textarea id="background" maxLength={40000} value={background} onChange={e=>setBackground(e.target.value)} placeholder="Your role, experience, projects, and achievements…"/><div className="footnote">{background.length.toLocaleString()} / 40,000 characters · Session only</div>
   <div className="job-context"><label className="field-label" htmlFor="target-role">Target role <span>目标岗位 · Optional</span></label><input id="target-role" type="text" maxLength={300} value={targetRole} disabled={busy} onChange={e=>setTargetRole(e.target.value)} placeholder="e.g. Backend Engineer · Stripe"/>
   <label className="field-label" htmlFor="job-description">Job description <span>JD · Optional</span></label><label className={'upload '+(busy?'disabled':'')}>↑ Attach JD · TXT<input aria-label="Upload JD TXT" type="file" accept=".txt,text/plain" disabled={busy} onChange={e=>{void uploadJD(e.target.files?.[0]);e.target.value='';}}/></label>
   {jdFilename&&<div className="attachment">{jdFilename}<button className="text-button" disabled={busy} onClick={()=>{setJobDescription('');setJdFilename('');}}>Remove JD</button></div>}
   <textarea id="job-description" className="jd-text" maxLength={20000} disabled={busy} value={jobDescription} onChange={e=>{setJobDescription(e.target.value);setJdFilename('');}} placeholder="Paste the job description, or attach a TXT file…"/><div className="footnote">{jobDescription.length.toLocaleString()} / 20,000 characters · Session only</div></div>
  </aside>
  <div className="main-column"><section className="card"><div className="card-heading"><span className="step">02</span><h2>Live Transcript</h2><span className={'status '+(listening?'active':'')}><i/>{status}</span></div><p className="muted">Play the question on computer A. Listen here on computer B.</p><label className="sr-only" htmlFor="question">Current interview question</label><textarea id="question" value={question} maxLength={12000} onChange={e=>setQuestion(e.target.value)} placeholder="The interview question will appear here. You can also type or edit it."/><p className="interim" aria-live="polite">{interim || 'English · microphone stays on between questions'}</p><div className="actions"><button className="secondary" onClick={listening?stop:start} disabled={!supported}>{listening?'Stop Listening':'Start Listening'}</button><button className="primary" onClick={()=>void generate()} disabled={busy||!(question+interim).trim()||!background.trim()}>{busy?'Generating…':'Generate Answer'}<span>↗</span></button><button className="text-button" disabled={busy} onClick={()=>{setQuestion('');setInterim('');interimRef.current='';rec.current?.abort();setAnswer('');setError('');}}>Next Question</button></div>{!supported&&<p className="notice">Speech recognition is unavailable. Open in desktop Chrome, or type a question.</p>}</section>
  <section className="card answer"><div className="card-heading"><span className="step">03</span><h2>Suggested Answer</h2><span className="answer-tag">ENGLISH</span></div>
  <div className="answer-settings"><div><label className="field-label" htmlFor="ielts-level">English level · IELTS</label><select id="ielts-level" value={ieltsLevel} disabled={busy} onChange={e=>setIeltsLevel(Number(e.target.value))}>{Array.from({length:9},(_,i)=>5+i*0.5).map(level=><option key={level} value={level}>IELTS {level.toFixed(1)}</option>)}</select></div><div><label className="field-label" htmlFor="answer-style">Answer style · 语言风格</label><select id="answer-style" value={answerStyle} disabled={busy} onChange={e=>setAnswerStyle(e.target.value as AnswerStyle)}>{Object.entries(answerStyles).map(([key,style])=><option key={key} value={key}>{style.label}</option>)}</select></div></div><p className="settings-note">Applies to your next answer. IELTS controls vocabulary and sentence complexity; it is not a score prediction.</p>
  {answer?<div className="answer-text" aria-live="polite" aria-busy={busy}>{answer}{busy&&<span className="cursor"/>}</div>:<div className="empty"><span>✧</span><p>{busy?'Preparing your answer…':'Your experience, clearly expressed.'}</p><small>Load your background and capture a question to begin.</small></div>}{busy&&<button className="text-button" onClick={()=>generation.current?.abort()}>Stop generating</button>}</section></div></div>
  {error&&<div className="error" role="alert">{error}</div>}
  <footer>Background, role, JD and answer preferences are sent to OpenAI with your question when you generate. Speech recognition may use Chrome’s online service. Use where assistance and recording are permitted.</footer>
 </main>;
}
