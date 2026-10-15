import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import App from '../App';
import {StoryForm} from '../components/StoryForm';
import {markdown,download} from '../export';
import type {Result} from '../types';
import {analyzeStory,getProviders} from '../api/client';
vi.mock('../api/client',()=>({getProviders:vi.fn(),analyzeStory:vi.fn()}));
const result:Result={provider:'openai',model:'test-model',status:'draft',warnings:[],analysis:{functional_requirements:[{id:'FR-1',title:'Reset',description:'Allow reset',evidence:['reset password'],classification:'explicit'}],non_functional_requirements:[],risks:[],assumptions:[],clarification_questions:[]}};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getProviders).mockResolvedValue([{id:'openai',model:'test-model',enabled:true}]);});
describe('review workflow',()=>{
 it('validates a blank story and loads the example',()=>{
  const submit=vi.fn();render(<StoryForm providers={[{id:'openai',model:'test',enabled:true}]} busy={false} onAnalyze={submit}/>);
  fireEvent.click(screen.getByText('Analyze'));expect(screen.getByRole('alert')).toHaveTextContent('Enter a user story');expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Load example'));expect((screen.getByLabelText('User story') as HTMLTextAreaElement).value).toContain('registered customer');
 });
 it('shows loading, renders sections, and allows edits and reviewer acceptance',async()=>{
  let resolve!:(r:Result)=>void;vi.mocked(analyzeStory).mockReturnValue(new Promise(r=>{resolve=r;}));render(<App/>);
  await waitFor(()=>expect(screen.getByText('Analyze')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('User story'),{target:{value:'reset password'}});fireEvent.click(screen.getByText('Analyze'));
  expect(screen.getByRole('status')).toHaveTextContent('Analyzing');expect(screen.getByText('Analyzing…')).toBeDisabled();
  resolve(structuredClone(result));await screen.findByText('Analysis draft');
  expect(screen.getAllByText(/Capgemini GEP/).length).toBeGreaterThan(0);expect(screen.getByText('explicit')).toBeInTheDocument();expect(screen.getByText('reset password',{selector:'blockquote'})).toBeInTheDocument();expect(screen.getAllByText('No findings in this section.')).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('Title FR-1'),{target:{value:'Revised reset'}});expect(screen.getByLabelText('Title FR-1')).toHaveValue('Revised reset');
  fireEvent.change(screen.getByLabelText('Review FR-1'),{target:{value:'accepted'}});expect(screen.getByLabelText('Review FR-1')).toHaveValue('accepted');
  fireEvent.change(screen.getByLabelText('Review FR-1'),{target:{value:'rejected'}});expect(screen.getByLabelText('Review FR-1')).toHaveValue('rejected');
 });
 it('shows provider errors',async()=>{
  vi.mocked(analyzeStory).mockRejectedValue(new Error('Configure GENERATIVE_ENGINE_API_KEY'));render(<App/>);await waitFor(()=>expect(screen.getByText('Analyze')).toBeEnabled());
  fireEvent.click(screen.getByText('Load example'));fireEvent.click(screen.getByText('Analyze'));expect(await screen.findByRole('alert')).toHaveTextContent('Configure GENERATIVE_ENGINE_API_KEY');
 });
 it('exports review decisions and downloads both formats',()=>{
  const reviewed=structuredClone(result);reviewed.analysis.functional_requirements[0].review='accepted';
  expect(markdown(reviewed)).toContain('Review: accepted');expect(markdown(reviewed)).toContain('No findings.');
  const create=vi.fn(()=> 'blob:test'),revoke=vi.fn();Object.defineProperty(URL,'createObjectURL',{value:create,configurable:true});Object.defineProperty(URL,'revokeObjectURL',{value:revoke,configurable:true});
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});download(reviewed,'json');download(reviewed,'md');expect(create).toHaveBeenCalledTimes(2);expect(click).toHaveBeenCalledTimes(2);click.mockRestore();
 });
});