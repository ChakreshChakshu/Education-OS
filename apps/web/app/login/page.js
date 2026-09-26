"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  GraduationCap, 
  EnvelopeSimple, 
  LockSimple, 
  ArrowRight, 
  CheckCircle, 
  WarningCircle, 
  Sparkle, 
  RocketLaunch 
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
        setError(res.error || "Invalid credentials");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-2xl rounded-3xl bg-card overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 border-b border-border bg-muted/20 text-center space-y-2">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Sign In to Education OS</h2>
        <p className="text-xs text-muted-foreground">Access your institutional portal, classroom player, and course catalog</p>
      </div>

      <CardContent className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2.5">
            <WarningCircle size={20} weight="bold" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle size={20} weight="bold" className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <EnvelopeSimple size={16} /> Official Email Address
            </label>
            <Input
              type="email"
              required
              placeholder="admin@institution.edu"
              className="h-12 text-sm rounded-xl font-medium"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LockSimple size={16} /> Password
              </label>
              <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot?</a>
            </div>
            <Input
              type="password"
              required
              placeholder="••••••••"
              className="h-12 text-sm rounded-xl font-medium"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>

          <Button type="submit" size="lg" className="w-full h-12 text-sm font-bold rounded-xl mt-3 gap-2" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Portal"} <ArrowRight size={16} weight="bold" />
          </Button>
        </form>

        {/* ONBOARDING CALLOUT BANNER */}
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 mt-6">
          <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
            <Sparkle size={16} weight="bold" />
            <span>New Institution or Academy?</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Provision a dedicated multi-tenant subdomain on Neon Postgres Cloud with customized logo, color palette studio, and campus branch.
          </p>
          <Link href="/register" className="block">
            <Button variant="outline" size="sm" className="w-full font-bold text-xs gap-2 border-primary/30 text-primary hover:bg-primary/10">
              <RocketLaunch size={16} weight="bold" />
              <span>Open Institution Onboarding Studio</span>
            </Button>
          </Link>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border text-[11px] font-mono text-muted-foreground py-3 bg-muted/20">
        Protected by EOS Multi-Tenant Domain Boundary Security
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
              <GraduationCap size={28} weight="bold" />
            </div>
            <span className="text-2xl font-black tracking-tight text-foreground">Education OS</span>
          </Link>
          <p className="text-xs text-muted-foreground font-mono">ENTERPRISE ACADEMIC GATEWAY</p>
        </div>

        {/* Auth Card wrapped in Suspense */}
        <Suspense fallback={<div className="p-6 text-center text-sm font-medium text-muted-foreground">Loading Auth Portal...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
