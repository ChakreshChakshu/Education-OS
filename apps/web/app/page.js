"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SpecularButton from "@/components/ui/specular-button";
import { Badge } from "@/components/ui/badge";
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";
import CoreArchitectureMarquee from "@/components/core-architecture-marquee";
import ComparisonSection from "@/components/comparison-section";
import RapidOnboardingTimeline from "@/components/rapid-onboarding-timeline";
import InteractiveSpotlightBento from "@/components/interactive-spotlight-bento";
import SiteFooter from "@/components/site-footer";
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

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
              <SpecularButton
                size="md"
                radius={12}
                tint="#5b12ed"
                tintOpacity={0.08}
                textColor="currentColor"
                lineColor="#5b12ed"
                baseColor="#8f707d"
                thickness={1.4}
                className="w-full sm:w-auto text-sm sm:text-base font-bold px-7 h-12 border border-border/70 hover:border-primary/50 transition-all cursor-pointer"
              >
                <span>Register Institution</span>
                <ArrowRight size={16} weight="bold" />
              </SpecularButton>
            </Link>
          </div>

          {/* Minimal, Simple Trust Highlights Strip */}
          <div className="mt-10 pt-6 border-t border-border/50 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-2xs hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Privacy</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">100% Private</span>
              <span className="text-xs text-muted-foreground">Campus data isolated</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-2xs hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Reliability</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">99.99% Uptime</span>
              <span className="text-xs text-muted-foreground">Zero finals crashes</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-2xs hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Streaming</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">Buffer-Free</span>
              <span className="text-xs text-muted-foreground">Smooth HD lectures</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-card/80 backdrop-blur-md border border-border shadow-2xs hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider block">Setup</span>
              <span className="text-sm font-bold text-foreground mt-0.5 block">Self-Service</span>
              <span className="text-xs text-muted-foreground">Instant branch launch</span>
            </div>
          </div>
        </ParallaxComponent>

        {/* Section 1: Interactive Spotlight Bento Product Features */}
        <InteractiveSpotlightBento />

        {/* Section 2: Core Architecture (3D Curved Tilted Marquee) */}
        <section id="features" className="border-t border-border overflow-hidden">
          <CoreArchitectureMarquee />
        </section>

        {/* Section 3: High-Impact Architecture Comparison */}
        <ComparisonSection />

        {/* Section 4: Rapid Onboarding Delivery Framework */}
        <RapidOnboardingTimeline />

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
                <SpecularButton
                  size="md"
                  radius={12}
                  tint="#5b12ed"
                  tintOpacity={0.08}
                  textColor="currentColor"
                  lineColor="#5b12ed"
                  baseColor="#8f707d"
                  thickness={1.4}
                  className="w-full sm:w-auto text-sm sm:text-base font-bold px-8 h-12 border border-border/70 hover:border-primary/50 transition-all cursor-pointer"
                >
                  <span>Register Institution</span>
                </SpecularButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Modern 4-Column Footer with Halfcut Brand Typography */}
      <SiteFooter />
    </div>
  );
}
