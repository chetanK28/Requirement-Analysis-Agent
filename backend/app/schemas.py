from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class AnalysisRequest(StrictModel):
    user_story: str = Field(min_length=1, max_length=12000)
    acceptance_criteria: str = Field(default="", max_length=12000)
    context: str = Field(default="", max_length=12000)
    provider: str = Field(default="openai", max_length=40)

    @field_validator("user_story")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("User story must not be blank")
        return value.strip()

class Finding(StrictModel):
    id: str = ""
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(min_length=1, max_length=4000)
    evidence: list[str] = Field(max_length=20)
    classification: Literal["explicit", "inferred"]

class Analysis(StrictModel):
    functional_requirements: list[Finding] = Field(max_length=50)
    non_functional_requirements: list[Finding] = Field(max_length=50)
    risks: list[Finding] = Field(max_length=50)
    assumptions: list[Finding] = Field(max_length=50)
    clarification_questions: list[Finding] = Field(max_length=50)

class AnalysisResponse(StrictModel):
    provider: str
    model: str
    status: Literal["draft"] = "draft"
    warnings: list[str]
    analysis: Analysis

SECTIONS = tuple(Analysis.model_fields)