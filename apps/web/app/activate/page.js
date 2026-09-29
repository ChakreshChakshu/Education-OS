"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiClient } from "@/lib/api";
import {
  GraduationCap,
  LockSimple,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  Eye,
  EyeSlash,
  Buildings,
  Sparkle
} from "@phosphor-icons/react";

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("Missing activation token in URL. Please check your invitation email or link.");
      setVerifying(false);
      return;
    }

    ApiClient.verifyActivationToken(token)
      .then((res) => {
        if (res.success) {
          setTokenData(res);
        } else {
          setTokenError(res.error || "Activation token is invalid or has expired.");
        }
      })
      .catch((err) => {
        setTokenError(err.message || "Failed to verify activation link.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.activateAccount({ token, password });
      if (res.success) {
        setActivatedSuccess(true);
        if (res.tenantId) {
          localStorage.setItem("eos_tenant_id", res.tenantId);
          if (res.tenants && res.tenants.length > 0) {
            const current = res.tenants.find((t) => t.tenantId === res.tenantId || t.id === res.tenantId) || res.tenants[0];
            localStorage.setItem("eos_tenant", JSON.stringify(current));
          }
        }
        setTimeout(() => {
          router.push("/dashboard/courses");
        }, 1200);
      } else {
        setSubmitError(res.error || "Activation failed. Please try again.");
      }
    } catch (err) {
      setSubmitError(err.message || "An unexpected error occurred during activation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/25 border border-primary/20 group-hover:scale-105 transition-all">
              <GraduationCap size={24} weight="fill" className="text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                EducationOS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                Student Portal
              </span>
            </div>
          </Link>
        </div>

        {verifying ? (
          <Card className="border-border shadow-xl rounded-2xl bg-card p-10 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Verifying activation invitation...</p>
            </div>
          </Card>
        ) : tokenError ? (
          <Card className="border-destructive/30 shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
                <WarningCircle size={32} weight="fill" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Invalid Activation Link</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full h-11 rounded-xl">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : activatedSuccess ? (
          <Card className="border-emerald-500/30 shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle size={32} weight="fill" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Welcome Aboard!</h3>
                <p className="text-xs text-muted-foreground">
                  Your student account is active. Entering your campus classroom now...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary">
                <Sparkle size={16} weight="fill" className="animate-pulse" />
                <span>Redirecting to courses...</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-border shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 py-1 px-2.5 text-xs font-semibold">
                  <Buildings size={14} weight="duotone" />
                  {tokenData?.tenantName || "Campus Portal"}
                </Badge>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Set Your Password
              </h2>
              <p className="text-xs text-muted-foreground">
                You've been invited to join <span className="font-semibold text-foreground">{tokenData?.tenantName}</span>. Choose a secure password to access your student dashboard.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-destructive text-xs">
                  <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Student identity read-only summary */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Student Account
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {tokenData?.name || "Student"}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {tokenData?.email}
                </Badge>
              </div>

              <form onSubmit={handleActivateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Create Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <LockSimple size={18} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="pl-10 pr-10 h-11 rounded-xl bg-background border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <LockSimple size={18} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="pl-10 h-11 rounded-xl bg-background border-border"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer transition-all"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>Activating Portal...</span>
                      </div>
                    ) : (
                      <>
                        <span>Activate & Enter Campus</span>
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="pt-2 border-t border-border text-center">
                <p className="text-[11px] text-muted-foreground">
                  Already have your permanent credentials?{" "}
                  <Link href="/login" className="text-primary font-semibold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function StudentActivationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
