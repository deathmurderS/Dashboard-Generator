/**
 * frontend/charts/ChartGrid.jsx
 */

import React, { useState, useRef, useCallback } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { toPng } from "html-to-image";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, GripVertical, ArrowUpDown } from "lucide-react";

// ─── Design tokens ──────────────────────────────────────────────────────────
const TOKENS = {
  panel: "#1B1F26", panelAlt: "#20242C", border: "#2A2F38",
  text: "#ECEAE3", textMuted: "#8A8F98",
  accent: "#2DD4A7", date: "#8B80F0", category: "#E8A23D",
};
const STACK_COLORS = ["#2DD4A7", "#8B80F0", "#E8A23D", "#5B9BD5", "#E2574C", "#C792EA"];
const tooltipStyle = {
  background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
  borderRadius: 8, color: TOKENS.text, fontSize: 12,
};

// ─── Helper: ambil dataKey yang benar (name atau label) ────────────────────
function getDataKey(data) {
  if (!data?.length) return "label";
  return "name" in data[0] ? "name" : "label";
}

// ─── Helper: apakah spec punya data yang bisa dirender ─────────────────────
function hasRenderableData(spec) {
  if (spec.type === "trend") {
    // trend bisa render kalau ada granularities ATAU data
    const hasGran = spec.granularities && Object.values(spec.granularities).some((arr) => arr?.length > 0);
    return hasGran || spec.data?.length > 0;
  }
  return spec.data?.length > 0;
}

