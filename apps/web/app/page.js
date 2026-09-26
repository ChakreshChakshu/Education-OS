"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  BookOpen,
  Users,
  Video,
  CheckCircle2,
  Zap,
  Terminal,
  Lock,
  TrendingUp,
  ChevronRight,
  Check,
  X,
  Globe,
  Activity,
  Layers,
  FileText,
  Clock,
  Play
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("campuses");

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-35">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-electric-indigo-500/20 blur-[150px] rounded-full" />
        <div className="absolute top-[850px] -left-40 w-[650px] h-[450px] bg-medium-slate-blue-500/15 blur-[140px] rounded-full" />
        <div className="absolute top-[1600px] -right-40 w-[600px] h-[400px] bg-lavender-mist-500/15 blur-[140px] rounded-full" />
      </div>

      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl px-6 lg:px-12 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-electric-indigo-500 via-medium-slate-blue-600 to-electric-indigo-700 flex items-center justify-center text-white shadow-md shadow-electric-indigo-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight font-heading text-foreground">
                  Education<span className="text-electric-indigo-400">OS</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-electric-indigo-500/10 text-electric-indigo-300 border border-electric-indigo-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  v2.4 Enterprise
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-4">
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Operating Model</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Why EOS</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
          </nav>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold text-xs md:text-sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-bold text-xs md:text-sm gap-2 shadow-sm shadow-primary/20">
              Launch Institution <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border/80 text-xs md:text-sm font-medium text-foreground mb-8 shadow-xs">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Unified Multi-Campus Governance</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-primary font-bold">100% Cryptographic Tenant Isolation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading max-w-5xl leading-[1.08] text-foreground">
            The Operating System for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-electric-indigo-400 via-medium-slate-blue-300 to-lavender-mist-300 bg-clip-text text-transparent">
              Modern University Networks
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-3xl leading-relaxed font-normal">
            Consolidate fragmented academic software into a unified command plane. Govern autonomous campuses, 
            stream adaptive buffer-free HD lectures, run zero-crash exams, and safeguard academic records with bank-grade security.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-13 rounded-xl gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Explore Live Campus Portal <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-13 rounded-xl bg-card/60 backdrop-blur-sm border-border hover:bg-secondary transition-all">
                Onboard Your Institution
              </Button>
            </Link>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl text-left">
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Tenant Security</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Zero Data Leaks</div>
              <div className="text-xs text-muted-foreground mt-0.5">Strict schema-enforced isolation</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Exam Reliability</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">99.99% Uptime</div>
              <div className="text-xs text-muted-foreground mt-0.5">Zero crash during peak finals</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Video Pipeline</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Adaptive HLS</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sub-second start, 1080p stream</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Provisioning</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">&lt; 60 Seconds</div>
              <div className="text-xs text-muted-foreground mt-0.5">Instant multi-branch setup</div>
            </div>
          </div>
        </section>

        {/* Interactive Operating Model Showcase (Tabs Powered) */}
        <section id="platform" className="py-12 px-6 lg:px-12 max-w-7xl mx-auto w-full">
          <div className="rounded-2xl border border-border bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Terminal Window Header */}
            <div className="px-5 py-3.5 bg-secondary/70 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2 text-xs font-mono text-foreground font-semibold">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span>eos-core.v2.preview</span>
                </div>
              </div>

              {/* Status pill */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Active Branch: Main Campus</span>
              </div>
            </div>

            {/* Radix Tabs Component */}
            <Tabs defaultValue="campuses" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4 border-b border-border/60 bg-muted/20">
                <TabsList className="bg-transparent p-0 gap-2 h-auto flex flex-wrap justify-start">
                  <TabsTrigger
                    value="campuses"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold"
                  >
                    <Building2 className="h-3.5 w-3.5 mr-2" />
                    Multi-Campus Governance
                  </TabsTrigger>
                  <TabsTrigger
                    value="learning"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold"
                  >
                    <Video className="h-3.5 w-3.5 mr-2" />
                    Interactive Classroom
                  </TabsTrigger>
                  <TabsTrigger
                    value="curriculum"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold"
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-2" />
                    Curriculum & Cohorts
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-xs font-bold"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                    Audit & Security
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 md:p-8">
                {/* Tab 1: Multi-Campus */}
                <TabsContent value="campuses" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-foreground">One Central Command for Every Campus & College</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Manage multi-campus university systems without data leaks or administrative overhead.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-primary border-primary/40 bg-primary/5">
                      Hierarchical Tenant Architecture
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Apex University System</CardTitle>
                        <CardDescription>Global executive oversight across faculties, campuses, and degree paths.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Consolidated institutional analytics, global policy controls, and unified tuition monitoring.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center mb-2">
                          <Users className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Autonomous Regional Campuses</CardTitle>
                        <CardDescription>Each campus branch operates with its own instructors, cohorts, and curricula.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Medical center, Law school, and Engineering campuses operate with full administrative sovereignty.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Guaranteed Data Isolation</CardTitle>
                        <CardDescription>Cryptographic tenant scoping eliminates any chance of cross-branch leaks.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Staff in Campus A cannot query or modify student records in Campus B. FERPA enforced at the database layer.
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 2: Interactive Classroom */}
                <TabsContent value="learning" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-foreground">High-Engagement Interactive Classroom</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Lecture streaming, time-stamped note taking, and in-video assessments in one continuous flow.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/40 bg-emerald-500/5">
                      Sub-Second Latency HLS
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <Video className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Adaptive Bitrate Streaming</CardTitle>
                        <CardDescription>Seamless auto-switching between 1080p, 720p, and 360p based on student connection.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Zero buffering even on constrained student mobile data networks.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">In-Lecture Knowledge Checks</CardTitle>
                        <CardDescription>Automated quiz popovers measure active comprehension during lectures.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Prevents passive video scrubbing and flags struggling students directly to faculty.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Live Gradebook Sync</CardTitle>
                        <CardDescription>All quiz responses and completion states write directly into the instructor dashboard.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Real-time student progress tracking without manual spreadsheet exports.
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 3: Curriculum & Cohorts */}
                <TabsContent value="curriculum" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-foreground">Effortless Curriculum & Cohort Management</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Design degree paths, sequence learning modules, and enroll student batches in minutes.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-sky-500 border-sky-500/40 bg-sky-500/5">
                      Curriculum Engine
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Structured Syllabus Tree</CardTitle>
                        <CardDescription>Organize courses into modules, lessons, downloadable assets, and assignments.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Drag-and-drop sequencing with prerequisite rules and conditional unlocks.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center mb-2">
                          <Users className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Cohort Batch Scheduling</CardTitle>
                        <CardDescription>Organize student intakes into Spring, Fall, or custom academic terms.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Assign dedicated faculty instructors and monitor batch graduation rates.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                          <Zap className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">One-Click Asset Publishing</CardTitle>
                        <CardDescription>Publish lecture notes, reading PDFs, and lab repos across cohorts instantly.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Zero latency asset delivery powered by cloud CDN edge caching.
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab 4: Audit & Security */}
                <TabsContent value="audit" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-foreground">Enterprise Security, Privacy & Audit Readiness</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Built to satisfy stringent higher-ed accreditation standards and privacy regulations.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/40 bg-emerald-500/5">
                      Accreditation Ready
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <Lock className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Granular Role Permissions</CardTitle>
                        <CardDescription>Rigorous access policies for Deans, Dept Heads, Faculty, TAs, and Students.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Eliminates accidental permission escalation across department borders.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">Immutable Audit Records</CardTitle>
                        <CardDescription>Every grade modification, exam submission, and enrollment is tamper-proof.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Cryptographically logged timestamps for painless institutional accreditation audits.
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/80">
                      <CardHeader className="pb-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
                          <Terminal className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">PostgreSQL Cloud Architecture</CardTitle>
                        <CardDescription>Serverless Postgres with automated point-in-time recovery and branch backups.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pt-0">
                        Resilient, production-grade cloud database infrastructure that scales on demand.
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>

        {/* Stakeholder Value Grid */}
        <section id="solutions" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
              Built for Every Stakeholder
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
              Empowering Leadership, Faculty & Students
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Education OS eliminates friction at every layer of the academic institution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* For University Deans */}
            <Card className="p-6 border-border bg-card/80 hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Building2 className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Deans & Chancellors</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Institutional Governance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consolidated multi-campus analytics, student retention metrics, and accreditation reporting with zero administrative overhead.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-primary flex items-center gap-1">
                <span>Multi-Campus Control</span> <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Card>

            {/* For Faculty */}
            <Card className="p-6 border-border bg-card/80 hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Faculty & Instructors</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Teaching Without Busywork</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Intuitive course builders, automated quiz grading, attendance logs, and frictionless lecture video distribution.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-primary flex items-center gap-1">
                <span>Automated Grading</span> <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Card>

            {/* For Students */}
            <Card className="p-6 border-border bg-card/80 hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Enrolled Students</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Modern Learning Experience</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A high-speed classroom with video speed controls, mobile responsiveness, progress tracking, and instant quiz feedback.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-primary flex items-center gap-1">
                <span>Instant Feedback</span> <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Card>

            {/* For IT Leaders */}
            <Card className="p-6 border-border bg-card/80 hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For CIOs & IT Teams</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Zero-Maintenance Cloud</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Clean modular architecture, automatic security patches, zero cross-tenant leaks, and modern REST APIs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-primary flex items-center gap-1">
                <span>99.99% Reliability</span> <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Card>
          </div>
        </section>

        {/* Legacy ERP vs Education OS Comparison */}
        <section id="comparison" className="py-20 px-6 lg:px-12 bg-secondary/20 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
                The Upgrade Imperative
              </Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
                Why Universities Are Replacing Legacy Portals
              </h2>
              <p className="mt-4 text-base md:text-lg text-muted-foreground">
                Outdated legacy systems frustrate students, overwhelm IT departments, and jeopardize institutional trust.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Legacy Portals */}
              <div className="p-6 md:p-8 rounded-2xl bg-card/60 border border-destructive/30 space-y-5">
                <div className="flex items-center gap-2 text-destructive font-bold text-lg font-heading">
                  <X className="h-5 w-5" />
                  <span>Outdated Legacy Campus Portals</span>
                </div>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>High Maintenance Costs:</strong> Clunky software that requires specialized consultants for every minor change.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Crashes During Exams:</strong> Server overloads during final submissions leave students and faculty stranded.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Data Leak Hazards:</strong> Fragile shared databases where human error can expose sensitive student records.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</span>
                    <span><strong>Poor Student Adoption:</strong> Frustrating 2005-era user interfaces that drive students away from official platforms.</span>
                  </li>
                </ul>
              </div>

              {/* Education OS */}
              <div className="p-6 md:p-8 rounded-2xl bg-card border border-primary/50 shadow-xl space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 text-primary font-bold text-lg font-heading">
                  <Sparkles className="h-5 w-5" />
                  <span>The Education OS Advantage</span>
                </div>
                <ul className="space-y-4 text-sm text-foreground">
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span><strong>Guaranteed Multi-Campus Isolation:</strong> Enforces independent security boundaries so campus data is never cross-exposed.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span><strong>Instant Exam Concurrency:</strong> Cloud-native architecture easily absorbs tens of thousands of concurrent quiz submissions.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span><strong>Consumer-Grade 60fps Experience:</strong> Modern, responsive interface students and faculty love using every day.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span><strong>Rapid Time-to-Value:</strong> Deploy and onboard new academic departments in hours, not months.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Onboarding Journey */}
        <section id="architecture" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
              Frictionless Deployment
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
              Launch Your University in Three Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-3 text-left shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg shadow-sm shadow-primary/30">
                1
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Provision Your System</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Register your institution name, claim your campus subdomain slug, set custom branding palette, and establish leadership roles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-3 text-left shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg shadow-sm shadow-primary/30">
                2
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Structure Curriculum</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize degree modules, upload adaptive video lectures, link course notes, and configure in-lecture assessment checkpoints.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-3 text-left shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg shadow-sm shadow-primary/30">
                3
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Enroll & Teach</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Invite student cohorts, deliver buffer-free lectures, track real-time comprehension, and monitor graduation trajectories.
              </p>
            </div>
          </div>
        </section>

        {/* Enterprise Call To Action */}
        <section className="py-16 px-6 lg:px-12 max-w-6xl mx-auto w-full">
          <div className="relative rounded-3xl p-8 md:p-14 bg-gradient-to-br from-card via-card to-electric-indigo-500/10 border border-electric-indigo-500/30 overflow-hidden text-center flex flex-col items-center shadow-2xl">
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-electric-indigo-500/20 blur-[110px] rounded-full pointer-events-none" />
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-indigo-500/10 border border-electric-indigo-500/25 text-xs font-mono text-electric-indigo-300 mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Ready for Immediate Deployment
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-foreground max-w-2xl">
              Elevate Your University&apos;s Academic Experience
            </h2>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              Join leading universities and modern academies already running on Education OS.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 rounded-xl gap-2 shadow-lg shadow-primary/25">
                  Launch Web Portal <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 rounded-xl bg-card">
                  Register New Institution
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60 py-12 px-6 lg:px-12 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-bold text-base tracking-tight font-heading text-foreground">
              Education OS (EOS)
            </span>
            <span className="text-xs text-muted-foreground">| Enterprise Higher Education Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-medium">
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Operating Model</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Comparison</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Campus Login</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Institution Onboarding</Link>
          </div>

          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>All Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
