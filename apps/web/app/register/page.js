"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  GraduationCap,
  Buildings,
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkle,
  Globe,
  LockKey,
  EnvelopeSimple,
  User,
  ShieldCheck,
  MapPin,
  RocketLaunch,
  WarningCircle,
  Eye,
  EyeSlash,
  CalendarCheck
} from "@phosphor-icons/react";

const BRAND_PALETTES = [
  { id: "indigo", name: "Royal Indigo", hex: "#5b12ed" },
  { id: "emerald", name: "Emerald Academy", hex: "#059669" },
  { id: "sapphire", name: "Sapphire Tech", hex: "#2563eb" },
  { id: "navy", name: "Oxford Navy", hex: "#1e3a8a" },
  { id: "rose", name: "Crimson Institute", hex: "#e11d48" },
  { id: "amber", name: "Amber Forge", hex: "#d97706" }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function RegisterOnboardingPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Admin & Institution
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState("idle"); // 'idle' | 'checking' | 'available' | 'taken'
  const slugDebounceRef = useRef(null);

  // Step 2: Campus & Branding
  const [branchName, setBranchName] = useState("Main Campus");
  const [academicTerm, setAcademicTerm] = useState("Spring 2026");
  const [primaryColor, setPrimaryColor] = useState(BRAND_PALETTES[0].hex);
  const [logoUrl, setLogoUrl] = useState("");

  // Auto-generate slug from institution name
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
        setSlugStatus("available"); // Graceful fallback
      }
    }, 350);
  };

  const handleSlugChange = (val) => {
    const formatted = slugify(val);
    setSlug(formatted);
    triggerSlugCheck(formatted);
  };

  const handleNext = () => {
    setError("");

    if (step === 1) {
      if (!adminName.trim() || adminName.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters).");
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
      if (!institutionName.trim() || institutionName.trim().length < 2) {
        setError("Please enter your university or institution name.");
        return;
      }
      if (slug.length < 3) {
        setError("Subdomain slug must be at least 3 characters.");
        return;
      }
      if (slugStatus === "taken") {
        setError("This subdomain is already registered. Please choose another.");
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 2) {
      if (!branchName.trim() || branchName.trim().length < 2) {
        setError("Please specify a campus or branch name.");
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  };

  const handlePrev = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Launch Provisioning
  const handleLaunch = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        institutionName,
        slug,
        branchName: branchName || "Main Campus",
        settingsJson: {
          branding: {
            primaryColor,
            logoUrl: logoUrl.trim() || "",
            tagline: `${institutionName} Academic Operations`,
            supportEmail: adminEmail
          },
          campus: {
            branchName: branchName || "Main Campus",
            academicTerm: academicTerm || "Spring 2026"
          }
        }
      };

      const res = await register(payload);

      if (res.success) {
        router.push("/dashboard");
      } else {
        setError(res.error || "Registration failed. Please check your credentials.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during workspace launch.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Top Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div 
              className="h-9 w-9 rounded-xl text-white flex items-center justify-center font-extrabold shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              <GraduationCap size={20} weight="bold" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-foreground">
              Education<span style={{ color: primaryColor }}>OS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Already registered?</span>
            <Link href="/login">
              <Button variant="outline" size="sm" className="font-bold text-xs cursor-pointer">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
        {/* Step Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 transition-all duration-300 -translate-y-1/2 z-0"
              style={{ 
                backgroundColor: primaryColor,
                width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" 
              }} 
            />

            {[
              { num: 1, label: "Account & Workspace" },
              { num: 2, label: "Campus & Branding" },
              { num: 3, label: "Review & Launch" }
            ].map((s) => {
              const isPassed = step > s.num;
              const isCurrent = step === s.num;

              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? "text-white ring-4 ring-primary/20 scale-110"
                        : isPassed
                        ? "text-white"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                    style={
                      isCurrent || isPassed 
                        ? { backgroundColor: primaryColor } 
                        : {}
                    }
                  >
                    {isPassed ? <Check size={16} weight="bold" /> : s.num}
                  </div>
                  <span className={`text-xs mt-2 font-semibold hidden sm:block ${isCurrent ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200 max-w-2xl mx-auto">
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Administrator & Institution Identity */}
        {step === 1 && (
          <Card className="border-border shadow-xs max-w-2xl mx-auto animate-in fade-in duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkle size={16} />
                <span>Step 1 of 3</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                Administrator & Institution Workspace
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Establish root institutional ownership and claim your custom multi-tenant subdomain.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Administrator Credentials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User size={14} /> Full Legal Name
                    </label>
                    <Input
                      required
                      placeholder="e.g. Dr. Eleanor Vance"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="text-xs sm:text-sm h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <EnvelopeSimple size={14} /> Official Work Email
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="dean@university.edu"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="text-xs sm:text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <LockKey size={14} /> Master Password (min 8 chars)
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="text-xs sm:text-sm h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t border-border">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Institutional Identity & Routing
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Buildings size={14} /> Institution / University Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Apex University System"
                    value={institutionName}
                    onChange={(e) => handleInstitutionNameChange(e.target.value)}
                    className="text-xs sm:text-sm h-10 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe size={14} /> Dedicated Subdomain Slug
                    </label>
                    {slugStatus === "checking" && (
                      <span className="text-[11px] font-mono text-muted-foreground">Checking...</span>
                    )}
                    {slugStatus === "available" && (
                      <span className="text-[11px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={12} weight="bold" /> Available
                      </span>
                    )}
                    {slugStatus === "taken" && (
                      <span className="text-[11px] font-mono font-bold text-destructive">Unavailable</span>
                    )}
                  </div>
                  <div className="flex items-center h-10 rounded-xl border border-input bg-card px-3 shadow-2xs focus-within:ring-2 focus-within:ring-primary">
                    <span className="text-xs font-mono text-muted-foreground">https://</span>
                    <input
                      type="text"
                      required
                      placeholder="apex"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="flex-1 bg-transparent px-1 font-mono text-xs sm:text-sm font-bold text-foreground outline-none"
                    />
                    <span className="text-xs font-mono text-muted-foreground">.education-os.edu</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t border-border pt-4">
              <Button onClick={handleNext} className="gap-2 font-bold text-xs sm:text-sm h-10 px-6 cursor-pointer shadow-xs">
                <span>Continue: Campus & Branding</span>
                <ArrowRight size={16} weight="bold" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: Campus Branch & Visual Branding */}
        {step === 2 && (
          <Card className="border-border shadow-xs max-w-2xl mx-auto animate-in fade-in duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkle size={16} />
                <span>Step 2 of 3</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                Campus Branch & Visual Branding
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Personalize your primary campus branch and select your institutional brand color theme.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Campus Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin size={14} /> Primary Campus Branch
                  </label>
                  <Input
                    required
                    placeholder="e.g. Main Campus, Tech Park Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="text-xs sm:text-sm h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CalendarCheck size={14} /> Initial Academic Term
                  </label>
                  <Input
                    placeholder="e.g. Spring 2026"
                    value={academicTerm}
                    onChange={(e) => setAcademicTerm(e.target.value)}
                    className="text-xs sm:text-sm h-10"
                  />
                </div>
              </div>

              {/* Brand Palette Selection */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Palette size={14} /> Institutional Brand Palette
                  </label>
                  <span 
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2 py-0.5 rounded-md border"
                    style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    {primaryColor.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BRAND_PALETTES.map((p) => {
                    const isSelected = primaryColor.toLowerCase() === p.hex.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrimaryColor(p.hex)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30 bg-muted/50 shadow-xs"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        <span 
                          className="h-5 w-5 rounded-full shrink-0 border border-black/10 shadow-2xs" 
                          style={{ backgroundColor: p.hex }} 
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{p.hex}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hex Color */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 p-0.5 border border-border rounded-lg cursor-pointer bg-card"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="text-xs font-mono uppercase w-32 h-9"
                    placeholder="#5B12ED"
                  />
                  <span className="text-xs text-muted-foreground">Custom Color Hex</span>
                </div>
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5 pt-3 border-t border-border">
                <label className="text-xs font-bold text-foreground">
                  Campus Logo Image URL (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-xl text-white flex items-center justify-center font-extrabold text-sm shrink-0 overflow-hidden shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{institutionName ? institutionName.charAt(0).toUpperCase() : "E"}</span>
                    )}
                  </div>
                  <Input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="text-xs sm:text-sm h-10"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border pt-4">
              <Button variant="ghost" onClick={handlePrev} className="gap-2 font-bold text-xs sm:text-sm h-10 cursor-pointer">
                <ArrowLeft size={16} weight="bold" />
                <span>Back</span>
              </Button>
              <Button onClick={handleNext} className="gap-2 font-bold text-xs sm:text-sm h-10 px-6 cursor-pointer shadow-xs">
                <span>Continue: Review & Launch</span>
                <ArrowRight size={16} weight="bold" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: Review & Direct Launch */}
        {step === 3 && (
          <Card className="border-border shadow-xs max-w-2xl mx-auto animate-in fade-in duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkle size={16} />
                <span>Step 3 of 3</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
                Confirm & Launch Institutional Workspace
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your isolated tenant schema and administrator credentials are ready to be provisioned in Neon Cloud.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Summary Overview Card */}
              <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div 
                    className="h-12 w-12 rounded-xl text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-xs overflow-hidden"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{institutionName.charAt(0).toUpperCase() || "E"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base sm:text-lg font-extrabold text-foreground truncate">
                      {institutionName}
                    </p>
                    <p className="text-xs font-mono font-bold text-primary truncate">
                      https://{slug}.education-os.edu
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block">Primary Administrator</span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">{adminName}</span>
                    <span className="text-muted-foreground font-mono">{adminEmail}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground font-semibold block">Campus & Term</span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">{branchName}</span>
                    <span className="text-muted-foreground font-mono">{academicTerm}</span>
                  </div>
                </div>
              </div>

              {/* Infrastructure Guarantee Note */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p className="font-bold text-foreground mb-0.5">Automated Tenant Provisioning</p>
                  Instant ACID schema initialization on Neon PostgreSQL, HLS video pipeline binding, and role assignment. You will be automatically redirected to your live dashboard.
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border pt-4">
              <Button 
                variant="ghost" 
                onClick={handlePrev} 
                disabled={loading}
                className="gap-2 font-bold text-xs sm:text-sm h-10 cursor-pointer"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Back</span>
              </Button>
              <Button 
                onClick={handleLaunch} 
                disabled={loading}
                className="gap-2 font-bold text-xs sm:text-sm h-10 px-8 cursor-pointer shadow-xs"
              >
                <RocketLaunch size={18} weight="bold" />
                <span>{loading ? "Provisioning in Neon Cloud..." : "Launch Workspace"}</span>
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-6 px-6 text-center text-xs text-muted-foreground">
        <span>EducationOS • Multi-Tenant Institutional Platform • Protected by Neon Cloud ACID Isolation</span>
      </footer>
    </div>
  );
}