// ─── Chart views ────────────────────────────────────────────────────────────
function BarChartView({ spec }) {
  const dataKey = getDataKey(spec.data);
  const sliceColors = spec.slice_colors ?? {};
  const hasCustomColors = Object.keys(sliceColors).length > 0;
  return (
    <ResponsiveContainer>
      <BarChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={dataKey} tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
          axisLine={{ stroke: TOKENS.border }} tickLine={false}
          interval={0} angle={spec.data.length > 6 ? -25 : 0}
          textAnchor={spec.data.length > 6 ? "end" : "middle"}
          height={spec.data.length > 6 ? 50 : 30} />
        <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" fill={TOKENS.accent} radius={[4, 4, 0, 0]}>
          {hasCustomColors && spec.data.map((entry, i) => {
            const label = entry[dataKey] ?? "";
            const fill = sliceColors[label] ?? STACK_COLORS[i % STACK_COLORS.length];
            return <Cell key={i} fill={fill} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ spec }) {
  const dataKey = getDataKey(spec.data);
  const lineColor = spec.color ?? TOKENS.date;
  return (
    <ResponsiveContainer>
      <LineChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={dataKey} tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
          axisLine={{ stroke: TOKENS.border }} tickLine={false} />
        <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke={lineColor}
          strokeWidth={2} dot={{ r: 2, fill: lineColor }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ spec }) {
  const nameKey = getDataKey(spec.data);
  const sliceColors = spec.slice_colors ?? {};
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={spec.data} dataKey="value" nameKey={nameKey}
          cx="50%" cy="50%" outerRadius={75} stroke={TOKENS.panel} strokeWidth={2}>
          {spec.data.map((entry, i) => {
            const label = entry[nameKey] ?? entry.name ?? entry.label ?? "";
            const fill = sliceColors[label] ?? STACK_COLORS[i % STACK_COLORS.length];
            return <Cell key={i} fill={fill} />;
          })}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: TOKENS.textMuted }} iconSize={8} iconType="square" />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HBarChartView({ spec }) {
  const [sortMode, setSortMode] = useState("original");
  const dataKey = getDataKey(spec.data);
  const sliceColors = spec.slice_colors ?? {};
  const hasCustomColors = Object.keys(sliceColors).length > 0;

  const sorted = (() => {
    if (sortMode === "original") return spec.data;
    const copy = [...spec.data];
    copy.sort((a, b) => sortMode === "desc" ? b.value - a.value : a.value - b.value);
    return copy;
  })();

  function cycleSort() {
    setSortMode((m) => m === "original" ? "desc" : m === "desc" ? "asc" : "original");
  }

  const sortLabel = { original: "Urutan asli", desc: "Nilai ↓", asc: "Nilai ↑" }[sortMode];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={cycleSort} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: sortMode !== "original" ? TOKENS.accent + "22" : "transparent",
          border: `1px solid ${sortMode !== "original" ? TOKENS.accent : TOKENS.border}`,
          borderRadius: 5, padding: "3px 9px",
          color: sortMode !== "original" ? TOKENS.accent : TOKENS.textMuted,
          fontSize: 11, cursor: "pointer",
        }}>
          <ArrowUpDown size={11} /> {sortLabel}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
              axisLine={{ stroke: TOKENS.border }} tickLine={false} />
            <YAxis type="category" dataKey={dataKey}
              tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
              axisLine={{ stroke: TOKENS.border }} tickLine={false} width={110} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" fill={TOKENS.accent} radius={[0, 4, 4, 0]}>
              {hasCustomColors && sorted.map((entry, i) => {
                const label = entry[dataKey] ?? "";
                const fill = sliceColors[label] ?? STACK_COLORS[i % STACK_COLORS.length];
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StackedBarChartView({ spec }) {
  const { stack_categories = [] } = spec;
  const sliceColors = spec.slice_colors ?? {};
  const dataKey = getDataKey(spec.data);
  return (
    <ResponsiveContainer>
      <BarChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={dataKey} tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
          axisLine={{ stroke: TOKENS.border }} tickLine={false}
          interval={0} angle={spec.data.length > 6 ? -25 : 0}
          textAnchor={spec.data.length > 6 ? "end" : "middle"}
          height={spec.data.length > 6 ? 50 : 30} />
        <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: TOKENS.textMuted }} iconSize={8} iconType="square" />
        {stack_categories.map((cat, i) => {
          const fill = sliceColors[cat] ?? STACK_COLORS[i % STACK_COLORS.length];
          return (
            <Bar key={cat} dataKey={String(cat)}
              fill={fill} stackId="1"
              radius={i === stack_categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChartView({ spec }) {
  const nameKey = getDataKey(spec.data);
  const sliceColors = spec.slice_colors ?? {};
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={spec.data} dataKey="value" nameKey={nameKey}
          cx="50%" cy="50%" innerRadius={45} outerRadius={75}
          stroke={TOKENS.panel} strokeWidth={2}>
          {spec.data.map((entry, i) => {
            const label = entry[nameKey] ?? entry.name ?? entry.label ?? "";
            const fill = sliceColors[label] ?? STACK_COLORS[i % STACK_COLORS.length];
            return <Cell key={i} fill={fill} />;
          })}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: TOKENS.textMuted }} iconSize={8} iconType="square" />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Trend chart — line + switch granularitas ────────────────────────────────
const GRAN_LABELS = { minute: "Per menit", hour: "Per jam", day: "Per hari", week: "Per minggu" };

function TrendChartView({ spec }) {
  const granularities = spec.granularities ?? { day: spec.data ?? [] };
  const available = ["minute", "hour", "day", "week"].filter(
    (g) => granularities[g]?.length > 0
  );

  const [gran, setGran] = useState(
    spec.active_granularity && granularities[spec.active_granularity]?.length > 0
      ? spec.active_granularity
      : available[0] ?? "day"
  );

  const data = granularities[gran] ?? spec.data ?? [];
  const lineColor = spec.color ?? TOKENS.date;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      {/* Tombol switch granularitas */}
      {available.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, flexWrap: "wrap" }}>
          {available.map((g) => (
            <button key={g} onClick={() => setGran(g)} style={{
              background: gran === g ? TOKENS.accent + "22" : "transparent",
              border: `1px solid ${gran === g ? TOKENS.accent : TOKENS.border}`,
              borderRadius: 5, padding: "3px 9px",
              color: gran === g ? TOKENS.accent : TOKENS.textMuted,
              fontSize: 11, cursor: "pointer",
            }}>
              {GRAN_LABELS[g] ?? g}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TOKENS.textMuted, fontSize: 10 }}
              axisLine={{ stroke: TOKENS.border }} tickLine={false}
              interval={Math.max(0, Math.floor(data.length / 8))}
              angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={lineColor}
              strokeWidth={2} dot={{ r: 2, fill: lineColor }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Registry ────────────────────────────────────────────────────────────────
const CHART_COMPONENTS = {
  bar: BarChartView,
  line: LineChartView,
  pie: PieChartView,
  hbar: HBarChartView,
  stacked_bar: StackedBarChartView,
  donut: DonutChartView,
  trend: TrendChartView,
};

// ─── ChartCard: export + optional drag handle ────────────────────────────────
function ChartCard({ spec, dragHandle }) {
  const cardRef = useRef(null);
  const ChartComponent = CHART_COMPONENTS[spec.type];

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { backgroundColor: TOKENS.panel, pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${spec.title.replace(/\s+/g, "_")}.png`;
      a.click();
    } catch (e) {
      console.error("Export chart gagal:", e);
    }
  }, [spec.title]);

  // ← pakai hasRenderableData, bukan cuma cek spec.data?.length
  if (!ChartComponent || !hasRenderableData(spec)) return null;

  return (
    <div ref={cardRef} style={{
      background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
      borderRadius: 8, padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {dragHandle && (
          <span style={{ color: TOKENS.textMuted, display: "flex", alignItems: "center" }}>
            {dragHandle}
          </span>
        )}
        <p style={{
          color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em",
          flex: 1, margin: 0,
        }}>
          {spec.title}
        </p>
        <button onClick={handleExport} title="Download sebagai PNG" style={{
          background: "transparent", border: "none",
          color: TOKENS.textMuted, cursor: "pointer",
          padding: 4, borderRadius: 4, display: "flex", alignItems: "center",
          opacity: 0.5, transition: "opacity 0.15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
        >
          <Download size={14} />
        </button>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ChartComponent spec={spec} />
      </div>
    </div>
  );
}

// ─── Sortable wrapper ────────────────────────────────────────────────────────
function SortableChartCard({ spec }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: spec.id });
  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition, opacity: isDragging ? 0.45 : 1,
    }}>
      <ChartCard
        spec={spec}
        dragHandle={
          <span {...attributes} {...listeners} style={{ cursor: "grab", display: "flex", touchAction: "none" }}>
            <GripVertical size={15} />
          </span>
        }
      />
    </div>
  );
}

// ─── ChartGrid utama ─────────────────────────────────────────────────────────
export default function ChartGrid({ charts = [], editable = false, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIdx = charts.findIndex((c) => c.id === active.id);
    const newIdx = charts.findIndex((c) => c.id === over.id);
    if (onReorder) onReorder(arrayMove(charts, oldIdx, newIdx));
  }

  if (!charts.length) return null;

  const firstFull = charts.length === 1 || (charts.length >= 3 && charts.length % 2 === 1);
  const firstChart = charts[0];
  const restCharts = firstFull ? charts.slice(1) : charts;

  function renderCard(spec) {
    if (!CHART_COMPONENTS[spec.type] || !hasRenderableData(spec)) return null;
    return editable
      ? <SortableChartCard key={spec.id} spec={spec} />
      : <ChartCard key={spec.id} spec={spec} />;
  }

  const gridContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
      {firstFull && firstChart && (
        <div style={{ width: "100%" }}>
          {renderCard(firstChart)}
        </div>
      )}
      {restCharts.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: restCharts.length === 1 ? "1fr" : "1fr 1fr",
          gap: 12,
        }}>
          {restCharts.map((spec) => renderCard(spec))}
        </div>
      )}
    </div>
  );

  if (!editable) return gridContent;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={charts.map((c) => c.id)} strategy={rectSortingStrategy}>
        {gridContent}
      </SortableContext>
    </DndContext>
  );
}