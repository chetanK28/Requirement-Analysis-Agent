import {useEffect,useState} from 'react';
import {getProviders,analyzeStory} from './api/client';
import {StoryForm} from './components/StoryForm';
import {AnalysisResults} from './components/AnalysisResults';
import type {Provider,Result,Story} from './types';
export default function App(){
 const [providers,setProviders]=useState<Provider[]>([]),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=()=>{setError('');getProviders().then(setProviders).catch(e=>setError(e.message));};
 useEffect(()=>{load();},[]);
 async function submit(story:Story){setBusy(true);setError('');setResult(null);try{setResult(await analyzeStory(story));}catch(e){setError(e instanceof Error?e.message:'Analysis failed.');}finally{setBusy(false);}}
 return <main><header><p className="eyebrow">FROM STORY TO SHARED UNDERSTANDING</p><h1>Requirement Analysis Agent</h1><p className="subtitle">Explore requirements, surface uncertainty, and shape a draft you can review.</p></header><div className="workspace"><StoryForm providers={providers} busy={busy} onAnalyze={submit}/><div aria-live="polite">{error&&<div role="alert" className="error">{error}{!providers.length&&<button onClick={load}>Retry connection</button>}</div>}{busy&&<div role="status" className="placeholder">Analyzing your story… This may take a minute.</div>}{result?<AnalysisResults result={result} onChange={setResult}/>:!busy&&<div className="placeholder"><h2>A clearer starting point</h2><p>Your draft will include functional requirements, non-functional requirements, risks, assumptions, and clarification questions.</p><p>Edit findings, record review decisions, and download your work.</p></div>}</div></div><footer>Drafts only · No database · Review changes are lost on refresh. Download to save them.</footer></main>;
}