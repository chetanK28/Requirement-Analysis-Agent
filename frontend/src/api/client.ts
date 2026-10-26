import type {Provider, Result, Story} from '../types';
const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
async function request<T>(path:string, options?:RequestInit):Promise<T> {
  try {
    const response = await fetch(base + path, {...options, signal:AbortSignal.timeout(190000)});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Request failed. Check your input and backend configuration.');
    return body;
  } catch(error) {
    if (error instanceof TypeError) throw new Error('Cannot reach the backend. Start FastAPI on port 8000.');
    if (error instanceof DOMException) throw new Error('The request timed out. Please retry.');
    throw error;
  }
}
export const getProviders = () => request<Provider[]>('/api/v1/providers');
export const analyzeStory = (story:Story) => request<Result>('/api/v1/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(story)});
export type Extraction = {text:string; character_count:number};
export const extractDocument = (file:File) => {
 const form = new FormData();form.append('file',file);
 return request<Extraction>('/api/v1/extract-file',{method:'POST',body:form});
};