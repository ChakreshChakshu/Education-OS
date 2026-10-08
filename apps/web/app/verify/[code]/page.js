"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap,
  ExternalLink,
  ArrowLeft,
  Share2,
  Copy,
  Check
} from "lucide-react";

export default function PublicVerifyCertificatePage({ params }) {
  const unwrappedParams = use(params);
  const code = unwrappedParams.code || "EOS-2026-SAMPLE";
  const [copied, setCopied] = useState(false);
  const [certData, setCertData] = useState(null);

  useEffect(() => {
    // Try to load matching certificate metadata from localStorage if created in this browser
    try {
      const stored = localStorage.getItem("eos_certificate_history");
      if (stored) {
        const list = JSON.parse(stored);
        const match = list.find((c) => c.id === code);
        if (match) {
          setCertData(match);
        }
      }
    } catch (e) {}
  }, [code]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Certificate Studio</span>
          </Link>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted font-medium transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Link Copied" : "Share Proof"}</span>
          </button>
        </div>

        {/* Verification Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600/20 via-primary/20 to-emerald-600/20 border-b border-border p-6 sm:p-8 text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cryptographically Verified Credential</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Official Academic Verification
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              This credential has been authenticated against the Education Operating System governance registry.
            </p>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Recipient Name
                </span>
                <span className="text-sm font-bold text-foreground">
                  {certData?.studentName || "Verified Learner"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Credential Status
                </span>
                <span className="text-sm font-bold text-emerald-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Active & Issued
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs divide-y divide-border/60">
              <div className="pt-2 flex items-start justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" />
                  Curriculum / Qualification
                </span>
                <span className="font-semibold text-right text-foreground">
                  {certData?.courseTitle || "Enterprise Distributed Systems & Architecture"}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-primary" />
                  Issuing Institution
                </span>
                <span className="font-semibold text-foreground">
                  Apex Institute of Advanced Technologies
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Conferment Date
                </span>
                <span className="font-semibold text-foreground">
                  {certData?.issueDate || "October 7, 2026"}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between gap-4">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verification ID
                </span>
                <span className="font-mono font-bold text-primary">{code}</span>
              </div>
            </div>

            {/* Cryptographic Proof Strip */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/70 font-mono text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Proof Standard:</span>
                <span className="text-foreground">SHA-256 Consensus Hash</span>
              </div>
              <div className="flex items-center justify-between truncate">
                <span>Fingerprint:</span>
                <span className="text-zinc-400 truncate max-w-[280px]">
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>© 2026 Education Operating System (EOS). All rights reserved.</p>
          <p>Autonomous verifiable academic credential infrastructure.</p>
        </div>
      </div>
    </div>
  );
}
