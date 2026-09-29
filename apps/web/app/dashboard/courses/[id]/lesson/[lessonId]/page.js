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
  Sparkle,
  CloudCheck,
  CloudArrowUp,
  ArrowsClockwise,
  BookmarkSimple,
  Plus,
  Trash
} from "@phosphor-icons/react";

export default function ClassroomLessonPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { id: courseId, lessonId } = params;
  const { user } = useAuth();
  const playerRef = useRef(null);
  const notesSaveTimerRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState("chapters"); // 'chapters' | 'bookmarks' | 'notes' | 'quiz'
  const [rightDrawerTab, setRightDrawerTab] = useState("timeline"); // 'timeline' | 'curriculum'
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [studentNotes, setStudentNotes] = useState("");
  const [notesSyncStatus, setNotesSyncStatus] = useState("synced"); // 'synced' | 'saving' | 'typing' | 'offline' | 'idle'
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkTime, setBookmarkTime] = useState(0);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec === null) return "00:00";
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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

      // 1. Initial responsive populate from local buffer
      const localNotes = typeof window !== "undefined" ? localStorage.getItem(`eos_notes_${currentLesson.id}`) || "" : "";
      setStudentNotes(localNotes);

      // 2. Fetch authoritative cloud notes from Neon DB
      try {
        const cloudRes = await ApiClient.getLessonNotes(currentLesson.id);
        if (cloudRes.success && cloudRes.data && cloudRes.data.content !== undefined) {
          const cloudContent = cloudRes.data.content;
          if (cloudContent) {
            setStudentNotes(cloudContent);
            if (typeof window !== "undefined") {
              localStorage.setItem(`eos_notes_${currentLesson.id}`, cloudContent);
            }
          } else if (localNotes) {
            // Local notes exist but cloud is empty -> push local to cloud
            ApiClient.saveLessonNotes(currentLesson.id, localNotes);
          }
          setNotesSyncStatus("synced");
        } else {
          setNotesSyncStatus(localNotes ? "offline" : "synced");
        }
      } catch (err) {
        // Non-fatal fallback
      }

      // 3. Fetch authoritative cloud bookmarks from Neon DB
      try {
        const bmRes = await ApiClient.getLessonBookmarks(currentLesson.id);
        if (bmRes?.success && Array.isArray(bmRes.data)) {
          setBookmarks(bmRes.data);
        }
      } catch (err) {
        // Non-fatal fallback
      }

      setLoading(false);
    }
    loadCourse();

    return () => {
      if (notesSaveTimerRef.current) {
        clearTimeout(notesSaveTimerRef.current);
      }
    };
  }, [courseId, lessonId, currentLesson.id]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setStudentNotes(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`eos_notes_${currentLesson.id}`, val);
    }
    setNotesSyncStatus("typing");

    if (notesSaveTimerRef.current) {
      clearTimeout(notesSaveTimerRef.current);
    }

    notesSaveTimerRef.current = setTimeout(async () => {
      setNotesSyncStatus("saving");
      const res = await ApiClient.saveLessonNotes(currentLesson.id, val);
      if (res.success) {
        setNotesSyncStatus("synced");
      } else {
        setNotesSyncStatus("offline");
      }
    }, 800);
  };

  const handleChapterClick = (time) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time);
    } else {
      const playerEl = document.querySelector(".group");
      if (playerEl && typeof playerEl.seekTo === "function") {
        playerEl.seekTo(time);
      }
    }
  };

  const handleOpenBookmarkForm = (timeOverride) => {
    let currentT = 0;
    if (typeof timeOverride === "number") {
      currentT = Math.floor(timeOverride);
    } else if (playerRef.current?.getCurrentTime) {
      currentT = Math.floor(playerRef.current.getCurrentTime());
    } else {
      currentT = Math.floor(currentPlaybackTime);
    }
    setBookmarkTime(currentT);
    const mins = Math.floor(currentT / 60);
    const secs = (currentT % 60).toString().padStart(2, "0");
    setBookmarkTitle(`Bookmark @ ${mins}:${secs}`);
    setBookmarkNote("");
    setShowBookmarkForm(true);
    setActiveTab("bookmarks");
  };

  const handleSaveBookmark = async (e) => {
    e.preventDefault();
    if (!bookmarkTitle.trim()) return;

    setSavingBookmark(true);
    try {
      const res = await ApiClient.createLessonBookmark(currentLesson.id, {
        timestampSeconds: bookmarkTime,
        title: bookmarkTitle.trim(),
        note: bookmarkNote.trim() || null
      });

      if (res?.success && res?.data) {
        setBookmarks((prev) =>
          [...prev, res.data].sort((a, b) => a.timestampSeconds - b.timestampSeconds)
        );
        setShowBookmarkForm(false);
        setBookmarkTitle("");
        setBookmarkNote("");
      }
    } catch (err) {
      console.error("Save bookmark failed:", err);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    try {
      await ApiClient.deleteLessonBookmark(currentLesson.id, bookmarkId);
    } catch (err) {
      console.error("Delete bookmark failed:", err);
    }
  };

  const toggleLessonComplete = async (id) => {
    const next = new Set(completedLessons);
    const isNowDone = !next.has(id);
    if (isNowDone) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setCompletedLessons(next);

    if (isNowDone && user?.id) {
      await ApiClient.completeLesson({
        studentUserId: user.id,
        lessonModuleId: id,
        batchId: course?.batchId
      });
    }
  };

  const handleQuizAnswer = async (optionKey) => {
    setSelectedOption(optionKey);
    setQuizSubmitted(true);
    const correct = optionKey === "B";
    setQuizCorrect(correct);
    if (correct) {
      setCompletedLessons(new Set([...completedLessons, currentLesson.id]));
    }

    if (user?.id) {
      await ApiClient.submitQuiz({
        studentUserId: user.id,
        lessonModuleId: currentLesson.id,
        score: correct ? 100 : 0,
        passingScore: 70
      });
    }
  };

  const progressPercent = Math.round((completedLessons.size / allLessons.length) * 100);

  // Chronologically interleaved chapters and student bookmarks
  const timelineItems = [
    ...(currentLesson.chapters || []).map((ch, idx) => ({
      id: `ch_${idx}`,
      type: "chapter",
      time: ch.time,
      title: ch.title,
      index: idx + 1
    })),
    ...bookmarks.map((bm) => ({
      id: bm.id,
      type: "bookmark",
      time: bm.timestampSeconds,
      title: bm.title,
      note: bm.note,
      rawBookmark: bm
    }))
  ].sort((a, b) => a.time - b.time);

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
            <div className="space-y-3">
              <HlsVideoPlayer
                ref={playerRef}
                src={currentLesson.hlsUrl}
                title={currentLesson.title}
                chapters={currentLesson.chapters || []}
                onTimeUpdate={(t) => setCurrentPlaybackTime(t)}
                onEnded={() => toggleLessonComplete(currentLesson.id)}
              />

              {/* Player Quick Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[11px] font-mono font-bold text-foreground">
                    <Clock size={13} weight="bold" className="text-primary" />
                    <span>{formatSeconds(currentPlaybackTime)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Current Position
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenBookmarkForm(currentPlaybackTime)}
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs font-bold border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary"
                  >
                    <BookmarkSimple size={14} weight="bold" />
                    <span>Bookmark Moment ({formatSeconds(currentPlaybackTime)})</span>
                  </Button>

                  <Button
                    onClick={() => setRightDrawerTab("timeline")}
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ListBullets size={14} weight="bold" />
                    <span>Timeline Drawer</span>
                  </Button>
                </div>
              </div>
            </div>
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
            <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("chapters")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "chapters"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <ListBullets size={16} weight="bold" />
                <span>Chapters</span>
                {currentLesson.chapters && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                    {currentLesson.chapters.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("bookmarks")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "bookmarks"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <BookmarkSimple size={16} weight="bold" />
                <span>Bookmarks</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                  {bookmarks.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

            {/* Tab 2: Video Bookmarks & Key Timestamps */}
            {activeTab === "bookmarks" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Video Bookmarks</h3>
                    <p className="text-xs text-muted-foreground">
                      Pin timestamped moments to review concepts and jump directly to key segments.
                    </p>
                  </div>
                  {!showBookmarkForm && (
                    <Button
                      onClick={() => handleOpenBookmarkForm()}
                      size="sm"
                      className="gap-1.5 font-bold h-8 text-xs"
                    >
                      <Plus size={14} weight="bold" />
                      <span>New Bookmark</span>
                    </Button>
                  )}
                </div>

                {/* Inline Add Bookmark Form */}
                {showBookmarkForm && (
                  <form
                    onSubmit={handleSaveBookmark}
                    className="p-4 rounded-xl border border-primary/40 bg-primary/[0.04] space-y-3 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <BookmarkSimple size={15} weight="bold" />
                        <span>Bookmark Timestamp</span>
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                        {formatSeconds(bookmarkTime)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={bookmarkTitle}
                        onChange={(e) => setBookmarkTitle(e.target.value)}
                        placeholder="Bookmark Title (e.g. Outbox Table Schema Explanation)"
                        autoFocus
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                      />
                      <textarea
                        value={bookmarkNote}
                        onChange={(e) => setBookmarkNote(e.target.value)}
                        placeholder="Optional study note or quote from instructor..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={savingBookmark}
                        onClick={() => setShowBookmarkForm(false)}
                        className="h-8 text-xs font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingBookmark || !bookmarkTitle.trim()}
                        className="h-8 text-xs font-bold gap-1.5"
                      >
                        {savingBookmark ? (
                          <>
                            <ArrowsClockwise size={13} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} weight="bold" />
                            <span>Save Bookmark</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Bookmarks List */}
                {bookmarks.length > 0 ? (
                  <div className="space-y-2">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="group flex items-start justify-between p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all gap-3"
                      >
                        <div
                          onClick={() => handleChapterClick(bm.timestampSeconds)}
                          className="flex items-start gap-3 flex-1 cursor-pointer"
                        >
                          <div className="h-8 px-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {formatSeconds(bm.timestampSeconds)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {bm.title}
                            </p>
                            {bm.note && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {bm.note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            onClick={() => handleChapterClick(bm.timestampSeconds)}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-mono font-bold group-hover:border-primary/40"
                          >
                            Jump ➔
                          </Button>
                          <button
                            onClick={() => handleDeleteBookmark(bm.id)}
                            title="Delete bookmark"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-card rounded-xl border border-border space-y-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                      <BookmarkSimple size={20} weight="bold" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">No Bookmarks Saved Yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Capture timestamped moments while watching to easily revisit critical lessons later.
                      </p>
                    </div>
                    {!showBookmarkForm && (
                      <Button
                        onClick={() => handleOpenBookmarkForm()}
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold gap-1.5"
                      >
                        <Plus size={13} weight="bold" />
                        <span>Bookmark Current Playback</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Interactive Student Notes with Neon Postgres Cloud Sync */}
            {activeTab === "notes" && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Take notes while watching. Synced across your devices.</span>
                  {notesSyncStatus === "saving" && (
                    <span className="flex items-center gap-1.5 text-amber-500 font-bold font-mono text-[11px] animate-pulse">
                      <CloudArrowUp size={15} weight="bold" /> Saving to Cloud...
                    </span>
                  )}
                  {notesSyncStatus === "typing" && (
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold font-mono text-[11px]">
                      <ArrowsClockwise size={15} weight="bold" className="animate-spin" /> Typing...
                    </span>
                  )}
                  {notesSyncStatus === "synced" && (
                    <span className="flex items-center gap-1.5 text-emerald-500 font-bold font-mono text-[11px]">
                      <CloudCheck size={15} weight="bold" /> Cloud Synced
                    </span>
                  )}
                  {notesSyncStatus === "offline" && (
                    <span className="flex items-center gap-1.5 text-yellow-500 font-bold font-mono text-[11px]">
                      <Check size={15} weight="bold" /> Saved Locally
                    </span>
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

        {/* RIGHT COLUMN: TIMELINE DRAWER & CURRICULUM (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border bg-card rounded-2xl overflow-hidden shadow-sm">
            {/* Drawer Mode Switcher Tabs */}
            <div className="p-2 border-b border-border bg-muted/40 grid grid-cols-2 gap-1">
              <button
                onClick={() => setRightDrawerTab("timeline")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  rightDrawerTab === "timeline"
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListBullets size={15} weight="bold" />
                <span>Timeline Drawer</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  {timelineItems.length}
                </span>
              </button>

              <button
                onClick={() => setRightDrawerTab("curriculum")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  rightDrawerTab === "curriculum"
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmarks size={15} weight="bold" />
                <span>Syllabus</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  {allLessons.length}
                </span>
              </button>
            </div>

            {/* TAB 1: TIMELINE DRAWER WITH CHAPTER JUMP & BOOKMARKS */}
            {rightDrawerTab === "timeline" && (
              <div className="p-3 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Jump to Milestone</span>
                  </div>
                  <Button
                    onClick={() => handleOpenBookmarkForm()}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                  >
                    <Plus size={12} weight="bold" />
                    <span>Bookmark Time</span>
                  </Button>
                </div>

                {timelineItems.length > 0 ? (
                  <div className="relative pl-3 space-y-2 border-l-2 border-border/70 ml-2 py-1">
                    {timelineItems.map((item, idx) => {
                      const isCurrentlyActive =
                        currentPlaybackTime >= item.time &&
                        (idx === timelineItems.length - 1 || currentPlaybackTime < timelineItems[idx + 1].time);

                      return (
                        <div
                          key={item.id}
                          className="relative group"
                        >
                          {/* Timeline node icon on the rail */}
                          <div
                            className={`absolute -left-[19px] top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isCurrentlyActive
                                ? "bg-primary border-primary ring-4 ring-primary/20 scale-110"
                                : item.type === "bookmark"
                                ? "bg-card border-amber-500 text-amber-500"
                                : "bg-card border-muted-foreground/60 text-muted-foreground"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrentlyActive
                                  ? "bg-primary-foreground"
                                  : item.type === "bookmark"
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground/60"
                              }`}
                            />
                          </div>

                          {/* Item card */}
                          <div
                            onClick={() => handleChapterClick(item.time)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isCurrentlyActive
                                ? "bg-primary/10 border-primary/40 shadow-sm"
                                : "bg-card border-border/60 hover:border-primary/40 hover:bg-accent/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      item.type === "bookmark"
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {item.type === "bookmark" ? "Bookmark" : `Ch ${item.index}`}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-foreground">
                                    {formatSeconds(item.time)}
                                  </span>
                                </div>
                                <p
                                  className={`font-semibold line-clamp-2 ${
                                    isCurrentlyActive ? "text-primary font-bold" : "text-foreground"
                                  }`}
                                >
                                  {item.title}
                                </p>
                                {item.note && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                    {item.note}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="font-mono text-[11px] text-primary font-bold group-hover:translate-x-0.5 transition-transform">
                                  ➔
                                </span>
                                {item.type === "bookmark" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBookmark(item.id);
                                    }}
                                    title="Delete bookmark"
                                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border space-y-2">
                    <p className="font-semibold text-foreground">No Timeline Items</p>
                    <p>No chapters or bookmarks defined for this lesson yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COURSE CURRICULUM SYLLABUS */}
            {rightDrawerTab === "curriculum" && (
              <CardContent className="p-3 space-y-4 animate-in fade-in duration-150">
                {modules.map((mod) => (
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
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
