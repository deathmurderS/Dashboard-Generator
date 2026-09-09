"""
Visora backend — routers/recommender.py

POST /recommender/suggest — accepts the profiler's column schema and
returns ranked widget blueprints for the Visora dashboard builder.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import RecommendationRequest, RecommendationResponse
from services.recommender_service import recommend_charts

router = APIRouter(prefix="/recommender", tags=["recommender"])


@router.post("/suggest", response_model=RecommendationResponse)
async def suggest(request: RecommendationRequest) -> RecommendationResponse:
    if not request.columns:
        raise HTTPException(status_code=422, detail="Schema has no columns to recommend from.")
    return RecommendationResponse(recommendations=recommend_charts(request.model_dump()))