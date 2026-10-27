"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle, 
  Clock, 
  DotsThreeVertical, 
  FileText, 
  Video, 
  CheckSquare, 
  ArrowRight,
  Sparkle
} from "@phosphor-icons/react";

export function DashboardTaskList({ enrolledCourses = [] }) {
  // Synthesize tasks from real enrolled course modules or clean syllabus tasks
  const initialTasks = [
    {
      id: "tsk-1",
      title: "Domain Entities vs Value Objects Architecture",
      subject: "CS-101 Clean Arch",
      dueDate: "Today, 11:59 PM",
      type: "VIDEO",
      completed: true,
      courseId: enrolledCourses[0]?.courseId || enrolledCourses[0]?.id || "default"
    },
    {
      id: "tsk-2",
      title: "Transactional Outbox Pattern & Queue Workers",
      subject: "Distributed Systems",
      dueDate: "Tomorrow",
      type: "DOCUMENT",
      completed: false,
      courseId: enrolledCourses[1]?.courseId || enrolledCourses[0]?.courseId || "default"
    },
    {
      id: "tsk-3",
      title: "HLS Multi-bitrate Video Transcoding Assessment",
      subject: "Media Engineering",
      dueDate: "Oct 29",
      type: "QUIZ",
      completed: false,
      courseId: enrolledCourses[0]?.courseId || "default"
    },
    {
      id: "tsk-4",
      title: "PostgreSQL SKIP LOCKED Concurrency Quiz",
      subject: "Database Systems",
      dueDate: "Nov 01",
      type: "QUIZ",
      completed: false,
      courseId: enrolledCourses[1]?.courseId || "default"
    }
  ];

  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
            Today Tasks
          </h2>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
            {tasks.length} results
          </span>
        </div>

        <Link 
          href="/dashboard/courses" 
          className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-primary dark:hover:underline flex items-center gap-1 transition-colors"
        >
          View all tasks <ArrowRight size={13} weight="bold" />
        </Link>
      </div>

      {/* Task List Items */}
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all ${
              task.completed 
                ? "bg-muted/20 border-border/40 opacity-75" 
                : "bg-card border-border/60 hover:border-primary/40 hover:shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Type Icon Badge */}
              <div 
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  task.type === "QUIZ" 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : task.type === "VIDEO"
                    ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}
              >
                {task.type === "QUIZ" ? (
                  <Sparkle size={18} weight="bold" />
                ) : task.type === "VIDEO" ? (
                  <Video size={18} weight="bold" />
                ) : (
                  <FileText size={18} weight="bold" />
                )}
              </div>

              {/* Title & Subject */}
              <div className="min-w-0">
                <p 
                  className={`text-xs sm:text-sm font-bold truncate ${
                    task.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="font-mono font-bold">{task.subject}</span>
                  <span>•</span>
                  <span>{task.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Checkbox & Menu Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleTask(task.id)}
                className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                  task.completed 
                    ? "bg-emerald-500 text-white border-emerald-500" 
                    : "border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-500"
                }`}
                title={task.completed ? "Mark incomplete" : "Mark completed"}
              >
                <CheckCircle size={16} weight={task.completed ? "fill" : "bold"} />
              </button>

              <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <DotsThreeVertical size={16} weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
