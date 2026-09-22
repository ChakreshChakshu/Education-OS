"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import HlsVideoPlayer from "@/components/media/HlsVideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  PlayCircle,
  Bookmarks,
  NotePencil,
  Question,
  FileText,
  Clock,
  Check,
  ListBullets,
  Sparkle
} from "@phosphor-icons/react";

export default function ClassroomLessonPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { id: courseId, lessonId } = params;
  const { user } = useAuth();
  const playerRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState("chapters"); // 'chapters' | 'notes' | 'quiz'
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [studentNotes, setStudentNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);

  // Default demonstration curriculum data
  const defaultModules = [
    {
      id: "mod_1",
      title: "Module 1: Domain-Driven Architecture",
      lessons: [
        {
          id: "lesson_1",
          title: "Introduction to Clean Architecture & Domain Boundaries",
          duration: "08:45",
          contentType: "VIDEO",
          hlsUrl: "http://localhost:3001/uploads/hls/3300f639-98b8-491d-bac2-769503c599ea/master.m3u8",
          fallbackUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
          chapters: [
            { time: 0, title: "Architecture Philosophy & Layer Rules" },
            { time: 60, title: "Domain Entities vs Value Objects" },
            { time: 180, title: "Aggregate Roots & Consistency Boundaries" }
          ]
        },
        {
          id: "lesson_2",
          title: "Transactional Outbox Pattern & Background Workers",
          duration: "12:20",
          contentType: "VIDEO",
          hlsUrl: "http://localhost:3001/uploads/hls/3300f639-98b8-491d-bac2-769503c599ea/master.m3u8",
          chapters: [
            { time: 0, title: "The Dual-Write Problem" },
            { time: 120, title: "Neon Postgres Outbox Tables" },
            { time: 280, title: "SKIP LOCKED Queue Dequeuing" }
          ]
        },
        {
          id: "lesson_3",
          title: "Multi-bitrate Video Transcoding with FFmpeg",
          duration: "15:00",
          contentType: "VIDEO",
          hlsUrl: "http://localhost:3001/uploads/hls/3300f639-98b8-491d-bac2-769503c599ea/master.m3u8",
          chapters: [
            { time: 0, title: "HLS Specification & Master Playlists" },
            { time: 90, title: "Resolution Variants (360p, 720p, 1080p)" },
            { time: 240, title: "Serving Segmented Media at Scale" }
          ]
        }
      ]
    },
    {
      id: "mod_2",
      title: "Module 2: Real-World Implementation",
      lessons: [
        {
          id: "lesson_4",
          title: "Architecture Assessment Quiz",
          duration: "05:00",
          contentType: "QUIZ"
        }
      ]
    }
  ];

  // Flattened lessons list
  const allLessons = defaultModules.flatMap((m) => m.lessons);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const nextLesson = allLessons[currentLessonIndex + 1] || null;
  const prevLesson = allLessons[currentLessonIndex - 1] || null;

  useEffect(() => {
    async function loadCourse() {
      setLoading(true);
      const res = await ApiClient.getCourseById(courseId);
      if (res.success && res.data) {
        setCourse(res.data);
      } else {
        setCourse({
          id: courseId,
          code: "EOS-401",
          title: "Enterprise Educational Operating System Architecture"
        });
      }
      setModules(defaultModules);

      // Load saved notes from localStorage
      const savedNotes = localStorage.getItem(`eos_notes_${currentLesson.id}`);
      if (savedNotes) {
        setStudentNotes(savedNotes);
      } else {
        setStudentNotes("");
      }

      setLoading(false);
    }
    loadCourse();
  }, [courseId, lessonId, currentLesson.id]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setStudentNotes(val);
    localStorage.setItem(`eos_notes_${currentLesson.id}`, val);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleChapterClick = (time) => {
    // If player exposed seekTo, invoke it
    const playerEl = document.querySelector(".group");
    if (playerEl && typeof playerEl.seekTo === "function") {
      playerEl.seekTo(time);
    }
  };

  const toggleLessonComplete = (id) => {
    const next = new Set(completedLessons);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCompletedLessons(next);
  };

  const handleQuizAnswer = (optionKey) => {
    setSelectedOption(optionKey);
    setQuizSubmitted(true);
    const correct = optionKey === "B";
    setQuizCorrect(correct);
    if (correct) {
      setCompletedLessons(new Set([...completedLessons, currentLesson.id]));
    }
  };

  const progressPercent = Math.round((completedLessons.size / allLessons.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Entering Classroom...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Classroom Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Back to Course</span>
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="font-mono text-[11px] font-bold px-2 py-0.2">
              {course?.code || "EOS-401"}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            {currentLesson.title}
          </h1>
        </div>

        {/* Progress & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Course Progress</span>
            <span className="text-sm font-mono font-extrabold text-primary">
              {progressPercent}% ({completedLessons.size}/{allLessons.length})
            </span>
          </div>

          <Button
            onClick={() => toggleLessonComplete(currentLesson.id)}
            variant={completedLessons.has(currentLesson.id) ? "success" : "outline"}
            size="sm"
            className="gap-2 font-bold"
          >
            <CheckCircle size={16} weight="bold" />
            <span>{completedLessons.has(currentLesson.id) ? "Completed" : "Mark Complete"}</span>
          </Button>

          {nextLesson && (
            <Link href={`/dashboard/courses/${courseId}/lesson/${nextLesson.id}`}>
              <Button size="sm" className="gap-1.5 font-bold">
                <span>Next</span>
                <ArrowRight size={14} weight="bold" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Classroom Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PLAYER & INTERACTIVE WORKSPACE (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Custom HLS Video Player */}
          {currentLesson.contentType === "VIDEO" ? (
            <HlsVideoPlayer
              ref={playerRef}
              src={currentLesson.hlsUrl}
              title={currentLesson.title}
              chapters={currentLesson.chapters || []}
              onEnded={() => toggleLessonComplete(currentLesson.id)}
            />
          ) : (
            /* Quiz / Text Lesson Stage */
            <Card className="p-8 bg-card border-border rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                <Question size={32} weight="bold" />
              </div>
              <h2 className="text-xl font-bold">{currentLesson.title}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Complete the checkpoint evaluation below to advance your course progress.
              </p>
            </Card>
          )}

          {/* Interactive Workspace Navigation Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <button
                onClick={() => setActiveTab("chapters")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "chapters"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <ListBullets size={16} weight="bold" />
                <span>Chapters & Milestones</span>
                {currentLesson.chapters && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                    {currentLesson.chapters.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "notes"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <NotePencil size={16} weight="bold" />
                <span>My Notes</span>
                {studentNotes && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "quiz"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Sparkle size={16} weight="bold" />
                <span>Knowledge Check</span>
              </button>
            </div>

            {/* Tab 1: Chapters & Milestones */}
            {activeTab === "chapters" && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                {currentLesson.chapters && currentLesson.chapters.length > 0 ? (
                  currentLesson.chapters.map((ch, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleChapterClick(ch.time)}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/40 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors font-mono font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {ch.title}
                          </p>
                          <span className="text-xs text-muted-foreground font-mono">
                            Starts at {Math.floor(ch.time / 60)}:{(ch.time % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs group-hover:border-primary/30">
                        Jump ➔
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border">
                    No chapter checkpoints defined for this lesson.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Interactive Student Notes with LocalStorage Autosave */}
            {activeTab === "notes" && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Take notes while watching. Auto-saved locally.</span>
                  {notesSaved ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold font-mono">
                      <Check size={14} weight="bold" /> Saved
                    </span>
                  ) : (
                    <span className="font-mono text-[11px]">Autosave enabled</span>
                  )}
                </div>
                <textarea
                  value={studentNotes}
                  onChange={handleNotesChange}
                  placeholder="Jot down architecture notes, code snippets, or questions..."
                  className="w-full h-44 p-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono resize-y"
                />
              </div>
            )}

            {/* Tab 3: Knowledge Check Quiz */}
            {activeTab === "quiz" && (
              <Card className="border-border bg-card p-6 rounded-2xl animate-in fade-in duration-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <Sparkle size={16} weight="bold" />
                    <span>Quick Architecture Checkpoint</span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    In the Transactional Outbox pattern, why are domain events written to the database instead of directly published to message queues?
                  </h3>

                  <div className="space-y-2">
                    {[
                      { key: "A", text: "Because message queues cannot store JSON payloads" },
                      { key: "B", text: "To eliminate dual-write partial failures by participating in the same database transaction" },
                      { key: "C", text: "To avoid encrypting network packets over HTTP" },
                      { key: "D", text: "Because PostgreSQL has higher throughput than all external message brokers" }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleQuizAnswer(opt.key)}
                        disabled={quizSubmitted}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-medium transition-all ${
                          selectedOption === opt.key
                            ? opt.key === "B"
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                              : "bg-red-500/10 border-red-500/50 text-red-400"
                            : "border-border hover:bg-muted/50 hover:border-primary/40 text-foreground"
                        }`}
                      >
                        <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    ))}
                  </div>

                  {quizSubmitted && (
                    <div
                      className={`p-4 rounded-xl border text-xs leading-relaxed ${
                        quizCorrect
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                          : "bg-red-500/10 border-red-500/30 text-red-400 font-medium"
                      }`}
                    >
                      {quizCorrect ? (
                        <span>
                          <strong>Correct!</strong> Relational DB commits guarantee that business state and outbox event records are saved atomically, eliminating dual-write failures.
                        </span>
                      ) : (
                        <span>
                          <strong>Incorrect.</strong> Option B is correct: External queues cannot join ACID database transactions, causing dual-write race conditions.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CURRICULUM DRAWER (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmarks size={18} weight="bold" className="text-primary" />
                <CardTitle className="text-sm font-bold">Course Curriculum</CardTitle>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {allLessons.length} Lessons
              </span>
            </CardHeader>

            <CardContent className="p-3 space-y-4">
              {modules.map((mod, modIdx) => (
                <div key={mod.id} className="space-y-1.5">
                  <div className="px-2 py-1 text-[11px] uppercase font-bold text-muted-foreground/80 tracking-wider">
                    {mod.title}
                  </div>

                  <div className="space-y-1">
                    {mod.lessons.map((les) => {
                      const isActive = les.id === currentLesson.id;
                      const isComplete = completedLessons.has(les.id);

                      return (
                        <Link
                          key={les.id}
                          href={`/dashboard/courses/${courseId}/lesson/${les.id}`}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                            isActive
                              ? "bg-primary/10 border border-primary/40 text-primary font-bold shadow-sm"
                              : "hover:bg-muted/60 text-foreground border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {isComplete ? (
                              <CheckCircle size={16} weight="fill" className="text-emerald-500 shrink-0" />
                            ) : isActive ? (
                              <PlayCircle size={16} weight="fill" className="text-primary shrink-0 animate-pulse" />
                            ) : (
                              <Circle size={16} className="text-muted-foreground shrink-0" />
                            )}
                            <span className="line-clamp-1">{les.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground shrink-0">
                            <Clock size={12} />
                            <span>{les.duration}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
