import {Fragment} from 'react';

// Render only our small Markdown subset. Text is always escaped by React;
// raw HTML, scripts and arbitrary URL links are never interpreted.
function prose(value: string, prefix: number) {
  const lines=value.split('\n');
  const blocks=[];
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if(line.trim().startsWith('|') && i+1<lines.length && /^\s*\|?[\s:|-]+\|\s*$/.test(lines[i+1])) {
      const cells=(row:string)=>row.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
      const headers=cells(line),rows=[];i+=2;
      while(i<lines.length && lines[i].trim().startsWith('|')){rows.push(cells(lines[i]));i++;}i--;
      blocks.push(<div className="answer-table" key={`${prefix}-${i}`}><table><thead><tr>{headers.map((cell,j)=><th key={j}>{cell}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((cell,k)=><td key={k}>{cell}</td>)}</tr>)}</tbody></table></div>);
    } else if(/^#{1,6}\s/.test(line)) blocks.push(<h3 key={`${prefix}-${i}`}>{line.replace(/^#{1,6}\s+/,'')}</h3>);
    else blocks.push(<Fragment key={`${prefix}-${i}`}>{line}{i<lines.length-1?'\n':''}</Fragment>);
  }
  return blocks;
}
export default function AnswerContent({text}:{text:string}) {
  const pieces=text.split(/^```/m);
  return <>{pieces.map((part,i)=>{
    if(i%2===0)return <Fragment key={i}>{prose(part,i)}</Fragment>;
    const newline=part.indexOf('\n'),language=newline<0?part:part.slice(0,newline).trim();
    return <div className="code-block" key={i}><div className="code-language">{language || 'Code'}</div><pre><code>{newline<0?'':part.slice(newline+1)}</code></pre></div>;
  })}</>;
}
