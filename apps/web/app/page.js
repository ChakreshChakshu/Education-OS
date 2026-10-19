"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";
import AppleCardsCarouselDemo from "@/components/apple-cards-carousel-demo";
import {
  GraduationCap,
  Buildings,
  BookOpen,
  Users,
  Video,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkle,
  Lightning,
  ChartLineUp,
  Palette,
  Check,
  FileText,
  PlayCircle,
  CaretRight,
  Shield,
  Clock,
  Broadcast
} from "@phosphor-icons/react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("campuses");

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Primary Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold shadow-xs transition-transform group-hover:scale-105">
                <GraduationCap size={20} weight="bold" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-foreground">
                Education<span className="text-primary">OS</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-muted-foreground">
              <Link href="/courses" className="text-foreground hover:text-primary transition-colors flex items-center gap-1 font-bold">
                <BookOpen size={15} className="text-primary" weight="bold" />
                <span>Course Catalog</span>
              </Link>
              <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
              <a href="#features" className="hover:text-foreground transition-colors">Pillars</a>
              <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
              <a href="#setup" className="hover:text-foreground transition-colors">Setup</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-semibold cursor-pointer">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="text-xs sm:text-sm font-bold gap-1.5 cursor-pointer shadow-xs">
                <span>Live Campus Demo</span>
                <ArrowRight size={14} weight="bold" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Parallax Hero Section */}
        <ParallaxComponent
          badge="Complete Privacy Across Campuses & Colleges"
          title="The Operating System for"
          subtitle="Modern Higher Education"
        >
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            A unified multi-tenant platform for autonomous campus branches, buffer-free HD lecture streaming, and crash-proof exam submissions.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <Link href="/courses" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-sm sm:text-base font-bold px-7 h-12 rounded-xl gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all cursor-pointer">
                <BookOpen size={18} weight="bold" />
                <span>Browse Course Catalog</span>
                <ArrowRight size={16} weight="bold" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-sm sm:text-base font-bold px-7 h-12 rounded-xl bg-card/80 backdrop-blur-sm border-border hover:bg-muted transition-all cursor-pointer">
                Live Campus Demo
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-sm sm:text-base font-bold px-7 h-12 rounded-xl border border-border/60 hover:bg-muted transition-all cursor-pointer">
                Register Institution
              </Button>
            </Link>
          </div>

          {/* Compact Trust Highlights Strip */}
          <div className="mt-10 pt-6 border-t border-border/50 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Boundary</span>
              <span className="text-sm font-extrabold text-foreground mt-0.5 block">100% Private</span>
              <span className="text-[11px] text-muted-foreground">Strict schema isolation</span>
            </div>
            <div className="p-3 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Reliability</span>
              <span className="text-sm font-extrabold text-foreground mt-0.5 block">99.99% Uptime</span>
              <span className="text-[11px] text-muted-foreground">Zero finals dropouts</span>
            </div>
            <div className="p-3 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Streaming</span>
              <span className="text-sm font-extrabold text-foreground mt-0.5 block">Adaptive HLS</span>
              <span className="text-[11px] text-muted-foreground">Cloudflare R2 + FFmpeg</span>
            </div>
            <div className="p-3 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Database</span>
              <span className="text-sm font-extrabold text-foreground mt-0.5 block">Neon Cloud</span>
              <span className="text-[11px] text-muted-foreground">Postgres ACID isolation</span>
            </div>
          </div>
        </ParallaxComponent>

        {/* Section 1: Interactive Spotlight Product Preview */}
        <section id="overview" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
              Interactive Spotlight
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Designed for Higher-Ed Operational Precision
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Experience the actual interface: autonomous campus governance, seamless digital classrooms, and live cohort progress.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
            {/* macOS Chrome Header Bar */}
            <div className="border-b border-border bg-muted/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                  <div className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                  <div className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-background border border-border text-xs text-muted-foreground font-mono">
                  <span className="text-foreground font-bold">Apex University System</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>https://apex.educationos.edu</span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("campuses")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "campuses"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Campus Network
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("classroom")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "classroom"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  HD Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cohorts")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "cohorts"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cohort Velocity
                </button>
              </div>
            </div>

            {/* TAB 1: Campuses View */}
            {activeTab === "campuses" && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Multi-Campus Governance & Autonomy</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Autonomous branches operating under central institutional policy with independent branding.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs font-mono font-bold">3 Branches Active</Badge>
                    <Badge variant="success" className="text-xs font-bold">Isolated Boundaries</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-background space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-primary">BRANCH-MAIN</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#5b12ed]" title="Indigo Brand" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground">Main Campus</h4>
                      <p className="text-xs text-muted-foreground">Dean: Dr. Sarah Vance • 12 Departments</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs flex justify-between">
                      <span className="text-muted-foreground">Enrolled Students</span>
                      <span className="font-bold font-mono text-foreground">8,420</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-600">BRANCH-MED</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" title="Emerald Brand" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground">School of Medicine</h4>
                      <p className="text-xs text-muted-foreground">Dean: Dr. Marcus Chen • 6 Clinical Units</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs flex justify-between">
                      <span className="text-muted-foreground">Enrolled Students</span>
                      <span className="font-bold font-mono text-foreground">2,150</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-600">BRANCH-LAW</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" title="Sapphire Brand" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground">School of Law</h4>
                      <p className="text-xs text-muted-foreground">Dean: Prof. Elena Rostova • 4 Divisions</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs flex justify-between">
                      <span className="text-muted-foreground">Enrolled Students</span>
                      <span className="font-bold font-mono text-foreground">1,340</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-primary shrink-0" />
                    Data Isolation Policy: Medical records remain cryptographically unreachable by School of Law staff.
                  </span>
                  <Link href="/dashboard/tenants" className="text-primary font-bold hover:underline inline-flex items-center gap-1 shrink-0">
                    Open Branch Manager <CaretRight size={14} weight="bold" />
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: HD Classroom View */}
            {activeTab === "classroom" && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Adaptive HLS Video Streaming</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Sub-second latency video delivery powered by Cloudflare R2 storage and FFmpeg transcoding.</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-emerald-600 border-emerald-300 bg-emerald-500/10">
                    1080p ABR Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  <div className="lg:col-span-8 rounded-xl border border-border bg-black/90 p-5 flex flex-col justify-between min-h-[240px] text-white shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-600/90 text-white animate-pulse">
                        <Broadcast size={14} weight="bold" /> LIVE SESSION
                      </span>
                      <span className="text-xs font-mono text-white/70">1080p • 60fps • 4.2 Mbps</span>
                    </div>

                    <div className="my-auto py-6 text-center relative z-10">
                      <p className="text-base sm:text-lg font-extrabold text-white">CS-301: Distributed Consensus & Raft Protocol</p>
                      <p className="text-xs text-white/70 mt-1">Instructor: Dr. Sarah Vance • Synchronous Q&A and Attendance Enabled</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/80 pt-3 border-t border-white/10 relative z-10">
                      <span className="flex items-center gap-1.5"><Users size={14} /> 184 Students Connected</span>
                      <span className="text-emerald-400 font-medium">HLS Buffer Health: 99.8%</span>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                    <div className="p-4 rounded-xl border border-border bg-background space-y-1.5 shadow-2xs">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock size={16} className="text-primary" /> Automated Attendance
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Student presence is logged via cryptographic session heartbeats without manual roll-calls.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background space-y-1.5 shadow-2xs">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <PlayCircle size={16} className="text-primary" /> Instant Cloud Archives
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Lectures transcode into ABR video segments and become available for replay immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Cohort Velocity View */}
            {activeTab === "cohorts" && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Cohort Velocity & Examination Engine</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Postgres row-locked submission pipelines preventing crashes during campus-wide finals week.</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-emerald-600 border-emerald-300">
                    SKIP LOCKED Queue Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-background space-y-1 shadow-2xs">
                    <span className="text-xs text-muted-foreground font-semibold">Active Finals Assessments</span>
                    <span className="text-2xl font-extrabold text-foreground block">4 Modules</span>
                    <span className="text-xs text-emerald-600 font-medium">Running smoothly across all branches</span>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background space-y-1 shadow-2xs">
                    <span className="text-xs text-muted-foreground font-semibold">Concurrent Submissions</span>
                    <span className="text-2xl font-extrabold text-foreground block">1,842 Total</span>
                    <span className="text-xs text-muted-foreground font-medium">0 dropped packets or timeouts</span>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background space-y-1 shadow-2xs">
                    <span className="text-xs text-muted-foreground font-semibold">Automated Gradebook Sync</span>
                    <span className="text-2xl font-extrabold text-primary block">Instantaneous</span>
                    <span className="text-xs text-muted-foreground font-medium">Real-time Neon Cloud ACID updates</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Core Pillars (Apple Cards Carousel) */}
        <section id="features" className="border-t border-border bg-muted/20 overflow-hidden">
          <AppleCardsCarouselDemo />
        </section>

        {/* Section 3: High-Impact Architecture Comparison */}
        <section id="architecture" className="py-20 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12 space-y-2">
              <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
                Comparison
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Modern Cloud Infrastructure vs Legacy LMS Monoliths
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Why forward-thinking universities are phasing out slow, decade-old monolithic portals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Campus Isolation</span>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
                    <span className="font-bold text-destructive block">Legacy Portals</span>
                    <span className="text-muted-foreground mt-0.5 block">Shared tables prone to misconfigurations and accidental cross-branch student record leakage.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                    <span className="font-bold text-primary block">EducationOS</span>
                    <span className="text-foreground font-medium mt-0.5 block">Cryptographically scoped tenant context verified on every database query.</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Media & Streaming</span>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
                    <span className="font-bold text-destructive block">Legacy Portals</span>
                    <span className="text-muted-foreground mt-0.5 block">External video links with frequent buffering and manual attendance cross-checking.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                    <span className="font-bold text-primary block">EducationOS</span>
                    <span className="text-foreground font-medium mt-0.5 block">Native HLS adaptive multi-bitrate player with automated timestamp attendance.</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Finals Concurrency</span>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
                    <span className="font-bold text-destructive block">Legacy Portals</span>
                    <span className="text-muted-foreground mt-0.5 block">Server timeouts and dropped submissions when thousands test simultaneously.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                    <span className="font-bold text-primary block">EducationOS</span>
                    <span className="text-foreground font-medium mt-0.5 block">Postgres row-locked outbox queue with ACID transaction resilience.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: 3-Step Campus Setup Timeline */}
        <section id="setup" className="py-20 border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12 space-y-2">
              <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
                Rapid Onboarding
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Operational in minutes, not 18-month IT cycles
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Self-service institution setup with instant multi-branch provisioning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative shadow-xs">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs">
                  1
                </div>
                <h3 className="font-bold text-base text-foreground">Register Institution</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Claim your institutional subdomain and set up master administrator credentials.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative shadow-xs">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs">
                  2
                </div>
                <h3 className="font-bold text-base text-foreground">Configure Campus & Branding</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Provision autonomous branches, assign faculty roles, and set custom color palettes.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative shadow-xs">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs">
                  3
                </div>
                <h3 className="font-bold text-base text-foreground">Launch Cohorts & Stream</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Enroll student rosters, broadcast buffer-free lectures, and conduct live exams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: High-Impact Callout */}
        <section className="py-20 border-t border-border bg-gradient-to-b from-card to-background">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Ready to modernize your university network?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Test the platform directly with our interactive demo campus, or register your institution to begin setting up your autonomous branches.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-bold px-8 h-12 rounded-xl gap-2 shadow-lg shadow-primary/25 cursor-pointer">
                  <span>Explore Demo Campus</span>
                  <ArrowRight size={18} weight="bold" />
                </Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold px-8 h-12 rounded-xl border-border hover:bg-muted cursor-pointer">
                  Register Institution
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Structured Minimal Footer */}
      <footer className="border-t border-border bg-background py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <GraduationCap size={16} weight="bold" />
            </div>
            <span className="font-bold text-foreground">EducationOS</span>
            <span>• Modern University Operating System</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-medium">
            <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
            <a href="#features" className="hover:text-foreground transition-colors">Pillars</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#setup" className="hover:text-foreground transition-colors">Setup</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational (99.99% Uptime)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
