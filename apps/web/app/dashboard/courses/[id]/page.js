"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaUploader } from "@/components/ui/media-uploader";
import { resolveCourseThumbnail, handleCourseImageError } from "@/lib/course-media";
import { 
  ArrowLeft, 
  Plus, 
  Video, 
  FileText, 
  CheckSquare, 
  Clock, 
  GraduationCap, 
  X, 
  Trash,
  Pencil,
  BookBookmark,
  Hourglass,
  PlayCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  Check,
  Sparkle
} from "@phosphor-icons/react";

export default function CourseDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const courseId = params.id;
  const { activeTenant } = useAuth();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("curriculum"); // "curriculum" | "details"

  // Modal State
  const [modalType, setModalType] = useState(null); // null | "VIDEO" | "DOCUMENT" | "QUIZ"
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(15);
  
  // Quiz State
  const [quizQuestion, setQuizQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctOpt, setCorrectOpt] = useState("A");
  const [hlsUrl, setHlsUrl] = useState("");
  const [courseProgress, setCourseProgress] = useState({ completedLessonIds: [], progressPercent: 0, completedCount: 0 });
  const [previewLesson, setPreviewLesson] = useState(null);
  const [quizTestSelected, setQuizTestSelected] = useState(null);

  useEffect(() => {
    async function loadCourseData() {
      setLoading(true);
      // Load Course
      const courseRes = await ApiClient.getCourseById(courseId);
      if (courseRes.success && courseRes.data) {
        setCourse({
          ...courseRes.data,
          duration: courseRes.data.duration || (courseRes.data.credits ? `${courseRes.data.credits * 2} Weeks` : "4 Weeks")
        });
      } else {
        // Fallback default course context
        setCourse({
          id: courseId,
          code: "CS-101",
          title: "Course Curriculum Builder",
          description: "Manage lesson modules, video streams, reading assets, and quiz assessments.",
          duration: "4 Weeks",
          status: "ACTIVE"
        });
      }

      // Load Modules
      const modulesRes = await ApiClient.getCourseModules(courseId);
      if (modulesRes.success && Array.isArray(modulesRes.data)) {
        setModules(modulesRes.data);
      }

      // Load Progress
      try {
        const progRes = await ApiClient.getCourseProgress(courseId);
        if (progRes.success && progRes.data) {
          setCourseProgress(progRes.data);
        }
      } catch (e) {
        console.warn("Could not fetch course progress:", e.message);
      }

      setLoading(false);
    }

    loadCourseData();
  }, [courseId]);

  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!title) return;

    let payload = {
      title,
      contentType: modalType,
      contentUrl: url || "#",
      hlsUrl: hlsUrl || (url.includes('.m3u8') ? url : null),
      order: editingModuleId ? (modules.find(m => m.id === editingModuleId)?.order || 1) : (modules.length + 1)
    };

    if (modalType === "QUIZ") {
      payload.quiz = {
        question: quizQuestion,
        options: [
          { key: "A", text: optA },
          { key: "B", text: optB },
          { key: "C", text: optC },
          { key: "D", text: optD }
        ].filter(o => o.text),
        correct: correctOpt
      };
    }

    if (editingModuleId) {
      const res = await ApiClient.updateCourseModule(courseId, editingModuleId, payload);
      if (res.success && res.data) {
        setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...res.data } : m));
      } else {
        setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...payload } : m));
      }
    } else {
      const res = await ApiClient.createCourseModule(courseId, payload);
      const createdModule = (res.success && res.data) ? res.data : {
        id: "module_" + Date.now(),
        courseId,
        ...payload,
        status: "PUBLISHED"
      };
      setModules([...modules, createdModule]);
    }

    closeModal();
  };

  const handleOpenEditModule = (mod) => {
    setEditingModuleId(mod.id);
    setModalType(mod.contentType || "VIDEO");
    setTitle(mod.title || "");
    setUrl(mod.contentUrl || "");
    setHlsUrl(mod.hlsUrl || "");
    if (mod.quiz) {
      setQuizQuestion(mod.quiz.question || "");
      const opts = mod.quiz.options || [];
      setOptA(opts.find(o => o.key === "A")?.text || opts[0]?.text || "");
      setOptB(opts.find(o => o.key === "B")?.text || opts[1]?.text || "");
      setOptC(opts.find(o => o.key === "C")?.text || opts[2]?.text || "");
      setOptD(opts.find(o => o.key === "D")?.text || opts[3]?.text || "");
      setCorrectOpt(mod.quiz.correct || "A");
    } else {
      setQuizQuestion("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setCorrectOpt("A");
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    setIsDeleting(moduleId);
    try {
      const res = await ApiClient.deleteCourseModule(courseId, moduleId);
      if (res.success) {
        setModules(modules.filter(m => m.id !== moduleId));
      } else {
        alert(res.error || "Failed to delete module");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setModules(modules.filter(m => m.id !== moduleId));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMoveModule = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const updated = [...modules];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Update order numbers
    const reordered = updated.map((m, idx) => ({ ...m, order: idx + 1 }));
    setModules(reordered);

    // Save order changes
    try {
      await ApiClient.updateCourseModule(courseId, temp.id, { order: targetIndex + 1 });
      await ApiClient.updateCourseModule(courseId, updated[index].id, { order: index + 1 });
    } catch (e) {
      console.warn("Could not persist module reordering:", e);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingModuleId(null);
    setTitle("");
    setUrl("");
    setHlsUrl("");
    setDuration(15);
    setQuizQuestion("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectOpt("A");
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Top Navigation & Course Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />

          <Card className="p-6 md:p-8 rounded-2xl border border-border shadow-xs bg-card">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex flex-col sm:flex-row items-start gap-5 w-full">
                <Skeleton className="w-32 h-24 sm:w-40 sm:h-28 rounded-xl shrink-0" />
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-8 w-3/4 max-w-lg rounded-lg" />
                  <Skeleton className="h-4 w-full max-w-md rounded" />
                  <div className="flex items-center gap-3 pt-1">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs Skeleton */}
        <div className="flex border-b border-border pb-px gap-6">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        {/* Modules Skeleton Cards */}
        <div className="space-y-6">
          {[1, 2, 3].map((mod) => (
            <Card key={mod} className="border-border bg-card rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-20 rounded-md" />
                    <Skeleton className="h-6 w-48 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                {[1, 2].map((lesson) => (
                  <div
                    key={lesson}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-background/50 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-44 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Skeleton className="h-7 w-16 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Navigation & Course Header */}
      <div className="space-y-4">
        <Link href="/dashboard/courses" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} weight="bold" /> Back to Catalog
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img 
              src={resolveCourseThumbnail(course)} 
              alt={course?.title || "Course thumbnail"}
              onError={(e) => handleCourseImageError(e, course)}
              className="w-32 h-24 sm:w-40 sm:h-28 rounded-xl object-cover border border-border shrink-0 shadow-xs" 
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-0.5">{course?.code || "CS-101"}</Badge>
                {course?.level && (
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                    {course.level}
                  </Badge>
                )}
                <Badge variant="success" className="text-xs font-bold px-3 py-0.5">{course?.status || "ACTIVE"}</Badge>
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Hourglass size={15} /> {course?.duration || "4 Weeks"}
                </span>
                {course?.credits && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    • {course.credits} Credits
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{course?.title}</h1>
              <p className="text-sm text-muted-foreground max-w-3xl font-medium">{course?.description}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {modules.length > 0 && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-border min-w-[170px]">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">My Progress</span>
                  <span className="text-primary font-mono font-extrabold">{courseProgress.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${courseProgress.progressPercent || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {courseProgress.completedCount || (courseProgress.completedLessonIds?.length || 0)} of {modules.length} completed
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={`/dashboard/courses/${courseId}/lesson/${modules[0]?.id || "default"}`}>
                <Button size="lg" variant="default" className="gap-2 font-bold bg-primary text-primary-foreground shadow-xs">
                  <PlayCircle size={22} weight="bold" /> Student Classroom
                </Button>
              </Link>
              <Button onClick={() => setModalType("VIDEO")} variant="secondary" size="lg" className="gap-2 font-bold">
                <Video size={20} weight="bold" /> Add Video
              </Button>
              <Button onClick={() => setModalType("DOCUMENT")} variant="secondary" size="lg" className="gap-2 font-bold">
                <FileText size={20} weight="bold" /> Add Reading
              </Button>
              <Button onClick={() => setModalType("QUIZ")} variant="outline" size="lg" className="gap-2 font-bold">
                <CheckSquare size={20} weight="bold" /> Add Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-base font-bold gap-6">
        <button
          onClick={() => setActiveTab("curriculum")}
          className={`pb-3 transition-colors cursor-pointer border-b-2 ${
            activeTab === "curriculum"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Curriculum Modules ({modules.length})
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-3 transition-colors cursor-pointer border-b-2 ${
            activeTab === "details"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Course Settings
        </button>
      </div>

      {/* TAB 1: CURRICULUM MODULES */}
      {activeTab === "curriculum" && (
        <div className="space-y-4">
          {modules.length === 0 ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4 border-dashed border-2 border-border/80 rounded-2xl">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <BookBookmark size={36} weight="bold" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-xl font-bold">Curriculum Empty</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Add video lectures, PDF reading assignments, and interactive quizzes to build this course curriculum.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setModalType("VIDEO")} size="sm" className="gap-2 font-bold">
                  <Video size={16} /> Add Video
                </Button>
                <Button onClick={() => setModalType("DOCUMENT")} variant="secondary" size="sm" className="gap-2 font-bold">
                  <FileText size={16} /> Add Reading
                </Button>
                <Button onClick={() => setModalType("QUIZ")} variant="outline" size="sm" className="gap-2 font-bold">
                  <CheckSquare size={16} /> Add Quiz
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Curriculum Outline Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Curriculum Outline</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{modules.length} Lessons</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={() => setModalType("VIDEO")} size="sm" variant="outline" className="gap-1.5 text-xs font-bold h-8 cursor-pointer">
                    <Plus size={13} weight="bold" /> Add Video
                  </Button>
                  <Button onClick={() => setModalType("DOCUMENT")} size="sm" variant="outline" className="gap-1.5 text-xs font-bold h-8 cursor-pointer">
                    <Plus size={13} weight="bold" /> Add Reading
                  </Button>
                  <Button onClick={() => setModalType("QUIZ")} size="sm" variant="outline" className="gap-1.5 text-xs font-bold h-8 cursor-pointer">
                    <Plus size={13} weight="bold" /> Add Quiz
                  </Button>
                </div>
              </div>

              {/* Module Tree Items */}
              <div className="space-y-3">
                {modules.map((mod, idx) => (
                  <Card key={mod.id} className="hover:border-primary/50 transition-colors p-2 shadow-2xs rounded-xl">
                    <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5 sm:pt-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            disabled={idx === 0}
                            onClick={() => handleMoveModule(idx, "up")}
                            title="Move up"
                          >
                            <ArrowUp size={12} weight="bold" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            disabled={idx === modules.length - 1}
                            onClick={() => handleMoveModule(idx, "down")}
                            title="Move down"
                          >
                            <ArrowDown size={12} weight="bold" />
                          </Button>
                        </div>

                        {/* Number Badge */}
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-extrabold text-sm">
                          #{idx + 1}
                        </div>

                        {/* Module Info */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] font-mono font-bold uppercase gap-1 py-0">
                              {mod.contentType === "VIDEO" && <Video size={13} />}
                              {mod.contentType === "DOCUMENT" && <FileText size={13} />}
                              {mod.contentType === "QUIZ" && <CheckSquare size={13} />}
                              {mod.contentType}
                            </Badge>
                            <span className="text-sm font-bold text-foreground truncate">{mod.title}</span>
                          </div>

                          {mod.contentUrl && mod.contentUrl !== "#" && (
                            <p className="text-xs font-mono text-muted-foreground truncate max-w-sm sm:max-w-md">
                              Source: {mod.contentUrl}
                            </p>
                          )}

                          {mod.quiz && (
                            <div className="text-xs text-muted-foreground font-medium truncate max-w-md">
                              Question: <strong>{mod.quiz.question}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 font-bold h-8.5 text-xs rounded-lg cursor-pointer"
                          onClick={() => {
                            setPreviewLesson(mod);
                            setQuizTestSelected(null);
                          }}
                        >
                          <Eye size={14} weight="bold" />
                          <span>Preview</span>
                        </Button>
                        <Link href={`/dashboard/courses/${courseId}/lesson/${mod.id}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 font-bold h-8.5 text-xs rounded-lg border-primary/30 hover:border-primary/60 hover:bg-primary/10 text-primary cursor-pointer">
                            <PlayCircle size={15} weight="bold" />
                            <span className="hidden sm:inline">Enter Classroom</span>
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8.5 w-8.5 p-0 hover:bg-muted rounded-lg cursor-pointer"
                          onClick={() => handleOpenEditModule(mod)}
                          title="Edit module"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8.5 w-8.5 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          disabled={isDeleting === mod.id}
                          onClick={() => handleDeleteModule(mod.id)}
                          title="Delete module"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE SETTINGS */}
      {activeTab === "details" && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold">Course Meta & Settings</CardTitle>
            <CardDescription className="text-sm">Institutional curriculum attributes</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Course Code</label>
                <Input defaultValue={course?.code} className="h-11 text-base font-mono font-bold mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Course Duration</label>
                <Input defaultValue={course?.duration || "4 Weeks"} className="h-11 text-base font-bold mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Course Title</label>
              <Input defaultValue={course?.title} className="h-11 text-base font-bold mt-1" />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
              <Input defaultValue={course?.description} className="h-11 text-base mt-1" />
            </div>

            <Button size="lg" className="font-bold">Save Course Settings</Button>
          </CardContent>
        </Card>
      )}

      {/* MODAL BUILDER (VIDEO / DOCUMENT / QUIZ) */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-popover border-border shadow-2xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-xl font-bold">
                  {editingModuleId ? "Edit" : "Add"} {modalType === "VIDEO" && "Video Lesson Module"}
                  {editingModuleId ? "Edit" : "Add"} {modalType === "DOCUMENT" && "PDF / Reading Module"}
                  {editingModuleId ? "Edit" : "Add"} {modalType === "QUIZ" && "Quiz Assessment Module"}
                </CardTitle>
                <CardDescription className="text-sm">Course aggregate curriculum builder</CardDescription>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                <X size={22} />
              </button>
            </CardHeader>

            <form onSubmit={handleSaveModule}>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Module Title</label>
                  <Input 
                    required 
                    placeholder={
                      modalType === "VIDEO" ? "e.g. Lecture 1: Architecture Core" :
                      modalType === "DOCUMENT" ? "e.g. Chapter 2 Reading Notes (PDF)" :
                      "e.g. End of Unit 1 Knowledge Check"
                    }
                    className="h-11 text-base font-bold"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>

                {/* FILE UPLOADER FOR VIDEO / DOCUMENT */}
                {modalType !== "QUIZ" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">
                        {modalType === "VIDEO" ? "Upload Video File (.mp4)" : "Upload PDF Document (.pdf)"}
                      </label>
                      <MediaUploader 
                        accept={modalType === "VIDEO" ? "video/*" : "application/pdf"}
                        onUploadSuccess={(fileUrl, fileName, mediaData) => {
                          setUrl(fileUrl);
                          if (mediaData?.hlsUrl) {
                            setHlsUrl(mediaData.hlsUrl);
                          }
                        }} 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Or Direct File / Stream URL</label>
                      <Input 
                        placeholder={modalType === "VIDEO" ? "https://storage.provider/lecture1.mp4" : "https://storage.provider/handout.pdf"}
                        className="h-11 text-base font-mono"
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)} 
                      />
                    </div>
                  </div>
                )}

                {/* QUIZ QUESTION & OPTIONS */}
                {modalType === "QUIZ" && (
                  <div className="space-y-3 pt-1 border-t border-border">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Assessment Question</label>
                      <Input 
                        required
                        placeholder="e.g. What is the primary role of the Domain Aggregate in DDD?"
                        className="h-11 text-base font-bold"
                        value={quizQuestion} 
                        onChange={(e) => setQuizQuestion(e.target.value)} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Option A</label>
                        <Input required placeholder="Choice A" value={optA} onChange={(e) => setOptA(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Option B</label>
                        <Input required placeholder="Choice B" value={optB} onChange={(e) => setOptB(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Option C</label>
                        <Input placeholder="Choice C" value={optC} onChange={(e) => setOptC(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">Option D</label>
                        <Input placeholder="Choice D" value={optD} onChange={(e) => setOptD(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Correct Answer Key</label>
                      <select 
                        value={correctOpt} 
                        onChange={(e) => setCorrectOpt(e.target.value)}
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-base font-bold text-foreground"
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="flex justify-end gap-3 p-5 border-t border-border bg-muted/20 rounded-b-2xl">
                <Button type="button" variant="outline" size="lg" className="font-semibold" onClick={closeModal}>Cancel</Button>
                <Button type="submit" size="lg" className="font-bold">{editingModuleId ? "Save Changes" : "Save Module"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* FAST LESSON PREVIEW MODAL */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-card border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border p-5 bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="secondary" className="text-xs font-mono font-bold uppercase gap-1 shrink-0">
                  {previewLesson.contentType === "VIDEO" && <Video size={14} />}
                  {previewLesson.contentType === "DOCUMENT" && <FileText size={14} />}
                  {previewLesson.contentType === "QUIZ" && <CheckSquare size={14} />}
                  {previewLesson.contentType}
                </Badge>
                <CardTitle className="text-base sm:text-lg font-bold truncate">
                  {previewLesson.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                onClick={() => {
                  setPreviewLesson(null);
                  setQuizTestSelected(null);
                }}
              >
                <X size={18} />
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* VIDEO PREVIEW */}
              {previewLesson.contentType === "VIDEO" && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden bg-black border border-border shadow-xs">
                    {previewLesson.contentUrl && previewLesson.contentUrl !== "#" ? (
                      <video
                        src={previewLesson.contentUrl}
                        controls
                        className="w-full max-h-72 object-contain bg-black"
                      />
                    ) : (
                      <div className="p-12 text-center text-muted-foreground space-y-2">
                        <Video size={40} className="mx-auto text-primary/60" />
                        <p className="text-xs font-medium">No direct video source stream configured.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono bg-muted/40 p-2.5 rounded-xl border border-border">
                    <span className="truncate max-w-md">Source: {previewLesson.contentUrl || "Internal storage"}</span>
                    <span className="font-bold text-foreground shrink-0">Order #{previewLesson.order || 1}</span>
                  </div>
                </div>
              )}

              {/* DOCUMENT PREVIEW */}
              {previewLesson.contentType === "DOCUMENT" && (
                <div className="p-8 text-center space-y-4 border border-border/80 rounded-xl bg-muted/20">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                    <FileText size={32} weight="bold" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">{previewLesson.title}</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      PDF Reading assignment and lecture handout notes.
                    </p>
                  </div>
                  {previewLesson.contentUrl && previewLesson.contentUrl !== "#" && (
                    <a
                      href={previewLesson.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      Open Document in New Tab ↗
                    </a>
                  )}
                </div>
              )}

              {/* QUIZ PREVIEW */}
              {previewLesson.contentType === "QUIZ" && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground font-bold">Interactive Quiz Check Preview</span>
                    <h4 className="text-sm font-bold text-foreground">
                      {previewLesson.quiz?.question || "Sample Knowledge Verification Question"}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {(previewLesson.quiz?.options || [
                      { key: "A", text: "First architectural answer option" },
                      { key: "B", text: "Alternative option B" },
                      { key: "C", text: "Option C" },
                      { key: "D", text: "Option D" }
                    ]).map((opt) => {
                      const isSelected = quizTestSelected === opt.key;
                      const isCorrect = previewLesson.quiz?.correct === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setQuizTestSelected(opt.key)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                : "border-destructive bg-destructive/10 text-destructive"
                              : "border-border hover:border-primary/50 bg-background text-foreground"
                          }`}
                        >
                          <span><strong>{opt.key}.</strong> {opt.text}</span>
                          {isSelected && (
                            <span className="text-[11px] font-bold">
                              {isCorrect ? "✓ Correct Answer" : "✗ Incorrect"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between p-4 px-5 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Instructor Fast Lesson Preview</span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Link href={`/dashboard/courses/${courseId}/lesson/${previewLesson.id}`}>
                  <Button size="sm" className="gap-1.5 text-xs font-bold rounded-xl cursor-pointer">
                    <PlayCircle size={16} weight="bold" />
                    <span>Full Classroom</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold rounded-xl cursor-pointer"
                  onClick={() => {
                    setPreviewLesson(null);
                    setQuizTestSelected(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
