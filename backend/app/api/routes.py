from fastapi import APIRouter, Depends, UploadFile, File
from app.core.config import Settings
from app.providers.base import ProviderError
from app.providers.openai_provider import OpenAIProvider
from app.schemas import AnalysisRequest, AnalysisResponse, ExtractionResponse
from app.services.analyzer import analyze

router = APIRouter()
def get_settings():
    return Settings()
def get_providers(settings: Settings = Depends(get_settings)):
    return {"openai": OpenAIProvider(settings)}

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/api/v1/providers")
def providers(registry=Depends(get_providers)):
    return [{"id": name, "model": provider.model, "enabled": provider.enabled} for name, provider in registry.items()]

@router.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze_route(request: AnalysisRequest, registry=Depends(get_providers), settings: Settings = Depends(get_settings)):
    provider = registry.get(request.provider)
    if provider is None:
        raise ProviderError("unknown_provider", "Select a listed provider.", 400)
    return await analyze(request, provider, settings.llm_timeout_seconds)

@router.post('/api/v1/extract-file', response_model=ExtractionResponse)
async def extract_file(file: UploadFile = File(...)):
    from starlette.concurrency import run_in_threadpool
    from app.services.documents import extract_text, MAX_FILE_BYTES
    try:
        # Limit bytes read into application memory. Always close multipart temporary storage.
        data = await file.read(MAX_FILE_BYTES + 1)
        if len(data) > MAX_FILE_BYTES:
            raise ProviderError('file_too_large', 'The file exceeds the 10 MB upload limit.', 413)
        text = await run_in_threadpool(extract_text, data, file.filename or '', file.content_type or '')
        return ExtractionResponse(text=text, character_count=len(text))
    finally:
        await file.close()