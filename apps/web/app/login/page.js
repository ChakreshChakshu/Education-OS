"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  GraduationCap, 
  EnvelopeSimple, 
  LockSimple, 
  User, 
  Buildings,
  ArrowRight,
  CheckCircle,
  WarningCircle
} from "@phosphor-icons/react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const [tab, setTab] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regInstitutionName, setRegInstitutionName] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "register") setTab("register");
  }, [searchParams]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        setSuccess("Login successful! Redirecting...");
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await register(regName, regEmail, regPassword, regInstitutionName);
      if (res.success) {
        setSuccess(`Institution '${regInstitutionName || 'Academy'}' registered! Redirecting...`);
        setTimeout(() => router.push("/dashboard"), 600);
      } else {
        setError(res.error || "Registration failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-xl rounded-2xl bg-card">
      {/* Tab Buttons */}
      <div className="grid grid-cols-2 p-1.5 bg-muted/40 rounded-t-2xl border-b border-border text-center text-base font-bold">
        <button
          onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
          className={`py-3 rounded-xl transition-all cursor-pointer ${
            tab === "login"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
          className={`py-3 rounded-xl transition-all cursor-pointer ${
            tab === "register"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Register Institution
        </button>
      </div>

      <CardContent className="pt-6 px-6 md:px-8 space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold flex items-center gap-2.5">
            <WarningCircle size={20} weight="bold" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle size={20} weight="bold" />
            <span>{success}</span>
          </div>
        )}

        {tab === "login" ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <EnvelopeSimple size={16} /> Email Address
              </label>
              <Input
                type="email"
                required
                placeholder="admin@institution.edu"
                className="h-12 text-base rounded-xl"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LockSimple size={16} /> Password
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                className="h-12 text-base rounded-xl"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold rounded-xl mt-3 gap-2" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In to Portal"} <ArrowRight size={18} weight="bold" />
            </Button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Buildings size={16} /> Institution / University Name
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. SkillYards Academy or Delhi Public School"
                className="h-12 text-base rounded-xl"
                value={regInstitutionName}
                onChange={(e) => setRegInstitutionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User size={16} /> Full Administrator Name
              </label>
              <Input
                type="text"
                required
                placeholder="Dr. Eleanor Vance"
                className="h-12 text-base rounded-xl"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <EnvelopeSimple size={16} /> Official Email
              </label>
              <Input
                type="email"
                required
                placeholder="eleanor@university.edu"
                className="h-12 text-base rounded-xl"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LockSimple size={16} /> Password (Min 8 chars)
              </label>
              <Input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                className="h-12 text-base rounded-xl"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold rounded-xl mt-3 gap-2" disabled={loading}>
              {loading ? "Creating Institution..." : "Register Institution & Proceed"} <ArrowRight size={18} weight="bold" />
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border text-xs font-medium text-muted-foreground py-4">
        Protected by EOS Clean Domain Security Policy
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <GraduationCap size={28} weight="bold" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">Education OS</span>
          </Link>
          <p className="text-base text-muted-foreground font-medium">Enterprise Institution Portal Access</p>
        </div>

        {/* Auth Card wrapped in Suspense */}
        <Suspense fallback={<div className="p-6 text-center text-sm font-medium text-muted-foreground">Loading Auth Portal...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
