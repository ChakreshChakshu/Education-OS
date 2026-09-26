"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  Video,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  ChevronRight,
  FileText,
  BarChart3,
  Layers,
  Laptop
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("campuses");
  const [deploymentStep, setDeploymentStep] = useState(1);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Primary Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">
                Education<span className="text-primary">OS</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
              <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
              <a href="#solutions" className="hover:text-foreground transition-colors">Who We Serve</a>
              <a href="#comparison" className="hover:text-foreground transition-colors">Comparison</a>
              <a href="#deployment" className="hover:text-foreground transition-colors">Deployment</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Sign in
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="text-sm font-medium">
                Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Parallax Hero Section */}
        <ParallaxComponent
          badge="Complete Privacy Across Campuses & Colleges"
          title="The Unified Platform for"
          subtitle="Modern University Networks"
        >
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            Replace messy, disconnected software with a single unified system. Seamlessly manage multiple campuses, 
            deliver buffer-free HD video lectures, run stress-free exams without server crashes, and keep student records completely private.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 rounded-xl gap-2 shadow-lg shadow-electric-indigo-500/25 hover:shadow-electric-indigo-500/40 transition-all">
                Explore Interactive Campus Demo <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 rounded-xl bg-card/70 backdrop-blur-sm border-border hover:bg-secondary transition-all">
                Register Your Institution
              </Button>
            </Link>
          </div>
        </ParallaxComponent>

        {/* Key Reliability Highlights Strip */}
        <section className="relative z-20 py-8 px-6 lg:px-12 max-w-6xl mx-auto w-full -mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full text-left">
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Student Data Privacy</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">100% Private</div>
              <div className="text-xs text-muted-foreground mt-0.5">Campus records stay isolated & secure</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Exam Reliability</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">99.99% Uptime</div>
              <div className="text-xs text-muted-foreground mt-0.5">Zero crashes during peak final exams</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Lecture Streaming</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Buffer-Free HD</div>
              <div className="text-xs text-muted-foreground mt-0.5">Smooth playback on any phone or laptop</div>
            </div>
            <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-border/80 shadow-xs">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Campus Setup</div>
              <div className="mt-1 text-xl font-bold font-heading text-foreground">Ready in Minutes</div>
              <div className="text-xs text-muted-foreground mt-0.5">Quick setup with custom logos & colors</div>
            </div>
          </div>
        </section>

        {/* Interactive Platform Preview - Simple Mac View */}
        <section id="overview" className="max-w-6xl mx-auto px-6 pb-20">
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            {/* Mac Window Chrome Bar */}
            <div className="border-b border-border bg-muted/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Classic Traffic Light Window Controls */}
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                  <div className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                  <div className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>
                {/* Clean Mac App URL / Title */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-background border border-border/80 text-xs text-muted-foreground font-medium">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground font-semibold">Apex University System</span>
                  <span className="text-muted-foreground/50">&bull;</span>
                  <span>https://apex.educationos.edu</span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("campuses")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === "campuses"
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Campus Branches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === "courses"
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Courses & Cohorts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("classroom")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === "classroom"
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Digital Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("exams")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === "exams"
                      ? "bg-secondary text-secondary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Exams & Grading
                </button>
              </div>
            </div>

            {/* Tab 1: Campuses View */}
            {activeTab === "campuses" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Multi-Campus Governance</h3>
                    <p className="text-sm text-muted-foreground">Autonomous branches operating under central institutional policy.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">3 Active Branches</Badge>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50/50">Tenant Isolation Enforced</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">BRANCH-MAIN</span>
                      <span className="text-[11px] font-medium text-emerald-600">Active</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-foreground">Main Campus</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Dean: Dr. Sarah Vance &bull; 12 Departments</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground flex justify-between">
                      <span>Enrollment</span>
                      <span className="font-medium text-foreground">8,420 Students</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">BRANCH-MED</span>
                      <span className="text-[11px] font-medium text-emerald-600">Active</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-foreground">School of Medicine</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Dean: Dr. Marcus Chen &bull; 6 Departments</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground flex justify-between">
                      <span>Enrollment</span>
                      <span className="font-medium text-foreground">2,150 Students</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">BRANCH-LAW</span>
                      <span className="text-[11px] font-medium text-emerald-600">Active</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-foreground">School of Law</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Dean: Prof. Elena Rostova &bull; 4 Departments</p>
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground flex justify-between">
                      <span>Enrollment</span>
                      <span className="font-medium text-foreground">1,340 Students</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>Data boundary policy: Student records in School of Medicine are completely inaccessible from School of Law staff accounts.</span>
                  <Link href="/dashboard" className="text-primary font-medium hover:underline inline-flex items-center gap-1 shrink-0">
                    Open Branch Manager <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Tab 2: Courses & Cohorts */}
            {activeTab === "courses" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Course & Curriculum Directory</h3>
                    <p className="text-sm text-muted-foreground">Syllabi, lecture archives, and cohort-specific enrollment management.</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Fall Semester 2026</Badge>
                </div>

                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary">CS-301</span>
                        <h4 className="font-semibold text-sm text-foreground">Distributed Operating Systems</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Instructor: Dr. Vance &bull; Cohort A & B (184 students enrolled)</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">14 Modules</span>
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary">MED-510</span>
                        <h4 className="font-semibold text-sm text-foreground">Advanced Clinical Neuroanatomy</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Instructor: Dr. Chen &bull; Year 2 Cohort (76 students enrolled)</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">18 Modules</span>
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary">LAW-204</span>
                        <h4 className="font-semibold text-sm text-foreground">Constitutional Jurisprudence</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Instructor: Prof. Rostova &bull; 1L Section 3 (112 students enrolled)</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">12 Modules</span>
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Digital Classroom */}
            {activeTab === "classroom" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Interactive Digital Classroom</h3>
                    <p className="text-sm text-muted-foreground">Buffer-free lecture delivery with instant playback on all devices.</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50/50">HLS Adaptive HD Active</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-lg border border-border bg-muted/30 p-6 flex flex-col justify-between min-h-[220px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Live Lecture Streaming</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">1080p 60fps &bull; Sub-second latency</span>
                    </div>

                    <div className="my-auto py-4 text-center">
                      <div className="text-sm font-semibold text-foreground">CS-301: Distributed Consensus & Raft Protocol</div>
                      <div className="text-xs text-muted-foreground mt-1">Live broadcast with real-time student Q&A and attendance logging</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>162 Students Connected</span>
                      <span>Audio & Screen Share: Optimal</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg border border-border bg-background space-y-1.5">
                      <div className="text-xs font-semibold text-foreground">Automated Attendance</div>
                      <p className="text-xs text-muted-foreground">Student presence is verified automatically through session engagement timestamps.</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-border bg-background space-y-1.5">
                      <div className="text-xs font-semibold text-foreground">Instant Cloud Archive</div>
                      <p className="text-xs text-muted-foreground">Lectures are indexed and available for student replay immediately after the session ends.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Exams & Grading */}
            {activeTab === "exams" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Examination & Assessment Reliability</h3>
                    <p className="text-sm text-muted-foreground">Zero-crash test submissions during campus-wide finals with automated grading.</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50/50">99.99% Concurrency Passed</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-background">
                    <div className="text-xs text-muted-foreground">Current Active Exams</div>
                    <div className="text-2xl font-bold text-foreground mt-1">4 Assessments</div>
                    <div className="text-xs text-emerald-600 mt-1">Running smoothly across 2 campuses</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-background">
                    <div className="text-xs text-muted-foreground">Submissions Processed</div>
                    <div className="text-2xl font-bold text-foreground mt-1">1,842 Total</div>
                    <div className="text-xs text-muted-foreground mt-1">Zero dropped submissions</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-background">
                    <div className="text-xs text-muted-foreground">Automated Grade Sync</div>
                    <div className="text-2xl font-bold text-foreground mt-1">Instant</div>
                    <div className="text-xs text-muted-foreground mt-1">Directly into verified gradebook</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Core Institutional Capabilities */}
        <section id="capabilities" className="py-20 border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Core Capabilities</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Engineered for operational clarity across every department
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Traditional higher-ed software forces institutions to juggle multiple unintegrated vendors. EducationOS consolidates governance, classroom teaching, and compliance into a single standard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Multi-Branch Campus Architecture</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Support central university oversight while granting individual colleges, professional schools, and regional branches full administrative autonomy over their cohorts, staff, and grading rules.
                </p>
                <ul className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Strict database-level isolation per branch
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Executive roll-up reports for chancellors and deans
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">High-Definition Lecture Delivery</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Deliver synchronous and asynchronous video lectures with adaptive bitrates. Students with low bandwidth experience smooth audio and video without frustrating pauses or buffering.
                </p>
                <ul className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Responsive playback on mobile phones, tablets, and laptops
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Immediate archive availability with zero manual rendering
                  </li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Resilient Exam Submissions</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Prevent the notorious server crashes that plague legacy portals during finals week. Dedicated submission pipelines guarantee student tests are safely received and timestamped.
                </p>
                <ul className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Automated quiz grading with instant feedback
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Tamper-evident gradebook logging and audit histories
                  </li>
                </ul>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Student Record Privacy & Compliance</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Built to meet FERPA and GDPR standards out of the box. Precise role-based permissions ensure faculty and staff only access the students and grade records relevant to their approved scope.
                </p>
                <ul className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Scoped access levels for deans, professors, and registrars
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" /> Comprehensive audit logs for accreditation inspections
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Stakeholder Value Grid */}
        <section id="solutions" className="py-20 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Designed for Campuses</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Built for everyone in the university ecosystem
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Each stakeholder interacts with a purpose-built view tailored specifically to their academic responsibilities.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="text-xs font-semibold text-primary uppercase">Leadership</div>
                <h3 className="font-semibold text-base text-foreground">Deans & Provosts</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real-time visibility into cross-branch retention, faculty workloads, accreditation metrics, and institutional enrollment.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="text-xs font-semibold text-primary uppercase">Instruction</div>
                <h3 className="font-semibold text-base text-foreground">Faculty & Instructors</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fast curriculum creation, automated grading, attendance tracking, and intuitive course resource distribution.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="text-xs font-semibold text-primary uppercase">Learning</div>
                <h3 className="font-semibold text-base text-foreground">Enrolled Students</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A modern, responsive learning portal with video playback speed controls, assignment deadlines, and instant quiz results.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="text-xs font-semibold text-primary uppercase">Infrastructure</div>
                <h3 className="font-semibold text-base text-foreground">Campus IT & Registrars</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Instant campus branch setup, automated backups, zero cross-tenant data leaks, and 99.99% guaranteed uptime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Practical Comparison Table */}
        <section id="comparison" className="py-20 border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Architectural Comparison</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                How EducationOS compares to legacy university portals
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                A straightforward assessment of modern infrastructure versus decade-old monolithic campus systems.
              </p>
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-4 font-semibold text-foreground">Capability</th>
                      <th className="p-4 font-semibold text-muted-foreground">Legacy Campus Portals</th>
                      <th className="p-4 font-semibold text-primary">EducationOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-4 font-medium text-foreground">Campus Isolation</td>
                      <td className="p-4 text-muted-foreground">Shared tables prone to misconfigurations and accidental record exposure</td>
                      <td className="p-4 font-medium text-foreground">Dedicated schema boundaries enforced on every query</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">Exam Concurrency</td>
                      <td className="p-4 text-muted-foreground">Frequent bottlenecks and crashes during simultaneous finals submissions</td>
                      <td className="p-4 font-medium text-foreground">High-throughput submission queue designed for peak volume</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">Video Classroom</td>
                      <td className="p-4 text-muted-foreground">Third-party external links with manual attendance cross-checking</td>
                      <td className="p-4 font-medium text-foreground">Native adaptive streaming with automated participation tracking</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">Deployment Time</td>
                      <td className="p-4 text-muted-foreground">12 to 18 months involving expensive enterprise IT consulting</td>
                      <td className="p-4 font-medium text-foreground">Operational in hours with self-serve campus registration</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-foreground">User Experience</td>
                      <td className="p-4 text-muted-foreground">Dated 2000s desktop-only tables that confuse students and staff</td>
                      <td className="p-4 font-medium text-foreground">Clean, responsive interface built with modern accessibility standards</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Multi-Step Deployment Walkthrough */}
        <section id="deployment" className="py-20 border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Guided Setup</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Set up your institution in three clean, guided steps
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Click through the interactive steps below to see how straightforward campus onboarding is with EducationOS.
              </p>
            </div>

            {/* Step Navigation Pill Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setDeploymentStep(1)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  deploymentStep === 1
                    ? "border-primary bg-card shadow-sm ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card hover:border-border/80"
                }`}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  deploymentStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  1
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Register Institution</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Workspace domain & administrator setup</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeploymentStep(2)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  deploymentStep === 2
                    ? "border-primary bg-card shadow-sm ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card hover:border-border/80"
                }`}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  deploymentStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  2
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Configure Branches</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Autonomous colleges & faculty rosters</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeploymentStep(3)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  deploymentStep === 3
                    ? "border-primary bg-card shadow-sm ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card hover:border-border/80"
                }`}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  deploymentStep === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  3
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Launch Cohorts</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Enroll students & deliver live lectures</div>
                </div>
              </button>
            </div>

            {/* Interactive Step Content Box */}
            <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-xs">
              {deploymentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Step 1: Workspace & Administrator Profile</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Claim your unique institutional URL and create root administrative credentials.</p>
                    </div>
                    <Badge variant="outline" className="text-xs w-fit">Step 1 of 3</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Institution Name</label>
                      <input
                        type="text"
                        readOnly
                        value="Apex University System"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Campus Portal Subdomain</label>
                      <div className="flex items-center h-10 rounded-lg border border-border bg-muted/30 px-3 text-sm">
                        <span className="text-muted-foreground font-mono text-xs">https://</span>
                        <span className="font-semibold text-primary font-mono text-xs px-1">apex</span>
                        <span className="text-muted-foreground font-mono text-xs">.educationos.edu</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Primary Administrator</label>
                      <input
                        type="text"
                        readOnly
                        value="Dr. Eleanor Vance (Dean of Academic Governance)"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Administrative Email</label>
                      <input
                        type="text"
                        readOnly
                        value="provost@apex.edu"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Dedicated tenant schema initialized
                    </span>
                    <Button onClick={() => setDeploymentStep(2)} size="sm" className="gap-1.5 font-medium cursor-pointer">
                      Next: Configure Branches <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {deploymentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Step 2: Campus Branches & Department Curricula</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Establish isolated branch campuses and assign autonomous deans and faculty.</p>
                    </div>
                    <Badge variant="outline" className="text-xs w-fit">Step 2 of 3</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                      <div className="text-xs font-semibold text-primary">BRANCH 01</div>
                      <div className="text-sm font-semibold text-foreground">Main Campus</div>
                      <div className="text-xs text-muted-foreground">12 Academic Departments &bull; 8,420 Enrolled</div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                        <Check className="h-3 w-3" /> Fully Configured
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                      <div className="text-xs font-semibold text-primary">BRANCH 02</div>
                      <div className="text-sm font-semibold text-foreground">School of Medicine</div>
                      <div className="text-xs text-muted-foreground">6 Clinical Departments &bull; 2,150 Enrolled</div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                        <Check className="h-3 w-3" /> Fully Configured
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                      <div className="text-xs font-semibold text-primary">BRANCH 03</div>
                      <div className="text-sm font-semibold text-foreground">School of Law</div>
                      <div className="text-xs text-muted-foreground">4 Legal Divisions &bull; 1,340 Enrolled</div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                        <Check className="h-3 w-3" /> Fully Configured
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button onClick={() => setDeploymentStep(1)} variant="ghost" size="sm" className="cursor-pointer">
                      Back to Step 1
                    </Button>
                    <Button onClick={() => setDeploymentStep(3)} size="sm" className="gap-1.5 font-medium cursor-pointer">
                      Next: Launch Cohorts <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {deploymentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Step 3: Cohort Enrollment & Classroom Launch</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Invite student cohorts, deliver buffer-free video lectures, and conduct exams.</p>
                    </div>
                    <Badge variant="outline" className="text-xs w-fit text-emerald-600 border-emerald-300">Ready to Teach</Badge>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">Fall Semester 2026 Batch Active</div>
                      <div className="text-xs text-muted-foreground">184 students enrolled in CS-301 &bull; Live lecture stream ready &bull; Exam schedule set</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-600">Online & Operational</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button onClick={() => setDeploymentStep(2)} variant="ghost" size="sm" className="cursor-pointer">
                      Back to Step 2
                    </Button>
                    <Link href="/dashboard">
                      <Button size="sm" className="gap-1.5 font-medium cursor-pointer">
                        Open Live Campus Portal <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Action Callout */}
        <section className="py-16 border-t border-border bg-muted/40">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ready to modernize your university network?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Test the platform directly with our interactive demo campus, or register your institution to begin setting up your autonomous branches.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Explore Demo Campus <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Register Institution
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Structured Footer */}
      <footer className="border-t border-border bg-background py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-foreground">EducationOS</span>
            <span>&bull; Modern University Operating System</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
            <a href="#solutions" className="hover:text-foreground transition-colors">Stakeholders</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Comparison</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Operational (99.99% Uptime)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
