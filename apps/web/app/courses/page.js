"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AuthMultiStepLoader } from "@/components/auth-multi-step-loader";
import { FALLBACK_COURSES, FALLBACK_INSTITUTIONS } from "@/lib/catalog-data";
import { TenantLogo } from "@/components/ui/tenant-logo";
import {
  GraduationCap,
  Buildings,
  Clock,
  Sparkle,
  Users,
  CheckCircle,
  ArrowRight,
  MagnifyingGlass,
  X,
  BookOpen,
  ChalkboardTeacher,
  Globe,
  Sliders,
  Laptop,
  LockSimple,
  EnvelopeSimple,
  WarningCircle,
  ArrowsClockwise,
  Eye,
  ArrowUpRight,
  Tag
} from "@phosphor-icons/react";

const LEVEL_CONFIG = {
  ALL_LEVELS: { label: "All Levels", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  BEGINNER: { label: "Beginner", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  ADVANCED: { label: "Advanced", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30" }
};

const DOMAIN_CATEGORIES = [
  { id: "ALL", label: "All Domains" },
  { id: "cs", label: "Computer Science", keywords: ["cs-", "database", "operating system", "software", "data structure"] },
  { id: "web", label: "FullStack & Web", keywords: ["fsd", "mern", "web", "react", "fullstack"] },
  { id: "systems", label: "Cloud & Distributed Systems", keywords: ["cloud", "distributed", "systems", "architecture"] },
  { id: "engineering", label: "Aerospace & Engineering", keywords: ["apollo", "orbital", "mechanics", "propulsion"] }
];

function CoursesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();

  const [courses, setCourses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolledMap, setEnrolledMap] = useState({});

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("ALL");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [sortBy, setSortBy] = useState("featured");

  // Interaction Modals & States
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);
  const [activeCourseForLogin, setActiveCourseForLogin] = useState(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  // Quick In-Page Auth State
  const [quickAuthEmail, setQuickAuthEmail] = useState("");
  const [quickAuthPassword, setQuickAuthPassword] = useState("");
  const [quickAuthLoading, setQuickAuthLoading] = useState(false);
  const [quickAuthError, setQuickAuthError] = useState("");
  const [quickAuthSuccess, setQuickAuthSuccess] = useState("");

  // Enforce light theme on courses catalog page
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const res = await ApiClient.getPublicCourses();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCourses(res.data);
          if (res.institutions && Array.isArray(res.institutions) && res.institutions.length > 0) {
            setInstitutions(res.institutions);
          } else {
            setInstitutions(FALLBACK_INSTITUTIONS);
          }
        } else {
          setCourses(FALLBACK_COURSES);
          setInstitutions(FALLBACK_INSTITUTIONS);
        }
      } catch (err) {
        console.error("Failed to fetch courses catalog:", err);
        setCourses(FALLBACK_COURSES);
        setInstitutions(FALLBACK_INSTITUTIONS);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Fetch student enrollments if logged in
  useEffect(() => {
    async function checkUserEnrollments() {
      if (!user?.id && !user?.userId) {
        setEnrolledMap({});
        return;
      }
      const map = {};
      try {
        const studentId = user.id || user.userId;
        const res = await ApiClient.getEnrollments({ studentUserId: studentId });
        if (res?.success && Array.isArray(res.data)) {
          res.data.forEach((enr) => {
            map[enr.courseId] = {
              isEnrolled: true,
              progressPercent: enr.progressPercentage || 0,
              enrollmentId: enr.id
            };
          });
        }
      } catch (e) {
        console.error("Failed to load user enrollments:", e);
      }
      setEnrolledMap(map);
    }
    checkUserEnrollments();
  }, [user]);

  // Read initial filter from URL if present
  useEffect(() => {
    const instParam = searchParams.get("institution");
    const domainParam = searchParams.get("domain");
    if (instParam) setSelectedInstitution(instParam);
    if (domainParam) setSelectedDomain(domainParam);
  }, [searchParams]);

  // Filtered & Sorted Courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesTitle = c.title?.toLowerCase().includes(q);
          const matchesCode = c.code?.toLowerCase().includes(q);
          const matchesDesc = (c.shortDescription || c.description || "").toLowerCase().includes(q);
          const matchesInst = c.institution?.name?.toLowerCase().includes(q);
          const matchesTeacher = c.teacher?.name?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesCode && !matchesDesc && !matchesInst && !matchesTeacher) {
            return false;
          }
        }

        // Institution filter
        if (selectedInstitution !== "ALL") {
          if (c.tenantId !== selectedInstitution && c.institution?.slug !== selectedInstitution) {
            return false;
          }
        }

        // Level filter
        if (selectedLevel !== "ALL") {
          if (c.level !== selectedLevel) return false;
        }

        // Domain category filter
        if (selectedDomain !== "ALL") {
          const cat = DOMAIN_CATEGORIES.find((d) => d.id === selectedDomain);
          if (cat && cat.keywords) {
            const courseText = `${c.title} ${c.code} ${c.shortDescription || ""}`.toLowerCase();
            const matchedKeyword = cat.keywords.some((k) => courseText.includes(k));
            if (!matchedKeyword) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "credits-desc") return (b.credits || 0) - (a.credits || 0);
        if (sortBy === "popular") return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return 0; // featured default
      });
  }, [courses, search, selectedInstitution, selectedDomain, selectedLevel, sortBy]);

  // Direct Enroll action for logged-in user
  const handleDirectEnroll = async (course) => {
    setEnrollingCourseId(course.id);
    try {
      const studentId = user?.id || user?.userId;
      const res = await ApiClient.enrollStudent({
        courseId: course.id,
        tenantId: course.tenantId,
        studentUserId: studentId,
        studentEmail: user?.email,
        studentName: user?.name || "Student"
      });

      // Update local enrolled map regardless of whether new or existing
      setEnrolledMap((prev) => ({
        ...prev,
        [course.id]: { isEnrolled: true, progressPercent: 0 }
      }));

      // Navigate to LMS Student Courses Dashboard with highlight
      router.push(`/dashboard/courses?enrolled=${course.id}`);
    } catch (err) {
      console.error("Enrollment error:", err);
      // Still navigate gracefully to LMS dashboard
      router.push(`/dashboard/courses?enrolled=${course.id}`);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Trigger Purchase / Enrollment flow for a course
  const handleInitiateEnroll = (course) => {
    const isEnrolled = enrolledMap[course.id]?.isEnrolled;
    if (isEnrolled) {
      // User is already enrolled: go directly into the LMS platform
      router.push(`/dashboard/courses/${course.id}/learn`);
      return;
    }

    if (user) {
      // User is logged in: execute instant auto-enrollment
      handleDirectEnroll(course);
    } else {
      // User is not logged in: prompt in-page LMS login modal
      setActiveCourseForLogin(course);
      setQuickAuthError("");
      setQuickAuthSuccess("");
    }
  };

  // Submit in-page LMS login and auto-enroll
  const handleQuickLoginSubmit = async (e) => {
    e.preventDefault();
    if (!quickAuthEmail || !quickAuthPassword) {
      setQuickAuthError("Please provide both email and password.");
      return;
    }

    setQuickAuthError("");
    setQuickAuthLoading(true);

    try {
      const res = await login(quickAuthEmail, quickAuthPassword);
      if (res.success) {
        setQuickAuthSuccess("Credentials verified! Provisioning course enrollment...");

        if (activeCourseForLogin) {
          try {
            const studentId = res.user?.id || res.user?.userId;
            await ApiClient.enrollStudent({
              courseId: activeCourseForLogin.id,
              tenantId: activeCourseForLogin.tenantId,
              studentUserId: studentId,
              studentEmail: res.user?.email || quickAuthEmail,
              studentName: res.user?.name || "Student"
            });
          } catch (enrollErr) {
            console.warn("Auto-enroll error:", enrollErr);
          }

          setTimeout(() => {
            router.push(`/dashboard/courses?enrolled=${activeCourseForLogin.id}`);
          }, 1400);
        } else {
          setTimeout(() => {
            router.push("/dashboard/courses");
          }, 1400);
        }
      } else {
        setQuickAuthError(res.error || "Invalid campus credentials. Please check your email and password.");
        setQuickAuthLoading(false);
      }
    } catch (err) {
      setQuickAuthError(err.message || "Failed to authenticate with LMS platform.");
      setQuickAuthLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Top Multi-Tenant Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow-xs transition-transform group-hover:scale-105">
                <GraduationCap size={20} weight="bold" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-foreground leading-tight">
                  Education<span className="text-primary">OS</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
                  Global Academic Network
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Course Marketplace</span>
            </div>
          </div>

          {/* Header Action Nav */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-foreground">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground">{user.email}</span>
                </div>
                <Link href="/dashboard/courses">
                  <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs cursor-pointer">
                    <Laptop size={15} weight="bold" />
                    <span>Open LMS Dashboard</span>
                    <ArrowRight size={13} weight="bold" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs font-bold cursor-pointer">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="sm" className="text-xs font-bold gap-1 cursor-pointer hidden sm:flex">
                    <Buildings size={14} />
                    <span>Register Campus</span>
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="sm" className="text-xs font-bold gap-1 cursor-pointer shadow-xs">
                    <span>Live LMS Demo</span>
                    <ArrowRight size={13} weight="bold" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-16 border-b border-border bg-gradient-to-b from-primary/5 via-card/50 to-background">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold shadow-xs">
              <Sparkle size={15} weight="fill" />
              <span>Accredited Academic Course Offerings</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              One Unified Marketplace. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-sky-600 dark:via-indigo-400 dark:to-sky-400">
                Courses Offered Across All Institutions.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Explore official courses and certified specializations published by autonomous universities and institutes.
              Enroll instantly with your campus credentials to launch interactive lectures, video streaming, and quizzes.
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-xs font-bold text-muted-foreground block">Partner Campuses</span>
                <span className="text-xl font-extrabold text-foreground">{institutions.length || 5}+ Institutes</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-xs font-bold text-muted-foreground block">Active Offerings</span>
                <span className="text-xl font-extrabold text-primary">{courses.length || 11} Programs</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-xs font-bold text-muted-foreground block">Institutional Credits</span>
                <span className="text-xl font-extrabold text-foreground">Verified Transcripts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-xs font-bold text-muted-foreground block">Enrollment Speed</span>
                <span className="text-xl font-extrabold text-emerald-500">Instant Access</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CONTROLS & CATALOG */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
          {/* SEARCH & FILTERS CONTAINER */}
          <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border shadow-sm mb-10 space-y-5">
            {/* Top Search & Level Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="catalog-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search course title, code (e.g. FSD-01, CS-001), institution, or professor..."
                  className="pl-10 pr-9 h-11 bg-background rounded-xl border-border text-xs sm:text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Level Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="ALL">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="featured">Featured Programs</option>
                  <option value="credits-desc">Credits (Highest)</option>
                  <option value="popular">Most Enrolled</option>
                  <option value="newest">Recently Added</option>
                </select>
              </div>
            </div>

            {/* DOMAIN CATEGORY PILLS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <span className="text-xs font-bold text-muted-foreground mr-1.5 shrink-0 flex items-center gap-1">
                <Tag size={13} /> Domain:
              </span>
              {DOMAIN_CATEGORIES.map((cat) => {
                const isActive = selectedDomain === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedDomain(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* INSTITUTION FILTER PILLS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border/60 pt-3 no-scrollbar">
              <span className="text-xs font-bold text-muted-foreground mr-1.5 shrink-0 flex items-center gap-1">
                <Buildings size={13} /> Offering Institute:
              </span>
              <button
                onClick={() => setSelectedInstitution("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedInstitution === "ALL"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                All Institutions ({courses.length})
              </button>
              {institutions.map((inst) => {
                const isActive = selectedInstitution === inst.id || selectedInstitution === inst.slug;
                return (
                  <button
                    key={inst.id}
                    onClick={() => setSelectedInstitution(inst.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <TenantLogo tenant={inst} size="xs" />
                    <span>{inst.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-background/20 font-mono">
                      {inst.courseCount || 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active filter count & reset */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Showing <strong className="text-foreground">{filteredCourses.length}</strong> of {courses.length} courses
              </span>
              {(search || selectedInstitution !== "ALL" || selectedDomain !== "ALL" || selectedLevel !== "ALL") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedInstitution("ALL");
                    setSelectedDomain("ALL");
                    setSelectedLevel("ALL");
                  }}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* COURSE CARDS GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-3xl bg-card border border-border animate-pulse p-6 space-y-4">
                  <div className="h-44 bg-muted rounded-2xl w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-border space-y-4 max-w-2xl mx-auto">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <BookOpen size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-foreground">No Courses Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                No courses match your active search filters. Try broadening your keywords or clearing the institute filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="font-bold cursor-pointer"
                onClick={() => {
                  setSearch("");
                  setSelectedInstitution("ALL");
                  setSelectedDomain("ALL");
                  setSelectedLevel("ALL");
                }}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const levelInfo = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.ALL_LEVELS;
                const isEnrolled = !!enrolledMap[course.id]?.isEnrolled;
                const isEnrolling = enrollingCourseId === course.id;

                return (
                  <Card
                    key={course.id}
                    className="overflow-hidden flex flex-col justify-between rounded-3xl border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1"
                  >
                    <div>
                      {/* COURSE CARD BANNER / THUMBNAIL (Links to Detail Page) */}
                      <Link href={`/courses/${course.id}`} className="block relative h-48 w-full overflow-hidden bg-muted/60 border-b border-border cursor-pointer group/thumb">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/40 relative">
                            <div className="absolute right-3 bottom-2 font-black text-6xl text-foreground/5 select-none pointer-events-none font-mono">
                              {course.code}
                            </div>
                            <div className="p-3.5 rounded-2xl bg-card/90 border border-border/80 shadow-xs text-primary mb-1 group-hover/thumb:scale-110 transition-transform">
                              <BookOpen size={28} weight="duotone" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground tracking-widest font-mono">
                              {course.code}
                            </span>
                          </div>
                        )}

                        {/* Top Badges: Level & Credits */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${levelInfo.color}`}>
                            {levelInfo.label}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-background/80 backdrop-blur-md text-foreground border border-border shadow-xs flex items-center gap-1">
                            <Sparkle size={12} weight="fill" className="text-amber-400" />
                            <span>{course.credits || 3} Credits</span>
                          </span>
                        </div>

                        {/* If Enrolled Pill */}
                        {isEnrolled && (
                          <div className="absolute bottom-3 left-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs backdrop-blur-xs">
                              <CheckCircle size={13} weight="bold" />
                              <span>Enrolled • In LMS</span>
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* CARD CONTENT */}
                      <div className="p-5 space-y-4">
                        {/* 1. INSTITUTION WHICH IS OFFERING THAT COURSE */}
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
                          <button
                            onClick={() => setSelectedInstitution(course.institution?.id || course.tenantId)}
                            className="flex items-center gap-2 group/inst text-left cursor-pointer min-w-0"
                            title={`Filter courses by ${course.institution?.name || "Institution"}`}
                          >
                            <TenantLogo 
                              tenant={course.institution || { name: course.institution?.name, slug: course.institution?.slug }} 
                              size="xs" 
                            />
                            <span className="text-xs font-extrabold text-foreground group-hover/inst:text-primary transition-colors line-clamp-1">
                              {course.institution?.name || "Academic Institution"}
                            </span>
                          </button>

                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase shrink-0">
                            {course.institution?.slug || "campus"}
                          </span>
                        </div>

                        {/* TITLE & DESCRIPTION (Links to Detail Page) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                              {course.code}
                            </span>
                          </div>
                          <Link href={`/courses/${course.id}`} className="block group/title">
                            <h3 className="text-base sm:text-lg font-extrabold text-foreground group-hover/title:text-primary transition-colors leading-snug cursor-pointer line-clamp-2">
                              {course.title}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {course.shortDescription || course.description || "Comprehensive academic syllabus and guided lectures."}
                          </p>
                        </div>

                        {/* 2. DURATION, CREDIT, TEACHER SPECIFICATION */}
                        <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 space-y-2.5">
                          {/* Duration & Credit strip */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-foreground font-semibold">
                              <Clock size={15} className="text-primary" weight="bold" />
                              <span>Duration: <strong>{course.duration || "4 Weeks"}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground font-semibold">
                              <Sparkle size={15} className="text-amber-400" weight="bold" />
                              <span>Credits: <strong>{course.credits || 3}</strong></span>
                            </div>
                          </div>

                          {/* Teacher Row */}
                          <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              <ChalkboardTeacher size={16} weight="bold" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">
                                {course.teacher?.name || "Academic Faculty"}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {course.teacher?.title || "Lead Instructor"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD FOOTER & ACTIONS */}
                    <div className="p-5 pt-0 border-t border-border/40 mt-3 flex items-center justify-between gap-3">
                      <Link
                        href={`/courses/${course.id}`}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </Link>

                      {isEnrolled ? (
                        <Link href={`/dashboard/courses/${course.id}/learn`}>
                          <Button size="sm" className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs">
                            <span>Open LMS</span>
                            <ArrowRight size={13} weight="bold" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/courses/${course.id}?enroll=true`}>
                          <Button
                            size="sm"
                            className="font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Purchase & Enroll</span>
                            <ArrowRight size={13} weight="bold" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* INSTITUTIONAL TRUST & PARTNERS BANNER */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-20 pt-10 border-t border-border text-center space-y-6">
          <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
            Powered by Education-OS Multi-Tenant Architecture
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-80">
            {institutions.slice(0, 5).map((inst) => (
              <div key={inst.id} className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-card border border-border flex items-center justify-center text-primary">
                  <Buildings size={16} weight="bold" />
                </div>
                <span className="text-sm font-extrabold text-foreground">{inst.name}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* QUICK IN-PAGE AUTH & AUTO-ENROLLMENT MODAL */}
      {activeCourseForLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <AuthMultiStepLoader loading={quickAuthLoading && !quickAuthError} mode="login" />

          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5">
            <button
              onClick={() => setActiveCourseForLogin(null)}
              className="absolute top-5 right-5 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>

            {/* Target Course Header Strip */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                <Sparkle size={12} weight="fill" />
                <span>Instant Course Enrollment</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Sign in to Purchase & Enroll
              </h2>
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border/80 flex items-start gap-3 text-left">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <BookOpen size={16} weight="bold" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-mono font-bold text-primary block">{activeCourseForLogin.code}</span>
                  <span className="text-sm font-extrabold text-foreground block truncate">{activeCourseForLogin.title}</span>
                  <span className="text-xs text-muted-foreground block">
                    Offered by <strong>{activeCourseForLogin.institution?.name}</strong> • {activeCourseForLogin.duration} ({activeCourseForLogin.credits} Credits)
                  </span>
                </div>
              </div>
            </div>

            {quickAuthError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <WarningCircle size={18} weight="bold" className="shrink-0" />
                <span>{quickAuthError}</span>
              </div>
            )}

            {quickAuthSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle size={18} weight="bold" className="shrink-0" />
                <span>{quickAuthSuccess}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleQuickLoginSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <EnvelopeSimple size={14} className="text-muted-foreground" /> Work / Campus Email
                </label>
                <Input
                  type="email"
                  required
                  value={quickAuthEmail}
                  onChange={(e) => setQuickAuthEmail(e.target.value)}
                  placeholder="student@institution.edu"
                  className="h-10 text-xs bg-background rounded-xl border-border"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <LockSimple size={14} className="text-muted-foreground" /> Password
                </label>
                <Input
                  type="password"
                  required
                  value={quickAuthPassword}
                  onChange={(e) => setQuickAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 text-xs bg-background rounded-xl border-border"
                />
              </div>

              <Button
                type="submit"
                disabled={quickAuthLoading}
                className="w-full h-11 text-xs font-bold gap-2 rounded-xl cursor-pointer shadow-md"
              >
                <span>Authorize & Auto-Enroll in LMS</span>
                <ArrowRight size={14} weight="bold" />
              </Button>
            </form>

            <div className="text-center pt-2 text-xs text-muted-foreground space-y-1">
              <p>Once signed in, you will be automatically enrolled and redirected directly into your LMS student dashboard.</p>
              <Link
                href={`/login?redirect=/dashboard/courses&autoEnroll=${activeCourseForLogin.id}&tenantId=${activeCourseForLogin.tenantId}`}
                className="text-primary hover:underline font-bold inline-block pt-1"
              >
                Or open dedicated login page →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SYLLABUS & COURSE DETAILS MODAL */}
      {selectedCourseForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCourseForDetail(null)}
              className="absolute top-5 right-5 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {selectedCourseForDetail.code}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {selectedCourseForDetail.duration}
                </span>
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {selectedCourseForDetail.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                Offered by <strong>{selectedCourseForDetail.institution?.name}</strong>
              </p>
            </div>

            {/* Specification Grid */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Duration</span>
                <span className="text-xs sm:text-sm font-extrabold text-foreground block">
                  {selectedCourseForDetail.duration || "4 Weeks"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Credits</span>
                <span className="text-xs sm:text-sm font-extrabold text-foreground block">
                  {selectedCourseForDetail.credits || 3} Credits
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Faculty</span>
                <span className="text-xs sm:text-sm font-extrabold text-foreground block truncate">
                  {selectedCourseForDetail.teacher?.name || "Academic Lead"}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Program Overview</h4>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {selectedCourseForDetail.description || selectedCourseForDetail.shortDescription || "Comprehensive academic syllabus and guided lectures covering core competencies, practical projects, and exam checkpoints."}
              </p>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle size={16} weight="bold" className="text-emerald-500" />
                <span>Instant Auto-Enrollment into LMS</span>
              </div>

              <Button
                onClick={() => {
                  const target = selectedCourseForDetail;
                  setSelectedCourseForDetail(null);
                  handleInitiateEnroll(target);
                }}
                className="font-bold text-xs gap-1.5 cursor-pointer shadow-md"
              >
                <span>Enroll in Course</span>
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoursesCatalogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-3 text-muted-foreground font-bold">
          <ArrowsClockwise size={20} className="animate-spin text-primary" />
          <span>Loading Education-OS Course Network...</span>
        </div>
      </div>
    }>
      <CoursesCatalogContent />
    </Suspense>
  );
}
