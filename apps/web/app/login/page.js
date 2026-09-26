"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  EnvelopeSimple, 
  LockSimple, 
  ArrowRight, 
  CheckCircle, 
  WarningCircle, 
  Laptop,
  Buildings,
  ShieldCheck,
  Check
} from "@phosphor-icons/react";

function LoginContent() {
  const router = useRouter();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        setSuccess("Login successful! Entering dashboard...");
        setTimeout(() => router.push("/dashboard"), 600);
      } else {
        setError(res.error || "Invalid email or password.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-border space-y-1.5">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Sign in to your portal</h2>
        <p className="text-xs text-muted-foreground">Enter your credentials to access your courses and campus dashboard.</p>
      </div>

      <CardContent className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <WarningCircle size={18} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle size={18} weight="bold" className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
              <EnvelopeSimple size={15} className="text-muted-foreground" /> Work email
            </label>
            <Input
              type="email"
              required
              placeholder="name@institution.edu"
              className="h-11 text-sm rounded-xl font-medium"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                <LockSimple size={15} className="text-muted-foreground" /> Password
              </label>
              <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
            </div>
            <Input
              type="password"
              required
              placeholder="••••••••"
              className="h-11 text-sm rounded-xl font-medium"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>

          <Button type="submit" size="lg" className="w-full h-11 text-sm font-bold rounded-xl mt-2 gap-2" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"} <ArrowRight size={16} weight="bold" />
          </Button>
        </form>

        {/* REGISTER CALLOUT */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">New institution?</span>
          <Link href="/register" className="font-bold text-primary hover:underline flex items-center gap-1">
            <span>Set up onboarding</span>
            <ArrowRight size={12} weight="bold" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-12">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: SIGN IN FORM (6 cols) */}
        <div className="lg:col-span-6 w-full space-y-5">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
              <GraduationCap size={22} weight="bold" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">Education OS</span>
          </Link>

          <Suspense fallback={<div className="p-6 text-center text-sm font-medium text-muted-foreground">Loading authentication...</div>}>
            <LoginContent />
          </Suspense>
        </div>

        {/* RIGHT COLUMN: EDITORIAL & PLATFORM VALUE (6 cols) */}
        <div className="lg:col-span-6 space-y-6 lg:pl-6 hidden lg:block">
          <div className="space-y-3">
            <Badge variant="outline" className="font-mono text-[10px] font-bold text-primary border-primary/30">
              ACADEMIC OPERATING SYSTEM
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Enterprise learning infrastructure built for modern institutions.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage courses, stream adaptive video classrooms, organize student cohorts, and track campus analytics in one unified platform.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-xs">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Laptop size={20} weight="bold" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Adaptive Video Classrooms</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Fast HLS video streaming, real-time synchronized notes, and assessment checkpoints.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-xs">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Buildings size={20} weight="bold" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Multi-Campus Administration</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Isolate student records across physical and online divisions with centralized governance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card shadow-xs">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <ShieldCheck size={20} weight="bold" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Tenant Isolation & Security</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dedicated schema scoping, encrypted storage, and role-based access control.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Check size={14} weight="bold" className="text-emerald-600" /> Multi-tenant
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} weight="bold" className="text-emerald-600" /> White-label themes
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} weight="bold" className="text-emerald-600" /> 99.9% Uptime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
