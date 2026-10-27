"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  CaretLeft, 
  CaretRight, 
  CaretDown, 
  MagnifyingGlass, 
  Bell, 
  Video, 
  Calendar, 
  Clock, 
  User, 
  PlayCircle,
  ArrowRight
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function DashboardScheduleSidebar({ user, activeCourse }) {
  const [selectedDay, setSelectedDay] = useState(27);
  const [currentMonth, setCurrentMonth] = useState("October, 2026");

  // Calendar dates matrix
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  
  // 5 rows of calendar days for demonstration
  const calendarDays = [
    [28, 29, 30, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, 1],
  ];

  const highlightedClass = {
    title: activeCourse?.courseTitle || "Machine Learning Architecture",
    instructor: activeCourse?.instructor || "Dr. Eleanor Pena",
    time: "10:30 - 11:30 AM",
    date: "Today, Oct 27",
    streamUrl: activeCourse ? `/dashboard/courses/${activeCourse.courseId}/lesson/${activeCourse.nextModuleId || 'first'}` : "/dashboard/courses"
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Profile Bar */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 rounded-3xl p-3 shadow-xs">
        <div className="flex-1 relative flex items-center">
          <MagnifyingGlass size={16} className="absolute left-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search syllabus..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 rounded-xl border border-transparent focus:border-primary/40 focus:bg-background outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>

        <button 
          className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer relative"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        </button>

        <Avatar className="h-8 w-8 border border-border shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
            {user?.name ? user.name.charAt(0) : "S"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Interactive Monthly Mini Calendar */}
      <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-foreground tracking-tight">
            {currentMonth}
          </h3>

          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/60">
            <button 
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Previous Month"
            >
              <CaretLeft size={13} weight="bold" />
            </button>
            <button 
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Next Month"
            >
              <CaretRight size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-muted-foreground">
          {daysOfWeek.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {calendarDays.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1 text-center">
              {week.map((day, dIdx) => {
                const isSelected = selectedDay === day && (wIdx >= 3);
                const isRange = (wIdx === 2 && day >= 15 && day <= 17);
                const isAdjacent = (wIdx === 0 && day > 20) || (wIdx === 4 && day === 1);

                return (
                  <button
                    key={`${wIdx}-${dIdx}-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`h-8 w-full rounded-xl text-xs font-mono transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "bg-rose-500 text-white font-extrabold shadow-sm scale-105"
                        : isRange
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                        : isAdjacent
                        ? "text-muted-foreground/40 font-normal"
                        : "text-foreground font-semibold hover:bg-muted"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Timetable Section */}
      <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Header with Dropdown */}
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-foreground tracking-tight">
            Upcoming
          </h3>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-foreground">
            <span>Today</span>
            <CaretDown size={12} weight="bold" className="text-muted-foreground" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-medium -mt-1">
          Monday, 27 October
        </p>

        {/* Timetable Flow */}
        <div className="relative pl-12 space-y-3.5 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
          {/* Time Marker 08:30 Preview */}
          <div className="relative">
            <span className="absolute -left-12 top-0 text-[10px] font-mono font-bold text-muted-foreground">
              08:30
            </span>
            <div className="p-2.5 rounded-xl border border-border/50 bg-muted/30 text-xs">
              <p className="font-bold text-foreground truncate">Distributed Systems Intro</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">1 hour • Dr. Harrison</p>
            </div>
          </div>

          {/* Time Marker 10:30 (Highlighted Spotlight Session) */}
          <div className="relative">
            <span className="absolute -left-12 top-0 text-[10px] font-mono font-bold text-rose-500 dark:text-primary">
              10:30
            </span>

            {/* Spotlight Card */}
            <div className="p-4 rounded-2xl border-2 border-rose-500/30 dark:border-primary/40 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-md space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500 dark:text-primary bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Live Classroom
                </span>
                <h4 className="font-extrabold text-sm text-foreground mt-1.5 leading-snug">
                  {highlightedClass.title}
                </h4>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <User size={13} weight="bold" />
                  <span>{highlightedClass.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} weight="bold" />
                  <span>{highlightedClass.time}</span>
                </div>
              </div>

              <Link
                href={highlightedClass.streamUrl}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <PlayCircle size={16} weight="bold" />
                <span>Join to the class</span>
              </Link>
            </div>
          </div>

          {/* Time Marker 14:00 */}
          <div className="relative">
            <span className="absolute -left-12 top-0 text-[10px] font-mono font-bold text-muted-foreground">
              14:00
            </span>
            <div className="p-2.5 rounded-xl border border-border/50 bg-muted/30 text-xs">
              <p className="font-bold text-foreground truncate">Exam Submissions Review</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">45 min • Cohort Q&A</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
