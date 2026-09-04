"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  GraduationCap, 
  ShieldCheck, 
  Cpu, 
  Buildings, 
  ArrowRight,
  Sparkle
} from "@phosphor-icons/react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            <GraduationCap size={24} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight">Education OS</span>
            <Badge variant="outline" className="ml-2 text-xs font-mono font-bold">v1.0 Clean</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="lg" className="font-bold">Sign In</Button>
          </Link>
          <Link href="/login?tab=register">
            <Button size="lg" className="font-bold gap-2">Register Institution <ArrowRight size={18} weight="bold" /></Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 max-w-6xl mx-auto text-center space-y-8">
        <Badge variant="secondary" className="px-4 py-1.5 text-sm font-semibold gap-2 border border-border">
          <Sparkle size={16} className="text-primary" /> Multi-Tenant Educational Operating System
        </Badge>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Operating System for <span className="text-primary">Higher Education</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-medium">
          Clean Architecture, domain aggregates, multi-tenant institutional partitioning, and scalable infrastructure built for modern universities and academies.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto text-lg font-bold px-8 h-14 rounded-xl gap-2">
              Launch Web Portal <ArrowRight size={20} weight="bold" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg font-bold px-8 h-14 rounded-xl">
              Institution Onboarding
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 text-left w-full">
          <Card className="p-4 border-border bg-card hover:border-primary/50 transition-colors rounded-2xl">
            <CardContent className="pt-4 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Buildings size={28} weight="bold" />
              </div>
              <h3 className="font-bold text-xl">Multi-Tenant Isolation</h3>
              <p className="text-base text-muted-foreground font-medium leading-relaxed">
                Hierarchical organization structure separating universities, campuses, and branches with zero data leakage.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 border-border bg-card hover:border-primary/50 transition-colors rounded-2xl">
            <CardContent className="pt-4 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Cpu size={28} weight="bold" />
              </div>
              <h3 className="font-bold text-xl">Clean DDD Core</h3>
              <p className="text-base text-muted-foreground font-medium leading-relaxed">
                Domain aggregates, Value Objects, and Application Use-Cases separated from Fastify and Drizzle ORM providers.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 border-border bg-card hover:border-primary/50 transition-colors rounded-2xl">
            <CardContent className="pt-4 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck size={28} weight="bold" />
              </div>
              <h3 className="font-bold text-xl">Enterprise Security</h3>
              <p className="text-base text-muted-foreground font-medium leading-relaxed">
                UUID v7 audit trails, optimistic concurrency locking, role-based access control, and strict relational integrity.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm font-medium text-muted-foreground">
        © 2026 Education Operating System (EOS). Built with Clean Architecture & Modern Solid Minimalism.
      </footer>
    </div>
  );
}
