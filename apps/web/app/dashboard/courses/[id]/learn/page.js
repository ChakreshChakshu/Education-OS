"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  CheckSquare, 
  CheckCircle, 
  PlayCircle, 
  BookBookmark,
  Hourglass,
  Trophy,
  GraduationCap
} from "@phosphor-icons/react";

export default function StudentLMSPlayerPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const courseId = params.id;
  const { activeTenant, user } = useAuth();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [completedModuleIds, setCompletedModuleIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const courseRes = await ApiClient.getCourseById(courseId);
      if (courseRes.success && courseRes.data) {
        setCourse(courseRes.data);
      } else {
        setCourse({
          id: courseId,
          code: "CS-101",
          title: "Enterprise Educational Architecture",
          description: "Learn domain aggregates, clean architecture, and scalable system design.",
          duration: "4 Weeks"
        });
      }

      const modulesRes = await ApiClient.getCourseModules(courseId);
      if (modulesRes.success && Array.isArray(modulesRes.data) && modulesRes.data.length > 0) {
        setModules(modulesRes.data);
      } else {
        // Sample demonstration modules if clean course has no modules yet
        setModules([
          {
            id: "mod_demo_1",
            title: "Lecture 1: Introduction to Clean Domain Aggregates",
            contentType: "VIDEO",
            contentUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            order: 1
          },
          {
            id: "mod_demo_2",
            title: "Reading: Domain-Driven Design Reference Guide (PDF)",
            contentType: "DOCUMENT",
            contentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            order: 2
          },
          {
            id: "mod_demo_3",
            title: "Knowledge Check: Architecture Assessment Quiz",
            contentType: "QUIZ",
            quiz: {
              question: "What is the primary boundary for consistency in Domain-Driven Design?",
              options: [
                { key: "A", text: "Domain Aggregate Root" },
                { key: "B", text: "Database ORM Model" },
                { key: "C", text: "REST API Endpoint Route" },
                { key: "D", text: "Microservice Container" }
              ],
              correct: "A"
            },
            order: 3
          }
        ]);
      }
      setLoading(false);
    }

    loadData();
  }, [courseId]);

  const activeModule = modules[activeModuleIndex] || null;

  const toggleComplete = (modId) => {
    const next = new Set(completedModuleIds);
    if (next.has(modId)) {
      next.delete(modId);
    } else {
      next.add(modId);
    }
    setCompletedModuleIds(next);
  };

  const handleQuizSubmit = (e) => {
    e.preventDefault();
    if (!selectedQuizOption || !activeModule?.quiz) return;

    const isCorrect = selectedQuizOption === activeModule.quiz.correct;
    setQuizSubmitted(true);
    setQuizScore(isCorrect ? 100 : 0);

    if (isCorrect) {
      setCompletedModuleIds(new Set([...completedModuleIds, activeModule.id]));
    }
  };

  const resetQuiz = () => {
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading Student Classroom...</div>;
  }

  const progressPercent = modules.length > 0 
    ? Math.round((completedModuleIds.size / modules.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border">
        <div className="space-y-1">
          <Link href={`/dashboard/courses/${courseId}`} className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft size={16} weight="bold" /> Back to Course Builder
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs font-bold px-2.5 py-0.5">{course?.code || "CS-101"}</Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{course?.title}</h1>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground uppercase">Course Completion</p>
            <p className="text-lg font-extrabold text-primary">{progressPercent}% ({completedModuleIds.size}/{modules.length})</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <Trophy size={26} weight="bold" />
          </div>
        </div>
      </div>

      {/* Main Student Classroom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: ACTIVE CONTENT PLAYER */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border-border bg-card p-0 rounded-2xl">
            <CardHeader className="border-b border-border p-5 bg-card flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono font-bold uppercase gap-1">
                    {activeModule?.contentType === "VIDEO" && <Video size={14} />}
                    {activeModule?.contentType === "DOCUMENT" && <FileText size={14} />}
                    {activeModule?.contentType === "QUIZ" && <CheckSquare size={14} />}
                    {activeModule?.contentType}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono font-semibold">Lesson #{activeModuleIndex + 1}</span>
                </div>
                <CardTitle className="text-xl font-bold">{activeModule?.title || "Select a Lesson"}</CardTitle>
              </div>

              {activeModule && (
                <Button
                  onClick={() => toggleComplete(activeModule.id)}
                  variant={completedModuleIds.has(activeModule.id) ? "success" : "outline"}
                  size="sm"
                  className="gap-2 font-bold shrink-0"
                >
                  <CheckCircle size={18} weight="bold" />
                  {completedModuleIds.has(activeModule.id) ? "Completed" : "Mark Complete"}
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-6">
              {/* VIDEO PLAYER */}
              {activeModule?.contentType === "VIDEO" && (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-xl bg-black overflow-hidden border border-border flex items-center justify-center relative">
                    {activeModule.contentUrl && activeModule.contentUrl.endsWith(".mp4") ? (
                      <video 
                        controls 
                        className="w-full h-full object-contain"
                        src={activeModule.contentUrl}
                      />
                    ) : (
                      <div className="text-center space-y-3 p-8">
                        <PlayCircle size={64} className="text-primary mx-auto animate-pulse" />
                        <p className="text-base font-bold text-foreground">{activeModule.title}</p>
                        <p className="text-xs font-mono text-muted-foreground">{activeModule.contentUrl}</p>
                        <a href={activeModule.contentUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" className="gap-2 font-bold mt-2">
                            Open Video Stream Source
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-background space-y-1">
                    <p className="text-sm font-bold">Lecture Instructions</p>
                    <p className="text-xs text-muted-foreground font-medium">Watch the video lecture carefully to unlock the next module.</p>
                  </div>
                </div>
              )}

              {/* DOCUMENT READ ASSIGNMENT */}
              {activeModule?.contentType === "DOCUMENT" && (
                <div className="space-y-4">
                  <div className="p-8 rounded-xl border border-border bg-background text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <FileText size={40} weight="bold" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{activeModule.title}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{activeModule.contentUrl}</p>
                    </div>
                    <a href={activeModule.contentUrl} target="_blank" rel="noreferrer">
                      <Button size="lg" className="gap-2 font-bold">
                        Download / Read PDF Document
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {/* QUIZ ASSESSMENT PLAYER */}
              {activeModule?.contentType === "QUIZ" && activeModule?.quiz && (
                <div className="space-y-6 max-w-xl mx-auto py-2">
                  <div className="p-5 rounded-xl border border-border bg-background space-y-3">
                    <span className="text-xs uppercase font-bold text-primary tracking-wider">Knowledge Assessment</span>
                    <h3 className="text-lg font-bold leading-snug">{activeModule.quiz.question}</h3>
                  </div>

                  {!quizSubmitted ? (
                    <form onSubmit={handleQuizSubmit} className="space-y-4">
                      <div className="space-y-2.5">
                        {activeModule.quiz.options.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSelectedQuizOption(opt.key)}
                            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                              selectedQuizOption === opt.key
                                ? "border-primary bg-primary/10 text-foreground font-bold"
                                : "border-border bg-background hover:border-foreground/30 text-foreground font-medium"
                            }`}
                          >
                            <span className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center font-bold text-sm shrink-0">
                              {opt.key}
                            </span>
                            <span className="text-sm">{opt.text}</span>
                          </button>
                        ))}
                      </div>

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full font-bold h-12 text-base mt-2" 
                        disabled={!selectedQuizOption}
                      >
                        Submit Answer Key
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-4 text-center p-6 rounded-xl border border-border bg-background">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
                        quizScore === 100 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        <Trophy size={36} weight="bold" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-extrabold">
                          {quizScore === 100 ? "Assessment Passed! 100%" : "Incorrect Answer (0%)"}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium">
                          {quizScore === 100 
                            ? "Great job! Lesson marked as completed in your roster." 
                            : `Correct answer was Option ${activeModule.quiz.correct}. Try again!`}
                        </p>
                      </div>
                      <Button onClick={resetQuiz} variant="outline" size="sm" className="font-bold">
                        Retake Assessment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: MODULE NAVIGATION SIDEBAR */}
        <div className="space-y-4">
          <Card className="border-border bg-card p-0 rounded-2xl">
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="text-lg font-bold">Curriculum Syllabus</CardTitle>
              <CardDescription className="text-xs font-medium">Click any lesson to open classroom player</CardDescription>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {modules.map((mod, idx) => {
                const isActive = idx === activeModuleIndex;
                const isDone = completedModuleIds.has(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => { setActiveModuleIndex(idx); resetQuiz(); }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-bold"
                        : "border-border/60 bg-background hover:bg-card text-foreground font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isDone ? "bg-success text-success-foreground" : "bg-card border border-border text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle size={18} weight="bold" /> : `#${idx + 1}`}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold truncate leading-snug">{mod.title}</p>
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">{mod.contentType}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
