"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ArrowRight, Check } from "lucide-react";

export default function ComparisonSection() {
  return (
    <section id="architecture" className="py-20 md:py-28 border-t border-border bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <span className="text-xs font-mono font-medium tracking-[0.25em] uppercase text-muted-foreground block mb-3">
            Before and After
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif tracking-tight text-foreground">
            The same semester, spent two ways
          </h2>
        </div>

        {/* Main Comparison Container using Brand Tokens */}
        <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-10 md:p-12 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
            {/* Center Divider for Desktop */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-border -translate-x-1/2" />

            {/* Left Column: Legacy Monoliths */}
            <div className="space-y-6 md:pr-6">
              {/* Column Header */}
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-mono font-semibold tracking-[0.18em] uppercase">
                  Running Legacy Monoliths
                </span>
              </div>

              {/* Items List */}
              <ul className="space-y-5 text-sm sm:text-[15px] text-muted-foreground leading-relaxed font-sans">
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/60 font-mono select-none">—</span>
                  <span>
                    A course catalog lives across three separate portals, each with its own fragile authentication session.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/60 font-mono select-none">—</span>
                  <span>
                    Finals week concurrency is a high-risk ticket nobody wants to pick up.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/60 font-mono select-none">—</span>
                  <span>
                    The video player was derived from external embeds, so low-bandwidth students buffer constantly.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/60 font-mono select-none">—</span>
                  <span>
                    Every compliance audit means manually cross-referencing someone else&apos;s unindexed database tables.
                  </span>
                </li>
              </ul>
            </div>

            {/* Right Column: EducationOS */}
            <div className="space-y-6 md:pl-6 pt-6 md:pt-0 border-t md:border-t-0 border-border">
              {/* Column Header */}
              <div className="flex items-center gap-2.5 text-primary">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                <span className="text-xs font-mono font-semibold tracking-[0.18em] uppercase text-primary">
                  Switching to EducationOS
                </span>
              </div>

              {/* Items List */}
              <ul className="space-y-5 text-sm sm:text-[15px] text-foreground leading-relaxed font-sans font-medium">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    One unified multi-tenant schema with dedicated campus branding and isolated tenant roles.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    SKIP LOCKED queue pipelines guarantee exams submit without server timeouts under peak load.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Native HLS adaptive streaming from 360p to 1080p with automated attendance logs.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Cryptographically scoped FERPA &amp; GDPR compliance built directly into every query.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
          {/* Stats Group */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm text-muted-foreground">
            <div>
              <span className="font-bold text-foreground">One platform</span>{" "}
              <span className="text-muted-foreground">from governance to grading</span>
            </div>
            <div>
              <span className="font-bold text-foreground">0 timeouts</span>{" "}
              <span className="text-muted-foreground">during peak finals exams</span>
            </div>
            <div>
              <span className="font-bold text-foreground">100% compliant</span>{" "}
              <span className="text-muted-foreground">FERPA &amp; GDPR isolation</span>
            </div>
          </div>

          {/* Right Action Button */}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs cursor-pointer group"
            >
              <span>See what ships</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
