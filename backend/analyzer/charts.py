"""
backend/analyzer/charts.py
"""

from __future__ import annotations

import pandas as pd

MAX_CATEGORIES = 10
MAX_DATE_POINTS = 50
MAX_CATEGORY_CARDINALITY = 50
MAX_CATEGORY_UNIQUE_RATIO = 0.3
MULTI_VALUE_DELIMITERS = ["|", ";"]
MULTI_VALUE_MIN_RATIO = 0.5

# Pola nama kolom yang dianggap tidak bermakna — skip dari chart dan KPI
SKIP_PATTERNS = ["unnamed", "kolom_", "column_", "field_", "var_"]


def _is_meaningful_column(col_name: str) -> bool:
    name_lower = col_name.lower().strip()
    if len(name_lower) <= 2:
        return False
    return not any(p in name_lower for p in SKIP_PATTERNS)


def _normalized_value_counts(series: pd.Series, top_n: int) -> list[tuple[str, int]]:
    cleaned = series.dropna().astype(str).str.strip()
    if cleaned.empty:
        return []
    norm_key = cleaned.str.lower()
    counts = norm_key.value_counts()
    display_map = (
        cleaned.groupby(norm_key)
        .agg(lambda vals: vals.value_counts().idxmax())
    )
    result = []
    for key, count in counts.head(top_n).items():
        result.append((display_map.get(key, key), int(count)))
    return result


def _is_high_cardinality(series: pd.Series) -> bool:
    n_total = len(series)
    if n_total == 0:
        return False
    n_unique = series.nunique(dropna=True)
    if n_unique <= MAX_CATEGORY_CARDINALITY:
        return False
    return (n_unique / n_total) > MAX_CATEGORY_UNIQUE_RATIO or n_unique > 500


def _detect_multivalue_delimiter(series: pd.Series) -> str | None:
    sample = series.dropna().astype(str)
    if sample.empty:
        return None
    sample = sample.sample(min(200, len(sample)), random_state=42)
    for delim in MULTI_VALUE_DELIMITERS:
        ratio = sample.str.contains(delim, regex=False).mean()
        if ratio >= MULTI_VALUE_MIN_RATIO:
            return delim
    return None


def _is_likely_id_column(df: pd.DataFrame, numeric_col: str) -> bool:
    name_lower = numeric_col.lower()
    if name_lower == "id" or name_lower.endswith("_id") or name_lower.endswith("id"):
        return True
    series = df[numeric_col].dropna()
    MIN_ROWS_FOR_UNIQUENESS_CHECK = 30
    if len(series) < MIN_ROWS_FOR_UNIQUENESS_CHECK:
        return False
    return series.nunique() == len(series)


def _bar_chart_multivalue(df: pd.DataFrame, category_col: str, delimiter: str) -> dict:
    exploded = (
        df[category_col]
        .dropna()
        .astype(str)
        .str.split(delimiter)
        .explode()
        .str.strip()
    )
    counts = exploded[exploded != ""].value_counts().head(MAX_CATEGORIES)
    return {
        "id": f"bar_{category_col}_items",
        "type": "bar",
        "title": f"Item paling sering muncul di {category_col}",
        "x_label": category_col,
        "y_label": "Jumlah",
        "data": [{"label": str(k), "value": int(v)} for k, v in counts.items()],
    }


def _bar_chart_category_count(df: pd.DataFrame, category_col: str) -> dict:
    counts = _normalized_value_counts(df[category_col], MAX_CATEGORIES)
    return {
        "id": f"bar_{category_col}_count",
        "type": "bar",
        "title": f"Distribusi {category_col}",
        "x_label": category_col,
        "y_label": "Jumlah",
        "data": [{"label": label, "value": value} for label, value in counts],
    }


def _pie_chart_category(df: pd.DataFrame, category_col: str) -> dict:
    counts = _normalized_value_counts(df[category_col], MAX_CATEGORIES)
    return {
        "id": f"pie_{category_col}",
        "type": "pie",
        "title": f"Proporsi {category_col}",
        "data": [{"label": label, "value": value} for label, value in counts],
    }


