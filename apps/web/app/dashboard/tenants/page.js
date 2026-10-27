"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TenantLogo } from "@/components/ui/tenant-logo";
import { 
  Buildings, 
  Plus, 
  Check, 
  Shield, 
  Users, 
  MapPin, 
  X, 
  Globe, 
  Gear, 
  Palette, 
  Sparkle, 
  GraduationCap,
  CalendarCheck
} from "@phosphor-icons/react";

const BRAND_PRESETS = [
  { name: "Indigo", hex: "#5b12ed" },
  { name: "Emerald", hex: "#059669" },
  { name: "Sapphire", hex: "#2563eb" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Slate", hex: "#475569" },
];

export default function TenantsPage() {
  const { activeTenant, tenants, switchTenant, addTenant, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Safeguard: Ensure unique tenants by ID to avoid React key collision
  const uniqueTenants = React.useMemo(() => {
    const seen = new Set();
    return (tenants || []).filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tenants]);

  const [tenantName, setTenantName] = useState("");
  const [slug, setSlug] = useState("");
  const [branchName, setBranchName] = useState("");
  const [academicTerm, setAcademicTerm] = useState("Spring 2026");
  const [selectedColor, setSelectedColor] = useState("#5b12ed");
  const [address, setAddress] = useState("");

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!tenantName || !slug) return;
    setLoading(true);

    try {
      const res = await ApiClient.createTenant({
        tenantName,
        slug,
        organizationName: branchName || "Main Campus"
      });

      if (res.success && res.data) {
        const tenantData = res.data.tenant || res.data;
        const tenantId = tenantData.id;

        const initialSettings = {
          branding: {
            primaryColor: selectedColor,
            tagline: `${tenantName} Academic Operations`,
            supportEmail: `support@${slug}.education-os.edu`,
            logoUrl: ""
          },
          campus: {
            branchName: branchName || "Main Campus",
            academicTerm: academicTerm || "Spring 2026",
            address: address || ""
          }
        };

        try {
          await ApiClient.updateTenantSettings({
            tenantId,
            name: tenantName,
            settingsJson: initialSettings
          });
        } catch (e) {
          console.warn("Could not save initial branding:", e);
        }

        const created = {
          id: tenantId || 'tenant_' + Date.now(),
          name: tenantData.name || tenantName,
          slug: tenantData.slug || slug,
          branch: branchName || "Main Campus",
          settings: initialSettings
        };

        if (addTenant) {
          addTenant(created);
        } else {
          switchTenant(created);
        }

        setIsModalOpen(false);
        setTenantName("");
        setSlug("");
        setBranchName("");
        setAddress("");
        setSelectedColor("#5b12ed");
      } else {
        alert("Tenant creation failed: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      alert("Tenant creation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeColor = activeTenant?.settings?.branding?.primaryColor || 
                      activeTenant?.settings?.primaryColor || 
                      "#5b12ed";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 md:p-8 rounded-3xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/40 text-primary bg-primary/5 uppercase">
              Multi-Tenant Architecture
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Neon PostgreSQL RLS
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Institution & Campus Operations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Manage multi-tenant institutional boundaries, campus branches, and brand color palettes synchronized in real-time.
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)} 
          size="sm" 
          className="gap-2 font-bold text-xs h-9.5 px-4 rounded-xl shrink-0 cursor-pointer shadow-xs"
        >
          <Plus size={16} weight="bold" /> Provision Campus Branch
        </Button>
      </div>

      {/* Active Context Banner */}
      {authLoading && !activeTenant ? (
        <Card className="p-6 md:p-7 border border-border/80 bg-card rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
          <div className="flex items-center gap-5 w-full">
            <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-36 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-xl" />
              </div>
              <Skeleton className="h-7 w-48 rounded-xl" />
              <Skeleton className="h-4 w-64 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-10 w-44 rounded-xl shrink-0" />
        </Card>
      ) : activeTenant && (
        <Card className="p-6 md:p-7 border border-primary/40 bg-gradient-to-r from-card via-card to-primary/5 rounded-3xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-xs">
          <div className="flex items-center gap-5 min-w-0">
            <TenantLogo tenant={activeTenant} size="xl" showBadge />
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                  CURRENT ACTIVE CONTEXT
                </Badge>
                <span 
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border"
                  style={{ 
                    borderColor: `${activeColor}50`, 
                    backgroundColor: `${activeColor}15`, 
                    color: activeColor 
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
                  {activeColor.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Globe size={13} /> https://{activeTenant.slug}.education-os.edu
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground truncate">{activeTenant.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-primary" /> Campus: <strong className="text-foreground">{activeTenant.settings?.campus?.branchName || activeTenant.branch || "Main Campus"}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CalendarCheck size={14} className="text-primary" /> Session: <strong className="text-foreground">{activeTenant.settings?.campus?.academicTerm || "Spring 2026"}</strong>
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9.5 px-4 rounded-xl shrink-0 cursor-pointer hover:bg-card border-border/80" asChild>
            <Link href="/dashboard/settings">
              <Gear size={16} weight="bold" /> Branding & Campus Settings
            </Link>
          </Button>
        </Card>
      )}

      {/* Tenant List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              Registered Institutions & Branches {authLoading && !uniqueTenants.length ? "" : `(${uniqueTenants.length})`}
            </h3>
            <p className="text-xs text-muted-foreground">Tenant isolated cloud storage with automatic schema routing</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono font-bold">
            Row Level Security Active
          </Badge>
        </div>

        {authLoading && !uniqueTenants.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5 rounded-3xl border-border/70 bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-40 rounded" />
                    <Skeleton className="h-3.5 w-28 rounded" />
                  </div>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {uniqueTenants.map((t) => {
            const isActive = activeTenant?.id === t.id;
            const tenantColor = t.settings?.branding?.primaryColor || t.settings?.primaryColor || "#5b12ed";
            const campusBranch = t.settings?.campus?.branchName || t.branch || "Main Campus";
            const term = t.settings?.campus?.academicTerm || "Spring 2026";

            return (
              <Card 
                key={t.id} 
                className={`p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between ${
                  isActive ? "border-primary/80 ring-2 ring-primary/20 bg-card" : "border-border/70 hover:border-primary/40 bg-card"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? "success" : "outline"} className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {isActive ? "ACTIVE CONTEXT" : "SEPARATE TENANT"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span 
                        className="h-2.5 w-2.5 rounded-full border border-black/10 shadow-2xs" 
                        style={{ backgroundColor: tenantColor }} 
                        title={`Brand color: ${tenantColor}`}
                      />
                      <span className="text-[11px] text-muted-foreground font-mono font-bold">/{t.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 mt-3.5">
                    <TenantLogo tenant={t} size="md" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold truncate text-foreground">
                        {t.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium truncate">
                        <MapPin size={13} className="shrink-0 text-primary" />
                        <span>{campusBranch}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{term}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 mt-2">
                  <div className="flex items-center justify-between text-xs py-2 border-t border-border/60">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-[11px]">
                      <Shield size={13} className="text-primary" /> Tenant Boundary
                    </span>
                    <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-[170px]">{t.id}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isActive ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Check size={16} weight="bold" /> Active Workspace
                        </span>
                        <Button variant="outline" size="sm" asChild className="gap-1.5 font-bold text-xs h-8 px-3 rounded-xl cursor-pointer border-border/80">
                          <Link href="/dashboard/settings">
                            <Palette size={14} weight="bold" />
                            <span>Branding</span>
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="font-bold text-xs h-8.5 rounded-xl cursor-pointer w-full hover:bg-muted" 
                        onClick={() => switchTenant(t)}
                      >
                        Switch to Workspace
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border p-6 pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Buildings size={20} className="text-primary" />
                  <span>Provision Campus Branch & Tenant</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Create isolated multi-tenant boundary, campus identity, and brand palette.
                </CardDescription>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-xl hover:bg-muted cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateTenant}>
              <CardContent className="space-y-4 p-6 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Institution / University Name</label>
                  <Input 
                    required 
                    placeholder="e.g. Oxford Institute of Technology" 
                    className="h-10 text-xs sm:text-sm font-medium rounded-xl" 
                    value={tenantName} 
                    onChange={(e) => setTenantName(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Subdomain Slug</label>
                    <Input 
                      required 
                      placeholder="oxford-tech" 
                      className="h-10 text-xs sm:text-sm font-mono font-bold rounded-xl" 
                      value={slug} 
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Campus Branch Name</label>
                    <Input 
                      placeholder="e.g. Main Campus, City Hub" 
                      className="h-10 text-xs sm:text-sm font-medium rounded-xl" 
                      value={branchName} 
                      onChange={(e) => setBranchName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Current Academic Term</label>
                    <Input 
                      placeholder="e.g. Spring 2026" 
                      className="h-10 text-xs sm:text-sm font-medium rounded-xl" 
                      value={academicTerm} 
                      onChange={(e) => setAcademicTerm(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Campus Address</label>
                    <Input 
                      placeholder="e.g. Building 2, Technology Corridor" 
                      className="h-10 text-xs sm:text-sm font-medium rounded-xl" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Primary Brand Color Selection */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground block">
                    Institutional Brand Color Palette
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {BRAND_PRESETS.map((p) => {
                      const isSelected = selectedColor.toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setSelectedColor(p.hex)}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30 bg-muted/50"
                              : "border-border hover:border-primary/40 bg-card"
                          }`}
                        >
                          <span className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: p.hex }} />
                          <span className="text-xs font-bold truncate">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="h-8 w-12 p-0.5 border border-border rounded-xl cursor-pointer bg-card"
                    />
                    <Input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="text-xs h-8 font-mono uppercase w-32 rounded-xl"
                    />
                    <span className="text-xs text-muted-foreground font-mono">Custom Hex</span>
                  </div>
                </div>
              </CardContent>

              <div className="flex justify-end gap-2.5 p-5 border-t border-border bg-muted/20 rounded-b-3xl">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="font-semibold text-xs h-9 rounded-xl cursor-pointer border-border/80" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="font-bold text-xs h-9 rounded-xl cursor-pointer shadow-xs" 
                  disabled={loading}
                >
                  {loading ? "Provisioning..." : "Provision Campus Branch"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
