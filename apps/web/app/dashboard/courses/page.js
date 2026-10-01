"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Plus, 
  MagnifyingGlass, 
  Users, 
  GraduationCap, 
  Clock, 
  X,
  BookBookmark,
  ArrowRight,
  Hourglass,
  UploadSimple,
  Image as ImageIcon,
  Trash,
  CheckCircle,
  ArrowsClockwise,
  Sparkle,
  Globe,
  Sliders,
  PlayCircle
} from "@phosphor-icons/react";

const LEVEL_CONFIG = {
  ALL_LEVELS: { label: "All Levels", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
  BEGINNER: { label: "Beginner", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  ADVANCED: { label: "Advanced", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" }
};

export default function CoursesPage() {
  const router = useRouter();
  const { user, activeTenant } = useAuth();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Portal mode: 'STUDENT' | 'ADMIN'
  const [portalMode, setPortalMode] = useState("ADMIN");
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL' | 'ENROLLED'
  const [enrolledMap, setEnrolledMap] = useState({});
  const [enrollingId, setEnrollingId] = useState(null);

  const [courses, setCourses] = useState([]);

  // Form modal state
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newShortDesc, setNewShortDesc] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState("6 Weeks");
  const [newCredits, setNewCredits] = useState(4);
  const [newLevel, setNewLevel] = useState("ALL_LEVELS");
  const [thumbnailFileId, setThumbnailFileId] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  // Sync portal mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStudentRole = user?.role === "STUDENT" || activeTenant?.role === "STUDENT";
      const savedMode = localStorage.getItem("eos_portal_mode");
      if (savedMode) {
        setPortalMode(savedMode);
      } else if (isStudentRole) {
        setPortalMode("STUDENT");
      } else {
        setPortalMode("ADMIN");
      }

      const handleModeChange = (e) => {
        if (e.detail) setPortalMode(e.detail);
      };
      window.addEventListener("eos_portal_mode_change", handleModeChange);
      return () => window.removeEventListener("eos_portal_mode_change", handleModeChange);
    }
  }, [user, activeTenant]);

  useEffect(() => {
    async function loadData() {
      const studentId = user?.id || user?.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const [res, enrollRes] = await Promise.all([
        ApiClient.getCourses(),
        ApiClient.getEnrollments({ studentUserId: studentId })
      ]);

      if (res.success && Array.isArray(res.data)) {
        setCourses(res.data.map(c => ({
          ...c,
          enrolled: c.enrolled || 0,
          instructor: c.instructor || "Academic Faculty",
          duration: c.duration || (c.credits ? `${c.credits * 2} Weeks` : "4 Weeks"),
          level: c.level || "ALL_LEVELS",
          slug: c.slug || c.code?.toLowerCase() || ""
        })));
      }

      if (enrollRes?.success && Array.isArray(enrollRes.data)) {
        const map = {};
        for (const enr of enrollRes.data) {
          map[enr.courseId] = {
            isEnrolled: true,
            progressPercent: enr.progressPercentage || 0,
            batchName: enr.batchName || "Standard",
            enrollmentId: enr.id
          };
        }
        setEnrolledMap(map);
      }
    }
    loadData();
  }, [activeTenant, user]);

  const handleEnrollCourse = async (courseId) => {
    setEnrollingId(courseId);
    try {
      const studentId = user?.id || user?.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await ApiClient.enrollStudent({
        courseId,
        studentUserId: studentId,
        studentEmail: user?.email || "student@neon.edu",
        studentName: user?.name || "Student"
      });

      if (res.success) {
        setEnrolledMap(prev => ({
          ...prev,
          [courseId]: { isEnrolled: true, progressPercent: 0, batchName: "General" }
        }));
        const modRes = await ApiClient.getCourseModules(courseId);
        const firstLessonId = modRes.data?.[0]?.id || "first";
        router.push(`/dashboard/courses/${courseId}/lesson/${firstLessonId}`);
      } else {
        alert(res.error || "Failed to enroll in course");
      }
    } catch (err) {
      alert(err.message || "Failed to enroll in course");
    } finally {
      setEnrollingId(null);
    }
  };

  // Auto-slugify on title changes if slug not manually customized
  const handleTitleChange = (val) => {
    setNewTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewSlug(generatedSlug);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        setThumbnailPreviewUrl(fileData);

        const uploadRes = await ApiClient.uploadMediaFile({
          filename: file.name,
          fileData,
          mimeType: file.type
        });

        if (uploadRes.success && uploadRes.data?.id) {
          setThumbnailFileId(uploadRes.data.id);
          if (uploadRes.data.url) {
            setThumbnailPreviewUrl(uploadRes.data.url);
          }
        } else {
          console.warn("Media upload failed:", uploadRes.error);
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to upload thumbnail:", err);
      setUploadingImage(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newTitle || !newCode) return;
    setLoading(true);

    const payload = {
      tenantId: activeTenant?.id || null,
      title: newTitle,
      code: newCode,
      slug: newSlug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: newShortDesc || newDesc || "Academic curriculum module.",
      description: newDesc || "Comprehensive course curriculum and modular lectures.",
      thumbnailFileId: thumbnailFileId || null,
      level: newLevel,
      language: "en",
      visibility: "PUBLIC",
      credits: parseInt(newCredits) || 3
    };

    const res = await ApiClient.createCourse(payload);

    if (!res.success || !res.data) {
      alert(res.error || "Failed to create course. Please verify your inputs.");
      setLoading(false);
      return;
    }

    const created = {
      ...res.data,
      thumbnailUrl: res.data.thumbnailUrl || thumbnailPreviewUrl || null,
      enrolled: 0,
      instructor: "Academic Faculty",
      duration: `${payload.credits * 2} Weeks`
    };

    setCourses([created, ...courses]);
    setIsModalOpen(false);
    // Reset form
    setNewCode("");
    setNewTitle("");
    setNewSlug("");
    setNewShortDesc("");
    setNewDesc("");
    setThumbnailFileId(null);
    setThumbnailPreviewUrl("");
    setLoading(false);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      (c.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.level || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "ENROLLED") return !!enrolledMap[c.id];
    return true;
  });

  const enrolledCount = Object.keys(enrolledMap).length;

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-wider">
              {portalMode === "STUDENT" ? "Student Learning" : "Academics"}
            </span>
            <span className="text-xs text-muted-foreground">• Centralized Curriculum</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {portalMode === "STUDENT" ? "Course Catalog & Curriculums" : "Course Catalog"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Structured courses, syllabus modules, and media assets for <strong className="text-foreground">{activeTenant?.name || "Institution"}</strong>
          </p>
        </div>
        {portalMode !== "STUDENT" && (
          <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 font-bold px-6 shadow-sm">
            <Plus size={18} weight="bold" /> Create Course
          </Button>
        )}
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative max-w-lg flex-1">
          <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by course code, title, or level..."
            className="pl-11 h-12 text-base rounded-xl bg-card border-border shadow-2xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Catalog Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("ENROLLED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ENROLLED"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Enrolled ({enrolledCount})
          </button>
        </div>
      </div>

      {/* Course Grid / Empty State */}
      {filteredCourses.length === 0 ? (
        <Card className="p-16 text-center flex flex-col items-center justify-center space-y-5 border-dashed border-2 border-border/80 rounded-2xl">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <BookBookmark size={44} weight="bold" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-bold">
              {activeTab === "ENROLLED" ? "No Enrolled Courses" : "No Courses Found"}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              {activeTab === "ENROLLED"
                ? "You haven't enrolled in any courses yet. Switch to 'All Courses' to explore and enroll in your first curriculum."
                : `Academic catalog for ${activeTenant?.name || "Institution"} has no matching courses.`}
            </p>
          </div>
          {activeTab === "ENROLLED" ? (
            <Button onClick={() => setActiveTab("ALL")} size="lg" className="gap-2 font-bold mt-2">
              Browse All Courses
            </Button>
          ) : portalMode !== "STUDENT" ? (
            <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 font-bold mt-2">
              <Plus size={18} weight="bold" /> Create Course
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const levelInfo = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.ALL_LEVELS;
            const enrollment = enrolledMap[course.id];
            const isEnrolled = !!enrollment;

            return (
              <Card 
                key={course.id} 
                className="overflow-hidden flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all duration-200 border-border group bg-card"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-muted/60 border-b border-border/70">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 via-background to-secondary/30 relative">
                        <div className="absolute right-3 bottom-2 font-black text-6xl text-foreground/5 select-none pointer-events-none">
                          {course.code}
                        </div>
                        <div className="p-3.5 rounded-2xl bg-card/80 border border-border/60 shadow-xs text-primary mb-1">
                          <BookOpen size={30} weight="duotone" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono">
                          {course.code}
                        </span>
                      </div>
                    )}

                    {/* Level Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${levelInfo.color}`}>
                        {levelInfo.label}
                      </span>
                    </div>

                    {/* Status / Enrolled Pill */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {isEnrolled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/90 text-white backdrop-blur-xs shadow-xs">
                          <CheckCircle size={13} weight="bold" />
                          <span>Enrolled • {enrollment.progressPercent}%</span>
                        </span>
                      ) : (
                        <Badge variant={course.status === "ACTIVE" || course.status === "PUBLISHED" ? "success" : "secondary"} className="text-xs font-semibold px-2 py-0.5 shadow-xs backdrop-blur-md">
                          {course.status || "ACTIVE"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 text-muted-foreground border-border">
                        {course.code}
                      </Badge>
                      {course.credits && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {course.credits} Credits
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm mt-1.5 font-medium leading-relaxed">
                      {course.shortDescription || course.description || "Academic course curriculum module."}
                    </CardDescription>
                  </CardHeader>
                </div>

                <CardContent className="pt-0 text-sm space-y-3.5">
                  <div className="flex items-center justify-between text-muted-foreground pt-3 border-t border-border/60 font-medium">
                    <span className="flex items-center gap-2 text-xs">
                      <GraduationCap size={16} className="text-primary/70" /> 
                      {course.instructor || "Academic Faculty"}
                    </span>
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Hourglass size={15} className="text-primary/70" /> 
                      {course.duration || `${(course.credits || 3) * 2} Weeks`}
                    </span>
                  </div>

                  {/* Actions: Classroom vs. 1-Click Enroll vs. Curriculum Builder */}
                  <div className="pt-1">
                    {isEnrolled ? (
                      <Link href={`/dashboard/courses/${course.id}/lesson/${enrollment.firstLessonId || 'first'}`} className="block">
                        <Button className="w-full gap-2 font-bold justify-between shadow-2xs">
                          <span className="flex items-center gap-1.5">
                            <PlayCircle size={16} weight="bold" /> Enter Classroom
                          </span>
                          <ArrowRight size={16} weight="bold" />
                        </Button>
                      </Link>
                    ) : portalMode === "STUDENT" ? (
                      <Button 
                        onClick={() => handleEnrollCourse(course.id)}
                        disabled={enrollingId === course.id}
                        className="w-full gap-2 font-bold justify-center shadow-2xs"
                      >
                        {enrollingId === course.id ? (
                          <>
                            <ArrowsClockwise size={15} className="animate-spin" /> Enrolling...
                          </>
                        ) : (
                          <>
                            <Plus size={15} weight="bold" /> 1-Click Enroll & Start
                          </>
                        )}
                      </Button>
                    ) : (
                      <Link href={`/dashboard/courses/${course.id}`} className="block">
                        <Button variant="secondary" className="w-full gap-2 font-bold justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                          <span>Curriculum Builder</span>
                          <ArrowRight size={16} weight="bold" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Course Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl bg-card border-border shadow-2xl rounded-2xl overflow-hidden my-8">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkle size={20} className="text-primary" weight="fill" />
                  Create Academic Course
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Provision new course entity with centralized media storage in {activeTenant?.name || "Institution"}
                </CardDescription>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateCourse}>
              <CardContent className="space-y-4 pt-5 max-h-[75vh] overflow-y-auto pr-3">
                {/* Thumbnail Dropzone / Media Uploader */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Course Banner & Thumbnail</span>
                    <span className="text-[11px] text-muted-foreground font-normal lowercase">PNG, JPG, WebP (16:9 recommended)</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                  />

                  {thumbnailPreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-border group h-36 bg-black">
                      <img 
                        src={thumbnailPreviewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="secondary" 
                          className="gap-1.5 text-xs font-bold"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          <UploadSimple size={14} /> Replace
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="destructive" 
                          className="gap-1.5 text-xs font-bold"
                          onClick={() => {
                            setThumbnailFileId(null);
                            setThumbnailPreviewUrl("");
                          }}
                        >
                          <Trash size={14} /> Remove
                        </Button>
                      </div>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center gap-2 text-xs font-bold text-primary">
                          <ArrowsClockwise size={16} className="animate-spin" /> Uploading to Media Vault...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                        dragActive 
                          ? "border-primary bg-primary/10" 
                          : "border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-muted/10"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ImageIcon size={22} weight="duotone" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {uploadingImage ? "Uploading to Cloudflare R2 / Media Asset..." : "Drop course thumbnail here, or click to browse"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Links directly to @eos/infra-storage centralized files
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Code & Title */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course Code</label>
                    <Input 
                      required 
                      placeholder="CS-302" 
                      className="h-10 text-sm font-mono font-bold" 
                      value={newCode} 
                      onChange={(e) => setNewCode(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course Title</label>
                    <Input 
                      required 
                      placeholder="Distributed Cloud Architectures" 
                      className="h-10 text-sm font-semibold" 
                      value={newTitle} 
                      onChange={(e) => handleTitleChange(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Slug Auto-generation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={13} /> URL Slug Identifier
                  </label>
                  <Input 
                    placeholder="distributed-cloud-architectures" 
                    className="h-9 text-xs font-mono text-muted-foreground" 
                    value={newSlug} 
                    onChange={(e) => setNewSlug(e.target.value)} 
                  />
                </div>

                {/* Level & Credits & Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic Level</label>
                    <select
                      className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                    >
                      <option value="ALL_LEVELS">All Levels</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credit Hours</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="12" 
                      className="h-10 text-sm font-bold" 
                      value={newCredits} 
                      onChange={(e) => setNewCredits(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Est. Duration</label>
                    <Input 
                      placeholder="e.g. 8 Weeks" 
                      className="h-10 text-sm" 
                      value={newDuration} 
                      onChange={(e) => setNewDuration(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Short Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Short Summary</label>
                  <Input 
                    placeholder="Brief 1-sentence value proposition for catalog listing..." 
                    className="h-10 text-sm" 
                    value={newShortDesc} 
                    onChange={(e) => setNewShortDesc(e.target.value)} 
                  />
                </div>

                {/* Long Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detailed Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Full course overview, prerequisites, and learning objectives..." 
                    className="w-full p-2.5 text-sm rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary resize-none" 
                    value={newDesc} 
                    onChange={(e) => setNewDesc(e.target.value)} 
                  />
                </div>
              </CardContent>

              <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/20">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="default" 
                  className="font-semibold" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="default" 
                  className="font-bold gap-2 px-5" 
                  disabled={loading || uploadingImage}
                >
                  {loading ? (
                    <>
                      <ArrowsClockwise size={16} className="animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} weight="bold" /> Publish Course
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
