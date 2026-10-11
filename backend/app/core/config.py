from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    llm_timeout_seconds: float = Field(default=60, ge=1, le=180)
    cors_origin: str = "http://localhost:5173"