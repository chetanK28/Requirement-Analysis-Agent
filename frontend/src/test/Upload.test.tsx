import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {StoryForm} from '../components/StoryForm';
import {extractDocument} from '../api/client';
vi.mock('../api/client',()=>({extractDocument:vi.fn()}));
const providers=[{id:'openai',model:'test',enabled:true}];
beforeEach(()=>vi.resetAllMocks());
function choose(file:File){fireEvent.click(screen.getByLabelText('Upload document'));fireEvent.change(screen.getByLabelText('Choose a document'),{target:{files:[file]}});}
it('uploads, previews and edits text before using existing analysis submission',async()=>{
 const submit=vi.fn();let resolve!:(v:{text:string;character_count:number})=>void;vi.mocked(extractDocument).mockReturnValue(new Promise(r=>resolve=r));render(<StoryForm providers={providers} busy={false} onAnalyze={submit}/>);
 const file=new File(['pdf'],'story.pdf',{type:'application/pdf'});choose(file);expect(screen.getByText(/Selected: story.pdf/)).toBeInTheDocument();fireEvent.click(screen.getByText('Extract text'));
 expect(screen.getByRole('status')).toHaveTextContent('Uploading and extracting');expect(screen.getByText('Analyze')).toBeDisabled();expect(submit).not.toHaveBeenCalled();
 resolve({text:'Extracted original story',character_count:24});await waitFor(()=>expect(screen.getByLabelText('Extracted text preview')).toHaveValue('Extracted original story'));
 fireEvent.change(screen.getByLabelText('Extracted text preview'),{target:{value:''}});expect(screen.getByLabelText('Extracted text preview')).toBeEnabled();fireEvent.change(screen.getByLabelText('Extracted text preview'),{target:{value:'Reviewed corrected story'}});
 fireEvent.click(screen.getByText('Analyze'));expect(submit).toHaveBeenCalledWith({user_story:'Reviewed corrected story',acceptance_criteria:'',context:'',provider:'openai'});expect(extractDocument).toHaveBeenCalledWith(file);
});
it('preserves manual entry when switching input methods',()=>{
 render(<StoryForm providers={providers} busy={false} onAnalyze={vi.fn()}/>);fireEvent.change(screen.getByLabelText('User story'),{target:{value:'Manual draft'}});fireEvent.click(screen.getByLabelText('Upload document'));fireEvent.click(screen.getByLabelText('Enter manually'));expect(screen.getByLabelText('User story')).toHaveValue('Manual draft');
});
it('shows extraction errors without enabling analysis',async()=>{
 vi.mocked(extractDocument).mockRejectedValue(new Error('Scanned PDFs need OCR, which is not supported.'));render(<StoryForm providers={providers} busy={false} onAnalyze={vi.fn()}/>);choose(new File(['pdf'],'scan.pdf',{type:'application/pdf'}));fireEvent.click(screen.getByText('Extract text'));expect(await screen.findByRole('alert')).toHaveTextContent('OCR');expect(screen.getByText('Analyze')).toBeDisabled();
});
it.each([['old.doc','Legacy .doc'],['bad.txt','Choose a PDF']])('rejects %s locally', (name,message)=>{
 render(<StoryForm providers={providers} busy={false} onAnalyze={vi.fn()}/>);choose(new File(['x'],name));expect(screen.getByRole('alert')).toHaveTextContent(message);expect(extractDocument).not.toHaveBeenCalled();
});
it('rejects files over 10 MB before upload',()=>{
 render(<StoryForm providers={providers} busy={false} onAnalyze={vi.fn()}/>);choose(new File([new Uint8Array(10*1024*1024+1)],'big.pdf',{type:'application/pdf'}));expect(screen.getByRole('alert')).toHaveTextContent('10 MB');expect(extractDocument).not.toHaveBeenCalled();
});
it('clears old extracted preview when another file is selected',async()=>{
 vi.mocked(extractDocument).mockResolvedValue({text:'Old text',character_count:8});render(<StoryForm providers={providers} busy={false} onAnalyze={vi.fn()}/>);choose(new File(['x'],'one.docx'));fireEvent.click(screen.getByText('Extract text'));await waitFor(()=>expect(screen.getByLabelText('Extracted text preview')).toHaveValue('Old text'));
 fireEvent.change(screen.getByLabelText('Choose a document'),{target:{files:[new File(['x'],'two.pdf')]}});expect(screen.getByLabelText('Extracted text preview')).toHaveValue('');expect(screen.getByText('Analyze')).toBeDisabled();
});