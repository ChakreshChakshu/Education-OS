"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  User,
  ShieldCheck,
  Palette,
  Sliders,
  FloppyDisk,
  CheckCircle,
  WarningCircle,
  Buildings,
  Globe,
  Clock,
  Sparkle,
  LockKey,
  EnvelopeSimple,
  Phone,
  Sun,
  Moon,
  Desktop,
  ArrowSquareOut
} from "@phosphor-icons/react";

const BRAND_PALETTES = [
  { name: "Electric Indigo", hex: "#4f46e5" },
  { name: "Emerald Forest", hex: "#059669" },
  { name: "Royal Sapphire", hex: "#0284c7" },
  { name: "Warm Amber", hex: "#d97706" },
  { name: "Crimson Rose", hex: "#e11d48" },
  { name: "Slate Monochrome", hex: "#334155" }
];

export default function SettingsPage() {
  const { user, activeTenant, updateCurrentUser, updateActiveTenant } = useAuth();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    timezone: "UTC",
    language: "en",
    avatar: ""
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Tenant Branding State
  const [brandingForm, setBrandingForm] = useState({
    name: "",
    slug: "",
    primaryColor: "#4f46e5",
    tagline: "",
    supportEmail: "",
    logoUrl: ""
  });

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  // Initialize form states from auth context & API
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        language: user.language || "en",
        avatar: user.avatar || ""
      }));
    }

    // Fetch fresh user profile details
    ApiClient.getUserProfile().then((res) => {
      if (res?.success && res?.data) {
        setProfileForm((prev) => ({
          ...prev,
          name: res.data.name || prev.name,
          email: res.data.email || prev.email,
          phone: res.data.phone || "",
          timezone: res.data.timezone || prev.timezone,
          language: res.data.language || "en",
          avatar: res.data.avatar || ""
        }));
      }
    });

    // Fetch tenant settings
    ApiClient.getTenantSettings().then((res) => {
      if (res?.success && res?.data) {
        const settings = res.data.settingsJson || {};
        setBrandingForm({
          name: res.data.name || activeTenant?.name || "Institution Workspace",
          slug: res.data.slug || activeTenant?.slug || "academy",
          primaryColor: settings.primaryColor || "#4f46e5",
          tagline: settings.tagline || "Empowering institutional academic excellence",
          supportEmail: settings.supportEmail || "support@institution.edu",
          logoUrl: settings.logoUrl || ""
        });
      } else if (activeTenant) {
        setBrandingForm((prev) => ({
          ...prev,
          name: activeTenant.name || prev.name,
          slug: activeTenant.slug || prev.slug
        }));
      }
    });
  }, [user, activeTenant]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setStatusMessage(null);
    } else {
      setStatusMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setStatusMessage(null);
      setErrorMessage(null);
    }, 4500);
  };

  // 1. Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await ApiClient.updateUserProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        timezone: profileForm.timezone,
        language: profileForm.language,
        avatar: profileForm.avatar
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to update profile");
      }

      updateCurrentUser({
        name: profileForm.name,
        phone: profileForm.phone,
        timezone: profileForm.timezone,
        language: profileForm.language,
        avatar: profileForm.avatar
      });

      showNotification("Profile and preferences saved successfully");
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification("New password and confirmation do not match", true);
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showNotification("New password must be at least 8 characters long", true);
      return;
    }

    setSavingPassword(true);
    try {
      const res = await ApiClient.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to change password");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      showNotification("Password rotated successfully. Active session renewed.");
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingPassword(false);
    }
  };

  // 3. Handle Tenant Branding Save
  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const res = await ApiClient.updateTenantSettings({
        name: brandingForm.name,
        settingsJson: {
          primaryColor: brandingForm.primaryColor,
          tagline: brandingForm.tagline,
          supportEmail: brandingForm.supportEmail,
          logoUrl: brandingForm.logoUrl
        }
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to update tenant branding");
      }

      if (activeTenant) {
        updateActiveTenant({
          ...activeTenant,
          name: brandingForm.name
        });
      }

      showNotification("Institutional branding & workspace parameters published");
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Settings & Configurations
            </h1>
            <Badge variant="outline" className="font-mono text-[11px] font-bold py-0.5">
              Enterprise v2026.1
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your personal credentials, communication preferences, and institutional workspace identity.
          </p>
        </div>

        {/* Status notification toast */}
        {statusMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle size={16} weight="bold" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold animate-in fade-in duration-200">
            <WarningCircle size={16} weight="bold" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1.5 bg-muted/50 rounded-2xl border border-border">
          <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5">
            <User size={16} weight="bold" />
            <span>Profile & Account</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
            <ShieldCheck size={16} weight="bold" />
            <span>Security & Auth</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 py-2.5">
            <Palette size={16} weight="bold" />
            <span>Branding & Campus</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 py-2.5">
            <Sliders size={16} weight="bold" />
            <span>Preferences</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Profile & Account */}
        <TabsContent value="profile">
          <form onSubmit={handleProfileSubmit}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  <span>Personal Profile</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Your identity details appear across course rosters, student feedback threads, and certificates.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Avatar preview and input */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                  <Avatar className="h-16 w-16 border-2 border-border shadow-xs">
                    {profileForm.avatar ? (
                      <AvatarImage src={profileForm.avatar} alt={profileForm.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                      {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">Avatar Image URL</p>
                    <Input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Square JPG/PNG image URL or leave blank to display initials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User size={14} /> Full Name
                    </label>
                    <Input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <EnvelopeSimple size={14} /> Email Address
                      </span>
                      <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase">
                        Verified Primary
                      </span>
                    </label>
                    <Input
                      type="email"
                      disabled
                      value={profileForm.email}
                      className="text-xs h-10 bg-muted/40 cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Phone size={14} /> Contact Phone
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock size={14} /> Timezone
                    </label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST +9:00)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </select>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end border-t border-border pt-4">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="font-bold text-xs gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{savingProfile ? "Saving..." : "Save Profile Changes"}</span>
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 2: Security & Credentials */}
        <TabsContent value="security">
          <form onSubmit={handlePasswordSubmit}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" />
                  <span>Security & Authentication</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage your account credentials, encryption standards, and active authentication tokens.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-1.5 max-w-md">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <LockKey size={14} /> Current Password
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="text-xs h-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">New Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="At least 8 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Confirm New Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="text-xs h-10"
                    />
                  </div>
                </div>

                {/* Password strength advice */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-2 max-w-2xl">
                  <p className="font-bold text-foreground">Password & Session Policy</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside text-[11px]">
                    <li>Minimum 8 characters with a mix of numbers and letters.</li>
                    <li>Passwords are salted and securely hashed using Bcrypt (10 rounds).</li>
                    <li>Changing your password will maintain your current session with refreshed tokens.</li>
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end border-t border-border pt-4">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="font-bold text-xs gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <LockKey size={16} weight="bold" />
                  <span>{savingPassword ? "Rotating Password..." : "Update Password"}</span>
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 3: Institutional Branding & Workspace */}
        <TabsContent value="branding">
          <form onSubmit={handleBrandingSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form inputs column */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Buildings size={18} className="text-primary" />
                      <span>Workspace Identity & Custom Theme</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Brand colors, institutional naming, and portal styling applied to the active tenant workspace.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Institution Display Name</label>
                        <Input
                          type="text"
                          required
                          value={brandingForm.name}
                          onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                          className="text-xs h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Tenant Subdomain</span>
                          <span className="text-[10px] text-muted-foreground font-mono">Immutable ID</span>
                        </label>
                        <div className="flex items-center">
                          <Input
                            disabled
                            value={brandingForm.slug}
                            className="text-xs h-10 font-mono bg-muted/40 cursor-not-allowed opacity-80"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Institutional Tagline</label>
                      <Input
                        type="text"
                        placeholder="e.g. Next-Generation Engineering Institute"
                        value={brandingForm.tagline}
                        onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                        className="text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Support & Inquiries Email</label>
                      <Input
                        type="email"
                        placeholder="support@yourinstitution.edu"
                        value={brandingForm.supportEmail}
                        onChange={(e) => setBrandingForm({ ...brandingForm, supportEmail: e.target.value })}
                        className="text-xs h-10"
                      />
                    </div>

                    {/* Color Palette Selection */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Brand Accent Color</span>
                        <span className="font-mono text-xs font-bold text-primary">{brandingForm.primaryColor}</span>
                      </label>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                        {BRAND_PALETTES.map((p) => {
                          const isSelected = brandingForm.primaryColor.toLowerCase() === p.hex.toLowerCase();
                          return (
                            <button
                              key={p.hex}
                              type="button"
                              onClick={() => setBrandingForm({ ...brandingForm, primaryColor: p.hex })}
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-primary ring-2 ring-primary/20 bg-accent/40 shadow-xs"
                                  : "border-border hover:border-primary/40 bg-card"
                              }`}
                            >
                              <span
                                className="h-6 w-6 rounded-full shadow-2xs block"
                                style={{ backgroundColor: p.hex }}
                              />
                              <span className="text-[10px] font-bold truncate max-w-full">{p.name.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                          className="h-9 w-12 p-0.5 border border-border rounded-lg cursor-pointer shrink-0"
                        />
                        <Input
                          type="text"
                          value={brandingForm.primaryColor}
                          onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                          className="text-xs h-9 font-mono uppercase"
                          placeholder="#4F46E5"
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="submit"
                      disabled={savingBranding}
                      className="font-bold text-xs gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <FloppyDisk size={16} weight="bold" />
                      <span>{savingBranding ? "Publishing..." : "Save Workspace Branding"}</span>
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Live Preview Column */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Sparkle size={16} className="text-primary" />
                      <span className="text-xs font-bold text-foreground">Live Portal Preview</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Student View
                    </Badge>
                  </div>

                  {/* Render Mock Student Portal Card with live colors */}
                  <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                        style={{ backgroundColor: brandingForm.primaryColor }}
                      >
                        {brandingForm.name.charAt(0) || "E"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-foreground">
                          {brandingForm.name || "Institution Name"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {brandingForm.slug}.educationos.com
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                        style={{
                          backgroundColor: `${brandingForm.primaryColor}20`,
                          color: brandingForm.primaryColor
                        }}
                      >
                        Active Course
                      </span>
                      <p className="text-xs font-extrabold text-foreground leading-tight">
                        Advanced Distributed Systems & Microservices
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span>Module 3 of 12</span>
                        <span className="font-bold">45% Completed</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: "45%", backgroundColor: brandingForm.primaryColor }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 px-3 rounded-lg text-white font-bold text-xs shadow-xs transition-opacity hover:opacity-95"
                      style={{ backgroundColor: brandingForm.primaryColor }}
                    >
                      Continue Learning
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Student course dashboards, player accents, and institutional email notifications inherit this brand primary color.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 4: Preferences & System */}
        <TabsContent value="system">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders size={18} className="text-primary" />
                <span>System & Infrastructure Diagnostics</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Platform deployment topology, database connection, and localized UI settings.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Architecture specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Database</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Neon PostgreSQL Cloud</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">ACID Transaction Isolation</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Media Engine</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Cloudflare R2 + HLS</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">360p / 720p / 1080p ABR</p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Outbox Queue</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Postgres Row-Locked Queue</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">SKIP LOCKED Concurrency</p>
                </div>
              </div>

              {/* Documentation links */}
              <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Architecture Reference Documentation</p>
                  <p className="text-[11px] text-muted-foreground">
                    Read complete Clean Architecture, DDD bounded contexts, and API reference guides.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="font-bold text-xs gap-1.5 cursor-pointer shrink-0"
                >
                  <a href="/docs" target="_blank" rel="noreferrer">
                    <span>Architecture Docs</span>
                    <ArrowSquareOut size={14} />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
