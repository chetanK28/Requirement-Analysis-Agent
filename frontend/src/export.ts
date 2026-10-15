import {labels, sections, type Result} from './types';
export function markdown(result:Result):string {
 return ['# Requirement analysis — draft for human review', `Provider: ${result.provider === 'openai' ? 'Capgemini GEP' : result.provider} | Model: ${result.model}`, 'Review decisions are local reviewer annotations, not automatic approval.', ...result.warnings.map(w=>`Warning: ${w}`), ...sections.flatMap(section=>[`\n## ${labels[section]}`, ...(result.analysis[section].length ? result.analysis[section].map(f=>`\n### ${f.id}: ${f.title}\n${f.description}\n\nClassification: ${f.classification} | Review: ${f.review || 'pending'}\n\nEvidence:\n${f.evidence.map(e=>`> ${e.replace(/\n/g,'\n> ')}`).join('\n') || 'None supplied'}`) : ['No findings.'])])].join('\n\n');
}
export function download(result:Result, format:'json'|'md') {
 const blob = new Blob([format==='json'?JSON.stringify(result,null,2):markdown(result)], {type:format==='json'?'application/json':'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download=`requirement-analysis.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}