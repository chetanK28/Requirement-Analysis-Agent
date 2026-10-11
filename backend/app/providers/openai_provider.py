import json
from pathlib import Path
from openai import AsyncOpenAI, APIConnectionError, APITimeoutError, APIStatusError, RateLimitError, AuthenticationError
from pydantic import ValidationError
from app.core.config import Settings
from app.providers.base import ProviderError
from app.schemas import Analysis, AnalysisRequest

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "analysis_v1.txt").read_text(encoding="utf-8")

class OpenAIProvider:
    name = "openai"
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = settings.openai_model
        self.enabled = bool(settings.openai_api_key.strip())

    async def analyze(self, request: AnalysisRequest) -> Analysis:
        if not self.enabled:
            raise ProviderError("configuration_error", "Set OPENAI_API_KEY in backend/.env and restart the backend.", 503)
        try:
            async with AsyncOpenAI(api_key=self.settings.openai_api_key, timeout=self.settings.llm_timeout_seconds, max_retries=0) as client:
                response = await client.responses.parse(
                    model=self.model,
                    input=[{"role": "system", "content": PROMPT}, {"role": "user", "content": json.dumps(request.model_dump(exclude={"provider"}))}],
                    text_format=Analysis,
                    store=False,
                )
                if response.status != "completed" or response.output_parsed is None:
                    raise ProviderError("invalid_output", "The provider refused or returned an incomplete analysis. Please revise the input or retry.")
                return Analysis.model_validate(response.output_parsed)
        except RateLimitError:
            raise ProviderError("rate_limit", "OpenAI rate or quota limit reached. Check your account and retry later.", 429) from None
        except APITimeoutError:
            raise ProviderError("timeout", "OpenAI timed out. Please retry.", 504) from None
        except AuthenticationError:
            raise ProviderError("configuration_error", "OpenAI rejected the API key. Check backend/.env.", 503) from None
        except APIConnectionError:
            raise ProviderError("provider_unavailable", "Cannot connect to OpenAI. Check your connection and retry.", 502) from None
        except APIStatusError:
            raise ProviderError("provider_failure", "OpenAI rejected the request. Check model access and configuration.", 502) from None
        except (ValidationError, ValueError):
            raise ProviderError("invalid_output", "OpenAI returned output that failed schema validation.") from None