"use client";

import React, { useState, useEffect } from "react";
import { useAuth, applyTenantTheme } from "@/providers/auth-context";
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
  { name: "Electric Indigo", hex: "#5b12ed", label: "Default" },
  { name: "Emerald Forest", hex: "#059669", label: "Growth" },
  { name: "Royal Sapphire", hex: "#0284c7", label: "Academic" },
  { name: "Deep Ocean Navy", hex: "#0f62fe", label: "Enterprise" },
  { name: "Crimson Rose", hex: "#e11d48", label: "Prestigious" },
  { name: "Warm Amber", hex: "#d97706", label: "Executive" },
  { name: "Violet Twilight", hex: "#7c3aed", label: "Creative" },
  { name: "Slate Monochrome", hex: "#334155", label: "Minimal" }
];

export default function SettingsPage() {
  const { user, activeTenant, updateCurrentUser, updateActiveTenant } = useAuth();

  // Role detection: Students must never access campus branding or system diagnostics
  const isStudentRole = user?.role === "STUDENT" || activeTenant?.role === "STUDENT";
  const [portalMode, setPortalMode] = useState(isStudentRole ? "STUDENT" : "ADMIN");
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mode = localStorage.getItem("eos_portal_mode");
      if (mode && !isStudentRole) {
        setPortalMode(mode);
      }
    }
  }, [isStudentRole]);

  const isStudent = isStudentRole || portalMode === "STUDENT";

  useEffect(() => {
    if (isStudent && (activeTab === "branding" || activeTab === "system")) {
      setActiveTab("profile");
    }
  }, [isStudent, activeTab]);

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

  // Tenant Branding & Campus State
  const [brandingForm, setBrandingForm] = useState({
    name: "",
    slug: "",
    branchName: "Main Campus",
    address: "",
    academicTerm: "Spring 2026",
    primaryColor: "#5b12ed",
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

    // Fetch tenant settings & campus parameters
    ApiClient.getTenantSettings().then((res) => {
      if (res?.success && res?.data) {
        const settings = res.data.settingsJson || {};
        const branding = settings.branding || {};
        const campus = settings.campus || {};
        const color = branding.primaryColor || settings.primaryColor || "#5b12ed";
        setBrandingForm({
          name: res.data.name || activeTenant?.name || "Institution Workspace",
          slug: res.data.slug || activeTenant?.slug || "academy",
          branchName: campus.branchName || settings.branch || activeTenant?.branch || "Main Campus",
          address: campus.address || "",
          academicTerm: campus.academicTerm || "Spring 2026",
          primaryColor: color,
          tagline: branding.tagline || settings.tagline || "Empowering institutional academic excellence",
          supportEmail: branding.supportEmail || settings.supportEmail || "support@institution.edu",
          logoUrl: branding.logoUrl || settings.logoUrl || ""
        });
      } else if (activeTenant) {
        setBrandingForm((prev) => ({
          ...prev,
          name: activeTenant.name || prev.name,
          slug: activeTenant.slug || prev.slug,
          branchName: activeTenant.branch || prev.branchName
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

  const handleColorSelect = (hex) => {
    setBrandingForm((prev) => ({ ...prev, primaryColor: hex }));
    applyTenantTheme(hex);
  };

  // 3. Handle Tenant Branding & Campus Settings Save
  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const payload = {
        name: brandingForm.name.trim(),
        settingsJson: {
          primaryColor: brandingForm.primaryColor,
          branch: brandingForm.branchName.trim(),
          branding: {
            primaryColor: brandingForm.primaryColor,
            tagline: brandingForm.tagline.trim(),
            supportEmail: brandingForm.supportEmail.trim(),
            logoUrl: brandingForm.logoUrl.trim()
          },
          campus: {
            branchName: brandingForm.branchName.trim(),
            address: brandingForm.address.trim(),
            academicTerm: brandingForm.academicTerm.trim(),
            timezone: profileForm.timezone || "UTC"
          }
        }
      };

      const res = await ApiClient.updateTenantSettings(payload);

      if (!res?.success) {
        throw new Error(res?.error || "Failed to update tenant branding");
      }

      if (activeTenant) {
        updateActiveTenant({
          ...activeTenant,
          name: brandingForm.name.trim(),
          branch: brandingForm.branchName.trim(),
          settings: payload.settingsJson
        });
      }

      applyTenantTheme(brandingForm.primaryColor);
      showNotification("Institutional branding & campus configuration published successfully");
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
            {isStudent
              ? "Manage your personal credentials, contact details, and account security."
              : "Manage your personal credentials, communication preferences, and institutional workspace identity."}
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className={`grid ${isStudent ? "grid-cols-2 max-w-lg mx-auto" : "grid-cols-2 md:grid-cols-4"} w-full h-auto p-1.5 bg-muted/50 rounded-2xl border border-border`}>
          <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5">
            <User size={16} weight="bold" />
            <span>Profile & Account</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
            <ShieldCheck size={16} weight="bold" />
            <span>Security & Auth</span>
          </TabsTrigger>
          {!isStudent && (
            <>
              <TabsTrigger value="branding" className="flex items-center gap-2 py-2.5">
                <Palette size={16} weight="bold" />
                <span>Branding & Campus</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2 py-2.5">
                <Sliders size={16} weight="bold" />
                <span>Preferences</span>
              </TabsTrigger>
            </>
          )}
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

        {/* Faculty/Admin Only Settings */}
        {!isStudent && (
          <>
            <TabsContent value="branding">
              <form onSubmit={handleBrandingSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Form inputs column (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Card 1: Campus Identity & Operations */}
                    <Card className="border-border shadow-xs">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                          <Buildings size={20} className="text-primary" />
                          <span>Campus Identity & Operations</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                          Institutional naming, branch designation, and academic scheduling parameters.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground">Institution Name</label>
                            <Input
                              type="text"
                              required
                              value={brandingForm.name}
                              onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                              className="text-xs sm:text-sm h-10"
                              placeholder="e.g. SkillYards Academy"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground flex items-center justify-between">
                              <span>Tenant Subdomain</span>
                              <span className="text-xs text-muted-foreground font-mono">Immutable</span>
                            </label>
                            <Input
                              disabled
                              value={brandingForm.slug}
                              className="text-xs sm:text-sm h-10 font-mono bg-muted/40 cursor-not-allowed opacity-80"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground">Campus / Branch Name</label>
                            <Input
                              type="text"
                              value={brandingForm.branchName}
                              onChange={(e) => setBrandingForm({ ...brandingForm, branchName: e.target.value })}
                              className="text-xs sm:text-sm h-10"
                              placeholder="e.g. Main Campus, Tech Park Branch"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground">Current Academic Term</label>
                            <Input
                              type="text"
                              value={brandingForm.academicTerm}
                              onChange={(e) => setBrandingForm({ ...brandingForm, academicTerm: e.target.value })}
                              className="text-xs sm:text-sm h-10 font-mono"
                              placeholder="e.g. Spring 2026"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-bold text-foreground">Campus Physical Location</label>
                          <Input
                            type="text"
                            placeholder="e.g. Building 4, University Innovation Center, Tech Corridor"
                            value={brandingForm.address}
                            onChange={(e) => setBrandingForm({ ...brandingForm, address: e.target.value })}
                            className="text-xs sm:text-sm h-10"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card 2: Visual Branding & Assets */}
                    <Card className="border-border shadow-xs">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                          <Palette size={20} className="text-primary" />
                          <span>Visual Branding & Assets</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                          Institutional logo, brand tagline, and public support contact.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-bold text-foreground">Campus Logo Image URL</label>
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border border-border overflow-hidden shadow-xs"
                              style={{ backgroundColor: `${brandingForm.primaryColor}15` }}
                            >
                              {brandingForm.logoUrl ? (
                                <img
                                  src={brandingForm.logoUrl}
                                  alt="Campus Logo"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <span className="font-extrabold text-base" style={{ color: brandingForm.primaryColor }}>
                                  {brandingForm.name ? brandingForm.name.charAt(0).toUpperCase() : "E"}
                                </span>
                              )}
                            </div>
                            <Input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={brandingForm.logoUrl}
                              onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                              className="text-xs sm:text-sm h-10 font-mono flex-1"
                            />
                            {brandingForm.logoUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setBrandingForm({ ...brandingForm, logoUrl: "" })}
                                className="text-xs text-muted-foreground hover:text-foreground h-10 px-2.5"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Square PNG or SVG with transparent background recommended.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground">Institutional Tagline</label>
                            <Input
                              type="text"
                              placeholder="e.g. Next-Generation Engineering Institute"
                              value={brandingForm.tagline}
                              onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                              className="text-xs sm:text-sm h-10"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-bold text-foreground">Support & Inquiries Email</label>
                            <Input
                              type="email"
                              placeholder="support@yourinstitution.edu"
                              value={brandingForm.supportEmail}
                              onChange={(e) => setBrandingForm({ ...brandingForm, supportEmail: e.target.value })}
                              className="text-xs sm:text-sm h-10"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card 3: Color Palette Selection */}
                    <Card className="border-border shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                            <Sparkle size={20} className="text-primary" />
                            <span>Institutional Color Palette</span>
                          </CardTitle>
                          <span 
                            className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg border shadow-2xs"
                            style={{ 
                              borderColor: `${brandingForm.primaryColor}50`, 
                              backgroundColor: `${brandingForm.primaryColor}15`, 
                              color: brandingForm.primaryColor 
                            }}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brandingForm.primaryColor }} />
                            <span>{brandingForm.primaryColor.toUpperCase()}</span>
                          </span>
                        </div>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Selecting a palette immediately adapts your buttons, active links, and classroom player accents in real-time.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {BRAND_PALETTES.map((p) => {
                            const isSelected = brandingForm.primaryColor.toLowerCase() === p.hex.toLowerCase();
                            return (
                              <button
                                key={p.hex}
                                type="button"
                                onClick={() => handleColorSelect(p.hex)}
                                className={`p-3 rounded-xl border flex flex-col items-start gap-2 transition-all cursor-pointer text-left ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary/30 bg-muted/60 shadow-sm"
                                    : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span
                                    className="h-6 w-6 rounded-full shadow-xs shrink-0 border border-black/10"
                                    style={{ backgroundColor: p.hex }}
                                  />
                                  {isSelected && <CheckCircle size={16} weight="fill" className="text-primary" />}
                                </div>
                                <div className="min-w-0 w-full">
                                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">{p.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{p.label}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Color Input */}
                        <div className="pt-2 border-t border-border">
                          <label className="text-xs sm:text-sm font-bold text-foreground block mb-2">Custom Brand Hex</label>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                value={brandingForm.primaryColor}
                                onChange={(e) => handleColorSelect(e.target.value)}
                                className="h-10 w-14 p-1 border border-border rounded-xl cursor-pointer bg-card"
                              />
                            </div>
                            <Input
                              type="text"
                              value={brandingForm.primaryColor}
                              onChange={(e) => handleColorSelect(e.target.value)}
                              className="text-xs sm:text-sm h-10 font-mono uppercase w-36"
                              placeholder="#5B12ED"
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              Instant live preview active
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="flex justify-end border-t border-border pt-4">
                        <Button
                          type="submit"
                          disabled={savingBranding}
                          className="font-bold text-xs sm:text-sm h-10 px-5 gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
                        >
                          <FloppyDisk size={18} weight="bold" />
                          <span>{savingBranding ? "Publishing to Neon Cloud..." : "Save Workspace Branding"}</span>
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* Live Preview Column (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-5 sticky top-6">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Sparkle size={18} className="text-primary" />
                          <span className="text-sm font-bold text-foreground">Live Tenant Preview</span>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono font-bold">
                          Adaptive UI
                        </Badge>
                      </div>

                      {/* Mock Sidebar Header */}
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Navigation Header
                        </span>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0 overflow-hidden"
                            style={{ backgroundColor: brandingForm.primaryColor }}
                          >
                            {brandingForm.logoUrl ? (
                              <img src={brandingForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <span>{brandingForm.name.charAt(0) || "E"}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold truncate text-foreground">
                              {brandingForm.name || "Institution Name"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate font-mono">
                              {brandingForm.branchName || "Main Campus"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mock Student Learning Course Card */}
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Classroom Course Card
                        </span>
                        <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-block"
                              style={{
                                backgroundColor: `${brandingForm.primaryColor}20`,
                                color: brandingForm.primaryColor
                              }}
                            >
                              IN PROGRESS
                            </span>
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              {brandingForm.academicTerm || "Spring 2026"}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm font-extrabold text-foreground leading-snug">
                            {brandingForm.tagline || "Advanced Distributed Systems & Microservices"}
                          </p>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-muted-foreground">Syllabus Progress</span>
                              <span style={{ color: brandingForm.primaryColor }} className="font-mono">
                                68%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: "68%", backgroundColor: brandingForm.primaryColor }}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-lg text-white font-bold text-xs sm:text-sm shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
                            style={{ backgroundColor: brandingForm.primaryColor }}
                          >
                            Continue Learning
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                        <p className="font-semibold text-foreground mb-0.5">Direct Cloud Sync</p>
                        Publishing updates this tenant in Neon PostgreSQL. All enrolled students and faculty immediately inherit this branding.
                      </div>
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
      </>
    )}
  </Tabs>
    </div>
  );
}
