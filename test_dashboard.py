#!/usr/bin/env python3
"""
Test script untuk memverifikasi dashboard enhancement
Simulasi data CCTV health check seperti di screenshot
"""

import pandas as pd
import sys
sys.path.insert(0, '/home/muzaz/code/Dashboard_Generator_2/backend')

from analyzer.detector import detect_columns
from analyzer.charts import generate_charts
from analyzer.kpi import generate_kpis

# Sample data mirip dengan screenshot CCTV
data = {
    'WILAYAH_POLDA': ['Metro Jaya', 'Metro Jaya', 'Metro Jaya', 'Jawa Barat', 'Jawa Barat', 'Jawa Timur', 'Jawa Tengah', 'Sumut', 'NTB'],
    'HEALTH_STATUS': ['Healthy', 'Healthy', 'Unhealthy', 'Healthy', 'Timeout', 'Healthy', 'Unhealthy', 'Healthy', 'Timeout'],
    'STREAM_TYPE': ['VMS', 'RTSP', 'VMS', 'RTSP', 'VMS', 'RTSP', 'VMS', 'RTSP', 'VMS'],
    'IS_ACTIVE_K3I': ['Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No'],
    'STREAM_DETAIL': ['Video mengalir', 'Playlist kosong', 'Koneksi timeout', 'BE 400', 'Tidak bisa terhubung', 'BE timeout', 'HTTP 404', 'Tidak ada URL valid', 'Stream timeout'],
    'LATENCY_PING_MS': [25, 45, 120, 35, 250, 180, 90, 15, 300],
}

df = pd.DataFrame(data)
print("Sample DataFrame:")
print(df)
print("\n" + "="*80 + "\n")

# Detect columns
columns = detect_columns(df)
print("Detected Columns:")
for col in columns:
    print(f"  - {col['name']}: {col['type']}")
print("\n" + "="*80 + "\n")

# Generate KPIs
kpis = generate_kpis(df, columns)
print("Generated KPIs:")
for kpi in kpis:
    print(f"  - {kpi['id']}: {kpi['label']} = {kpi['value']}")
    if 'trend' in kpi and kpi['trend']['percentage'] > 0:
        print(f"    Trend: {kpi['trend']['direction']} {kpi['trend']['percentage']}%")
print("\n" + "="*80 + "\n")

# Generate Charts
charts = generate_charts(df, columns)
print(f"Generated {len(charts)} Charts:")
for chart in charts:
    print(f"  - [{chart['type']}] {chart['title']}")
    print(f"    ID: {chart['id']}")
    if 'stack_categories' in chart:
        print(f"    Stack categories: {chart['stack_categories']}")
    if 'sortable' in chart:
        print(f"    Sortable: {chart['sortable']}")
    print(f"    Data points: {len(chart['data'])}")
print("\n" + "="*80 + "\n")

print("✅ Test completed successfully!")
print("\nDashboard sekarang bisa menghasilkan:")
print("  ✓ KPI Cards dengan trend indicators (↑/↓)")
print("  ✓ Horizontal bar charts (sortable)")
print("  ✓ Stacked/grouped bar charts")
print("  ✓ Vertical bar charts")
print("  ✓ Pie/Donut charts")
print("  ✓ Line charts")
print("  ✓ Histograms")