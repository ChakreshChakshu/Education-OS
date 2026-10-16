"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiClient } from "@/lib/api";
import {
  GraduationCap,
  EnvelopeSimple,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  PaperPlaneTilt,
  ShieldCheck,
  Sparkle
} from "@phosphor-icons/react";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devResetUrl, setDevResetUrl] = useState("");
  const [mailError, setMailError] = useState("");
  const [devWarning, setDevWarning] = useState("");

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMailError("");
    setDevWarning("");
    setDevResetUrl("");
    setLoading(true);

    try {
      const res = await ApiClient.forgotPassword(email.trim());
      if (res.success) {
        setSubmittedEmail(email.trim());
        setSuccess(true);
        setCountdown(60);
        if (res.devResetUrl) setDevResetUrl(res.devResetUrl);
        if (res.mailError) setMailError(res.mailError);
        if (res.devWarning) setDevWarning(res.devWarning);
      } else {
        setError(res.error || "Failed to process password reset request. Please check your email.");
      }
    } catch (err) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await ApiClient.forgotPassword(submittedEmail);
      if (res.success) {
        setCountdown(60);
        if (res.devResetUrl) setDevResetUrl(res.devResetUrl);
        if (res.mailError) setMailError(res.mailError);
        if (res.devWarning) setDevWarning(res.devWarning);
      } else {
        setError(res.error || "Failed to resend reset link.");
      }
    } catch (err) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo Header */}
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
                Account Recovery
              </span>
            </div>
          </Link>
        </div>

        {success ? (
          /* SUCCESS STATE */
          <Card className="border-border shadow-xl rounded-2xl bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                <PaperPlaneTilt size={32} weight="duotone" className="animate-bounce" />
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold gap-1.5 py-1 px-3">
                  <CheckCircle size={14} weight="bold" />
                  Reset Link Dispatched
                </Badge>
                <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Check your email
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  We've sent a password reset link to{" "}
                  <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2">
                    {submittedEmail}
                  </span>.
                  Click the link in the message to choose a new password.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2.5 text-left">
                  <WarningCircle size={18} weight="bold" className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {devWarning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <WarningCircle size={15} weight="bold" />
                    <span>Account Notice</span>
                  </div>
                  <p>{devWarning}</p>
                </div>
              )}

              {mailError && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs text-left space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <WarningCircle size={15} weight="bold" />
                    <span>Resend Sandbox Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Resend default test sender (<code className="font-mono bg-amber-500/20 px-1 rounded">onboarding@resend.dev</code>) only delivers emails to the Resend account owner (<code className="font-mono bg-amber-500/20 px-1 rounded">sharma.ankush9193@gmail.com</code>) until a custom domain is verified.
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">
                    You can test your reset link directly below:
                  </p>
                </div>
              )}

              {devResetUrl && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-left space-y-2">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                    Instant Development Link
                  </span>
                  <Button asChild className="w-full h-10 rounded-xl text-xs font-bold gap-2">
                    <Link href={devResetUrl}>
                      <span>Open Reset Password Page</span>
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                  </Button>
                </div>
              )}

              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground text-left space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                  <ShieldCheck size={16} className="text-primary" weight="bold" />
                  Security Notice
                </div>
                <p>• The reset link remains valid for <strong>1 hour</strong>.</p>
                <p>• If you do not see the message, check your spam or junk folder.</p>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer transition-all"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : countdown > 0 ? (
                    <span>Resend available in {countdown}s</span>
                  ) : (
                    <>
                      <Sparkle size={15} weight="bold" className="text-primary" />
                      <span>Resend reset email</span>
                    </>
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full h-10 rounded-xl text-xs font-bold gap-2 text-muted-foreground hover:text-foreground">
                  <Link href="/login">
                    <ArrowLeft size={14} weight="bold" />
                    <span>Return to sign in</span>
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* FORM STATE */
          <Card className="border-border shadow-xl rounded-2xl bg-card overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-border space-y-1.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Reset your password
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your work or institution email address and we'll send you a secure link to set a new password.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                  <WarningCircle size={18} weight="bold" className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-2">
                    <EnvelopeSimple size={15} className="text-muted-foreground" /> Work email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="name@institution.edu"
                    className="h-11 text-sm rounded-xl font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">
                    We'll never share your email with anyone else.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-11 text-sm font-bold rounded-xl mt-2 gap-2 shadow-md shadow-primary/20 cursor-pointer transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Sending reset link...</span>
                    </div>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight size={16} weight="bold" />
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Remember your password?</span>
                <Link href="/login" className="font-bold text-primary hover:underline flex items-center gap-1">
                  <span>Sign in</span>
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
