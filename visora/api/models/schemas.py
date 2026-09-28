"""
Visora backend — models/schemas.py

Pydantic contracts shared by the routers. Mirrors the TypeScript types
in visora/lib/api.ts so the frontend and backend stay wire-compatible.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ColumnProfile(BaseModel):
    """One column as produced by /profiler/analyze and consumed by
    /recommender/suggest."""

    name: str
    description: str = ""
    semantic_type: str = Field(pattern="^(numeric|date|category|text)$")
    completeness: float = Field(ge=0, le=100)
    missing_count: int = Field(ge=0)
    distinct_count: int = Field(ge=0)
    distribution: list[int] = Field(default_factory=list)
    stats: dict[str, float | str] = Field(default_factory=dict)


class QualityAnomaly(BaseModel):
    column: str
    type: str = Field(pattern="^(warning|info)$")
    message: str
    suggestion: str


class ProfileResponse(BaseModel):
    filename: str
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=0)
    completeness_overall: float = Field(ge=0, le=100)
    columns: list[ColumnProfile]
    quality_anomalies: list[QualityAnomaly]


class RecommendationRequest(BaseModel):
    """The columns array from a profiler result, posted back verbatim."""

    columns: list[ColumnProfile]
    row_count: int = 0


class ChartRecommendation(BaseModel):
    chart_type: str
    title: str
    x_axis: str | None = None
    y_axis: str | None = None
    fit_score: int = Field(ge=0, le=100)


class RecommendationResponse(BaseModel):
    recommendations: list[ChartRecommendation]
