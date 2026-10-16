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
  Sparkle,
  Check
} from "@phosphor-icons/react";

function ResetPasswordContent() {
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
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("Missing password reset token in URL. Please check your reset email or request a new link.");
      setVerifying(false);
      return;
    }

    ApiClient.verifyResetToken(token)
      .then((res) => {
        if (res.success) {
          setTokenData(res);
        } else {
          setTokenError(res.error || "Password reset link is invalid or has expired.");
        }
      })
      .catch((err) => {
        setTokenError(err.message || "Failed to verify reset link.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!hasMinLength) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.resetPassword({ token, password });
      if (res.success) {
        setResetSuccess(true);
        const emailRedirect = tokenData?.email ? `&email=${encodeURIComponent(tokenData.email)}` : "";
        setTimeout(() => {
          router.push(`/login?reset=success${emailRedirect}`);
        }, 2200);
      } else {
        setSubmitError(res.error || "Password reset failed. Please request a new reset link.");
      }
    } catch (err) {
      setSubmitError(err.message || "An unexpected error occurred while resetting password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand header */}
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
                Security Portal
              </span>
            </div>
          </Link>
        </div>

        {verifying ? (
          /* VERIFYING STATE */
          <Card className="border-border shadow-xl rounded-2xl bg-card p-10 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Verifying security token...</p>
            </div>
          </Card>
        ) : tokenError ? (
          /* INVALID / EXPIRED TOKEN STATE */
          <Card className="border-destructive/30 shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
                <WarningCircle size={32} weight="fill" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Invalid Reset Link</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Button asChild className="w-full h-11 rounded-xl font-bold">
                  <Link href="/forgot-password">Request a New Reset Link</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full h-10 rounded-xl text-xs font-semibold text-muted-foreground">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : resetSuccess ? (
          /* RESET SUCCESS STATE */
          <Card className="border-emerald-500/30 shadow-xl rounded-2xl bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle size={32} weight="fill" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Password Reset Successfully</h3>
                <p className="text-xs text-muted-foreground">
                  Your credentials have been securely updated. You can now access your account with your new password.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary">
                <Sparkle size={16} weight="fill" className="animate-pulse" />
                <span>Redirecting to sign in...</span>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full h-11 rounded-xl font-bold">
                  <Link href={`/login?reset=success${tokenData?.email ? `&email=${encodeURIComponent(tokenData.email)}` : ""}`}>
                    Sign In Now
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* SET NEW PASSWORD FORM STATE */
          <Card className="border-border shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 py-1 px-2.5 text-xs font-semibold">
                  <ShieldCheck size={14} weight="duotone" />
                  Verified Reset Link
                </Badge>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Set New Password
              </h2>
              <p className="text-xs text-muted-foreground">
                Create a strong, new password for your EducationOS account.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-destructive text-xs">
                  <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* User Account Info Pill */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Account
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {tokenData?.name || "EducationOS User"}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {tokenData?.email}
                </Badge>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <LockSimple size={18} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      autoFocus
                      className="pl-10 pr-10 h-11 rounded-xl bg-background border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <LockSimple size={18} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="pl-10 h-11 rounded-xl bg-background border-border"
                    />
                  </div>
                </div>

                {/* Password Strength Requirements Checklist */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] space-y-1.5 text-muted-foreground">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-semibold" : ""}`}>
                    <Check size={13} weight="bold" className={hasMinLength ? "text-emerald-600" : "text-muted-foreground/50"} />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLetter && hasNumber ? "text-emerald-600 font-semibold" : ""}`}>
                    <Check size={13} weight="bold" className={hasLetter && hasNumber ? "text-emerald-600" : "text-muted-foreground/50"} />
                    <span>Contains letters and numbers</span>
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}`}>
                      <Check size={13} weight="bold" className={passwordsMatch ? "text-emerald-600" : "text-muted-foreground/50"} />
                      <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting || !hasMinLength}
                    className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer transition-all"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="pt-2 border-t border-border text-center">
                <p className="text-[11px] text-muted-foreground">
                  Remember your old password?{" "}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
