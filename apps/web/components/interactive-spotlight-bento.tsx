"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  SlidersHorizontal,
  Command,
  ShieldCheck,
  Building2,
  Video,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function InteractiveSpotlightBento() {
  const [governanceActive, setGovernanceActive] = useState(true);
  const [activeRange, setActiveRange] = useState("30D");

  return (
    <section id="overview" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      {/* Header matching user reference */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
          Product Features
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Organize, prioritize, and govern your campus nodes with operational precision in our trusted platform.
        </p>
      </div>

      {/* Bento Grid Layout matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Card 1: Left Tall Card (Spans 4 columns, full height) */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-colors">
          <div className="space-y-5">
            {/* Asterisk / Brand Star Icon */}
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                Campus Isolation
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Unlock autonomous governance. Connect your branches, enforce tenant isolation, streamline departmental workflows, and supercharge accreditation reporting with ease.
              </p>
            </div>
          </div>

          {/* Bottom Action Row: Configure Button + Interactive Toggle Switch */}
          <div className="pt-8 flex items-center justify-between border-t border-border/80">
            <Link href="/dashboard/tenants">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                <span>Configure</span>
              </button>
            </Link>

            {/* Interactive Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={governanceActive}
              onClick={() => setGovernanceActive(!governanceActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                governanceActive ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                  governanceActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right 8-Column Area */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">
          {/* Top Row: Cards 2 & 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Card 2: Trackers / Campuses Connected */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-colors">
              <div>
                <h4 className="text-sm font-bold text-foreground">Campuses Connected</h4>
                <p className="text-xs text-muted-foreground mt-0.5">03 Active Branch Nodes</p>
              </div>

              {/* Overlapping Avatar Stack matching screenshot */}
              <div className="flex items-center -space-x-2 pt-6">
                <Avatar className="h-8 w-8 border-2 border-card ring-1 ring-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">MC</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border-2 border-card ring-1 ring-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">MD</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border-2 border-card ring-1 ring-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80" />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">LW</AvatarFallback>
                </Avatar>
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +8
                </div>
              </div>
            </div>

            {/* Card 4: 10X Giant Stat */}
            <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center text-center shadow-xs hover:border-primary/50 transition-colors min-h-[140px]">
              <div>
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground block font-mono">
                  10X
                </span>
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mt-1 block">
                  Finals Submission Concurrency
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: Cards 3 & 5 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Card 3: Focusing / Stream Health Ratio */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">HLS Video Buffer</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Stream Reliability</p>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  ABR Engine
                </span>
              </div>

              <div className="py-4">
                <span className="text-4xl font-extrabold text-foreground tracking-tight font-mono">
                  99.8%
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Sub-second playback health</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Cloudflare R2</span>
              </div>
            </div>

            {/* Card 5: Team's Productivity / Student Privacy */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-colors">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">Faculty &amp; Student Privacy</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cryptographically scoped tenant boundaries guarantee FERPA and GDPR accreditation compliance.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pt-4">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Zero Cross-Tenant Leakage</span>
              </div>
            </div>
          </div>

          {/* Bottom Card: Card 6 Shortcut Keys (Spans full width of right section) */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-primary/50 transition-colors">
            <div>
              <h4 className="text-sm font-bold text-foreground">Shortcut Keys</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faster easier way to search courses and manage campuses.
              </p>
            </div>

            {/* Keyboard Command Pills matching screenshot */}
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="inline-flex items-center justify-center h-7 px-2 rounded-md bg-muted border border-border text-xs font-mono font-bold text-foreground shadow-2xs">
                ⌘
              </kbd>
              <span className="text-xs text-muted-foreground font-mono">+</span>
              <kbd className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-muted border border-border text-xs font-mono font-bold text-foreground shadow-2xs">
                K
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
