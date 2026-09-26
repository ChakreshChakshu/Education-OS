"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  GraduationCap,
  Buildings,
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkle,
  UploadSimple,
  Globe,
  LockSimple,
  EnvelopeSimple,
  User,
  ShieldCheck,
  Calendar,
  CurrencyDollar,
  MapPin,
  RocketLaunch,
  Laptop,
  BookOpen,
  Briefcase,
  WarningCircle,
  ArrowsClockwise,
  Eye,
  EyeSlash
} from "@phosphor-icons/react";

const PALETTE_PRESETS = [
  {
    id: "oxford-navy",
    name: "Oxford Navy",
    primary: "#1E3A8A",
    accent: "#3B82F6",
    description: "Traditional collegiate authority"
  },
  {
    id: "emerald-academy",
    name: "Emerald Academy",
    primary: "#065F46",
    accent: "#10B981",
    description: "Prestigious & growth-oriented"
  },
  {
    id: "royal-indigo",
    name: "Royal Indigo",
    primary: "#4338CA",
    accent: "#8B5CF6",
    description: "Modern academic elegance"
  },
  {
    id: "crimson-tech",
    name: "Crimson Tech",
    primary: "#991B1B",
    accent: "#EF4444",
    description: "Bold & intensive engineering"
  },
  {
    id: "amber-forge",
    name: "Amber Forge",
    primary: "#B45309",
    accent: "#F59E0B",
    description: "Dynamic bootcamp energy"
  },
  {
    id: "obsidian-slate",
    name: "Obsidian Slate",
    primary: "#0F172A",
    accent: "#64748B",
    description: "High-end executive academy"
  }
];

