"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Video,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface ArchitectureItem {
  id: string;
  category: string;
  title: string;
  headline: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  bullets: string[];
  techSpec: string;
  image: string;
}

const ARCHITECTURE_DATA: ArchitectureItem[] = [
  {
    id: "campus-autonomy",
    category: "Campus Autonomy",
    title: "Multi-Tenant Campus Isolation",
    headline: "Multi-Tenant Campus Isolation",
    badgeText: "Multi-Branch Governance",
    icon: Building2,
    description:
      "Support central university oversight while granting individual colleges and regional branches full administrative autonomy, custom branding palettes, and strict database query isolation.",
    bullets: [
      "Custom Domain Routing",
      "Autonomous Deans & Department Controls",
      "Dedicated Tenant Schemas in PostgreSQL",
      "Real-time Palette & Theme Injection",
    ],
    techSpec: "Neon PostgreSQL Schema-per-Tenant with Row-Level Security",
    image:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "adaptive-streaming",
    category: "Adaptive Streaming",
    title: "High-Definition HLS Video Delivery",
    headline: "High-Definition HLS Video Delivery",
    badgeText: "Media Engine",
    icon: Video,
    description:
      "Deliver synchronous and asynchronous video lectures with adaptive bitrates. Low-bandwidth students experience smooth audio and playback with zero manual transcode rendering.",
    bullets: [
      "Cloudflare R2 Object Storage",
      "Adaptive Bitrate (360p to 1080p)",
      "Automated Playback Attendance Logs",
      "Edge-Cached Sub-second Latency",
    ],
    techSpec: "Cloudflare R2 + HLS.js with dynamic manifest parsing",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "high-throughput",
    category: "High Throughput",
    title: "Concurrency-Proof Exam Submissions",
    headline: "Concurrency-Proof Exam Submissions",
    badgeText: "Exam Infrastructure",
    icon: FileCheck2,
    description:
      "Eliminate server crashes during finals week. Dedicated PostgreSQL row-locked submission pipelines guarantee tests are timestamped, safely received, and instantly graded.",
    bullets: [
      "Zero-Timeout Finals Submissions",
      "Instant Gradebook Sync",
      "SKIP LOCKED Queue Processing",
      "Tamper-Evident Submission Audit Trails",
    ],
    techSpec: "PostgreSQL SELECT FOR UPDATE SKIP LOCKED ACID Transactions",
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "security-compliance",
    category: "Security & Compliance",
    title: "FERPA & GDPR Student Privacy",
    headline: "FERPA & GDPR Student Privacy",
    badgeText: "Privacy & Compliance",
    icon: ShieldCheck,
    description:
      "Fine-grained RBAC ensures professors and staff access only the rosters and grade records within their approved scope, with complete audit logs for accreditation inspections.",
    bullets: [
      "Multi-Tenant Tenant-Scoped Boundaries",
      "Tamper-Evident Action Audit Logs",
      "Role-Based Data Scoping (Dean/Faculty/Student)",
      "Accreditation-Ready Compliance Exports",
    ],
    techSpec: "Cryptographic audit trail with strict RBAC middleware",
    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
  },
];

// High-resolution Unsplash imagery representing education architecture
const MARQUEE_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop",
    alt: "University campus architecture and governance",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
    alt: "Adaptive streaming video and student collaboration",
  },
  {
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
    alt: "High throughput exam and submission system",
  },
  {
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
    alt: "FERPA and GDPR compliant student privacy records",
  },
  {
    src: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1200&auto=format&fit=crop",
    alt: "Modern connected university campus hall",
  },
  {
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop",
    alt: "Cloud database servers and resilient infrastructure",
  },
  {
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    alt: "Security audit compliance interface",
  },
  {
    src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    alt: "Global resilient content distribution network",
  },
];

export default function CoreArchitectureMarquee() {
  const [selectedPillar, setSelectedPillar] = useState<ArchitectureItem | null>(null);

  return (
    <section className="relative w-full py-16 md:py-24 overflow-hidden bg-background">
      {/* 3D Cylindrical Marquee Hero Background */}
      <TiltedGridHero
        images={MARQUEE_IMAGES}
        speed={4.5}
        tileHeight={34}
        aspectRatio={16 / 9}
        gap={8}
        axis={50}
        curve={75}
        fade={16}
        className="h-[680px] sm:h-[720px] md:h-[760px] w-full border-y border-border/80 bg-background/50 shadow-inner"
      >
        {/* Top Header Content Overlay */}
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10 pointer-events-none">
          {/* Header block */}
          <div className="max-w-4xl mx-auto text-center pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/25 px-3 py-1 rounded-full shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Core Architecture
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mt-4 tracking-tight leading-tight">
              Engineered to replace fragmented campus software
            </h2>

            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Consolidating branch governance, adaptive media streaming, and student privacy into one standard.
            </p>
          </div>

          {/* Minimal Rounded Architecture Cards */}
          <div className="w-full max-w-6xl mx-auto pointer-events-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ARCHITECTURE_DATA.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPillar(item)}
                  className="group flex flex-col justify-between p-5 rounded-2xl sm:rounded-3xl bg-card/85 hover:bg-card backdrop-blur-md border border-border/70 hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider block">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors tracking-tight leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <span>Explore Architecture Details</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </TiltedGridHero>

      {/* Detail Dialog for Architecture Pillars */}
      <Dialog open={!!selectedPillar} onOpenChange={(open) => !open && setSelectedPillar(null)}>
        {selectedPillar && (
          <DialogContent className="max-w-xl sm:max-w-2xl bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2.5 py-0.5 rounded-md">
                  {selectedPillar.badgeText}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  • {selectedPillar.category}
                </span>
              </div>
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <selectedPillar.icon className="w-5 h-5" />
                </div>
                <span>{selectedPillar.headline}</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1 leading-relaxed">
                {selectedPillar.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedPillar.bullets.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs sm:text-sm font-semibold text-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>Infrastructure: {selectedPillar.techSpec}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPillar(null)}
                  className="cursor-pointer text-xs"
                >
                  Close
                </Button>
                <Link href="/dashboard">
                  <Button size="sm" className="gap-2 font-bold text-xs cursor-pointer shadow-xs">
                    <span>Live Interactive Demo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
