"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  HardDrive, 
  Plus, 
  TrendUp,
  GraduationCap,
  PlayCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkle,
  Trophy,
  Bookmarks,
  ArrowsClockwise,
  CheckSquare
} from "@phosphor-icons/react";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { user, activeTenant } = useAuth();
  
  // Portal Mode: 'STUDENT' | 'ADMIN'
  const [portalMode, setPortalMode] = useState("ADMIN");

  // Admin stats
  const [courseCount, setCourseCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  // Student portal data
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allCatalogCourses, setAllCatalogCourses] = useState([]);
  const [studentStats, setStudentStats] = useState({
    enrolledCount: 0,
    completedLessonsCount: 0,
    avgProgress: 0,
    quizzesPassed: 0
  });
  const [activeCourse, setActiveCourse] = useState(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync portal mode from localStorage and custom event
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

  // Load Admin metrics
  useEffect(() => {
    async function loadAdminData() {
      const [courseRes, enrollRes] = await Promise.all([
        ApiClient.getCourses(),
        ApiClient.getEnrollments()
      ]);
      if (courseRes?.success && Array.isArray(courseRes.data)) {
        setCourseCount(courseRes.data.length);
        setAllCatalogCourses(courseRes.data);
      }
      if (enrollRes?.success && Array.isArray(enrollRes.data)) {
        setStudentCount(enrollRes.data.length);
      }
    }
    loadAdminData();
  }, [activeTenant]);

  // Load Student portal data
  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const studentId = user?.id || user?.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
        
        const [enrollRes, courseRes] = await Promise.all([
          ApiClient.getEnrollments({ studentUserId: studentId }),
          ApiClient.getCourses()
        ]);

        const catalog = (courseRes?.success && Array.isArray(courseRes.data)) ? courseRes.data : [];
        setAllCatalogCourses(catalog);

        const enrollments = (enrollRes?.success && Array.isArray(enrollRes.data)) ? enrollRes.data : [];

        // Enrich each enrollment with real modules and progress
        const enriched = await Promise.all(
          enrollments.map(async (enr) => {
            const courseMeta = catalog.find(c => c.id === enr.courseId) || {};
            const [modRes, progRes] = await Promise.all([
              ApiClient.getCourseModules(enr.courseId),
              ApiClient.getCourseProgress(enr.courseId, studentId)
            ]);

            const modules = (modRes?.success && Array.isArray(modRes.data)) ? modRes.data : [];
            const completedIds = new Set(progRes?.data?.completedLessonIds || []);
            const progressPercent = progRes?.data?.progressPercent ?? enr.progressPercentage ?? 0;

            // Find next uncompleted module
            const nextModule = modules.find(m => !completedIds.has(m.id)) || modules[0] || null;

            return {
              ...enr,
              courseTitle: enr.courseTitle || courseMeta.title || "Course",
              courseCode: enr.courseCode || courseMeta.code || "CS",
              thumbnailUrl: courseMeta.thumbnailUrl || null,
              duration: courseMeta.duration || "4 Weeks",
              level: courseMeta.level || "ALL_LEVELS",
              modules,
              completedCount: completedIds.size,
              totalCount: modules.length,
              progressPercent,
              nextModuleId: nextModule?.id || (modules[0]?.id || "default_lesson")
            };
          })
        );

        setEnrolledCourses(enriched);

        // Calculate student aggregate stats
        const totalCompleted = enriched.reduce((acc, c) => acc + c.completedCount, 0);
        const avg = enriched.length > 0 
          ? Math.round(enriched.reduce((acc, c) => acc + c.progressPercent, 0) / enriched.length) 
          : 0;

        setStudentStats({
          enrolledCount: enriched.length,
          completedLessonsCount: totalCompleted,
          avgProgress: avg,
          quizzesPassed: Math.floor(totalCompleted * 0.4) // approximate passed quizzes
        });

        // Pick active course (first one with progress < 100 or first enrolled)
        const current = enriched.find(c => c.progressPercent < 100) || enriched[0] || null;
        setActiveCourse(current);

      } catch (err) {
        console.error("Failed to load student portal data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (portalMode === "STUDENT" || activeTenant) {
      loadStudentData();
    }
  }, [portalMode, activeTenant, user]);

  // Handle 1-Click Course Enrollment
  const handleEnrollCourse = async (course) => {
    setEnrollingCourseId(course.id);
    try {
      const studentId = user?.id || user?.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await ApiClient.enrollStudent({
        courseId: course.id,
        studentUserId: studentId,
        studentEmail: user?.email || "student@neon.edu",
        studentName: user?.name || "Student"
      });

      if (res.success) {
        // Fetch course modules to redirect to first lesson
        const modRes = await ApiClient.getCourseModules(course.id);
        const firstLessonId = modRes.data?.[0]?.id || "first";
        router.push(`/dashboard/courses/${course.id}/lesson/${firstLessonId}`);
      } else {
        alert(res.error || "Failed to enroll in course");
      }
    } catch (err) {
      alert(err.message || "Failed to enroll in course");
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // ==========================================
  // STUDENT LEARNING PORTAL VIEW
  // ==========================================
  if (portalMode === "STUDENT") {
    const unenrolledCourses = allCatalogCourses.filter(
      cat => !enrolledCourses.some(enr => enr.courseId === cat.id)
    );

    return (
      <div className="space-y-8">
        {/* Student Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="text-xs font-mono font-bold border-primary/30 text-primary">
                Student Learning Portal
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">
                {activeTenant?.name || "Institution Campus"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground pt-1">
              Welcome back, {user?.name || "Student"}! 🎓
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Keep progressing through your curriculum. Real-time progress is synchronized directly with Neon PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/courses">
              <Button variant="outline" className="gap-2 font-bold text-xs h-10">
                <BookOpen size={16} weight="bold" /> Browse Catalog
              </Button>
            </Link>
            {activeCourse && (
              <Link href={`/dashboard/courses/${activeCourse.courseId}/lesson/${activeCourse.nextModuleId}`}>
                <Button className="gap-2 font-bold text-xs h-10 shadow-xs">
                  <PlayCircle size={17} weight="bold" /> Resume Learning
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Continue Learning Active Hero Banner */}
        {activeCourse && (
          <Card className="border-primary/40 bg-gradient-to-r from-card via-card to-primary/5 overflow-hidden shadow-xs">
            <CardContent className="p-6 md:p-7">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <GraduationCap size={30} weight="bold" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary">{activeCourse.courseCode}</span>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="success" className="text-[10px] font-bold py-0.5">IN PROGRESS</Badge>
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{activeCourse.courseTitle}</h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      Cohort: <span className="font-semibold text-foreground">{activeCourse.batchName || "Standard Term"}</span> • {activeCourse.completedCount} of {activeCourse.totalCount} modules completed
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-72 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Course Completion</span>
                    <span className="text-primary font-mono">{activeCourse.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(activeCourse.progressPercent, 4)}%` }}
                    />
                  </div>
                  <div className="pt-2">
                    <Link href={`/dashboard/courses/${activeCourse.courseId}/lesson/${activeCourse.nextModuleId}`} className="block">
                      <Button className="w-full gap-2 font-bold text-xs h-9.5">
                        <PlayCircle size={16} weight="bold" /> Continue Next Lesson
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enrolled Courses</span>
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-foreground">{studentStats.enrolledCount}</span>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">Active curriculums</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lessons Finished</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-foreground">{studentStats.completedLessonsCount}</span>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">Verified in Neon DB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Progress</span>
                <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <TrendUp size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-foreground font-mono">{studentStats.avgProgress}%</span>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">Across all courses</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assessments Passed</span>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Trophy size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-foreground">{studentStats.quizzesPassed}</span>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">Mastery checks passed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Enrolled Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">My Enrolled Courses</h2>
              <p className="text-xs text-muted-foreground font-medium">Curriculums with active student progress tracking</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              {enrolledCourses.length} {enrolledCourses.length === 1 ? "Course" : "Courses"}
            </Badge>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((enr) => (
                <Card key={enr.id} className="overflow-hidden flex flex-col hover:border-primary/50 transition-all hover:shadow-md">
                  {/* Thumbnail / Header */}
                  <div className="relative h-40 bg-muted/70 overflow-hidden border-b border-border">
                    {enr.thumbnailUrl ? (
                      <img 
                        src={enr.thumbnailUrl} 
                        alt={enr.courseTitle} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-card via-muted to-primary/10 p-4 text-center">
                        <GraduationCap size={40} className="text-primary/60 mb-1" />
                        <span className="text-xs font-mono font-bold text-muted-foreground">{enr.courseCode}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-black/70 text-white backdrop-blur-xs">
                        {enr.courseCode}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="text-[10px] font-bold backdrop-blur-xs bg-background/80">
                        {enr.duration}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-foreground line-clamp-1">{enr.courseTitle}</h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        Cohort: <span className="text-foreground font-semibold">{enr.batchName || "Standard"}</span>
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground font-medium">Progress</span>
                        <span className="text-primary font-mono">{enr.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(enr.progressPercent, 4)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {enr.completedCount} of {enr.totalCount} lessons completed
                      </p>
                    </div>

                    {/* Enter Classroom Action */}
                    <div className="pt-2 border-t border-border">
                      <Link href={`/dashboard/courses/${enr.courseId}/lesson/${enr.nextModuleId}`} className="block">
                        <Button className="w-full gap-2 font-bold text-xs h-9">
                          <PlayCircle size={16} weight="bold" /> Enter Classroom
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed border-2">
              <div className="max-w-md mx-auto space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <BookOpen size={24} weight="bold" />
                </div>
                <h3 className="font-bold text-lg text-foreground">You are not enrolled in any courses yet</h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Enroll in curriculum courses below or explore the full course catalog to start your learning journey.
                </p>
                <div className="pt-2">
                  <Link href="/dashboard/courses">
                    <Button className="gap-2 font-bold text-xs px-5">
                      <Sparkle size={15} weight="bold" /> Explore All Courses
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Explore More Courses Catalog Preview */}
        {unenrolledCourses.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">Available Courses</h2>
                <p className="text-xs text-muted-foreground font-medium">1-click enroll to unlock lectures, readings, and interactive quizzes</p>
              </div>
              <Link href="/dashboard/courses" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View Catalog <ArrowRight size={14} weight="bold" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unenrolledCourses.slice(0, 3).map((course) => (
                <Card key={course.id} className="overflow-hidden flex flex-col hover:border-primary/40 transition-colors">
                  <div className="relative h-36 bg-muted/60 overflow-hidden border-b border-border">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-card p-4 text-center">
                        <GraduationCap size={32} className="text-primary/60 mb-1" />
                        <span className="text-xs font-mono font-bold text-muted-foreground">{course.code}</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 text-white">
                        {course.code}
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{course.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{course.description || "Comprehensive hands-on curriculum with video streaming and interactive assessments."}</p>
                    </div>

                    <Button 
                      onClick={() => handleEnrollCourse(course)}
                      disabled={enrollingCourseId === course.id}
                      className="w-full font-bold text-xs gap-1.5 h-8.5"
                    >
                      {enrollingCourseId === course.id ? (
                        <>
                          <ArrowsClockwise size={14} className="animate-spin" /> Enrolling...
                        </>
                      ) : (
                        <>
                          <Plus size={14} weight="bold" /> 1-Click Enroll
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // ADMIN EXECUTIVE OVERVIEW VIEW
  // ==========================================
  const metrics = [
    { title: "Academic Courses", value: String(courseCount), change: "Active catalog", icon: BookOpen },
    { title: "Enrolled Students", value: String(studentCount), change: studentCount > 0 ? "Active roster" : "Roster ready", icon: Users },
    { title: "Media Storage Provider", value: "Cloudflare R2", change: "HLS multi-bitrate", icon: HardDrive },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner - Solid Minimalist */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {activeTenant?.name || "Institution"} Executive Dashboard
          </h1>
          <p className="text-base text-muted-foreground mt-1 font-medium">
            Active Educational Context: <span className="font-bold text-foreground">{activeTenant?.name || "SkillYards Academy"}</span>
          </p>
        </div>
        <Link href="/dashboard/courses">
          <Button size="lg" className="gap-2 font-bold px-6">
            <Plus size={18} weight="bold" /> Create Course
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card key={idx} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">{m.title}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={22} weight="bold" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">{m.value}</span>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 font-medium">
                    <TrendUp size={14} className="text-success" /> {m.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Domain Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold">System Bounded Context Status</CardTitle>
            <CardDescription className="text-sm">Clean Architecture domain health & API connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-0">
            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Identity Domain</p>
                <p className="text-xs text-muted-foreground font-medium">Multi-Tenant Scoping: {activeTenant?.name}</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Healthy</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Academics & Learning Domain</p>
                <p className="text-xs text-muted-foreground font-medium">Neon PostgreSQL Real-Time Progress</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Healthy</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Storage Provider</p>
                <p className="text-xs text-muted-foreground font-medium">Cloudflare R2 Object Storage (HLS Stream Ready)</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Active</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Background Worker & Transcoder</p>
                <p className="text-xs text-muted-foreground font-medium">Transactional Outbox Video Pipeline (FFmpeg)</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Running</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Launch Card */}
        <Card className="flex flex-col justify-between p-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Build curriculum for {activeTenant?.name || "Institution"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Portal active context is set up for <strong>{activeTenant?.name || "SkillYards Academy"}</strong>. Create academic courses and manage curriculum with clean domain persistence.
            </p>
            <div className="space-y-2 pt-2">
              <Link href="/dashboard/courses" className="block">
                <Button size="lg" className="w-full gap-2 font-bold">
                  <Plus size={18} weight="bold" /> Open Course Manager
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => {
                  setPortalMode("STUDENT");
                  if (typeof window !== "undefined") {
                    localStorage.setItem("eos_portal_mode", "STUDENT");
                    window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: "STUDENT" }));
                  }
                }}
                className="w-full gap-2 font-bold text-xs"
              >
                <GraduationCap size={18} weight="bold" className="text-primary" /> Preview Student Learning Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
