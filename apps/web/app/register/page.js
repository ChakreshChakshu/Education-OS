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
  CheckCircle,
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
  const [currency, setCurrency] = useState("USD");
  const [initialCohort, setInitialCohort] = useState("Fall 2026 Cohort");

  // Step 5: Provisioning status animation
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStepText, setProvisionStepText] = useState("");

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
      const res = await ApiClient.checkSlug(slugVal);
      if (res.success && res.available) {
        setSlugStatus("available");
      } else {
        setSlugStatus("taken");
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
        alert("Logo file size must be under 2MB");
        return;
      }
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

  // Step Validation checks
  const canProceedStep1 = adminName.trim().length >= 2 && adminEmail.includes("@") && adminPassword.length >= 8;
  const canProceedStep2 = institutionName.trim().length >= 2 && slug.length >= 3 && slugStatus !== "taken";
  const canProceedStep3 = true;
  const canProceedStep4 = branchName.trim().length >= 2;

  const nextStep = () => {
    setError("");
    if (step === 1 && !canProceedStep1) {
      setError("Please fill out your name, valid email, and minimum 8-character password.");
      return;
    }
    if (step === 2 && !canProceedStep2) {
      setError("Please choose a valid institution name and an available subdomain.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Submission
  const handleLaunch = async () => {
    setLoading(true);
    setError("");
    setProvisionStepText("Creating secure administrator account...");
    setProvisionProgress(25);

    try {
      setTimeout(() => {
        setProvisionStepText("Provisioning Neon PostgreSQL multi-tenant schema...");
        setProvisionProgress(55);
      }, 700);

      setTimeout(() => {
        setProvisionStepText("Injecting visual branding, color tokens & RBAC policies...");
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
        setProvisionStepText("Institution environment ready! Entering dashboard...");
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <GraduationCap size={24} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight">Education OS</span>
            <span className="text-[11px] font-mono block text-muted-foreground">INSTITUTION ONBOARDING STUDIO</span>
          </div>
        </Link>

        {/* Step Indicator */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { num: 1, label: "Admin" },
            { num: 2, label: "Institution" },
            { num: 3, label: "Branding" },
            { num: 4, label: "Campus" },
            { num: 5, label: "Launch" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (s.num < step && !loading) setStep(s.num);
                }}
                disabled={s.num > step || loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : s.num < step
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "text-muted-foreground/60 cursor-not-allowed"
                }`}
              >
                <span>{s.num < step ? "✓" : s.num}</span>
                <span>{s.label}</span>
              </button>
              {s.num < 5 && <span className="text-muted-foreground/30 text-xs">➔</span>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Already registered?</span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="font-bold text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Multi-Step Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: MULTI-STEP WIZARD FORM (7 cols) */}
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
                  STEP 1 OF 4 • ADMINISTRATOR PROFILE
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Create your institution owner credentials</h1>
                <p className="text-sm text-muted-foreground">
                  You will hold full root governance, RBAC delegation, and multi-branch management authority.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User size={16} /> Full Legal Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Dr. Eleanor Vance"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <EnvelopeSimple size={16} /> Official Work Email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="eleanor@university.edu"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <LockSimple size={16} /> Master Account Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="At least 8 characters..."
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="h-12 text-sm rounded-xl font-medium pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {adminPassword && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            adminPassword.length >= 12
                              ? "w-full bg-emerald-500"
                              : adminPassword.length >= 8
                              ? "w-2/3 bg-amber-500"
                              : "w-1/3 bg-red-500"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {adminPassword.length >= 12 ? "Strong" : adminPassword.length >= 8 ? "Good" : "Too short"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} /> Leadership / Academic Title
                  </label>
                  <Input
                    placeholder="e.g. Dean of Academics, Founder, Principal"
                    value={adminRoleTitle}
                    onChange={(e) => setAdminRoleTitle(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={nextStep}
                  disabled={!canProceedStep1}
                  size="lg"
                  className="font-bold rounded-xl px-6 gap-2"
                >
                  <span>Continue to Institution Details</span>
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 2: INSTITUTION IDENTITY & SUBDOMAIN */}
          {step === 2 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 2 OF 4 • INSTITUTION & SUBDOMAIN
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Define your institution identity & URL</h1>
                <p className="text-sm text-muted-foreground">
                  Your dedicated subdomain provides isolated multi-tenant data scoping on Neon Cloud.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Buildings size={16} /> Institution Legal Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Imperial Institute of Artificial Intelligence"
                    value={institutionName}
                    onChange={(e) => handleInstitutionNameChange(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                </div>

                {/* Subdomain slug with live validator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Globe size={16} /> Dedicated Subdomain
                    </label>
                    {slugStatus === "checking" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground animate-pulse">
                        <ArrowsClockwise size={12} className="animate-spin" /> Verifying...
                      </span>
                    )}
                    {slugStatus === "available" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-bold">
                        <Check size={14} weight="bold" /> Subdomain available
                      </span>
                    )}
                    {slugStatus === "taken" && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-destructive font-bold">
                        ✗ Already in use or invalid
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
                      placeholder="imperial-ai"
                      className="flex-1 bg-transparent py-3 px-1 text-sm font-mono font-bold text-foreground focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-primary select-none">.educationos.io</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Students and faculty will access courses and live classrooms at this unique domain.
                  </p>
                </div>

                {/* Institution Type Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Institution Operating Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INSTITUTION_TYPES.map((type) => {
                      const IconComp = type.icon;
                      const isSelected = institutionType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setInstitutionType(type.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
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
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceedStep2}
                  size="lg"
                  className="font-bold rounded-xl px-6 gap-2"
                >
                  <span>Continue to Branding</span>
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 3: BRAND IDENTITY & THEME STUDIO */}
          {step === 3 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 3 OF 4 • VISUAL IDENTITY & THEME STUDIO
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Style your branded student portal</h1>
                <p className="text-sm text-muted-foreground">
                  Upload an institution logo and choose a brand color palette. Preview updates live in real-time.
                </p>
              </div>

              <div className="space-y-6 pt-2">
                {/* Logo Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkle size={16} /> Institution Crest / Logo
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border bg-muted/20">
                    <div
                      className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border shadow-xs"
                      style={{ backgroundColor: primaryColor, color: "#ffffff" }}
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
                          <span>Choose Logo Image</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
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
                        Supports PNG, SVG, or WebP (square recommended, max 2MB).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Theme Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Palette size={16} /> Curated Academic Color Palettes
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
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Primary Brand Color
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
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Accent Highlight Color
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
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button onClick={nextStep} size="lg" className="font-bold rounded-xl px-6 gap-2">
                  <span>Continue to Campus Settings</span>
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 4: CAMPUS BRANCH & REGIONAL SETTINGS */}
          {step === 4 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 4 OF 4 • CAMPUS & ACADEMIC LAUNCH
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Configure campus & academic settings</h1>
                <p className="text-sm text-muted-foreground">
                  Set up your first branch location, academic term, and regional operating defaults.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={16} /> Default Campus Branch Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Main Campus, North Bay Division, or Virtual Global"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} /> Initial Academic Cohort / Term
                  </label>
                  <Input
                    placeholder="e.g. Fall 2026 Cohort, Batch 2026-A"
                    value={initialCohort}
                    onChange={(e) => setInitialCohort(e.target.value)}
                    className="h-12 text-sm rounded-xl font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Automatically provisions your first student cohort so your curriculum builder is ready instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Globe size={16} /> Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-12 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="UTC">UTC (Universal Standard Time)</option>
                      <option value="America/New_York">America/New_York (EST / EDT)</option>
                      <option value="America/Chicago">America/Chicago (CST / CDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
                      <option value="Europe/London">Europe/London (GMT / BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET / CEST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <CurrencyDollar size={16} /> Billing Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-12 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={prevStep} variant="ghost" className="font-bold text-xs gap-1.5">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={!canProceedStep4}
                  size="lg"
                  className="font-bold rounded-xl px-6 gap-2"
                >
                  <span>Review & Launch</span>
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 5: REVIEW & FINAL LAUNCH */}
          {step === 5 && (
            <Card className="border-border shadow-sm rounded-2xl bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  STEP 5 OF 5 • CONFIRMATION & INITIALIZATION
                </Badge>
                <h1 className="text-2xl font-extrabold tracking-tight">Review & launch your institution portal</h1>
                <p className="text-sm text-muted-foreground">
                  Confirm your institutional parameters. Your dedicated multi-tenant environment will be provisioned instantly.
                </p>
              </div>

              {/* Review Overview Card */}
              <div className="space-y-3 p-5 rounded-2xl border border-border bg-muted/20">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden border border-border"
                    style={{ backgroundColor: primaryColor, color: "#ffffff" }}
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
                    <span className="text-muted-foreground block text-[11px]">Primary Administrator</span>
                    <strong className="text-foreground">{adminName}</strong> ({adminEmail})
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Campus Branch</span>
                    <strong className="text-foreground">{branchName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Operating Model</span>
                    <strong className="text-foreground">{institutionType}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Initial Cohort</span>
                    <strong className="text-foreground">{initialCohort}</strong>
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
                <Button onClick={prevStep} variant="ghost" disabled={loading} className="font-bold text-xs gap-1.5">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  onClick={handleLaunch}
                  disabled={loading}
                  size="lg"
                  className="font-bold rounded-xl px-8 gap-2 bg-primary text-primary-foreground shadow-md hover:opacity-95"
                >
                  <RocketLaunch size={18} weight="bold" />
                  <span>Launch Institution Workspace</span>
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE LIVE MOCKUP PREVIEW (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkle size={16} className="text-primary" /> Live Portal Mockup
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              REAL-TIME PREVIEW
            </Badge>
          </div>

          {/* Miniature Student LMS Classroom & Dashboard Preview Shell */}
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden transition-all duration-300">
            {/* Window Chrome Title Bar */}
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="text-[11px] font-mono text-muted-foreground px-3 py-0.5 rounded-md bg-card/60 border border-border/60">
                https://{slug || "your-school"}.educationos.io
              </div>
              <div className="w-10" />
            </div>

            {/* Institution LMS Header Bar */}
            <div
              className="p-4 border-b border-border text-white flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span>{institutionName ? institutionName.charAt(0).toUpperCase() : "E"}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-tight leading-tight line-clamp-1">
                    {institutionName || "Academic Operating System"}
                  </h4>
                  <span className="text-[10px] opacity-80 font-mono block">Campus: {branchName || "Main Branch"}</span>
                </div>
              </div>

              <div
                className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                STUDENT
              </div>
            </div>

            {/* Inner Dashboard Body Mock */}
            <div className="p-4 space-y-3.5 bg-background">
              {/* Welcome Banner */}
              <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase">
                    ACTIVE COHORT
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {initialCohort || "Fall 2026"}
                  </Badge>
                </div>
                <h5 className="text-xs font-extrabold text-foreground">
                  Welcome to {institutionName || "your academy portal"}
                </h5>
                <p className="text-[11px] text-muted-foreground">
                  Adaptive bitrate video streaming, notes cloud sync, and assessments enabled.
                </p>
              </div>

              {/* Sample Course Card */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold text-primary">CS-401</span>
                    <h6 className="text-xs font-bold text-foreground">Advanced Distributed Architecture</h6>
                  </div>
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ▶
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Progress</span>
                    <span>68% Complete</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "68%", backgroundColor: primaryColor }} />
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-1.5 rounded-lg text-white text-[11px] font-bold shadow-xs hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  Resume Classroom
                </button>
              </div>

              {/* Security & Multi-Tenant Scoping Badge */}
              <div className="p-2.5 rounded-xl border border-border bg-muted/30 flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                <CheckCircle size={14} weight="bold" className="shrink-0 text-emerald-600" />
                <span>Isolated Campus Tenant Schema &bull; FERPA Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
