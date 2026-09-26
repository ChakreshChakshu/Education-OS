"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  GraduationCap, 
  ShieldCheck, 
  Buildings, 
  ArrowRight,
  Sparkle,
  BookOpen,
  UsersThree,
  VideoCamera,
  CheckCircle,
  Lightning,
  TerminalWindow,
  LockKey,
  ChartLineUp,
  Browsers,
  Layers,
  CaretRight
} from "@phosphor-icons/react";

export default function Home() {
  const [activeSolutionTab, setActiveSolutionTab] = useState("campuses");

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/20 blur-[140px] rounded-full" />
        <div className="absolute top-[800px] -left-40 w-[600px] h-[400px] bg-secondary/30 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-md px-6 lg:px-12 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap size={24} weight="fill" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight font-heading text-foreground">
                  Education<span className="text-primary">OS</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-secondary text-secondary-foreground border border-border">
                  Enterprise
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-4">
            <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Campus Operating Model</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Why EOS</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security & Trust</a>
          </nav>
        </div>

        {/* Auth CTA */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-semibold text-sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-bold text-sm gap-2 shadow-sm">
              Launch Institution <ArrowRight size={16} weight="bold" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-6 lg:px-12 max-w-7xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border text-xs md:text-sm font-medium text-foreground mb-8 shadow-sm">
            <Sparkle size={16} className="text-primary" weight="fill" />
            <span>The Unified Higher Education Platform</span>
            <span className="text-border">|</span>
            <span className="text-primary font-bold">Multi-Campus Governance</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-heading max-w-5xl leading-[1.1] text-foreground">
            The Operating System for <br className="hidden sm:inline" />
            <span className="text-primary inline-block relative">
              Modern University Networks
              <svg className="absolute -bottom-2 left-0 w-full text-primary/30 h-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0 15 Q 50 0, 100 15" stroke="currentColor" strokeWidth="4" fill="transparent" />
              </svg>
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-3xl leading-relaxed font-normal">
            Replace fragmented software with a single unified platform. Govern autonomous campuses, 
            deliver buffer-free interactive learning, automate student assessments, and safeguard academic records with bank-grade security.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-13 rounded-xl gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Explore Live Campus Portal <ArrowRight size={18} weight="bold" />
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-13 rounded-xl bg-card border-border hover:bg-secondary transition-colors">
                Onboard Your Institution
              </Button>
            </Link>
          </div>

          {/* Business Proof Metrics */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-4xl text-left">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Multi-Campus Privacy</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">100% Data Isolation</div>
              <div className="text-xs text-muted-foreground mt-0.5">Strict FERPA & GDPR compliance</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Exam Reliability</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">99.99% Uptime</div>
              <div className="text-xs text-muted-foreground mt-0.5">Zero crash during exam spikes</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lecture Delivery</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Adaptive HD HLS</div>
              <div className="text-xs text-muted-foreground mt-0.5">Buffer-free mobile streaming</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Onboarding Speed</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Instant Provisioning</div>
              <div className="text-xs text-muted-foreground mt-0.5">Launch new branches in 60s</div>
            </div>
          </div>
        </section>

        {/* Interactive Operating Model Showcase */}
        <section id="platform" className="py-12 px-6 lg:px-12 max-w-7xl mx-auto w-full">
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Window Top Bar */}
            <div className="px-5 py-3.5 bg-secondary/80 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="h-4 w-px bg-border mx-1" />
                <div className="flex items-center gap-2 text-xs font-mono text-foreground font-semibold">
                  <TerminalWindow size={16} className="text-primary" />
                  <span>education-os.dashboard.preview</span>
                </div>
              </div>

              {/* Showcase Navigation */}
              <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border text-xs font-medium">
                <button
                  onClick={() => setActiveSolutionTab("campuses")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeSolutionTab === "campuses"
                      ? "bg-primary text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Multi-Campus Governance
                </button>
                <button
                  onClick={() => setActiveSolutionTab("learning")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeSolutionTab === "learning"
                      ? "bg-primary text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Interactive Classroom
                </button>
                <button
                  onClick={() => setActiveSolutionTab("curriculum")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeSolutionTab === "curriculum"
                      ? "bg-primary text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Curriculum & Cohorts
                </button>
                <button
                  onClick={() => setActiveSolutionTab("security")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    activeSolutionTab === "security"
                      ? "bg-primary text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Security & Compliance
                </button>
              </div>
            </div>

            {/* Showcase Tab Panels */}
            <div className="p-6 md:p-8 bg-card/60">
              {activeSolutionTab === "campuses" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-foreground">One Central Command for Every Campus & Branch</h3>
                      <p className="text-sm text-muted-foreground">Manage multi-campus university systems without data leaks or administrative chaos.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-primary border-primary/40 bg-primary/5">
                      Unified Institutional Hierarchy
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <Buildings size={20} />
                        <span>Apex University System</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Executive oversight across all colleges, faculties, and programs with global analytics and unified billing.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <UsersThree size={20} />
                        <span>Autonomous Campuses</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Each medical campus, law center, or regional branch operates with isolated student records and custom faculties.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <ShieldCheck size={20} />
                        <span>Zero Data Leakage Guarantee</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cryptographic tenant isolation guarantees Branch A staff can never view or leak Branch B records.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSolutionTab === "learning" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-foreground">High-Engagement Interactive Classroom</h3>
                      <p className="text-sm text-muted-foreground">Students watch lecture streams, read course handouts, and complete quizzes in one unified flow.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-400/40 bg-emerald-400/5">
                      Active Engagement Engine
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <VideoCamera size={20} />
                        <span>Adaptive Video Lectures</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatic bitrate adjustments (1080p to 360p) ensure flawless streaming even on slow student mobile connections.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <CheckCircle size={20} />
                        <span>Instant Knowledge Checks</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        In-lecture quizzes evaluate student comprehension automatically, preventing passive video skimming.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <ChartLineUp size={20} />
                        <span>Real-Time Progress Sync</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Every completed lesson, quiz score, and video timestamp updates live on the instructor gradebook.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSolutionTab === "curriculum" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-foreground">Effortless Curriculum & Cohort Management</h3>
                      <p className="text-sm text-muted-foreground">Design degree tracks, structure semesters, and enroll student batches in minutes.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-primary border-primary/40 bg-primary/5">
                      Curriculum Studio
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <BookOpen size={20} />
                        <span>Modular Syllabus Hierarchy</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Break courses into modules, lessons, and assignments with drag-and-drop sequencing and prerequisites.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <UsersThree size={20} />
                        <span>Cohort Batch Scheduling</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Organize students into Spring/Fall batches. Assign dedicated instructors and track cohort graduation trajectories.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <Lightning size={20} />
                        <span>One-Click Asset Distribution</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Upload lecture slides, reading PDFs, and lab assignments once and publish instantly across cohorts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSolutionTab === "security" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-foreground">Enterprise Security, Privacy & Audit Readiness</h3>
                      <p className="text-sm text-muted-foreground">Built to satisfy the stringent compliance requirements of higher-ed accreditation boards.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-400/40 bg-emerald-400/5">
                      Accreditation & FERPA Ready
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <LockKey size={20} />
                        <span>Fine-Grained Role Permissions</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Precise access policies for University Deans, Department Heads, Faculty, TAs, and Enrolled Students.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <ShieldCheck size={20} />
                        <span>Immutable Audit Records</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Every grade change, quiz submission, and enrollment update is permanently recorded with cryptographic timestamps.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2 text-primary font-bold mb-2">
                        <TerminalWindow size={20} />
                        <span>Enterprise Cloud Architecture</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        PostgreSQL cloud storage, automated daily backups, and encrypted sessions protect institution reputations.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stakeholder Value Grid */}
        <section id="solutions" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
              Built for Every Stakeholder
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
              Designed for Campus Leaders, Faculty & Students
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Education OS eliminates friction for every person involved in the academic journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* For University Deans */}
            <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Buildings size={28} weight="bold" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Deans & Chancellors</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Institutional Governance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consolidated multi-campus analytics, student retention metrics, and accreditation reporting with zero administrative overhead.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-primary flex items-center gap-1">
                <span>Multi-Campus Control</span> <CaretRight size={14} />
              </div>
            </Card>

            {/* For Faculty */}
            <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <BookOpen size={28} weight="bold" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Faculty & Instructors</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Teaching Without Busywork</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Intuitive course builders, automated quiz grading, attendance logs, and frictionless lecture video distribution.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-primary flex items-center gap-1">
                <span>Automated Grading</span> <CaretRight size={14} />
              </div>
            </Card>

            {/* For Students */}
            <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <GraduationCap size={28} weight="bold" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For Enrolled Students</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Modern Learning Experience</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A high-speed classroom with video speed controls, mobile responsiveness, progress tracking, and instant quiz feedback.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-primary flex items-center gap-1">
                <span>Instant Feedback</span> <CaretRight size={14} />
              </div>
            </Card>

            {/* For IT Leaders */}
            <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={28} weight="bold" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] font-mono">For CIOs & IT Teams</Badge>
                <h3 className="font-bold text-xl font-heading mb-2 text-foreground">Zero-Maintenance Peace of Mind</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Modular monolith architecture, automatic security patches, zero cross-tenant leaks, and modern REST APIs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-primary flex items-center gap-1">
                <span>99.99% Reliability</span> <CaretRight size={14} />
              </div>
            </Card>
          </div>
        </section>

        {/* Legacy ERP vs Education OS Comparison */}
        <section id="comparison" className="py-20 px-6 lg:px-12 bg-secondary/30 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
                The Upgrade Imperative
              </Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
                Why Universities Are Replacing Legacy Portals
              </h2>
              <p className="mt-4 text-base md:text-lg text-muted-foreground">
                Outdated legacy systems frustrate students, overwhelm IT departments, and jeopardize accreditation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Legacy Portals */}
              <div className="p-6 md:p-8 rounded-2xl bg-card border border-destructive/30 space-y-4">
                <div className="flex items-center gap-2 text-destructive font-bold text-lg font-heading">
                  <span>Outdated Legacy Campus Portals</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✕</span>
                    <span><strong>High Maintenance Costs:</strong> Clunky software that requires specialized consultants for every minor change.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✕</span>
                    <span><strong>Crashes During Exams:</strong> Server overloads during final submissions leave students and faculty stranded.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✕</span>
                    <span><strong>Data Leak Hazards:</strong> Fragile shared databases where human error can expose sensitive student records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✕</span>
                    <span><strong>Poor Student Adoption:</strong> Frustrating 2005-era user interfaces that drive students away from official platforms.</span>
                  </li>
                </ul>
              </div>

              {/* Education OS */}
              <div className="p-6 md:p-8 rounded-2xl bg-card border border-primary/60 shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-lg font-heading">
                  <Sparkle size={20} weight="fill" />
                  <span>The Education OS Advantage</span>
                </div>
                <ul className="space-y-3 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
                    <span><strong>Guaranteed Multi-Campus Isolation:</strong> Enforces independent security boundaries so campus data is never cross-exposed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
                    <span><strong>Instant Exam Concurrency:</strong> Cloud-native architecture easily absorbs tens of thousands of concurrent quiz submissions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
                    <span><strong>Consumer-Grade 60fps Experience:</strong> Modern, responsive interface students and faculty love using every day.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
                    <span><strong>Rapid Time-to-Value:</strong> Deploy and onboard new academic departments in hours, not months.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Onboarding Journey */}
        <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 border border-border font-mono text-xs">
              Frictionless Deployment
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-heading tracking-tight text-foreground">
              Launch Your University in Three Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-border space-y-3 text-left">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg">
                1
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Provision Your System</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Register your university name, set up campus branches, and assign Dean and administrative roles instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border space-y-3 text-left">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg">
                2
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Build Your Curriculum</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Publish course modules, attach video lectures and reading materials, and configure interactive assessment quizzes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border space-y-3 text-left">
              <div className="h-10 w-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center font-heading text-lg">
                3
              </div>
              <h3 className="font-bold text-lg font-heading text-foreground">Enroll & Teach</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Invite student cohorts, deliver buffer-free lectures, track real-time comprehension, and monitor graduation metrics.
              </p>
            </div>
          </div>
        </section>

        {/* Enterprise Call To Action */}
        <section id="security" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto w-full">
          <div className="relative rounded-3xl p-8 md:p-14 bg-secondary border border-border overflow-hidden text-center flex flex-col items-center">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/50 border border-border text-xs font-mono text-primary mb-6">
              <Sparkle size={14} weight="fill" /> Ready for Immediate Deployment
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-foreground max-w-2xl">
              Elevate Your University&apos;s Academic Experience
            </h2>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              Join leading universities and modern academies already running on Education OS.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 rounded-xl gap-2 shadow-lg">
                  Launch Web Portal <ArrowRight size={18} weight="bold" />
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
              <GraduationCap size={20} weight="fill" />
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
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            © 2026 Education Operating System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
