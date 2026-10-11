from fastapi import APIRouter, Depends
from app.core.config import Settings
from app.providers.base import ProviderError
from app.providers.openai_provider import OpenAIProvider
from app.schemas import AnalysisRequest, AnalysisResponse
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