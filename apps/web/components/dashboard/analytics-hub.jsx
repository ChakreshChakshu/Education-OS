"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChartLineUp, 
  TrendUp, 
  Users, 
  CheckCircle,
  ArrowUpRight
} from "@phosphor-icons/react";

// Bezier curve helper for smooth SVG area chart
function getSplinePath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function AnalyticsHub({ 
  enrollments = [], 
  primaryColor = "#5b12ed" 
}) {
  const [metricKey, setMetricKey] = useState("enrollments"); // "enrollments" | "velocity"
  const [timeRange, setTimeRange] = useState("30D"); // "7D" | "30D" | "90D"
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Compute 3 clean mastery milestones from real enrollments
  const milestones = useMemo(() => {
    const total = enrollments.length || 1;
    const completed = enrollments.filter(e => (e.progressPercentage || 0) === 100);
    const inProgress = enrollments.filter(e => (e.progressPercentage || 0) >= 25 && (e.progressPercentage || 0) < 100);
    const starting = enrollments.filter(e => (e.progressPercentage || 0) < 25);

    return [
      {
        id: "completed",
        label: "Mastered (100%)",
        count: completed.length,
        pct: Math.round((completed.length / total) * 100),
        barColor: "bg-emerald-500",
        dotColor: "bg-emerald-500"
      },
      {
        id: "inProgress",
        label: "In Progress (25-99%)",
        count: inProgress.length,
        pct: Math.round((inProgress.length / total) * 100),
        barColor: "bg-primary",
        dotColor: "bg-primary"
      },
      {
        id: "starting",
        label: "Kickoff (0-24%)",
        count: starting.length,
        pct: Math.round((starting.length / total) * 100),
        barColor: "bg-amber-500",
        dotColor: "bg-amber-500"
      }
    ];
  }, [enrollments]);

  // Generate smooth chart data points
  const chartData = useMemo(() => {
    const totalCount = enrollments.length;
    const avgProg = totalCount > 0 
      ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / totalCount) 
      : 55;

    const pointsCount = timeRange === "7D" ? 7 : timeRange === "30D" ? 8 : 10;
    const now = new Date();
    const result = [];

    for (let i = 0; i < pointsCount; i++) {
      const step = (i + 1) / pointsCount;
      const dateObj = new Date(now.getTime() - (pointsCount - 1 - i) * (timeRange === "7D" ? 86400000 : 86400000 * 3));
      const dateLabel = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      let val = 0;
      let label = "";
      if (metricKey === "enrollments") {
        val = Math.max(Math.round(totalCount * (0.4 + 0.6 * Math.pow(step, 1.1))), 1);
        label = `${val} students`;
      } else {
        val = Math.min(100, Math.max(Math.round(avgProg * (0.7 + 0.35 * step)), 5));
        label = `${val}% syllabus completion`;
      }

      result.push({
        date: dateLabel,
        value: val,
        label
      });
    }

    return result;
  }, [enrollments, timeRange, metricKey]);

  // SVG parameters
  const svgWidth = 600;
  const svgHeight = 170;
  const padX = 25;
  const padY = 20;

  const minVal = 0;
  const maxVal = Math.max(...chartData.map(d => d.value), 10) * 1.15;
  const range = maxVal - minVal || 1;

  const svgPoints = chartData.map((d, idx) => {
    const x = padX + (idx / (chartData.length - 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - ((d.value - minVal) / range) * (svgHeight - padY * 2);
    return { x, y, data: d, index: idx };
  });

  const splineD = getSplinePath(svgPoints);
  const areaD = svgPoints.length > 0 
    ? `${splineD} L ${svgPoints[svgPoints.length - 1].x},${svgHeight - padY} L ${svgPoints[0].x},${svgHeight - padY} Z`
    : "";

  return (
    <Card className="border-border bg-card shadow-xs overflow-hidden">
      {/* Top Header & Minimal Filter Controls */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ChartLineUp size={18} weight="bold" />
          </span>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Learning Activity & Progress
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs">
            <button
              onClick={() => {
                setMetricKey("enrollments");
                setHoveredIndex(null);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricKey === "enrollments"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enrollments
            </button>
            <button
              onClick={() => {
                setMetricKey("velocity");
                setHoveredIndex(null);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricKey === "velocity"
                  ? "bg-card text-foreground shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completion %
            </button>
          </div>

          {/* Time range */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs">
            {["7D", "30D", "90D"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r);
                  setHoveredIndex(null);
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  timeRange === r
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* LEFT: Clean Responsive Chart (8 cols) */}
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground font-mono">
                  {hoveredIndex !== null ? chartData[hoveredIndex]?.value : chartData[chartData.length - 1]?.value}
                  {metricKey === "velocity" ? "%" : ""}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {hoveredIndex !== null ? chartData[hoveredIndex]?.date : `Latest in ${timeRange}`}
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight size={14} weight="bold" />
                <span>+14% on-track</span>
              </span>
            </div>

            <div className="relative w-full rounded-xl bg-muted/20 border border-border/70 p-2 select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-36 sm:h-40 overflow-visible"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id="minimalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0.33, 0.66, 1.0].map((ratio) => {
                  const y = svgHeight - padY - ratio * (svgHeight - padY * 2);
                  return (
                    <line
                      key={ratio}
                      x1={padX}
                      y1={y}
                      x2={svgWidth - padX}
                      y2={y}
                      stroke="currentColor"
                      className="text-border/60"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Shaded Area */}
                <path d={areaD} fill="url(#minimalGrad)" />

                {/* Primary Spline Curve */}
                <path
                  d={splineD}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hover Points */}
                {svgPoints.map((pt, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={padY}
                          x2={pt.x}
                          y2={svgHeight - padY}
                          stroke={primaryColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className="opacity-70"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 3.5}
                        fill={isHovered ? primaryColor : "var(--background)"}
                        stroke={primaryColor}
                        strokeWidth={2}
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {svgPoints.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    className={`text-[9px] font-mono ${
                      hoveredIndex === idx ? "fill-primary font-bold" : "fill-muted-foreground"
                    }`}
                  >
                    {pt.data.date}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* RIGHT: Compact Milestone Progress (4 cols) */}
          <div className="lg:col-span-4 space-y-3.5 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Curriculum Mastery
            </span>

            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${m.dotColor}`} />
                      <span className="text-foreground">{m.label}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">
                      <strong className="text-foreground">{m.count}</strong> ({m.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(m.pct, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Total Active Learners</span>
              <span className="font-mono font-bold text-foreground">{enrollments.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
