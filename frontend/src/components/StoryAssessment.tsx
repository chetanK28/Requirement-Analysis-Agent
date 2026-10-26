import {useState} from 'react';
import {hasAssessment,type Result} from '../types';
export function StoryAssessment({result,onChange}:{result:Result;onChange:(r:Result)=>void}) {
 const [rating,setRating]=useState(result.feedback?.rating.toString()||'');
 const [comment,setComment]=useState(result.feedback?.comment||'');
 const [error,setError]=useState('');
 const valid=hasAssessment(result);
 return <section aria-labelledby="assessment-heading" className="story-assessment">
  <h2 id="assessment-heading">Story Assessment</h2>
  <p className="notice">AI estimates based on the original story, acceptance criteria and context. A person should review these scores; accuracy is not guaranteed. Finding edits do not recalculate the assessment.</p>
  {valid?<><div className="assessment-scores"><article className="finding"><h3>Complexity: {result.complexity_score}/5 - {result.complexity_label}</h3><ul>{result.complexity_reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul></article>
  <article className="finding"><h3>Readiness: {result.readiness_score}/5 - {result.readiness_label}</h3><h4>Missing or ambiguous details</h4>{result.readiness_gaps.length?<ul>{result.readiness_gaps.map((gap,i)=><li key={i}>{gap}</li>)}</ul>:<p>No gaps identified by the AI; human review is still required.</p>}</article></div></>:<p role="alert">Story Assessment is missing or invalid. Restart the updated backend and analyze again; no scores have been assumed.</p>}
  <form className="feedback-form" onSubmit={e=>{e.preventDefault();const score=Number(rating);if(!Number.isInteger(score)||score<1||score>5){setError('Select a usefulness rating from 1 to 5.');return;}setError('');onChange({...result,feedback:{rating:score,comment:comment.trim()}});}}>
   <h3>Reviewer feedback</h3><label>Was this analysis useful?<select value={rating} onChange={e=>setRating(e.target.value)}><option value="">Select a rating</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} - {n===1?'Not useful':n===5?'Very useful':'Usefulness rating'}</option>)}</select></label>
   <label>Optional comment<textarea rows={3} maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)}/></label>
   {error&&<p role="alert">{error}</p>}<button type="submit">Submit feedback</button>
   {result.feedback&&<p role="status">Submitted usefulness rating: {result.feedback.rating}/5{result.feedback.comment&&` - ${result.feedback.comment}`}</p>}
   <p className="small">Feedback stays in this page session and is included in downloads. Refreshing or starting a new analysis clears it. Export again after submitting feedback.</p>
  </form>
 </section>;
}