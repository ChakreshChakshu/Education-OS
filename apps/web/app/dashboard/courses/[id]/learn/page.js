"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import HlsVideoPlayer from "@/components/media/HlsVideoPlayer";
import { McqQuizPlayer } from "@/components/assessments/mcq-quiz-player";
import { AssignmentSubmissionPlayer } from "@/components/assessments/assignment-submission-player";
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
  GraduationCap,
  FilePdf
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
            title: "Knowledge Check: Architecture Assessment Quiz (Type A)",
            contentType: "QUIZ",
            quiz: {
              title: "Architecture Core Knowledge Check",
              timeLimitMinutes: 15,
              passingScore: 70,
              maxAttempts: 3,
              shuffleQuestions: true,
              questions: [
                {
                  id: "q1",
                  questionType: "SINGLE_CHOICE",
                  title: "What is the primary boundary for consistency in Domain-Driven Design?",
                  points: 10,
                  explanation: "The Domain Aggregate Root encapsulates entities and enforces business invariants atomically.",
                  options: [
                    { id: "A", key: "A", label: "Domain Aggregate Root", isCorrect: true },
                    { id: "B", key: "B", label: "Database ORM Model", isCorrect: false },
                    { id: "C", key: "C", label: "REST API Endpoint Route", isCorrect: false },
                    { id: "D", key: "D", label: "Microservice Container", isCorrect: false }
                  ]
                },
                {
                  id: "q2",
                  questionType: "TRUE_FALSE",
                  title: "In clean architecture, the domain layer may directly import external database ORM libraries.",
                  points: 10,
                  explanation: "The domain layer must remain pure and free from infrastructure or database coupling.",
                  options: [
                    { id: "A", key: "A", label: "True", isCorrect: false },
                    { id: "B", key: "B", label: "False", isCorrect: true }
                  ]
                }
              ]
            },
            order: 3
          },
          {
            id: "mod_demo_4",
            title: "Homework: Distributed Sagas Problem Set (Type B)",
            contentType: "ASSIGNMENT",
            quiz: {
              title: "Distributed Sagas & Idempotency Lab Report",
              instructions: "Download the problem set template. Analyze two-phase commit vs saga orchestrator patterns, and upload your PDF submission.",
              templatePdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              templateFileName: "Sagas_Problem_Set_Handout.pdf",
              dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
              passingScore: 70,
              maxFileSizeMB: 25,
              rubricCriteria: [
                { id: "c1", name: "Methodology & Architecture", maxPoints: 15, description: "Clear decomposition of compensation steps." },
                { id: "c2", name: "Failure Mode Proofs", maxPoints: 15, description: "Validation under network partition." },
                { id: "c3", name: "PDF Standard Formatting", maxPoints: 5, description: "Compliance with university standards." }
              ]
            },
            order: 4
          }
        ]);
      }
      setLoading(false);
    }

    loadData();
  }, [courseId]);

  const activeModule = modules[activeModuleIndex] || null;

  const toggleComplete = async (modId) => {
    const next = new Set(completedModuleIds);
    const isNowDone = !next.has(modId);
    if (isNowDone) {
      next.add(modId);
    } else {
      next.delete(modId);
    }
    setCompletedModuleIds(next);

    if (isNowDone && user?.id) {
      await ApiClient.completeLesson({
        studentUserId: user.id,
        lessonModuleId: modId,
        batchId: course?.batchId
      });
    }
  };

  const handleAssessmentCompleted = (result) => {
    if (activeModule?.id) {
      setCompletedModuleIds(new Set([...completedModuleIds, activeModule.id]));
      if (user?.id) {
        ApiClient.completeLesson({
          studentUserId: user.id,
          lessonModuleId: activeModule.id,
          batchId: course?.batchId
        });
      }
    }
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
                  <Badge
                    variant={activeModule?.contentType === "ASSIGNMENT" ? "outline" : "secondary"}
                    className={`text-xs font-mono font-bold uppercase gap-1 ${
                      activeModule?.contentType === "ASSIGNMENT" ? "border-indigo-400/40 text-indigo-400 bg-indigo-500/10" : ""
                    }`}
                  >
                    {activeModule?.contentType === "VIDEO" && <Video size={14} />}
                    {activeModule?.contentType === "DOCUMENT" && <FileText size={14} />}
                    {activeModule?.contentType === "QUIZ" && <CheckSquare size={14} />}
                    {activeModule?.contentType === "ASSIGNMENT" && <FilePdf size={14} />}
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
                  className="gap-2 font-bold shrink-0 cursor-pointer"
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
                  <HlsVideoPlayer
                    src={activeModule.hlsUrl || activeModule.contentUrl || "http://localhost:3001/uploads/hls/3300f639-98b8-491d-bac2-769503c599ea/master.m3u8"}
                    title={activeModule.title}
                    chapters={[
                      { time: 0, title: "Introduction" },
                      { time: 60, title: "Architecture Core" },
                      { time: 180, title: "Implementation Summary" }
                    ]}
                    onEnded={() => toggleComplete(activeModule.id)}
                  />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-sm font-bold text-foreground">Lecture Workspace</p>
                      <p className="text-xs text-muted-foreground">Open in full minimalist classroom view with interactive chapter checkpoints and autosaved notes.</p>
                    </div>
                    <Link href={`/dashboard/courses/${courseId}/lesson/${activeModule.id}`}>
                      <Button size="sm" className="font-bold gap-2 shrink-0 cursor-pointer">
                        <span>Open Classroom View</span>
                      </Button>
                    </Link>
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
                      <Button size="lg" className="gap-2 font-bold cursor-pointer">
                        Download / Read PDF Document
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {/* TYPE A: MCQ-STYLE QUIZ PLAYER */}
              {activeModule?.contentType === "QUIZ" && (
                <McqQuizPlayer
                  quizConfig={activeModule.quiz || activeModule}
                  moduleId={activeModule.id}
                  studentUser={user}
                  onCompleted={handleAssessmentCompleted}
                />
              )}

              {/* TYPE B: PDF SUBMISSION-STYLE ASSESSMENT PLAYER */}
              {activeModule?.contentType === "ASSIGNMENT" && (
                <AssignmentSubmissionPlayer
                  assignmentConfig={activeModule.quiz || activeModule}
                  courseId={courseId}
                  moduleId={activeModule.id}
                  studentUser={user}
                  onCompleted={handleAssessmentCompleted}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: MODULE NAVIGATION SIDEBAR */}
        <div className="space-y-4">
          <Card className="border-border bg-card p-0 rounded-2xl">
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="text-lg font-bold">Curriculum Syllabus</CardTitle>
              <CardDescription className="text-xs font-medium">Click any lesson or assessment to open</CardDescription>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {modules.map((mod, idx) => {
                const isActive = idx === activeModuleIndex;
                const isDone = completedModuleIds.has(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModuleIndex(idx)}
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
                        <p className="text-sm truncate">{mod.title}</p>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {mod.contentType}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isDone ? (
                        <span className="text-xs text-success font-bold">Done</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Start</span>
                      )}
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
