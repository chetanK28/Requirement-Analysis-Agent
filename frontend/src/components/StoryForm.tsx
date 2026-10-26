import {useState} from 'react';
import type {Provider, Story} from '../types';
import {extractDocument} from '../api/client';
export const example = 'As a registered customer, I want to reset my password using my verified email address so that I can regain access to my account.';
export function StoryForm({providers, busy, onAnalyze}:{providers:Provider[]; busy:boolean; onAnalyze:(s:Story)=>void}) {
 const [mode,setMode]=useState<'manual'|'document'>('manual');
 const [story,setStory]=useState(''),[documentText,setDocumentText]=useState('');
 const [criteria,setCriteria]=useState(''),[context,setContext]=useState(''),[provider,setProvider]=useState(''),[error,setError]=useState('');
 const [extracted,setExtracted]=useState(false);
 const [file,setFile]=useState<File|null>(null),[uploading,setUploading]=useState(false);
 const selected=provider||providers.find(p=>p.enabled)?.id||providers[0]?.id||'';
 const disabled=busy||uploading;
 const reviewedText=mode==='manual'?story:documentText;
 function selectFile(value:File|null){
  setFile(null);setDocumentText('');setExtracted(false);setError('');
  if(!value)return;
  if(value.name.toLowerCase().endsWith('.doc')){setError('Legacy .doc files are not supported. Save as .docx or use a text-based PDF.');return;}
  if(!/\.(pdf|docx)$/i.test(value.name)){setError('Choose a PDF (.pdf) or Word DOCX (.docx) file.');return;}
  if(value.size>10*1024*1024){setError('The file exceeds the 10 MB upload limit.');return;}
  if(!value.size){setError('The selected file is empty.');return;}
  setFile(value);
 }
 async function extract(){
  if(!file)return;setUploading(true);setExtracted(false);setError('');setDocumentText('');
  try{const result=await extractDocument(file);setDocumentText(result.text);setExtracted(true);}
  catch(e){setError(e instanceof Error?e.message:'Document extraction failed.');}
  finally{setUploading(false);}
 }
 return <form onSubmit={e=>{e.preventDefault();if(disabled)return;if(!reviewedText.trim()){setError(mode==='manual'?'Enter a user story.':'Extract and review the document text before analyzing.');return;}if(reviewedText.length>12000){setError('Keep the reviewed text within 12,000 characters.');return;}setError('');onAnalyze({user_story:reviewedText,acceptance_criteria:criteria,context,provider:selected});}}>
 <div className="section-heading"><h2>Describe the requirement</h2><button type="button" disabled={disabled} onClick={()=>{setMode('manual');setStory(example);setCriteria('');setContext('');setError('');}}>Load example</button></div>
 <fieldset className="input-mode"><legend>Input method</legend><label><input type="radio" name="input-method" checked={mode==='manual'} disabled={disabled} onChange={()=>{setMode('manual');setError('');}}/>Enter manually</label><label><input type="radio" name="input-method" checked={mode==='document'} disabled={disabled} onChange={()=>{setMode('document');setError('');}}/>Upload document</label></fieldset>
 {mode==='document'&&<section className="document-upload"><label>Choose a document<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={disabled} onChange={e=>selectFile(e.target.files?.[0]||null)}/></label><p className="small">PDF or DOCX, maximum 10 MB. Legacy .doc and OCR for scanned PDFs are not supported. Extracted text must fit 12,000 characters.</p>{file&&<p className="selected-file">Selected: {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}<button type="button" disabled={disabled||!file} onClick={extract}>{uploading?'Extracting text...':'Extract text'}</button>{uploading&&<p role="status">Uploading and extracting document text...</p>}<p className="small">Extraction does not contact the AI. Review and correct the preview before clicking Analyze. Only the reviewed text is sent for analysis.</p></section>}
 <label>{mode==='manual'?'User story':'Extracted text preview - review and edit'}<span>Required - up to 12,000 characters</span><textarea aria-label={mode==='manual'?'User story':'Extracted text preview'} maxLength={12000} rows={mode==='manual'?5:9} value={reviewedText} disabled={disabled||(mode==='document'&&!extracted)} onChange={e=>mode==='manual'?setStory(e.target.value):setDocumentText(e.target.value)} placeholder={mode==='manual'?'As a... I want... so that...':'Choose a document and click Extract text.'}/></label>
 {mode==='document'&&<p className="small">{documentText.length.toLocaleString()} / 12,000 characters. Extraction can change layout; check table order and wording.</p>}
 <label>Acceptance criteria <span>Optional</span><textarea maxLength={12000} rows={3} value={criteria} disabled={disabled} onChange={e=>setCriteria(e.target.value)}/></label>
 <label>Context <span>Optional</span><textarea maxLength={12000} rows={3} value={context} disabled={disabled} onChange={e=>setContext(e.target.value)}/></label>
 <label>LLM provider<select value={selected} disabled={disabled} onChange={e=>setProvider(e.target.value)}>{providers.map(p=><option key={p.id} value={p.id} disabled={!p.enabled}>{p.id==='openai'?'Capgemini GEP':p.id} - {p.model}{!p.enabled?' (configuration required)':''}</option>)}</select></label>
 {providers.length>0&&!providers.some(p=>p.enabled)&&<p className="notice">Configure GENERATIVE_ENGINE_API_KEY, GENERATIVE_ENGINE_BASE_URL and GENERATIVE_ENGINE_MODEL in backend/.env and restart the backend. Submitting will show the configuration error.</p>}
 {error&&<p role="alert">{error}</p>}
 <button className="primary" disabled={disabled||!selected||(mode==='document'&&!documentText.trim())} type="submit">{busy?'Analyzing…':'Analyze'}</button><p className="small">Source text is sent to the selected provider when you analyze. Every result requires human review.</p>
 </form>;
}