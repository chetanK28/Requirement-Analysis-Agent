from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

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

class StoryAssessment(StrictModel):
    complexity_score: int = Field(ge=1, le=5, strict=True)
    complexity_label: Literal["Low", "Moderate", "High", "Very high"]
    complexity_reasons: list[str] = Field(min_length=1, max_length=8)
    readiness_score: int = Field(ge=1, le=5, strict=True)
    readiness_label: Literal["Needs work", "Needs clarification", "Mostly clear", "Ready for review"]
    readiness_gaps: list[str] = Field(max_length=12)

    @field_validator("complexity_reasons", "readiness_gaps")
    @classmethod
    def nonblank_items(cls, values):
        if any(not value.strip() or len(value) > 1000 for value in values):
            raise ValueError("Assessment explanations must be nonblank and at most 1000 characters")
        return values

    @model_validator(mode="after")
    def consistent_labels(self):
        complexity = {1: "Low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high"}
        readiness = {1: "Needs work", 2: "Needs clarification", 3: "Needs clarification", 4: "Mostly clear", 5: "Ready for review"}
        if self.complexity_label != complexity[self.complexity_score] or self.readiness_label != readiness[self.readiness_score]:
            raise ValueError("Assessment labels do not match the scores")
        return self

class ModelAnalysis(Analysis, StoryAssessment):
    """Structured model output: five sections plus source-based assessment."""

class AnalysisResponse(StoryAssessment):
    provider: str
    model: str
    status: Literal["draft"] = "draft"
    warnings: list[str]
    analysis: Analysis

SECTIONS = tuple(Analysis.model_fields)

class ExtractionResponse(StrictModel):
    text: str = Field(min_length=1, max_length=12000)
    character_count: int
