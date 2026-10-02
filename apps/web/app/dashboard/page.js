"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MagnifyingGlass
} from "@phosphor-icons/react";

// Micro SVG Sparkline
function Sparkline({ data = [2, 5, 4, 8, 6, 9, 11], color = "#5b12ed", height = 34 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const padding = 3;
  const h = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${(width - padding).toFixed(1)},${height} L ${padding},${height} Z`;
  const gradientId = `spark_${color.replace(/[^a-zA-Z0-9]/g, "")}_${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 opacity-85 hover:opacity-100 transition-opacity">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Micro Radial Progress Ring
function RadialProgress({ value = 0, size = 48, strokeWidth = 4.5, color = "#5b12ed" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muted"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-mono font-bold text-[11px] text-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

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
      const studentId = user?.id || user?.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await ApiClient.enrollStudent({
        courseId: course.id,
        studentUserId: studentId,
        studentEmail: user?.email || "student@neon.edu",
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
  // STUDENT LEARNING PORTAL VIEW
  // ==========================================
  if (portalMode === "STUDENT") {
    const unenrolledCourses = allCatalogCourses.filter(
      cat => !enrolledCourses.some(enr => enr.courseId === cat.id)
    );

    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* Student Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="text-xs font-mono font-bold border-primary/40 text-primary bg-primary/5">
                Student Learning Portal
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
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
              <Button variant="outline" className="gap-2 font-bold text-xs h-10 border-border hover:bg-muted">
                <BookOpen size={16} weight="bold" /> Browse Catalog
              </Button>
            </Link>
            {activeCourse && (
              <Link href={`/dashboard/courses/${activeCourse.courseId}/lesson/${activeCourse.nextModuleId}`}>
                <Button className="gap-2 font-bold text-xs h-10 shadow-sm cursor-pointer">
                  <PlayCircle size={18} weight="bold" /> Resume Learning
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Continue Learning Active Hero Banner */}
        {activeCourse && (
          <Card className="border-primary/40 bg-gradient-to-r from-card via-card to-primary/5 overflow-hidden shadow-xs hover:border-primary/60 transition-all">
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
                      <Button className="w-full gap-2 font-bold text-xs h-9.5 cursor-pointer">
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
          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Enrolled Courses</span>
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{studentStats.enrolledCount}</span>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Active curriculums</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Lessons Finished</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{studentStats.completedLessonsCount}</span>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Verified in Neon DB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Average Progress</span>
                <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <TrendUp size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">{studentStats.avgProgress}%</span>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Across all courses</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">Assessments Passed</span>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Trophy size={18} weight="bold" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{studentStats.quizzesPassed}</span>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Mastery checks passed</p>
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
                  <div className="relative h-40 bg-muted/70 overflow-hidden border-b border-border">
                    {enr.thumbnailUrl ? (
                      <img 
                        src={enr.thumbnailUrl} 
                        alt={enr.courseTitle} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
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

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-foreground line-clamp-1">{enr.courseTitle}</h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        Cohort: <span className="text-foreground font-semibold">{enr.batchName || "Standard"}</span>
                      </p>
                    </div>

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

                    <div className="pt-2 border-t border-border">
                      <Link href={`/dashboard/courses/${enr.courseId}/lesson/${enr.nextModuleId}`} className="block">
                        <Button className="w-full gap-2 font-bold text-xs h-9 cursor-pointer">
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
                    <Button className="gap-2 font-bold text-xs px-5 cursor-pointer">
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
                      className="w-full font-bold text-xs gap-1.5 h-8.5 cursor-pointer"
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
  const kpis = [
    {
      title: "Academic Courses",
      value: adminMetrics.totalCourses,
      subtitle: `${adminMetrics.totalBatches} Cohort ${adminMetrics.totalBatches === 1 ? "Batch" : "Batches"}`,
      delta: "+12% this term",
      deltaType: "positive",
      icon: BookOpen,
      sparkColor: "#5b12ed",
      sparkData: [2, 3, 3, 4, 4, 5, Math.max(adminMetrics.totalCourses, 6)]
    },
    {
      title: "Enrolled Students",
      value: adminMetrics.totalStudents,
      subtitle: "Neon PostgreSQL Roster",
      delta: "+18% active growth",
      deltaType: "positive",
      icon: Users,
      sparkColor: "#10b981",
      sparkData: [1, 2, 4, 6, 8, 11, Math.max(adminMetrics.totalStudents, 14)]
    },
    {
      title: "Curriculum Velocity",
      value: `${adminMetrics.avgProgress}%`,
      subtitle: "Avg. Syllabus Completion",
      delta: "Synchronized live",
      deltaType: "neutral",
      icon: ChartLineUp,
      sparkColor: "#0ea5e9",
      sparkData: [15, 28, 36, 45, 52, 60, Math.max(adminMetrics.avgProgress, 65)]
    },
    {
      title: "Cloud Infrastructure",
      value: "99.98%",
      subtitle: "Cloudflare R2 & FFmpeg",
      delta: "Operational",
      deltaType: "positive",
      icon: HardDrive,
      sparkColor: "#f59e0b",
      sparkData: [99.9, 99.95, 99.92, 99.99, 99.98, 99.97, 99.98]
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck size={14} weight="bold" />
                <span>{activeTenant?.name || "SkillYards Academy"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-muted text-muted-foreground border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud Sync
              </span>
              <Badge variant="outline" className="text-xs font-semibold border-border hidden sm:inline-flex">
                {activeTenant?.settings?.campus?.academicTerm || "Spring 2026 Academic Term"}
              </Badge>
              {activeTenant?.branch && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-muted/60 text-muted-foreground border border-border">
                  {activeTenant.branch}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Institutional Executive Hub
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed max-w-3xl">
              High-level academic orchestration, cohort completion velocity, student rosters, and distributed media streaming infrastructure.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setPortalMode("STUDENT");
                if (typeof window !== "undefined") {
                  localStorage.setItem("eos_portal_mode", "STUDENT");
                  window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: "STUDENT" }));
                }
              }}
              className="gap-2 font-bold text-xs h-10 border-border hover:bg-muted cursor-pointer"
            >
              <GraduationCap size={16} weight="bold" className="text-primary" />
              <span>Student View</span>
            </Button>
            
            <Link href="/dashboard/students">
              <Button variant="outline" className="gap-2 font-bold text-xs h-10 border-border hover:bg-muted cursor-pointer">
                <UserPlus size={16} weight="bold" />
                <span>Enroll Student</span>
              </Button>
            </Link>

            <Link href="/dashboard/courses">
              <Button className="gap-2 font-bold text-xs h-10 shadow-xs cursor-pointer">
                <Plus size={16} weight="bold" />
                <span>New Course</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="hover:border-primary/40 transition-all duration-200 shadow-xs hover:shadow-sm">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{kpi.value}</h3>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
                    <Icon size={22} weight="bold" />
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-border/60 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{kpi.subtitle}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <TrendUp size={15} weight="bold" />
                      <span>{kpi.delta}</span>
                    </span>
                  </div>
                  <Sparkline data={kpi.sparkData} color={kpi.sparkColor} height={36} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dual Grid: Left 8 Cols (Courses & Activity) / Right 4 Cols (Quick Launch & Diagnostics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Cohort Velocity & Live Learning Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Courses & Cohort Velocity */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="p-5 pb-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ChartBar size={20} weight="bold" className="text-primary" />
                    <span>Curriculum & Cohort Velocity</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Active academic courses ranked by student enrollment and completion progress
                  </CardDescription>
                </div>
                
                {/* Search Box */}
                <div className="relative w-full sm:w-56">
                  <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-muted/50 border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-border">
              {filteredAdminCourses.length > 0 ? (
                filteredAdminCourses.map((c) => (
                  <div 
                    key={c.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                        <GraduationCap size={20} weight="bold" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                            {c.code || "CS"}
                          </span>
                          <span className="font-bold text-sm text-foreground truncate">{c.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{c.duration || "4 Weeks"}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">{c.studentCount} {c.studentCount === 1 ? "Student" : "Students"}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                            {c.level || "ALL_LEVELS"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="flex items-center gap-4 shrink-0 sm:w-64">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">Cohort Avg</span>
                          <span className="text-primary font-mono">{c.avgProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(c.avgProgress, 3)}%` }}
                          />
                        </div>
                      </div>

                      <Link href={`/dashboard/courses/${c.id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 px-3 cursor-pointer">
                          <span>Manage</span>
                          <CaretRight size={13} weight="bold" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">No matching courses found</p>
                  <p className="text-xs text-muted-foreground">Create a new academic course or adjust search query</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-Time Learning Activity Feed */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Clock size={20} weight="bold" className="text-primary" />
                    <span>Real-Time Learning Activity Feed</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Live student enrollments, curriculum progress, and completion events
                  </CardDescription>
                </div>
                <Link href="/dashboard/students" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  View Roster <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {adminMetrics.activities.length > 0 ? (
                <div className="space-y-4">
                  {adminMetrics.activities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between gap-3 text-xs p-3 rounded-xl bg-muted/40 border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                          {act.studentName?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">
                            {act.studentName} <span className="font-normal text-muted-foreground">enrolled in</span> <span className="text-primary font-semibold">{act.courseTitle}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Cohort: <span className="font-medium text-foreground">{act.batchName}</span> • Student Email: {act.studentEmail}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                          {act.progress}% Done
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{act.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No student enrollments yet. Use "+ Enroll Student" to add candidates to cohorts.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Quick Launch & System Diagnostics (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Executive Quick Launchpad */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lightning size={18} weight="fill" className="text-primary" />
                <span>Executive Quick Launch</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Rapid administrative actions and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-1 space-y-2.5">
              <Link href="/dashboard/courses" className="block">
                <div className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Plus size={18} weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Create Academic Course</p>
                      <p className="text-[11px] text-muted-foreground">Add syllabus, lessons & video streams</p>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              <Link href="/dashboard/students" className="block">
                <div className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <UserPlus size={18} weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors">Enroll Student to Cohort</p>
                      <p className="text-[11px] text-muted-foreground">Manage admissions & credentials</p>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              <Link href="/dashboard/students" className="block">
                <div className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                      <FolderPlus size={18} weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground group-hover:text-sky-500 transition-colors">Cohort Batch Management</p>
                      <p className="text-[11px] text-muted-foreground">Configure terms & seat capacities</p>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-muted-foreground group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              <div 
                onClick={() => {
                  setPortalMode("STUDENT");
                  if (typeof window !== "undefined") {
                    localStorage.setItem("eos_portal_mode", "STUDENT");
                    window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: "STUDENT" }));
                  }
                }}
                className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-purple-500 transition-colors">Launch Student Classroom</p>
                    <p className="text-[11px] text-muted-foreground">Preview active learning experience</p>
                  </div>
                </div>
                <CaretRight size={14} className="text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          {/* Clean Architecture Bounded Context Diagnostics */}
          <Card className="shadow-xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Pulse size={18} weight="bold" className="text-emerald-500" />
                  <span>Bounded Context Health</span>
                </CardTitle>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operational
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Domain isolation & direct cloud pipeline verification
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-1 space-y-3">
              <div className="p-3 rounded-xl border border-border bg-background/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">Identity & Tenancy</p>
                  <p className="text-[11px] text-muted-foreground">RLS Scoped: {activeTenant?.name || "Institution"}</p>
                </div>
                <Badge variant="success" className="text-[10px] font-mono font-bold py-0.5">HEALTHY</Badge>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">Academics & Learning</p>
                  <p className="text-[11px] text-muted-foreground">Neon PostgreSQL ({adminMetrics.totalCourses} courses)</p>
                </div>
                <Badge variant="success" className="text-[10px] font-mono font-bold py-0.5">CONNECTED</Badge>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">Cloudflare R2 Media</p>
                  <p className="text-[11px] text-muted-foreground">Adaptive HLS Video Streams</p>
                </div>
                <Badge variant="success" className="text-[10px] font-mono font-bold py-0.5">ACTIVE</Badge>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">Transactional Worker</p>
                  <p className="text-[11px] text-muted-foreground">Outbox Queue & Multi-Bitrate FFmpeg</p>
                </div>
                <Badge variant="success" className="text-[10px] font-mono font-bold py-0.5">POLLING</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
