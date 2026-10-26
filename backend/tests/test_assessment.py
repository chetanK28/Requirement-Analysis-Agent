import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from pydantic import ValidationError
from app.schemas import ModelAnalysis, StoryAssessment, AnalysisRequest, SECTIONS
from app.services.analyzer import analyze
from app.providers.openai_provider import OpenAIProvider, PROMPT
from app.core.config import Settings
from app.api.routes import get_providers
from app.main import app
from fastapi.testclient import TestClient

def fields(score=3):
    return dict(complexity_score=score, complexity_label={1:'Low',2:'Low',3:'Moderate',4:'High',5:'Very high'}[score],complexity_reasons=['Original story includes a workflow'],readiness_score=score,readiness_label={1:'Needs work',2:'Needs clarification',3:'Needs clarification',4:'Mostly clear',5:'Ready for review'}[score],readiness_gaps=[])

def payload():
    return {**{s:[] for s in SECTIONS}, **fields()}

@pytest.mark.parametrize('score',[1,2,3,4,5])
def test_valid_scores_and_labels(score):
    assert StoryAssessment.model_validate(fields(score)).complexity_score==score

@pytest.mark.parametrize('name',['complexity_score','readiness_score'])
@pytest.mark.parametrize('value',[0,6,2.5,True,'3',None])
def test_scores_are_strict_integers_in_range(name,value):
    data=fields();data[name]=value
    with pytest.raises(ValidationError):StoryAssessment.model_validate(data)

@pytest.mark.parametrize('missing',list(StoryAssessment.model_fields))
def test_missing_assessment_is_safe_api_error(missing):
    data=payload();data.pop(missing)
    class Provider:
        name,model,enabled='openai','test',True
        async def analyze(self,request):return data
    app.dependency_overrides[get_providers]=lambda:{'openai':Provider()}
    try:
        with TestClient(app) as client:
            response=client.post('/api/v1/analyze',json={'user_story':'private original story'})
        assert response.status_code==502
        assert 'Story Assessment' in response.json()['error']['message']
        assert 'private original story' not in response.text
    finally:app.dependency_overrides.clear()

@pytest.mark.parametrize('patch_data',[{'complexity_label':'High'},{'readiness_label':'Ready for review'},{'complexity_reasons':[]},{'complexity_reasons':[' ']},{'readiness_gaps':['']}])
def test_invalid_labels_and_explanations(patch_data):
    with pytest.raises(ValidationError):StoryAssessment.model_validate({**fields(),**patch_data})

def test_response_parsing_preserves_sections_and_assessment():
    parsed=ModelAnalysis.model_validate_json(__import__('json').dumps(payload()))
    class Provider:
        name,model='openai','test'
        async def analyze(self,request):return parsed
    result=asyncio.run(analyze(AnalysisRequest(user_story='original'),Provider()))
    assert set(result.analysis.model_dump())==set(SECTIONS)
    assert result.complexity_score==3 and result.readiness_gaps==[]
    assert result.status=='draft'

def test_sdk_gets_original_inputs_and_assessment_schema():
    client=MagicMock();client.responses.parse=AsyncMock(return_value=MagicMock(status='completed',output_parsed=ModelAnalysis.model_validate(payload())))
    client.__aenter__=AsyncMock(return_value=client);client.__aexit__=AsyncMock(return_value=False)
    source=AnalysisRequest(user_story='original story',acceptance_criteria='original criteria',context='original context')
    with patch('app.providers.openai_provider.AsyncOpenAI',return_value=client):
        asyncio.run(OpenAIProvider(Settings(generative_engine_api_key='test',generative_engine_model='test',_env_file=None)).analyze(source))
    args=client.responses.parse.call_args.kwargs
    assert args['text_format'] is ModelAnalysis
    assert __import__('json').loads(args['input'][1]['content'])==source.model_dump(exclude={'provider'})
    assert 'ORIGINAL user_story, acceptance_criteria and context' in PROMPT
    assert 'NOT the generated requirements' in PROMPT