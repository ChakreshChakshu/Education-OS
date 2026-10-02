"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";
import { Buildings, Video, FileText, ShieldCheck, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppleCardsCarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.title} card={card} index={index} />
  ));

  return (
    <div className="w-full py-16 md:py-24">
      <div className="max-w-7xl px-6 mx-auto mb-6">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg inline-block">
          Core Architecture
        </span>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mt-3 tracking-tight">
          Engineered to replace fragmented campus software
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Consolidating branch governance, adaptive media streaming, and student privacy into one standard.
        </p>
      </div>
      <Carousel items={cards} />
    </div>
  );
}

const ArchitectureCardDetail = ({
  icon: Icon,
  headline,
  description,
  bullets,
  badgeText
}: {
  icon: any;
  headline: string;
  description: string;
  bullets: string[];
  badgeText: string;
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 md:p-8 rounded-2xl bg-muted/40 border border-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={26} weight="bold" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-primary uppercase">{badgeText}</span>
            <h4 className="text-xl font-bold text-foreground">{headline}</h4>
          </div>
        </div>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/80 text-xs sm:text-sm font-semibold text-foreground">
              <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <span className="text-xs text-muted-foreground font-mono">
          Powered directly by Neon PostgreSQL ACID & Cloudflare R2
        </span>
        <Link href="/dashboard">
          <Button size="sm" className="gap-2 font-bold text-xs cursor-pointer shadow-xs">
            <span>Explore in Live Demo</span>
            <ArrowRight size={14} weight="bold" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

const data = [
  {
    category: "Campus Autonomy",
    title: "Multi-Tenant Campus Isolation",
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1600&auto=format&fit=crop",
    content: (
      <ArchitectureCardDetail
        icon={Buildings}
        headline="Multi-Tenant Campus Isolation"
        description="Support central university oversight while granting individual colleges and regional branches full administrative autonomy, custom branding palettes, and strict database query isolation."
        bullets={["Custom Domain Routing", "Autonomous Deans", "Dedicated Tenant Schemas", "Real-time Palette Injection"]}
        badgeText="Multi-Branch Governance"
      />
    )
  },
  {
    category: "Adaptive Streaming",
    title: "High-Definition HLS Video Delivery",
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600&auto=format&fit=crop",
    content: (
      <ArchitectureCardDetail
        icon={Video}
        headline="High-Definition HLS Video Delivery"
        description="Deliver synchronous and asynchronous video lectures with adaptive bitrates. Low-bandwidth students experience smooth audio and playback with zero manual transcode rendering."
        bullets={["Cloudflare R2 Storage", "360p - 1080p ABR", "Automated Attendance Logs", "Sub-second Latency"]}
        badgeText="Media Engine"
      />
    )
  },
  {
    category: "High Throughput",
    title: "Concurrency-Proof Exam Submissions",
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1600&auto=format&fit=crop",
    content: (
      <ArchitectureCardDetail
        icon={FileText}
        headline="Concurrency-Proof Exam Submissions"
        description="Eliminate server crashes during finals week. Dedicated PostgreSQL row-locked submission pipelines guarantee tests are timestamped, safely received, and instantly graded."
        bullets={["Zero-Timeout Finals", "Instant Gradebook Sync", "SKIP LOCKED Queue Processing", "Tamper-Evident Audit Trails"]}
        badgeText="Exam Infrastructure"
      />
    )
  },
  {
    category: "Security & Compliance",
    title: "FERPA & GDPR Student Privacy",
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1600&auto=format&fit=crop",
    content: (
      <ArchitectureCardDetail
        icon={ShieldCheck}
        headline="FERPA & GDPR Student Privacy"
        description="Fine-grained RBAC ensures professors and staff access only the rosters and grade records within their approved scope, with complete audit logs for accreditation inspections."
        bullets={["Multi-Tenant Boundaries", "Tamper-Evident Logs", "Role-Based Data Scoping", "Accreditation-Ready Exports"]}
        badgeText="Privacy & Compliance"
      />
    )
  }
];
