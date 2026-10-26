export const sections = ['functional_requirements', 'non_functional_requirements', 'risks', 'assumptions', 'clarification_questions'] as const;
export type Section = typeof sections[number];
export const labels: Record<Section, string> = {functional_requirements:'Functional requirements', non_functional_requirements:'Non-functional requirements', risks:'Risks', assumptions:'Assumptions', clarification_questions:'Clarification questions'};
export type Finding = {id:string; title:string; description:string; evidence:string[]; classification:'explicit'|'inferred'; review?:'pending'|'accepted'|'rejected'};
export type Result = Partial<StoryAssessment> & {feedback?:ReviewerFeedback; provider:string; model:string; status:'draft'; warnings:string[]; analysis:Record<Section,Finding[]>};
export type Provider = {id:string; model:string; enabled:boolean};
export type Story = {user_story:string; acceptance_criteria:string; context:string; provider:string};
export type StoryAssessment = {
 complexity_score:number; complexity_label:'Low'|'Moderate'|'High'|'Very high'; complexity_reasons:string[];
 readiness_score:number; readiness_label:'Needs work'|'Needs clarification'|'Mostly clear'|'Ready for review'; readiness_gaps:string[];
};
export type ReviewerFeedback = {rating:number; comment:string};
export function hasAssessment(value:Partial<StoryAssessment>):value is StoryAssessment {
 const complexity:Record<number,string>={1:'Low',2:'Low',3:'Moderate',4:'High',5:'Very high'};
 const readiness:Record<number,string>={1:'Needs work',2:'Needs clarification',3:'Needs clarification',4:'Mostly clear',5:'Ready for review'};
 const items=(list:unknown):list is string[]=>Array.isArray(list)&&list.every(v=>typeof v==='string'&&v.trim().length>0);
 return Number.isInteger(value.complexity_score)&&Number.isInteger(value.readiness_score)
  &&complexity[value.complexity_score!]===value.complexity_label&&typeof value.complexity_label==='string'
  &&readiness[value.readiness_score!]===value.readiness_label&&typeof value.readiness_label==='string'
  &&items(value.complexity_reasons)&&value.complexity_reasons.length>0&&items(value.readiness_gaps);
}