"use client";

import React, { useState } from "react";
import { 
  CaretLeft, 
  CaretRight, 
  DotsThreeVertical, 
  GraduationCap, 
  CheckCircle, 
  Trophy 
} from "@phosphor-icons/react";

export function PerformanceBarChart({ stats, courses = [] }) {
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(3); // Default highlighted bar (e.g. Sem 4)

  // Default demonstration semesters if few courses enrolled
  const cycles = [
    { label: "Sem 1", value: 2.8, percent: 70 },
    { label: "Sem 2", value: 3.1, percent: 78 },
    { label: "Sem 3", value: 2.9, percent: 72 },
    { label: "Sem 4", value: 3.2, percent: 85, active: true },
    { label: "Sem 5", value: 3.0, percent: 75 },
    { label: "Sem 6", value: 3.4, percent: 88 },
  ];

  const currentCycle = cycles[selectedCycleIndex] || cycles[3];

  const gpaValue = stats?.avgProgress 
    ? (2.0 + (stats.avgProgress / 100) * 2.0).toFixed(2)
    : "3.20";

  const totalPoints = stats?.completedLessonsCount 
    ? stats.completedLessonsCount * 45 
    : 490;

  const totalCredits = stats?.enrolledCount 
    ? stats.enrolledCount * 4 
    : 137;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-7 shadow-xs">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
            Semester&apos;s Grade
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Academic performance and syllabus mastery trajectory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/60">
            <button
              onClick={() => setSelectedCycleIndex((prev) => Math.max(0, prev - 1))}
              disabled={selectedCycleIndex === 0}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-30 cursor-pointer"
              title="Previous Semester"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              onClick={() => setSelectedCycleIndex((prev) => Math.min(cycles.length - 1, prev + 1))}
              disabled={selectedCycleIndex === cycles.length - 1}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-30 cursor-pointer"
              title="Next Semester"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>

          <button className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent transition-colors cursor-pointer">
            <DotsThreeVertical size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main Grid: Bar Chart + Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        {/* Left: 6 Pill Bar Tracks */}
        <div className="lg:col-span-8 flex items-end justify-between gap-3 sm:gap-6 pt-10 pb-2 px-2">
          {cycles.map((cycle, idx) => {
            const isSelected = selectedCycleIndex === idx;
            return (
              <div 
                key={cycle.label} 
                onClick={() => setSelectedCycleIndex(idx)}
                className="flex-1 flex flex-col items-center gap-3 group cursor-pointer"
              >
                {/* Floating Tooltip Pill for Active Bar */}
                <div className="h-7 relative flex items-center justify-center">
                  {isSelected && (
                    <div className="absolute bottom-1 px-2.5 py-1 rounded-full bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground text-[11px] font-mono font-black shadow-md tracking-tight animate-in fade-in zoom-in-95 duration-200 flex items-center justify-center">
                      <span>{cycle.value}</span>
                      {/* Triangle Pointer */}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-primary rotate-45" />
                    </div>
                  )}
                </div>

                {/* Pill Track */}
                <div className="w-full max-w-[34px] sm:max-w-[42px] h-44 sm:h-52 rounded-full bg-muted/60 dark:bg-muted/30 p-1 flex flex-col justify-end relative overflow-hidden transition-all group-hover:bg-muted/80">
                  <div
                    className={`w-full rounded-full transition-all duration-700 ease-out ${
                      isSelected
                        ? "bg-gradient-to-t from-rose-500 to-rose-400 dark:from-primary dark:to-primary/80 shadow-sm"
                        : "bg-rose-400/80 dark:bg-primary/50 group-hover:bg-rose-500"
                    }`}
                    style={{ height: `${cycle.percent}%` }}
                  />
                </div>

                {/* Label */}
                <span 
                  className={`text-xs font-mono tracking-tight transition-colors ${
                    isSelected ? "font-extrabold text-foreground" : "font-medium text-muted-foreground"
                  }`}
                >
                  {cycle.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Summary Metric Column */}
        <div className="lg:col-span-4 bg-muted/30 dark:bg-card/60 border border-border/60 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Summary
            </span>
            <button className="text-muted-foreground hover:text-foreground cursor-pointer">
              <DotsThreeVertical size={14} weight="bold" />
            </button>
          </div>

          {/* Metric 1: GPA */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border/40 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <GraduationCap size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-foreground font-mono leading-tight">{gpaValue}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Cumulative GPA</p>
            </div>
          </div>

          {/* Metric 2: Total Grade / Points */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border/40 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Trophy size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-foreground font-mono leading-tight">{totalPoints}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total Grade Points</p>
            </div>
          </div>

          {/* Metric 3: Total Credits */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border/40 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <CheckCircle size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-foreground font-mono leading-tight">{totalCredits}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Completed Credits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
