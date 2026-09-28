"""
Visora backend — services/recommender_service.py

Chart recommendation engine. Consumes the profiler's column schema (no
raw data ever leaves the browser) and maps column combinations onto
Visora widget blueprints with a deterministic fit score.

Heuristics ported from the original Dashboard-Generator analyzer
(charts.py): meaningful-column filtering, identifier detection and
cardinality limits.
"""

from __future__ import annotations

# Column-name patterns considered meaningless for charts and KPIs.
SKIP_PATTERNS = ["unnamed", "kolom_", "column_", "field_", "var_"]
# Category cardinality below which a donut/share chart stays readable.
LOW_CARDINALITY = 8
# Category cardinality above which bars become unreadable.
MAX_CATEGORY_CARDINALITY = 50
# Region-like column names treated as geographic breakdowns.
GEO_KEYWORDS = ("country", "region", "state", "city", "territory")
# Maximum number of widget blueprints returned.
MAX_RECOMMENDATIONS = 8


def _is_meaningful_column(col_name: str) -> bool:
    name_lower = col_name.lower().strip()
    if len(name_lower) <= 2:
        return False
    return not any(p in name_lower for p in SKIP_PATTERNS)


def _is_likely_id_column(col: dict) -> bool:
    name_lower = col["name"].lower()
    if name_lower == "id" or name_lower.endswith("_id"):
        return True
    # Free-text columns with huge cardinality are labels, not measures.
    return col.get("semantic_type") == "text" and int(col.get("distinct_count") or 0) > 500


def _label(name: str) -> str:
    return name.replace("_", " ").title()


def recommend_charts(schema: dict | list) -> list[dict]:
    """Map a profiler schema onto ranked widget blueprints.

    Accepts either the full profiler result dict ({columns: [...], ...})
    or a bare column list. Returns entries shaped like ChartRecommendation
    in lib/api.ts: {chart_type, title, x_axis, y_axis, fit_score}.
    """
    if isinstance(schema, list):
        schema = {"columns": schema}
    columns = [
        c
        for c in schema.get("columns", [])
        if _is_meaningful_column(c["name"]) and not _is_likely_id_column(c)
    ]

    date_cols = [c["name"] for c in columns if c.get("semantic_type") == "date"]
    numeric_cols = [c["name"] for c in columns if c.get("semantic_type") == "numeric"]
    category_cols = [
        c["name"]
        for c in columns
        if c.get("semantic_type") == "category"
        and int(c.get("distinct_count") or 0) <= MAX_CATEGORY_CARDINALITY
    ]
    share_cols = [
        c["name"]
        for c in columns
        if c.get("semantic_type") == "category"
        and int(c.get("distinct_count") or 0) <= LOW_CARDINALITY
    ]

    recs: list[dict] = []

    def add(chart_type: str, title: str, x_axis: str | None, y_axis: str | None, fit_score: int) -> None:
        recs.append({
            "chart_type": chart_type,
            "title": title,
            "x_axis": x_axis,
            "y_axis": y_axis,
            "fit_score": fit_score,
        })

    # Always: a headline number for the strongest measure.
    if numeric_cols:
        add("single_metric", f"{_label(numeric_cols[0])} at a Glance", None, numeric_cols[0], 92)

    # Date + numeric -> Line Trend.
    if date_cols and numeric_cols:
        add("line_trend", f"{_label(numeric_cols[0])} by {_label(date_cols[0])}", date_cols[0], numeric_cols[0], 98)

    # Category + numeric -> Bar Chart.
    if category_cols and numeric_cols:
        add("bar_chart", f"{_label(numeric_cols[0])} by {_label(category_cols[0])}", category_cols[0], numeric_cols[0], 95)

    # One low-cardinality category -> Donut/Ratio share.
    if share_cols and numeric_cols:
        add("donut_ratio", f"Share of {_label(numeric_cols[0])}", share_cols[0], numeric_cols[0], 90)

    # Two or more measures -> Scatter Dispersion.
    if len(numeric_cols) >= 2:
        add("scatter_dispersion", f"{_label(numeric_cols[0])} vs {_label(numeric_cols[1])}", numeric_cols[0], numeric_cols[1], 88)

    # Date + second measure -> cumulative Area Stream.
    if date_cols and len(numeric_cols) >= 2:
        add("area_stream", f"Cumulative {_label(numeric_cols[1])}", date_cols[0], numeric_cols[1], 85)

    # Two usable categories -> Matrix Heatmap.
    if len(category_cols) >= 2:
        add("matrix_heatmap", f"{_label(category_cols[1])} across {_label(category_cols[0])}", category_cols[0], category_cols[1], 82)

    # Region-like column -> Geo Table.
    geo_like = [c["name"] for c in columns if any(k in c["name"].lower() for k in GEO_KEYWORDS)]
    if geo_like and numeric_cols:
        add("geo_table", f"{_label(numeric_cols[0])} by {_label(geo_like[0])}", geo_like[0], numeric_cols[0], 80)

    recs.sort(key=lambda r: r["fit_score"], reverse=True)
    return recs[:MAX_RECOMMENDATIONS]