def _line_chart_trend(df: pd.DataFrame, date_col: str, numeric_col: str) -> dict:
    temp = df[[date_col, numeric_col]].copy()
    temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
    temp[numeric_col] = pd.to_numeric(temp[numeric_col], errors="coerce")
    temp = temp.dropna().sort_values(date_col)
    grouped = temp.groupby(temp[date_col].dt.date)[numeric_col].mean()
    if len(grouped) > MAX_DATE_POINTS:
        step = max(1, len(grouped) // MAX_DATE_POINTS)
        grouped = grouped.iloc[::step]
    return {
        "id": f"line_{date_col}_{numeric_col}",
        "type": "line",
        "title": f"Rata-rata {numeric_col} berdasarkan {date_col}",
        "x_label": date_col,
        "y_label": numeric_col,
        "data": [{"label": str(k), "value": round(float(v), 2)} for k, v in grouped.items()],
    }


def _horizontal_bar_chart(df: pd.DataFrame, category_col: str, value_col: str = None) -> dict:
    if value_col:
        agg = df.groupby(category_col)[value_col].sum().sort_values(ascending=True)
    else:
        counts = _normalized_value_counts(df[category_col], MAX_CATEGORIES)
        agg = pd.Series(dict(counts)).sort_values(ascending=True)
    agg = agg.tail(MAX_CATEGORIES)
    data = [{"label": str(k), "value": float(v)} for k, v in agg.items()]
    return {
        "id": f"hbar_{category_col}{f'_{value_col}' if value_col else ''}",
        "type": "hbar",
        "title": f"Top {len(data)} {category_col}{f' (by {value_col})' if value_col else ''}",
        "x_label": category_col,
        "y_label": "Jumlah" if not value_col else value_col,
        "data": data,
        "sortable": True,
    }


def _stacked_bar_chart(df: pd.DataFrame, category_col: str, stack_col: str, value_col: str = None) -> dict:
    if value_col:
        pivot = df.pivot_table(
            index=category_col, columns=stack_col,
            values=value_col, aggfunc="sum", fill_value=0
        )
    else:
        pivot = pd.crosstab(df[category_col], df[stack_col])
    if len(pivot) > MAX_CATEGORIES:
        pivot = pivot.head(MAX_CATEGORIES)
    categories = pivot.index.tolist()
    stack_categories = pivot.columns.tolist()
    data = []
    for cat in categories:
        row = {"label": str(cat)}
        for stack_cat in stack_categories:
            row[str(stack_cat)] = float(pivot.loc[cat, stack_cat]) if stack_cat in pivot.columns else 0
        data.append(row)
    return {
        "id": f"stacked_{category_col}_{stack_col}{f'_{value_col}' if value_col else ''}",
        "type": "stacked_bar",
        "title": f"{stack_col} per {category_col}",
        "x_label": category_col,
        "y_label": value_col or "Jumlah",
        "data": data,
        "stack_categories": [str(s) for s in stack_categories],
        "category_col": category_col,
        "stack_col": stack_col,
    }


def _histogram_numeric(df: pd.DataFrame, numeric_col: str, bins: int = 10) -> dict:
    series = pd.to_numeric(df[numeric_col], errors="coerce").dropna()
    counts, edges = pd.cut(series, bins=bins, retbins=True, duplicates="drop")
    grouped = counts.value_counts().sort_index()
    data = []
    for interval, value in grouped.items():
        label = f"{interval.left:.1f}–{interval.right:.1f}"
        data.append({"label": label, "value": int(value)})
    return {
        "id": f"hist_{numeric_col}",
        "type": "bar",
        "title": f"Distribusi nilai {numeric_col}",
        "x_label": numeric_col,
        "y_label": "Frekuensi",
        "data": data,
    }


def generate_charts(df: pd.DataFrame, columns: list[dict]) -> list[dict]:
    date_cols = [
        c["name"] for c in columns
        if c["type"] == "Date" and _is_meaningful_column(c["name"])
    ]
    numeric_cols = [
        c["name"] for c in columns
        if c["type"] == "Numeric"
        and not _is_likely_id_column(df, c["name"])
        and _is_meaningful_column(c["name"])
    ]
    category_cols = [
        c["name"] for c in columns
        if c["type"] == "Category" and _is_meaningful_column(c["name"])
    ]

    charts: list[dict] = []

    if date_cols and numeric_cols:
        charts.append(_line_chart_trend(df, date_cols[0], numeric_cols[0]))

    usable_category_cols = []
    pie_done = False
    for cat_col in category_cols:
        series = df[cat_col]
        delimiter = _detect_multivalue_delimiter(series)
        if delimiter:
            charts.append(_bar_chart_multivalue(df, cat_col, delimiter))
            continue
        if _is_high_cardinality(series):
            continue
        usable_category_cols.append(cat_col)

    for cat_col in usable_category_cols[:1]:
        charts.append(_horizontal_bar_chart(df, cat_col))

    if len(usable_category_cols) >= 2:
        charts.append(_stacked_bar_chart(df, usable_category_cols[0], usable_category_cols[1]))

    for cat_col in usable_category_cols[:2]:
        charts.append(_bar_chart_category_count(df, cat_col))

    if usable_category_cols and not pie_done:
        charts.append(_pie_chart_category(df, usable_category_cols[0]))
        pie_done = True

    for num_col in numeric_cols[:2]:
        charts.append(_histogram_numeric(df, num_col))

    if len(charts) < 3 and numeric_cols:
        for num_col in numeric_cols:
            if len(charts) >= 3:
                break
            spec = _histogram_numeric(df, num_col)
            if spec["id"] not in {c["id"] for c in charts}:
                charts.append(spec)

    return charts[:6]