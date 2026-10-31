"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Link2, MessageSquare, Camera, Briefcase, ArrowRight, Check } from "lucide-react";

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="relative border-t border-border bg-card overflow-hidden pt-16 md:pt-20">
      {/* Subtle Arc Spotlight at top center matching screenshot */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/5 rounded-[100%] blur-3xl -translate-y-1/2"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* 4-Column Grid matching user reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 sm:pb-16">
          {/* Column 1: Stay Connected (Spans 4 columns) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Stay Connected
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Subscribe to institutional release notes, architecture benchmarks, and regulatory compliance updates.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2.5 pt-1">
              <label htmlFor="footer-email" className="text-xs font-semibold text-foreground block">
                Email
              </label>
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                suppressHydrationWarning
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background/80 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                {subscribed ? (
                  <>
                    <Check className="w-4 h-4 text-primary" />
                    <span>Subscribed!</span>
                  </>
                ) : (
                  <span>Subscribe</span>
                )}
              </button>
            </form>
          </div>

          {/* Column 2: Quick Links (Spans 3 columns) */}
          <div className="lg:col-span-3 space-y-3.5 sm:pl-4">
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <a href="#overview" className="hover:text-primary transition-colors">
                  Product Features
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Core Architecture
                </a>
              </li>
              <li>
                <Link href="/courses" className="hover:text-primary transition-colors">
                  Course Catalog
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Live Campus Demo
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  Register Institution
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Us (Spans 3 columns) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Contact Us
            </h4>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>123 Innovation Street</p>
              <p>Tech Campus, TC 12345</p>
              <p className="pt-1">Phone: (123) 456-7890</p>
              <p>Email: contact@educationos.edu</p>
            </div>
          </div>

          {/* Column 4: Follow Us (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Follow Us
            </h4>
            <div className="flex items-center gap-3 text-muted-foreground">
              <a
                href="https://educationos.edu"
                target="_blank"
                rel="noreferrer"
                aria-label="Website Link"
                className="h-8 w-8 rounded-lg border border-border bg-background/80 hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Community Chat"
                className="h-8 w-8 rounded-lg border border-border bg-background/80 hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Media Photos"
                className="h-8 w-8 rounded-lg border border-border bg-background/80 hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Institutional Network"
                className="h-8 w-8 rounded-lg border border-border bg-background/80 hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Full-width Divider */}
        <div className="w-full border-t border-border/80" />

        {/* Copyright notice row */}
        <div className="py-6 text-center text-xs text-muted-foreground" suppressHydrationWarning>
          © {new Date().getFullYear()} EducationOS. All rights reserved.
        </div>
      </div>

      {/* Signature Half-cut Faded Typography at the bottom */}
      <div className="relative w-full overflow-hidden select-none pointer-events-none -mt-4 sm:-mt-8 md:-mt-10">
        <div className="text-center font-extrabold text-[14vw] leading-[0.76] tracking-tighter uppercase whitespace-nowrap bg-gradient-to-b from-foreground/15 dark:from-foreground/20 via-foreground/5 to-transparent bg-clip-text text-transparent transform translate-y-[10%]">
          EDUCATIONOS
        </div>
      </div>
    </footer>
  );
}
