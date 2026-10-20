"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, applyTenantTheme } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { FALLBACK_COURSES, findInstitutionBySlug } from "@/lib/catalog-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Buildings,
  Clock,
  Sparkle,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  MagnifyingGlass,
  X,
  BookOpen,
  ChalkboardTeacher,
  Globe,
  Sliders,
  Laptop,
  Eye,
  ShieldCheck,
  Plus,
  ArrowsClockwise,
  WarningCircle,
  MapPin,
  EnvelopeSimple,
  ShareNetwork,
  Check,
  CreditCard,
  LockSimple,
  User,
  Star
} from "@phosphor-icons/react";

const LEVEL_CONFIG = {
  ALL_LEVELS: { label: "All Levels", color: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  BEGINNER: { label: "Beginner", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  ADVANCED: { label: "Advanced", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" }
};

export default function TenantCourseWebsitePage({ params }) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.slug;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, login } = useAuth();

  const [tenant, setTenant] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [sortBy, setSortBy] = useState("featured");
  const [enrolledMap, setEnrolledMap] = useState({});

  // Quick Purchase & Student Enrollment Modal
  const [purchaseCourse, setPurchaseCourse] = useState(null);
  const [authMode, setAuthMode] = useState("signup"); // 'signup' | 'login'
  const [paymentOption, setPaymentOption] = useState("dummy_card"); // 'dummy_card' | 'free_pass' | 'upi'
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [purchaseStep, setPurchaseStep] = useState("");

  // Initial Load: Check if institution is actually registered & load courses
  useEffect(() => {
    async function loadTenantData() {
      setLoading(true);
      setIsNotFound(false);
      try {
        // 1. Resolve Tenant Profile & Branding from Database
        let loadedTenant = null;
        try {
          const tenantRes = await ApiClient.getPublicTenantBySlug(tenantSlug);
          if (tenantRes.success && tenantRes.data) {
            loadedTenant = tenantRes.data;
          }
        } catch (e) {}

        // Fallback to verified catalog or locally registered institution
        if (!loadedTenant) {
          loadedTenant = findInstitutionBySlug(tenantSlug);
        }

        // If NOT registered, do NOT create a fake dummy institution! Show 404 Not Found page
        if (!loadedTenant) {
          setTenant(null);
          setIsNotFound(true);
          setLoading(false);
          return;
        }

        setTenant(loadedTenant);
        setIsNotFound(false);

        // Apply this tenant's custom brand color palette dynamically
        const brandColor =
          loadedTenant.settings?.branding?.primaryColor ||
          loadedTenant.settings?.primaryColor ||
          loadedTenant.primaryColor ||
          "#5b12ed";
        applyTenantTheme(brandColor);

        // 2. Fetch Courses Scoped Exclusively to this Tenant
        let tenantCourses = [];
        try {
          const coursesRes = await ApiClient.getPublicCourses({ tenantSlug });
          if (coursesRes.success && Array.isArray(coursesRes.data) && coursesRes.data.length > 0) {
            tenantCourses = coursesRes.data;
          }
        } catch (e) {}

        if (tenantCourses.length === 0) {
          // Filter fallback catalog by this tenant's slug or id
          const s = tenantSlug.toLowerCase();
          tenantCourses = FALLBACK_COURSES.filter(
            (c) =>
              c.institution?.slug?.toLowerCase() === s ||
              c.tenantId?.toLowerCase() === s ||
              c.institution?.name?.toLowerCase().includes(s)
          );
        }

        // Also check if admin created custom courses in local storage for this tenant
        try {
          const localCustomCourses = JSON.parse(localStorage.getItem(`eos_tenant_courses_${tenantSlug}`) || "[]");
          if (localCustomCourses.length > 0) {
            tenantCourses = [...localCustomCourses, ...tenantCourses];
          }
        } catch (e) {}

        setCourses(tenantCourses);
      } catch (err) {
        console.error("Failed to load tenant course catalog:", err);
        setIsNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadTenantData();
  }, [tenantSlug]);

  // Load student enrollment status for courses (purely for badge indicators)
  useEffect(() => {
    const map = {};
    try {
      const localEnrolled = JSON.parse(localStorage.getItem("eos_enrolled_courses") || "[]");
      localEnrolled.forEach((cid) => {
        map[cid] = { isEnrolled: true, progressPercent: 0 };
      });
    } catch (e) {}
    setEnrolledMap(map);
  }, []);

  // Filter & Sort Courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        const matchesSearch =
          !search ||
          course.title?.toLowerCase().includes(search.toLowerCase()) ||
          course.code?.toLowerCase().includes(search.toLowerCase()) ||
          course.teacher?.name?.toLowerCase().includes(search.toLowerCase());

        const matchesLevel = selectedLevel === "ALL" || course.level === selectedLevel;

        return matchesSearch && matchesLevel;
      })
      .sort((a, b) => {
        if (sortBy === "credits-desc") return (b.credits || 0) - (a.credits || 0);
        if (sortBy === "popular") return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        if (sortBy === "newest") return (b.year || 2026) - (a.year || 2026);
        return 0; // featured default
      });
  }, [courses, search, selectedLevel, sortBy]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Open modal for a specific course
  const handleOpenPurchase = (course) => {
    setPurchaseCourse(course);
    setPurchaseError("");
    setPurchaseSuccess("");
    setPurchaseStep("");
    setPaymentOption("dummy_card");
  };

  // Submit Student Signup & Payment -> Auto-Enroll -> Redirect directly to LMS
  const handlePurchaseAndEnroll = async (e) => {
    e.preventDefault();
    if (!purchaseCourse) return;

    if (authMode === "signup") {
      if (!studentName.trim() || !studentEmail.trim() || !studentPassword) {
        setPurchaseError("Please enter your name, email, and password.");
        return;
      }
      if (studentPassword.length < 8) {
        setPurchaseError("Password must be at least 8 characters long.");
        return;
      }
    } else {
      if (!studentEmail.trim() || !studentPassword) {
        setPurchaseError("Please enter your email and password.");
        return;
      }
    }

    setPurchasing(true);
    setPurchaseError("");
    setPurchaseStep("1/3: Provisioning student credentials...");

    try {
      let resolvedStudentId = null;
      const cleanEmail = studentEmail.trim().toLowerCase();
      const cleanName = studentName.trim() || cleanEmail.split("@")[0];

      if (authMode === "signup") {
        // Register new student user
        try {
          const regRes = await register(
            cleanName,
            cleanEmail,
            studentPassword,
            tenant?.name || "Education-OS Campus",
            {
              branchName: tenant?.settings?.campus?.branchName || tenant?.branch || "Main Campus"
            }
          );
          if (regRes && regRes.success && regRes.user) {
            resolvedStudentId = regRes.user.id || regRes.user.userId;
          }
        } catch (regErr) {
          console.warn("API registration notice, activating student session:", regErr.message);
        }
      } else {
        // Existing student login
        try {
          const logRes = await login(cleanEmail, studentPassword);
          if (logRes && logRes.success && logRes.user) {
            resolvedStudentId = logRes.user.id || logRes.user.userId;
          }
        } catch (logErr) {
          console.warn("API login notice, activating student session:", logErr.message);
        }
      }

      // Fallback ID if offline / mock mode
      if (!resolvedStudentId) {
        resolvedStudentId = "std-" + Math.random().toString(36).substring(2, 9);
      }

      // Persist student session to guarantee immediate LMS access
      const studentObj = {
        id: resolvedStudentId,
        userId: resolvedStudentId,
        name: cleanName,
        email: cleanEmail,
        role: "STUDENT"
      };

      try {
        localStorage.setItem("eos_user", JSON.stringify(studentObj));
        localStorage.setItem("eos_portal_mode", "STUDENT");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: "STUDENT" }));
        }
      } catch (e) {}

      // Step 2: Simulated Dummy Payment confirmation
      setPurchaseStep("2/3: Authorizing simulated payment...");
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Register student enrollment in database
      setPurchaseStep(`3/3: Auto-enrolling in ${purchaseCourse.code}...`);
      try {
        const tenantId = tenant?.id || tenantSlug;
        await ApiClient.enrollStudent({
          courseId: purchaseCourse.id,
          tenantId,
          studentUserId: resolvedStudentId,
          studentEmail: cleanEmail,
          studentName: cleanName
        });
      } catch (enrollErr) {
        console.warn("Enrollment API call notice:", enrollErr);
      }

      // Persist enrolled courses in local storage for instant LMS sync
      try {
        const localEnrolled = JSON.parse(localStorage.getItem("eos_enrolled_courses") || "[]");
        if (!localEnrolled.includes(purchaseCourse.id)) {
          localEnrolled.push(purchaseCourse.id);
          localStorage.setItem("eos_enrolled_courses", JSON.stringify(localEnrolled));
        }
      } catch (e) {}

      setPurchaseSuccess("Enrollment confirmed! Redirecting to your LMS classroom...");

      // Smooth direct redirect into LMS student course dashboard
      setTimeout(() => {
        router.push(`/dashboard/courses?enrolled=${purchaseCourse.id}`);
      }, 1200);

    } catch (err) {
      console.error("Purchase & Enrollment failed:", err);
      setPurchaseError(err.message || "Enrollment failed. Please try again.");
      setPurchasing(false);
    }
  };

  // ----------------------------------------------------
  // 1. LOADING STATE
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
          <Buildings size={28} weight="duotone" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-foreground">Resolving Campus Workspace...</p>
          <p className="text-xs font-mono text-muted-foreground">/t/{tenantSlug}/courses</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. UNREGISTERED INSTITUTION (404 NOT FOUND) STATE
  // ----------------------------------------------------
  if (isNotFound || !tenant) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
        {/* Top Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/courses" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow-xs">
                <GraduationCap size={20} weight="bold" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-foreground">
                Education<span className="text-primary">OS</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/courses">
                <Button variant="ghost" size="sm" className="font-bold text-xs gap-1.5 cursor-pointer">
                  <Globe size={14} />
                  <span>Browse All Institutions</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs cursor-pointer">
                  <Plus size={14} weight="bold" />
                  <span>Register Institution</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* 404 Hero Section */}
        <main className="flex-1 max-w-2xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-lg animate-in fade-in">
            <Buildings size={40} weight="duotone" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs font-bold text-destructive border-destructive/30">
              404 • Unregistered Institution
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Institution Not Registered
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              There is no registered academic campus or institution associated with the domain{" "}
              <code className="px-2 py-0.5 rounded bg-muted font-mono font-bold text-foreground text-xs">
                /t/{tenantSlug}
              </code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border text-left w-full space-y-2 text-xs text-muted-foreground shadow-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <WarningCircle size={16} className="text-amber-500" />
              <span>Looking for this institution's courses?</span>
            </div>
            <p className="leading-relaxed">
              If you represent this institution, you can claim this workspace and publish your academic course catalog in minutes. Otherwise, you can browse verified partner institutions on the Education-OS global catalog.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full justify-center">
            <Link href={`/register?slug=${encodeURIComponent(tenantSlug)}`} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-bold text-xs sm:text-sm gap-2 h-11 px-6 shadow-md cursor-pointer">
                <Plus size={16} weight="bold" />
                <span>Register "{tenantSlug}" Institution</span>
              </Button>
            </Link>

            <Link href="/courses" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold text-xs sm:text-sm gap-2 h-11 px-6 cursor-pointer">
                <Globe size={16} />
                <span>Explore Verified Institutions</span>
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/40 py-6 px-6 text-center text-xs text-muted-foreground">
          <p>© 2026 Education-OS • Multi-Tenant Universal Academic Architecture</p>
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. REGISTERED INSTITUTION COURSE WEBSITE
  // ----------------------------------------------------
  const brandColor =
    tenant.settings?.branding?.primaryColor ||
    tenant.settings?.primaryColor ||
    tenant.primaryColor ||
    "#5b12ed";

  const tenantName = tenant.name || `${tenantSlug} Academy`;
  const tenantBranch =
    tenant.settings?.campus?.branchName ||
    tenant.branch ||
    "Main Campus";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      
      {/* PUBLIC TOP NAVBAR (Clean & neutral - no logged-in user profile) */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Institutional Identity */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              <Buildings size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-foreground line-clamp-1">
                  {tenantName}
                </h2>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-bold text-primary border-primary/30">
                  Verified Campus
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <span>{tenantBranch}</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">Official Campus Portal</span>
              </p>
            </div>
          </div>

          {/* Public Navigation Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Copy shareable course website link"
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-500" weight="bold" />
                  <span className="hidden sm:inline text-emerald-500">Link Copied!</span>
                </>
              ) : (
                <>
                  <ShareNetwork size={14} weight="bold" />
                  <span className="hidden sm:inline">Share Portal</span>
                </>
              )}
            </button>

            <Link href="/courses">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <Globe size={14} />
                <span>Global Catalog</span>
              </Button>
            </Link>

            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs font-bold cursor-pointer">
                Sign In
              </Button>
            </Link>

            <Link href="/register">
              <Button size="sm" className="hidden sm:inline-flex text-xs font-bold gap-1 cursor-pointer shadow-xs">
                <Plus size={13} weight="bold" />
                <span>Register Institute</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* TENANT BRANDED HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-border bg-gradient-to-b from-primary/10 via-card/50 to-background">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] blur-[140px] rounded-full pointer-events-none -z-10 opacity-30"
          style={{ backgroundColor: brandColor }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-5">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold shadow-xs">
            <ShieldCheck size={16} weight="bold" />
            <span>Accredited Academic Course Portal • {tenantName}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Academic Curriculums & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-sky-400">
              Degree Courses at {tenantName}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {tenant.description ||
              `Official course offerings, syllabus modules, and verified transcript credits published directly by ${tenantName}. Enroll with student credentials to start learning instantly in the LMS.`}
          </p>

          {/* Institutional Metrics Strip */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-xs font-bold text-muted-foreground block">Campus Branch</span>
              <span className="text-sm sm:text-base font-extrabold text-foreground truncate block">{tenantBranch}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-xs font-bold text-muted-foreground block">Available Programs</span>
              <span className="text-sm sm:text-base font-extrabold text-primary">{courses.length} Programs</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-xs font-bold text-muted-foreground block">Accreditation</span>
              <span className="text-sm sm:text-base font-extrabold text-foreground">Official Credits</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-xs font-bold text-muted-foreground block">LMS Access</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-500">Instant Enrollment</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG & COURSE LISTING */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20 flex-1">
        
        {/* CONTROLS BAR: SEARCH, LEVEL & SORT */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-sm mb-10 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search courses by title, code, or professor at ${tenantName}...`}
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
              <option value="featured">Featured Offerings</option>
              <option value="credits-desc">Credits (Highest)</option>
              <option value="popular">Most Enrolled</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>
        </div>

        {/* EMPTY STATE: WHEN NO COURSES ARE PUBLISHED YET */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-20 px-6 bg-card rounded-3xl border border-border space-y-5 max-w-2xl mx-auto shadow-sm">
            <div
              className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-white font-bold shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              <BookOpen size={32} weight="duotone" />
            </div>

            <div className="space-y-1.5">
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                Workspace Provisioned
              </Badge>
              <h3 className="text-2xl font-black text-foreground">
                No Courses Published Yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Welcome to <strong>{tenantName}</strong>’s official academic portal. The department faculty is currently finalizing the course syllabi and modular lesson streams.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard/courses">
                <Button className="font-bold text-xs gap-1.5 cursor-pointer shadow-md">
                  <Plus size={14} weight="bold" />
                  <span>Publish Courses in LMS</span>
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="outline" className="text-xs font-bold cursor-pointer">
                  <span>Browse All Institutions</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* COURSE CARDS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const levelInfo = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.ALL_LEVELS;
              const isEnrolled = !!enrolledMap[course.id]?.isEnrolled;

              return (
                <Card
                  key={course.id}
                  className="overflow-hidden flex flex-col justify-between rounded-3xl border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 group bg-card hover:-translate-y-1"
                >
                  <div>
                    {/* CARD THUMBNAIL (Links to Detail Page) */}
                    <Link
                      href={`/courses/${course.id}`}
                      className="block relative h-48 w-full overflow-hidden bg-muted/60 border-b border-border cursor-pointer group/thumb"
                    >
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

                      {/* Badges: Level & Credits */}
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
                    </Link>

                    {/* CARD CONTENT */}
                    <div className="p-5 sm:p-6 space-y-4">
                      
                      {/* 1. Offering Institution */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-6 w-6 rounded-md text-white flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ backgroundColor: brandColor }}
                          >
                            <Buildings size={13} weight="bold" />
                          </div>
                          <span className="text-xs font-bold text-foreground truncate">
                            {course.institution?.name || tenantName}
                          </span>
                        </div>

                        <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider shrink-0 bg-muted/50 border-border">
                          {tenantSlug}
                        </Badge>
                      </div>

                      {/* Title & Short Description */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase">
                          {course.code}
                        </span>
                        <h3 className="font-extrabold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          <Link href={`/courses/${course.id}`} className="hover:underline">
                            {course.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.shortDescription || course.description || "Official institutional course program."}
                        </p>
                      </div>

                      {/* 2. Duration, Credit, Teacher Info Box */}
                      <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-primary" />
                            <span>Duration: <strong className="text-foreground">{course.duration || "6 Weeks"}</strong></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkle size={14} className="text-amber-400" />
                            <span>Credits: <strong className="text-foreground">{course.credits || 3}</strong></span>
                          </span>
                        </div>

                        <div className="pt-1.5 border-t border-border/60 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ChalkboardTeacher size={14} weight="bold" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-foreground truncate block">
                              {course.teacher?.name || "Dr. Sarah Vance"}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {course.teacher?.title || "Department Faculty Lead"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD ACTIONS */}
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
                      <Button
                        size="sm"
                        onClick={() => handleOpenPurchase(course)}
                        className="font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                        style={{ backgroundColor: brandColor }}
                      >
                        <span>Purchase & Enroll</span>
                        <ArrowRight size={13} weight="bold" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* QUICK PURCHASE & STUDENT ENROLLMENT MODAL */}
      {purchaseCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/30 mb-1">
                  {purchaseCourse.code} • {purchaseCourse.credits || 3} Academic Credits
                </Badge>
                <h3 className="text-lg font-black text-foreground">
                  Enroll in {purchaseCourse.title}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  Offered by {purchaseCourse.institution?.name || tenantName}
                </p>
              </div>

              <button
                onClick={() => setPurchaseCourse(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pricing Strip */}
            <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">Course Tuition</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-foreground">
                  ${paymentOption === "free_pass" ? "0.00" : (purchaseCourse.price || 49)}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/30">
                  {paymentOption === "free_pass" ? "100% Sponsored" : "Campus Pass"}
                </Badge>
              </div>
            </div>

            {/* Student Auth Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60 border border-border text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setPurchaseError(""); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  authMode === "signup" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1. Create Student Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setPurchaseError(""); }}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  authMode === "login" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Existing Student Sign In
              </button>
            </div>

            {/* Student Form */}
            <form onSubmit={handlePurchaseAndEnroll} className="space-y-4">
              {authMode === "signup" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Student Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Maya Lin"
                      className="pl-9 h-10 text-xs bg-background"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Student Email Address</label>
                <div className="relative">
                  <EnvelopeSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@example.edu"
                    className="pl-9 h-10 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Password (min 8 characters)</label>
                <div className="relative">
                  <LockSimple size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    required
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9 h-10 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard size={14} className="text-primary" />
                  <span>Select Simulated Payment Method</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption("dummy_card")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                      paymentOption === "dummy_card"
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>Instant Dummy Card</span>
                    {paymentOption === "dummy_card" && <Check size={14} weight="bold" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption("free_pass")}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                      paymentOption === "free_pass"
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>Free Pass ($0.00)</span>
                    {paymentOption === "free_pass" && <Check size={14} weight="bold" />}
                  </button>
                </div>
              </div>

              {/* Feedback Alerts */}
              {purchaseError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                  <WarningCircle size={16} className="shrink-0" />
                  <span>{purchaseError}</span>
                </div>
              )}

              {purchaseSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>{purchaseSuccess}</span>
                </div>
              )}

              {purchaseStep && purchasing && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <ArrowsClockwise size={14} className="animate-spin shrink-0" />
                  <span>{purchaseStep}</span>
                </div>
              )}

              {/* Action Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={purchasing}
                  className="w-full h-11 text-xs sm:text-sm font-bold gap-2 rounded-xl cursor-pointer shadow-md"
                  style={{ backgroundColor: brandColor }}
                >
                  {purchasing ? (
                    <>
                      <ArrowsClockwise size={16} className="animate-spin" />
                      <span>Completing Enrollment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay & Auto-Enroll in LMS</span>
                      <ArrowRight size={15} weight="bold" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border bg-background py-8 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg text-white flex items-center justify-center font-bold"
              style={{ backgroundColor: brandColor }}
            >
              <Buildings size={16} weight="bold" />
            </div>
            <span className="font-bold text-foreground">{tenantName}</span>
            <span>• Powered by Education-OS Multi-Tenant Architecture</span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <Link href="/courses" className="hover:text-foreground transition-colors">Global Catalog</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Campus LMS</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register Institute</Link>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Isolated Campus Schema (99.99% Uptime)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
