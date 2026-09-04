"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/ui/media-uploader";
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
  PlayCircle
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
      setLoading(false);
    }

    loadCourseData();
  }, [courseId]);

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!title) return;

    let payload = {
      title,
      contentType: modalType,
      contentUrl: url || "#",
      order: modules.length + 1
    };

    if (modalType === "QUIZ") {
      payload.quiz = {
        question: quizQuestion,
        options: [
          { key: "A", text: optA },
          { key: "B", text: optB },
          { key: "C", text: optC },
          { key: "D", text: optD }
        ],
        correct: correctOpt
      };
    }

    const res = await ApiClient.createCourseModule(courseId, payload);

    const createdModule = (res.success && res.data) ? res.data : {
      id: "module_" + Date.now(),
      courseId,
      ...payload,
      status: "PUBLISHED"
    };

    setModules([...modules, createdModule]);
    closeModal();
  };

  const closeModal = () => {
    setModalType(null);
    setTitle("");
    setUrl("");
    setDuration(15);
    setQuizQuestion("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectOpt("A");
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading Course Builder...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Navigation & Course Header */}
      <div className="space-y-4">
        <Link href="/dashboard/courses" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} weight="bold" /> Back to Catalog
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1">{course?.code || "CS-101"}</Badge>
              <Badge variant="success" className="text-xs font-bold px-3 py-1">{course?.status || "ACTIVE"}</Badge>
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Hourglass size={16} /> {course?.duration || "4 Weeks"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{course?.title}</h1>
            <p className="text-sm text-muted-foreground max-w-3xl font-medium">{course?.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href={`/dashboard/courses/${courseId}/learn`}>
              <Button size="lg" variant="default" className="gap-2 font-bold bg-primary text-primary-foreground">
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
            <div className="space-y-3">
              {modules.map((mod, idx) => (
                <Card key={mod.id} className="hover:border-primary/50 transition-colors p-2">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-extrabold text-base">
                        #{idx + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono font-bold uppercase gap-1">
                            {mod.contentType === "VIDEO" && <Video size={14} />}
                            {mod.contentType === "DOCUMENT" && <FileText size={14} />}
                            {mod.contentType === "QUIZ" && <CheckSquare size={14} />}
                            {mod.contentType}
                          </Badge>
                          <span className="text-base font-bold text-foreground">{mod.title}</span>
                        </div>

                        {mod.contentUrl && (
                          <p className="text-xs font-mono text-muted-foreground truncate max-w-md">
                            Source: {mod.contentUrl}
                          </p>
                        )}

                        {mod.quiz && (
                          <div className="mt-1 text-xs text-muted-foreground font-medium">
                            Question: <strong>{mod.quiz.question}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                        <Pencil size={18} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => setModules(modules.filter(m => m.id !== mod.id))}
                      >
                        <Trash size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  {modalType === "VIDEO" && "Add Video Lesson Module"}
                  {modalType === "DOCUMENT" && "Add PDF / Reading Module"}
                  {modalType === "QUIZ" && "Add Quiz Assessment Module"}
                </CardTitle>
                <CardDescription className="text-sm">Course aggregate curriculum builder</CardDescription>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                <X size={22} />
              </button>
            </CardHeader>

            <form onSubmit={handleAddModule}>
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
                        onUploadSuccess={(fileUrl) => setUrl(fileUrl)} 
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
                <Button type="submit" size="lg" className="font-bold">Save Module</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
