import {useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {AnalysisResults} from '../components/AnalysisResults';
import {hasAssessment, type Result} from '../types';
import {markdown} from '../export';
const result:Result={provider:'openai',model:'test',status:'draft',warnings:[],analysis:{functional_requirements:[],non_functional_requirements:[],risks:[],assumptions:[],clarification_questions:[]},complexity_score:4,complexity_label:'High',complexity_reasons:['Two integrations in original criteria'],readiness_score:4,readiness_label:'Mostly clear',readiness_gaps:['Failure handling unclear']};
function Harness({initial=result}:{initial?:Result}){const [r,setR]=useState(initial);return <AnalysisResults result={r} onChange={setR}/>;}
it('renders assessment and submits session feedback',()=>{
 render(<Harness/>);
 expect(screen.getByText('Complexity: 4/5 - High')).toBeInTheDocument();expect(screen.getByText('Readiness: 4/5 - Mostly clear')).toBeInTheDocument();expect(screen.getByText('Failure handling unclear')).toBeInTheDocument();
 fireEvent.click(screen.getByText('Submit feedback'));expect(screen.getByRole('alert')).toHaveTextContent('Select a usefulness rating');
 fireEvent.change(screen.getByLabelText('Was this analysis useful?'),{target:{value:'5'}});fireEvent.change(screen.getByLabelText('Optional comment'),{target:{value:'Clear and useful'}});fireEvent.click(screen.getByText('Submit feedback'));
 expect(screen.getByRole('status')).toHaveTextContent('Submitted usefulness rating: 5/5 - Clear and useful');
});
it('handles missing assessment without inventing scores',()=>{
 const legacy={...result,complexity_score:undefined};render(<Harness initial={legacy}/>);expect(screen.getByRole('alert')).toHaveTextContent('missing or invalid');expect(markdown(legacy)).toContain('no scores assumed');
 expect(hasAssessment({...result,readiness_score:6})).toBe(false);expect(hasAssessment({...result,complexity_label:'Low'})).toBe(false);
});
it('exports scores, gaps and feedback in Markdown and JSON',()=>{
 const reviewed={...result,feedback:{rating:4,comment:'Useful context'}};const md=markdown(reviewed);expect(md).toContain('AI estimates');expect(md).toContain('Two integrations');expect(md).toContain('Failure handling unclear');expect(md).toContain('Was this analysis useful? 4/5');expect(md).toContain('Useful context');const saved=JSON.parse(JSON.stringify(reviewed));expect(saved.feedback.rating).toBe(4);expect(saved.complexity_score).toBe(4);
});
it('supports empty gaps without guaranteeing readiness',()=>{
 render(<Harness initial={{...result,readiness_gaps:[]}}/>);expect(screen.getByText(/No gaps identified by the AI/)).toHaveTextContent('human review');
});