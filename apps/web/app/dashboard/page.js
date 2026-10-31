"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsHub } from "@/components/dashboard/analytics-hub";
import { TenantLogo } from "@/components/ui/tenant-logo";
import { PerformanceBarChart } from "@/components/dashboard/performance-bar-chart";
import { StudentClassCard } from "@/components/dashboard/student-class-card";
import { DashboardTaskList } from "@/components/dashboard/dashboard-task-list";
import { DashboardScheduleSidebar } from "@/components/dashboard/dashboard-schedule-sidebar";
import { resolveCourseThumbnail, handleCourseImageError } from "@/lib/course-media";
import { 
  Users, 
  UserPlus,
  BookOpen, 
  HardDrive, 
  Plus, 
  TrendUp,
  TrendDown,
  GraduationCap, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkle, 
  Trophy, 
  Bookmarks, 
  ArrowsClockwise, 
  CheckSquare,
  Lightning,
  ShieldCheck,
  FolderPlus,
  CaretRight,
  ChartBar,
  ChartLineUp,
  Pulse,
  MagnifyingGlass,
  Buildings,
  Globe,
  CalendarCheck,
  ArrowUpRight,
  Gear
} from "@phosphor-icons/react";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { user, activeTenant } = useAuth();
  
  // Portal Mode: 'STUDENT' | 'ADMIN'
  const [portalMode, setPortalMode] = useState("ADMIN");

  // Admin Data
  const [adminCourses, setAdminCourses] = useState([]);
  const [adminEnrollments, setAdminEnrollments] = useState([]);
  const [adminBatches, setAdminBatches] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");

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

  // Load Admin metrics & data
  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      try {
        const [courseRes, enrollRes, batchRes] = await Promise.all([
          ApiClient.getCourses(),
          ApiClient.getEnrollments(),
          ApiClient.getBatches().catch(() => ({ success: true, data: [] }))
        ]);

        if (courseRes?.success && Array.isArray(courseRes.data)) {
          setAdminCourses(courseRes.data);
          setAllCatalogCourses(courseRes.data);
        }
        if (enrollRes?.success && Array.isArray(enrollRes.data)) {
          setAdminEnrollments(enrollRes.data);
        }
        if (batchRes?.success && Array.isArray(batchRes.data)) {
          setAdminBatches(batchRes.data);
        }
      } catch (err) {
        console.error("Failed to load admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [activeTenant]);

  // Load Student portal data
  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const studentId = user?.id || user?.userId;
        if (!studentId) {
          setLoading(false);
          return;
        }
        
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
          quizzesPassed: Math.floor(totalCompleted * 0.4)
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
      const studentId = user?.id || user?.userId;
      if (!studentId) {
        router.push("/login");
        return;
      }
      const res = await ApiClient.enrollStudent({
        courseId: course.id,
        studentUserId: studentId,
        studentEmail: user?.email,
        studentName: user?.name || "Student"
      });

      if (res.success) {
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

  // Derived Admin Metrics
  const adminMetrics = useMemo(() => {
    const totalCourses = adminCourses.length;
    const totalStudents = adminEnrollments.length;
    const totalBatches = adminBatches.length;
    const avgProgress = totalStudents > 0 
      ? Math.round(adminEnrollments.reduce((acc, e) => acc + (e.progressPercentage || 0), 0) / totalStudents)
      : 0;
    
    // Top courses with enrollment stats
    const courseStats = adminCourses.map(c => {
      const relatedEnrollments = adminEnrollments.filter(e => e.courseId === c.id);
      const courseAvg = relatedEnrollments.length > 0
        ? Math.round(relatedEnrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / relatedEnrollments.length)
        : 0;
      return {
        ...c,
        studentCount: relatedEnrollments.length,
        avgProgress: courseAvg
      };
    }).sort((a, b) => b.studentCount - a.studentCount);

    // Recent activity events synthesized from real enrollment logs
    const activities = adminEnrollments.slice(0, 5).map(e => ({
      id: e.id,
      studentName: e.studentName || e.studentEmail?.split("@")[0] || "Enrolled Student",
      studentEmail: e.studentEmail,
      courseTitle: e.courseTitle || "Curriculum Course",
      courseCode: e.courseCode || "CS",
      batchName: e.batchName || "Main Cohort",
      progress: e.progressPercentage || 0,
      date: e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Today"
    }));

    return {
      totalCourses,
      totalStudents,
      totalBatches,
      avgProgress,
      courseStats,
      activities
    };
  }, [adminCourses, adminEnrollments, adminBatches]);

  // Filtered courses for admin search
  const filteredAdminCourses = useMemo(() => {
    if (!courseSearch.trim()) return adminMetrics.courseStats;
    const query = courseSearch.toLowerCase();
    return adminMetrics.courseStats.filter(c => 
      c.title?.toLowerCase().includes(query) || 
      c.code?.toLowerCase().includes(query)
    );
  }, [adminMetrics.courseStats, courseSearch]);

  // ==========================================
  // SKELETON LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-xs">
          <div className="space-y-3 w-full max-w-xl">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>
            <Skeleton className="h-8 w-72 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Hero Banner Skeleton */}
        <Card className="border-border bg-card p-6 md:p-7 rounded-2xl shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-6 w-64 rounded-lg" />
                <Skeleton className="h-3.5 w-48 rounded" />
              </div>
            </div>
            <div className="w-full lg:w-72 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3.5 w-12 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-9.5 w-full rounded-xl mt-2" />
            </div>
          </div>
        </Card>

        {/* 4 Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 border-border bg-card shadow-xs space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Analytics Card Skeleton */}
        <Card className="p-5 border-border bg-card shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-8 w-36 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8">
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-3">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        </Card>

        {/* Content Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-5 border-border bg-card shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-36 rounded" />
                    <Skeleton className="h-2.5 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            ))}
          </Card>

          <Card className="lg:col-span-4 p-5 border-border bg-card shadow-xs space-y-3">
            <Skeleton className="h-5 w-32 rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-2.5 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-10 rounded" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // STUDENT LEARNING PORTAL VIEW
  // ==========================================
  if (portalMode === "STUDENT") {
    const unenrolledCourses = allCatalogCourses.filter(
      cat => !enrolledCourses.some(enr => enr.courseId === cat.id)
    );

    return (
      <div className="flex flex-col xl:flex-row gap-6 items-start animate-in fade-in duration-200">
        {/* Main Content (Center 2-Column Stage) */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Greeting Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/40 text-primary bg-primary/5 uppercase">
                  Student Portal
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {activeTenant?.name || "Institution Campus"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Hi, {user?.name?.split(" ")[0] || "Student"}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Let&apos;s check your progress and upcoming classes for today.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link href="/dashboard/courses">
                <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9 border-border/80 hover:bg-muted rounded-xl">
                  <BookOpen size={15} weight="bold" /> Browse Catalog
                </Button>
              </Link>
              {activeCourse && (
                <Link href={`/dashboard/courses/${activeCourse.courseId}/lesson/${activeCourse.nextModuleId || "first"}`}>
                  <Button size="sm" className="gap-2 font-bold text-xs h-9 shadow-xs rounded-xl cursor-pointer">
                    <PlayCircle size={16} weight="bold" /> Resume Lesson
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Performance Bar Chart Bento */}
          <PerformanceBarChart stats={studentStats} courses={enrolledCourses} />

          {/* My Classes Grid (Educame 2-Column style) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">My Classes</h2>
                <p className="text-xs text-muted-foreground">Active course curriculums and cohorts</p>
              </div>
              <Link 
                href="/dashboard/courses" 
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group"
              >
                See All <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCourses.map((enr) => (
                  <StudentClassCard key={enr.id || enr.courseId} course={enr} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed border-2 rounded-3xl bg-card/40">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                    <BookOpen size={24} weight="bold" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">You are not enrolled in any classes yet</h3>
                  <p className="text-xs text-muted-foreground">
                    Enroll in courses below or explore our academic catalog to start your learning journey.
                  </p>
                  <div className="pt-2">
                    <Link href="/dashboard/courses">
                      <Button size="sm" className="gap-2 font-bold text-xs px-4 rounded-xl cursor-pointer">
                        <Sparkle size={15} weight="bold" /> Explore All Courses
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Today Tasks Checklist */}
          <DashboardTaskList enrolledCourses={enrolledCourses} />

          {/* Available Courses Catalog Preview */}
          {unenrolledCourses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Available Courses</h2>
                  <p className="text-xs text-muted-foreground">1-click enroll to unlock lectures, readings, and assessments</p>
                </div>
                <Link href="/dashboard/courses" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  View Catalog <ArrowRight size={14} weight="bold" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unenrolledCourses.slice(0, 3).map((course) => (
                  <Card key={course.id} className="overflow-hidden flex flex-col hover:border-primary/40 transition-colors rounded-2xl">
                    <div className="relative h-32 bg-muted/60 overflow-hidden border-b border-border">
                      <img 
                        src={resolveCourseThumbnail(course)} 
                        alt={course.title} 
                        onError={(e) => handleCourseImageError(e, course)}
                        className="w-full h-full object-cover" 
                      />
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
                        size="sm"
                        className="w-full font-bold text-xs gap-1.5 h-8.5 rounded-xl cursor-pointer"
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

        {/* Right Schedule Sidebar (3rd Column) */}
        <aside className="w-full xl:w-80 shrink-0 space-y-6">
          <DashboardScheduleSidebar user={user} activeCourse={activeCourse} />
        </aside>
      </div>
    );
  }

  // ==========================================
  // ADMIN EXECUTIVE OVERVIEW VIEW (EDUCAME BENTO DESIGN)
  // ==========================================
  const activeColor = activeTenant?.settings?.branding?.primaryColor || "#5b12ed";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Welcome & Campus Context Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 md:p-7 rounded-3xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <TenantLogo tenant={activeTenant} size="xl" showBadge />
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/40 text-primary bg-primary/5 uppercase">
                Academic Administration
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {activeTenant?.settings?.campus?.branchName || activeTenant?.branch || "Main Campus"}
              </Badge>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Globe size={12} /> https://{activeTenant?.slug || "portal"}.education-os.edu
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {activeTenant?.name || "Institution Operations"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Academic orchestration, curriculum health, and cohort syllabus synchronization.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto pt-2 lg:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPortalMode("STUDENT");
              if (typeof window !== "undefined") {
                localStorage.setItem("eos_portal_mode", "STUDENT");
                window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: "STUDENT" }));
              }
            }}
            className="gap-1.5 font-bold text-xs h-9.5 rounded-xl border-border/80 hover:bg-muted cursor-pointer"
          >
            <GraduationCap size={16} weight="bold" className="text-primary" />
            <span>Student View</span>
          </Button>

          <Link href="/dashboard/students">
            <Button variant="outline" size="sm" className="gap-1.5 font-bold text-xs h-9.5 rounded-xl border-border/80 hover:bg-muted cursor-pointer">
              <UserPlus size={16} weight="bold" />
              <span>Enroll Student</span>
            </Button>
          </Link>

          <Link href="/dashboard/courses">
            <Button size="sm" className="gap-1.5 font-bold text-xs h-9.5 rounded-xl shadow-xs cursor-pointer">
              <Plus size={16} weight="bold" />
              <span>New Course</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Executive Bento KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border border-border/70 bg-card shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Courses</span>
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{adminMetrics.totalCourses}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] font-bold py-0 px-1.5">Published</Badge>
              <span className="text-xs text-muted-foreground font-medium">Active curriculums</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border border-border/70 bg-card shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enrolled Students</span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Users size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{adminMetrics.totalStudents}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="success" className="text-[10px] font-bold py-0 px-1.5">+18% growth</Badge>
              <span className="text-xs text-muted-foreground font-medium">Active learners</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border border-border/70 bg-card shadow-xs hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completion Rate</span>
            <div className="h-9 w-9 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <ChartLineUp size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{adminMetrics.avgProgress}%</span>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(adminMetrics.avgProgress, 4)}%` }} 
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border border-border/70 bg-card shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic Term</span>
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FolderPlus size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-xl font-extrabold text-foreground truncate block">
              {activeTenant?.settings?.campus?.academicTerm || "Spring 2026"}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] font-mono font-bold py-0 px-1.5">
                {adminMetrics.totalBatches} {adminMetrics.totalBatches === 1 ? "Cohort" : "Cohorts"}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">Current session</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Hub Bento */}
      <AnalyticsHub
        enrollments={adminEnrollments}
        primaryColor={activeColor}
      />

      {/* 2-Column Section: Active Courses & Campus Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (8 cols): Top Courses Performance */}
        <Card className="lg:col-span-8 shadow-xs border border-border/80 bg-card rounded-3xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-foreground tracking-tight">
                Curriculum Health & Enrollments
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Active syllabuses and cohort completion tracking
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted/40 rounded-xl border border-transparent focus:border-primary/40 focus:bg-background outline-none transition-all placeholder:text-muted-foreground w-36 sm:w-44"
                />
              </div>
              <Link href="/dashboard/courses" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0">
                All Courses <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-border/60">
            {filteredAdminCourses.length > 0 ? (
              filteredAdminCourses.slice(0, 6).map((c) => (
                <div key={c.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-primary/20">
                      {c.code ? c.code.slice(0, 3) : "CS"}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary">{c.code}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{c.duration || "4 Weeks"}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Users size={13} /> {c.studentCount} {c.studentCount === 1 ? "student enrolled" : "students enrolled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24 sm:w-36 hidden sm:block space-y-1 text-right">
                      <div className="flex justify-between text-[11px] font-mono font-bold text-muted-foreground">
                        <span>Progress</span>
                        <span className="text-primary">{c.avgProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300" 
                          style={{ width: `${Math.max(c.avgProgress, 4)}%` }} 
                        />
                      </div>
                    </div>

                    <Link href={`/dashboard/courses/${c.id}`}>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold rounded-xl border-border/80 hover:bg-muted cursor-pointer">
                        Manage <CaretRight size={13} weight="bold" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <BookOpen size={28} className="mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-semibold text-foreground">No courses matching your search</p>
                <p>Click &quot;+ New Course&quot; to publish your curriculum to the institution.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right (4 cols): Campus Operations & Recent Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Campus Operations Quick Card */}
          <Card className="p-5 rounded-3xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Buildings size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Campus Branch</h3>
                  <p className="text-[11px] text-muted-foreground">{activeTenant?.settings?.campus?.branchName || activeTenant?.branch || "Main Campus"}</p>
                </div>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" title="Settings">
                  <Gear size={16} />
                </Button>
              </Link>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-medium">
                <span>Public Portal</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Online</span>
              </div>
              <Link 
                href={`/t/${activeTenant?.slug || 'portal'}/courses`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1 font-bold truncate block"
              >
                https://{activeTenant?.slug || 'portal'}.education-os.edu <ArrowUpRight size={12} weight="bold" />
              </Link>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link href="/dashboard/tenants" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold h-9 rounded-xl border-border/80 hover:bg-muted">
                  <Buildings size={14} className="mr-1.5" weight="bold" /> Switch / Add Campus
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Student Enrollments Live Stream */}
          <Card className="shadow-xs border border-border/80 bg-card rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Recent Enrollments
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Real-time student activity feed
                </CardDescription>
              </div>
              <Link href="/dashboard/students" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Roster <ArrowRight size={13} weight="bold" />
              </Link>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 space-y-2">
              {adminMetrics.activities.length > 0 ? (
                adminMetrics.activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-2.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 text-xs hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                        {act.studentName?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{act.studentName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{act.courseTitle}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary shrink-0">
                      {act.progress}%
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No student enrollments yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