const INSTITUTION_TYPES = [
  {
    id: "UNIVERSITY",
    name: "University / Higher Ed",
    icon: GraduationCap,
    desc: "Multi-department degree & research curricula"
  },
  {
    id: "BOOTCAMP",
    name: "Tech Bootcamp / EdTech",
    icon: Laptop,
    desc: "Cohort-based accelerator with intensive sprints"
  },
  {
    id: "K12",
    name: "K-12 School / Academy",
    icon: BookOpen,
    desc: "Grade-based term progression & parent tracking"
  },
  {
    id: "CORPORATE",
    name: "Corporate Enterprise",
    icon: Briefcase,
    desc: "Employee onboarding & compliance certifications"
  }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getContrastInkColor(hexColor) {
  if (!hexColor || typeof hexColor !== "string") return "#ffffff";
  const clean = hexColor.replace("#", "");
  const fullHex = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return "#ffffff";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#0f172a" : "#ffffff";
}

const DEFAULT_TIMEZONES = [
  { value: "UTC", label: "UTC (Universal Standard Time)" },
  { value: "America/New_York", label: "America/New_York (EST / EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST / CDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST / PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET / CEST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" }
];

const STEP_INSIGHTS = {
  1: {
    badge: "Step 1 of 5",
    title: "Administrator Account",
    desc: "Your primary administrator account establishes root ownership for your institution.",
    highlights: [
      {
        title: "Administrative control",
        text: "Manage faculty roles, course builders, and institution-wide settings."
      },
      {
        title: "Secure credentials",
        text: "Single account with role-based permissions and encrypted storage."
      },
      {
        title: "Multi-campus governance",
        text: "Authority to configure and oversee all campus branches."
      }
    ]
  },
  2: {
    badge: "Step 2 of 5",
    title: "Dedicated Workspace",
    desc: "Every institution operates in its own dedicated, isolated workspace environment.",
    highlights: [
      {
        title: "Custom subdomain",
        text: "Direct branded URL for student course access and staff portals."
      },
      {
        title: "Data isolation",
        text: "Dedicated tenant boundaries safeguard student and academic records."
      },
      {
        title: "Tailored model",
        text: "Optimized structures for universities, tech bootcamps, and academies."
      }
    ]
  },
  3: {
    badge: "Step 3 of 5",
    title: "Brand & Visual Identity",
    desc: "Personalize your student classroom player and staff dashboards with your identity.",
    highlights: [
      {
        title: "Institution crest",
        text: "Display your official logo across student portals and course navigation."
      },
      {
        title: "Curated palettes",
        text: "Harmonious color combinations designed for academic elegance."
      },
      {
        title: "Accessible contrast",
        text: "Theme tokens automatically maintain high-contrast readability."
      }
    ]
  },
  4: {
    badge: "Step 4 of 5",
    title: "Campus & Operations",
    desc: "Establish your starting operational defaults for classrooms and scheduling.",
    highlights: [
      {
        title: "Campus branch setup",
        text: "Organize by physical campus division or virtual academy branch."
      },
      {
        title: "Initial student cohort",
        text: "Prepares your curriculum builder with a starting enrollment group."
      },
      {
        title: "Timezone synchronization",
        text: "Accurately coordinate live lecture streams and assignment deadlines."
      }
    ]
  },
  5: {
    badge: "Step 5 of 5",
    title: "Review & Provisioning",
    desc: "Verify your parameters before launching your institution workspace.",
    highlights: [
      {
        title: "Instant initialization",
        text: "Database schema, default roles, and settings configure automatically."
      },
      {
        title: "Ready to enroll",
        text: "Create courses, upload video lessons, and invite instructors right away."
      },
      {
        title: "Enterprise scaling",
        text: "Adaptive bitrate video pipelines and note sync ready out of the box."
      }
    ]
  }
};

export default function RegisterOnboardingPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Admin Profile
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRoleTitle, setAdminRoleTitle] = useState("Dean / Director");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Institution & Subdomain
  const [institutionName, setInstitutionName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState("idle"); // 'idle' | 'checking' | 'available' | 'taken'
  const [institutionType, setInstitutionType] = useState("UNIVERSITY");
  const slugDebounceRef = useRef(null);

  // Step 3: Branding & Color Palette
  const [logoPreview, setLogoPreview] = useState("");
  const [primaryColor, setPrimaryColor] = useState(PALETTE_PRESETS[0].primary);
  const [accentColor, setAccentColor] = useState(PALETTE_PRESETS[0].accent);
  const [activePreset, setActivePreset] = useState(PALETTE_PRESETS[0].id);

  // Step 4: Campus Branch & Regional Settings
  const [branchName, setBranchName] = useState("Main Campus");
  const [timezone, setTimezone] = useState("UTC");
  const [availableTimezones, setAvailableTimezones] = useState(DEFAULT_TIMEZONES);
  const [currency, setCurrency] = useState("USD");
  const [initialCohort, setInitialCohort] = useState("Fall 2026 Cohort");

  // Step 5: Provisioning status animation
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStepText, setProvisionStepText] = useState("");

  // Restore non-sensitive draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("education_os_register_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.adminName) setAdminName(parsed.adminName);
        if (parsed.adminEmail) setAdminEmail(parsed.adminEmail);
        if (parsed.adminRoleTitle) setAdminRoleTitle(parsed.adminRoleTitle);
        if (parsed.institutionName) setInstitutionName(parsed.institutionName);
        if (parsed.slug) {
          setSlug(parsed.slug);
          setSlugStatus("available");
        }
        if (parsed.institutionType) setInstitutionType(parsed.institutionType);
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
        if (parsed.activePreset) setActivePreset(parsed.activePreset);
        if (parsed.branchName) setBranchName(parsed.branchName);
        if (parsed.initialCohort) setInitialCohort(parsed.initialCohort);
        if (parsed.currency) setCurrency(parsed.currency);
      }
    } catch (e) {
      // Local storage unavailable or disabled
    }
  }, []);

  // Save non-sensitive fields to localStorage
  useEffect(() => {
    try {
      const draft = {
        adminName,
        adminEmail,
        adminRoleTitle,
        institutionName,
        slug,
        institutionType,
        primaryColor,
        accentColor,
        activePreset,
        branchName,
        initialCohort,
        currency
      };
      localStorage.setItem("education_os_register_draft", JSON.stringify(draft));
    } catch (_e) {
      // LocalStorage not accessible
    }
  }, [
    adminName,
    adminEmail,
    adminRoleTitle,
    institutionName,
    slug,
    institutionType,
    primaryColor,
    accentColor,
    activePreset,
    branchName,
    initialCohort,
    currency
  ]);

  // Auto-detect browser timezone
  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) {
        setTimezone(userTz);
        setAvailableTimezones((prev) => {
          if (!prev.some((tz) => tz.value === userTz)) {
            return [{ value: userTz, label: `${userTz} (Detected Local)` }, ...prev];
          }
          return prev;
        });
      }
    } catch (_e) {
      // Timezone detection failed, keep default
    }
  }, []);

  // Auto-generate slug from institution name when step 2 opens
  const handleInstitutionNameChange = (val) => {
    setInstitutionName(val);
    if (!slug || slugStatus === "idle") {
      const generated = slugify(val);
      setSlug(generated);
      triggerSlugCheck(generated);
    }
  };

  const triggerSlugCheck = (slugVal) => {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (!slugVal || slugVal.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await ApiClient.checkSlug(slugVal);
        if (res.success && res.available) {
          setSlugStatus("available");
        } else {
          setSlugStatus("taken");
        }
      } catch (err) {
        setSlugStatus("available"); // graceful fallback
      }
    }, 400);
  };

  const handleSlugChange = (val) => {
    const formatted = slugify(val);
    setSlug(formatted);
    triggerSlugCheck(formatted);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Logo file size exceeds 2MB limit. Please choose a smaller image file.");
        return;
      }
      setError("");
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (preset) => {
    setActivePreset(preset.id);
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
  };

  const nextStep = () => {
    setError("");

    if (step === 1) {
      if (!adminName.trim() || adminName.trim().length < 2) {
        setError("Please enter your full legal name (at least 2 characters).");
        return;
      }
      if (!adminEmail.trim() || !adminEmail.includes("@") || !adminEmail.includes(".")) {
        setError("Please enter a valid official work email address.");
        return;
      }
      if (adminPassword.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
    }

    if (step === 2) {
      if (!institutionName.trim() || institutionName.trim().length < 2) {
        setError("Please enter your institution's legal name.");
        return;
      }
      if (slug.length < 3) {
        setError("Dedicated subdomain must be at least 3 characters.");
        return;
      }
      if (slugStatus === "checking") {
        setError("Verifying subdomain availability. Please wait a moment.");
        return;
      }
      if (slugStatus === "taken") {
        setError("This subdomain is already taken or unavailable. Please choose another.");
        return;
      }
    }

    if (step === 4) {
      if (!branchName.trim() || branchName.trim().length < 2) {
        setError("Please provide a name for your default campus branch.");
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submission
  const handleLaunch = async () => {
    setLoading(true);
    setError("");
    setProvisionStepText("Setting up administrator account...");
    setProvisionProgress(25);

    try {
      setTimeout(() => {
        setProvisionStepText("Configuring database schema...");
        setProvisionProgress(55);
      }, 700);

      setTimeout(() => {
        setProvisionStepText("Applying brand settings & permissions...");
        setProvisionProgress(80);
      }, 1400);

      const payload = {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        institutionName,
        slug,
        branchName,
        timezone,
        settingsJson: {
          branding: {
            logoUrl: logoPreview || null,
            primaryColor,
            accentColor,
            palettePreset: activePreset
          },
          institutionType,
          roleTitle: adminRoleTitle,
          timezone,
          currency,
          initialCohort
        }
      };

      const res = await register(payload);

      if (res.success) {
        setProvisionProgress(100);
        setProvisionStepText("Workspace ready! Entering dashboard...");
        try {
          localStorage.removeItem("education_os_register_draft");
        } catch (_e) {
          // ignore
        }
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        setError(res.error || "Failed to provision institution. Please check your inputs.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during onboarding.");
      setLoading(false);
    }
  };

  // Dynamic ink calculation for contrast compliance
  const primaryInk = getContrastInkColor(primaryColor);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <GraduationCap size={22} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight">Education OS</span>
            <span className="text-[10px] sm:text-[11px] font-mono block text-muted-foreground">INSTITUTION ONBOARDING STUDIO</span>
          </div>
        </Link>

        {/* Desktop Step Stepper */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {[
            { num: 1, label: "Admin" },
            { num: 2, label: "Institution" },
            { num: 3, label: "Branding" },
            { num: 4, label: "Campus" },
            { num: 5, label: "Launch" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (s.num < step && !loading) {
                    setStep(s.num);
                    setError("");
                  }
                }}
                disabled={s.num > step || loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : s.num < step
                    ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                <span>{s.num < step ? "✓" : s.num}</span>
                <span>{s.label}</span>
              </button>
              {s.num < 5 && <span className="text-muted-foreground/30 text-xs">➔</span>}
            </div>
          ))}
        </div>

        {/* Mobile Step Counter & Progress Bar */}
        <div className="flex md:hidden flex-col items-end gap-1 w-28 sm:w-36">
          <div className="flex justify-between w-full text-[10px] font-mono font-bold text-muted-foreground">
            <span>STEP {step}/5</span>
            <span className="text-foreground font-semibold">
              {step === 1 ? "Admin" : step === 2 ? "School" : step === 3 ? "Branding" : step === 4 ? "Campus" : "Launch"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Already registered?</span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="font-bold text-xs h-9">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Multi-Step Layout (Left-Right Split) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: ACTIVE STEP FORM (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold flex items-center gap-3 animate-in fade-in">
              <WarningCircle size={22} weight="bold" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: ADMINISTRATOR CREDENTIALS */}
          {step === 1 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 1 OF 5 • ADMIN PROFILE
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Create your administrator account</h1>
                <p className="text-sm text-muted-foreground">
                  This primary account will manage your institution, branches, and billing.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <User size={15} className="text-muted-foreground" /> Full name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <EnvelopeSimple size={15} className="text-muted-foreground" /> Work email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="name@institution.edu"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <LockSimple size={15} className="text-muted-foreground" /> Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="h-11 text-sm rounded-xl font-medium pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength & Criteria */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            adminPassword.length >= 12
                              ? "w-full bg-emerald-500"
                              : adminPassword.length >= 8
                              ? "w-2/3 bg-amber-500"
                              : adminPassword.length > 0
                              ? "w-1/3 bg-red-500"
                              : "w-0"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {adminPassword.length >= 12 ? "Strong" : adminPassword.length >= 8 ? "Good" : adminPassword.length > 0 ? "Too short" : "Min 8 chars"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className={`flex items-center gap-1 ${adminPassword.length >= 8 ? "text-emerald-600 font-bold" : ""}`}>
                        <Check size={12} weight="bold" /> 8+ characters
                      </span>
                      <span className={`flex items-center gap-1 ${/[a-zA-Z]/.test(adminPassword) && /[0-9]/.test(adminPassword) ? "text-emerald-600 font-bold" : ""}`}>
                        <Check size={12} weight="bold" /> Letters & numbers
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <ShieldCheck size={15} className="text-muted-foreground" /> Role or title
                  </label>
                  <Input
                    placeholder="e.g. Dean, Founder, Director"
                    value={adminRoleTitle}
                    onChange={(e) => setAdminRoleTitle(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="font-bold rounded-xl px-6 gap-2"
                  >
                    <span>Continue to Institution</span>
                    <ArrowRight size={16} weight="bold" />
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* STEP 2: INSTITUTION IDENTITY & SUBDOMAIN */}
          {step === 2 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 2 OF 5 • INSTITUTION
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Set up your institution</h1>
                <p className="text-sm text-muted-foreground">
                  Choose your institution name and dedicated workspace domain.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-5 pt-2"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <Buildings size={15} className="text-muted-foreground" /> Institution name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Skillyards Academy"
                    value={institutionName}
                    onChange={(e) => handleInstitutionNameChange(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                    autoFocus
                  />
                </div>

                {/* Subdomain slug with live validator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                      <Globe size={15} className="text-muted-foreground" /> Subdomain
                    </label>
                    {slugStatus === "checking" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground animate-pulse">
                        <ArrowsClockwise size={12} className="animate-spin" /> Checking...
                      </span>
                    )}
                    {slugStatus === "available" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-bold">
                        <Check size={14} weight="bold" /> Available
                      </span>
                    )}
                    {slugStatus === "taken" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-destructive font-bold">
                        ✗ Unavailable
                      </span>
                    )}
                  </div>

                  <div className="flex items-center rounded-xl border border-border bg-muted/30 px-3.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
                    <span className="text-xs font-mono text-muted-foreground select-none">https://</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="skillyards"
                      className="flex-1 bg-transparent py-2.5 px-1 text-sm font-mono font-bold text-foreground focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-primary select-none">.educationos.io</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Your team and students will use this URL to access courses and portals.
                  </p>
                </div>

                {/* Institution Type Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/90">
                    Institution type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INSTITUTION_TYPES.map((type) => {
                      const IconComp = type.icon;
                      const isSelected = institutionType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setInstitutionType(type.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                              }`}
                            >
                              <IconComp size={18} weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{type.name}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{type.desc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button type="button" onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="font-bold rounded-xl px-6 gap-2"
                  >
                    <span>Continue to Branding</span>
                    <ArrowRight size={16} weight="bold" />
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* STEP 3: BRAND IDENTITY & THEME STUDIO */}
          {step === 3 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 3 OF 5 • BRANDING
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Brand & appearance</h1>
                <p className="text-sm text-muted-foreground">
                  Upload your logo and choose a color theme for your student and faculty portal.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-6 pt-2"
              >
                {/* Logo Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <Sparkle size={15} className="text-muted-foreground" /> Institution logo
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border bg-muted/20">
                    <div
                      className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border shadow-xs"
                      style={{ backgroundColor: primaryColor, color: primaryInk }}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <span>{institutionName ? institutionName.charAt(0).toUpperCase() : "E"}</span>
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-card border border-border text-xs font-bold cursor-pointer hover:bg-muted transition-colors">
                          <UploadSimple size={14} weight="bold" />
                          <span>Upload logo</span>
                          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={() => setLogoPreview("")}
                            className="text-xs text-muted-foreground hover:text-destructive underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Square recommended. PNG, SVG, or WebP up to 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Theme Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <Palette size={15} className="text-muted-foreground" /> Color presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PALETTE_PRESETS.map((preset) => {
                      const isSelected = activePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => selectPreset(preset)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-5 rounded-full shadow-xs" style={{ backgroundColor: preset.primary }} />
                            <div className="h-5 w-5 rounded-full shadow-xs" style={{ backgroundColor: preset.accent }} />
                            {isSelected && <Check size={14} weight="bold" className="ml-auto text-primary" />}
                          </div>
                          <p className="text-xs font-bold text-foreground">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90">
                      Primary color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="h-9 w-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor.toUpperCase()}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="w-24 px-2 py-1.5 rounded-lg border border-border bg-card font-mono text-xs font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90">
                      Accent color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => {
                          setAccentColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="h-9 w-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={accentColor.toUpperCase()}
                        onChange={(e) => {
                          setAccentColor(e.target.value);
                          setActivePreset("custom");
                        }}
                        className="w-24 px-2 py-1.5 rounded-lg border border-border bg-card font-mono text-xs font-bold uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button type="button" onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button type="submit" size="lg" className="font-bold rounded-xl px-6 gap-2">
                    <span>Continue to Campus</span>
                    <ArrowRight size={16} weight="bold" />
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* STEP 4: CAMPUS BRANCH & REGIONAL SETTINGS */}
          {step === 4 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 4 OF 5 • CAMPUS & SETTINGS
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Campus & regional settings</h1>
                <p className="text-sm text-muted-foreground">
                  Configure your default campus, initial academic term, and regional preferences.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <MapPin size={15} className="text-muted-foreground" /> Primary campus or branch
                  </label>
                  <Input
                    required
                    placeholder="e.g. Main Campus, Online Campus"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <Calendar size={15} className="text-muted-foreground" /> Initial cohort or term
                  </label>
                  <Input
                    placeholder="e.g. Fall 2026, Cohort 1"
                    value={initialCohort}
                    onChange={(e) => setInitialCohort(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Creates your starting cohort so you can organize courses right away.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                      <Globe size={15} className="text-muted-foreground" /> Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      {availableTimezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                      <CurrencyDollar size={15} className="text-muted-foreground" /> Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="USD">USD ($) — US Dollar</option>
                      <option value="EUR">EUR (€) — Euro</option>
                      <option value="GBP">GBP (£) — British Pound</option>
                      <option value="INR">INR (₹) — Indian Rupee</option>
                      <option value="CAD">CAD ($) — Canadian Dollar</option>
                      <option value="AUD">AUD ($) — Australian Dollar</option>
                      <option value="SGD">SGD ($) — Singapore Dollar</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button type="button" onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="font-bold rounded-xl px-6 gap-2"
                  >
                    <span>Review & Launch</span>
                    <ArrowRight size={16} weight="bold" />
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* STEP 5: REVIEW & FINAL LAUNCH */}
          {step === 5 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 5 OF 5 • REVIEW
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Review & launch</h1>
                <p className="text-sm text-muted-foreground">
                  Confirm your details. Your workspace will be ready in seconds.
                </p>
              </div>

              {/* Review Overview Card */}
              <div className="space-y-3 p-5 rounded-2xl border border-border bg-muted/20">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden border border-border shadow-xs"
                    style={{ backgroundColor: primaryColor, color: primaryInk }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span>{institutionName ? institutionName.charAt(0).toUpperCase() : "E"}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-foreground">{institutionName || "My Academy"}</h3>
                    <p className="text-xs font-mono text-primary font-bold">https://{slug}.educationos.io</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Administrator</span>
                    <strong className="text-foreground">{adminName}</strong>
                    <span className="text-muted-foreground block text-[10px]">{adminEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Campus</span>
                    <strong className="text-foreground">{branchName}</strong>
                    <span className="text-muted-foreground block text-[10px]">{timezone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Type</span>
                    <strong className="text-foreground">{institutionType}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Cohort</span>
                    <strong className="text-foreground">{initialCohort}</strong>
                    <span className="text-muted-foreground block text-[10px]">Currency: {currency}</span>
                  </div>
                </div>
              </div>

              {/* Provisioning Progress Loader */}
              {loading && (
                <div className="space-y-2 p-5 rounded-2xl bg-primary/10 border border-primary/30 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold font-mono">
                    <span className="text-primary flex items-center gap-2">
                      <ArrowsClockwise size={14} className="animate-spin" /> {provisionStepText}
                    </span>
                    <span className="text-primary">{provisionProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-primary/20 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${provisionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <Button type="button" onClick={prevStep} variant="ghost" disabled={loading} className="font-bold text-xs gap-1.5">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleLaunch}
                  disabled={loading}
                  size="lg"
                  className="font-bold rounded-xl px-8 gap-2 bg-primary text-primary-foreground shadow-md hover:opacity-95 cursor-pointer"
                >
                  <RocketLaunch size={18} weight="bold" />
                  <span>Launch workspace</span>
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: STEP GUIDANCE & WORKSPACE OVERVIEW (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-5">
          <Card className="border-border shadow-xs rounded-2xl bg-card p-6 space-y-5">
            <div className="space-y-1.5">
              <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary border-primary/30">
                {STEP_INSIGHTS[step]?.badge || "Step Guide"} • OVERVIEW
              </Badge>
              <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                {STEP_INSIGHTS[step]?.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {STEP_INSIGHTS[step]?.desc}
              </p>
            </div>

            <div className="space-y-3 pt-1 border-t border-border">
              {STEP_INSIGHTS[step]?.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Check size={13} weight="bold" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground">{h.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{h.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Summary Card */}
          <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2.5 text-xs">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
              Configured Parameters
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Institution</span>
                <span className="font-semibold text-foreground truncate block">
                  {institutionName || "Not set yet"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Subdomain</span>
                <span className="font-semibold text-foreground truncate block font-mono text-[10px]">
                  {slug ? `${slug}.educationos.io` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Admin</span>
                <span className="font-semibold text-foreground truncate block">
                  {adminName || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Campus</span>
                <span className="font-semibold text-foreground truncate block">
                  {branchName || "Main Campus"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
