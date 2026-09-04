"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Buildings, 
  Plus, 
  Check, 
  Shield, 
  Users, 
  MapPin, 
  X,
  Globe,
  PlusCircle,
  Gear
} from "@phosphor-icons/react";

export default function TenantsPage() {
  const { activeTenant, tenants, switchTenant } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tenantName, setTenantName] = useState("");
  const [slug, setSlug] = useState("");
  const [branchName, setBranchName] = useState("");

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

      if (res.success) {
        const created = {
          id: res.data.tenant.id,
          name: res.data.tenant.name,
          slug: res.data.tenant.slug,
          branch: res.data.organization?.name || "Main Branch"
        };
        tenants.push(created);
        switchTenant(created);
        setIsModalOpen(false);
        setTenantName("");
        setSlug("");
        setBranchName("");
      }
    } catch (err) {
      alert("Tenant creation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Institution & Branch Provisioning</h1>
          <p className="text-base text-muted-foreground mt-1 font-medium">
            Manage multi-tenant institutional boundaries, campus branches, and subdomain slugs
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 font-bold px-6">
          <Plus size={20} weight="bold" /> Provision Campus Branch
        </Button>
      </div>

      {/* Active Context Banner */}
      {activeTenant && (
        <Card className="p-6 border-primary/50 bg-primary/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-2xl shrink-0">
              {activeTenant.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs font-bold px-2.5 py-0.5">CURRENTLY ACTIVE CONTEXT</Badge>
                <span className="text-xs font-mono text-muted-foreground">https://{activeTenant.slug}.education-os.edu</span>
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mt-1">{activeTenant.name}</h2>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin size={16} /> Campus Branch: <strong className="text-foreground">{activeTenant.branch || "Main Campus"}</strong>
              </p>
            </div>
          </div>
          <Button variant="outline" size="lg" className="gap-2 font-bold shrink-0">
            <Gear size={20} weight="bold" /> Institution Settings
          </Button>
        </Card>
      )}

      {/* Tenant List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">Registered Institutions & Branches ({tenants.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenants.map((t) => {
            const isActive = activeTenant?.id === t.id;
            return (
              <Card key={t.id} className={`p-2 transition-colors ${isActive ? "border-primary bg-card" : "hover:border-primary/50 bg-card"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? "success" : "outline"} className="text-xs font-bold px-2.5 py-0.5">
                      {isActive ? "ACTIVE CONTEXT" : "SEPARATE TENANT"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono font-bold">/{t.slug}</span>
                  </div>
                  <CardTitle className="text-2xl font-bold mt-2 flex items-center gap-3">
                    <Buildings size={28} className="text-primary" /> {t.name}
                  </CardTitle>
                  <CardDescription className="text-sm flex items-center gap-1.5 mt-1 font-medium">
                    <MapPin size={16} /> Campus: <span className="font-bold text-foreground">{t.branch || "Main Campus"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs py-3 border-t border-border/60">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Shield size={16} /> Isolation Boundary</span>
                    <span className="font-mono text-xs font-bold text-foreground">{t.id}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isActive ? (
                      <span className="text-sm font-bold text-success flex items-center gap-1.5">
                        <Check size={18} weight="bold" /> Active Institutional Workspace
                      </span>
                    ) : (
                      <Button variant="secondary" size="md" className="font-bold" onClick={() => switchTenant(t)}>
                        Switch to Workspace
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-popover border-border shadow-2xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-xl font-bold">Provision Campus Branch</CardTitle>
                <CardDescription className="text-sm">Create isolated multi-tenant boundary & campus branch</CardDescription>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                <X size={22} />
              </button>
            </CardHeader>
            <form onSubmit={handleCreateTenant}>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Institution Name</label>
                  <Input required placeholder="e.g. Oxford Institute of Technology" className="h-11 text-base font-bold" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Subdomain Slug</label>
                  <Input required placeholder="oxford-tech" className="h-11 text-base font-mono font-bold" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Branch / Campus Name</label>
                  <Input placeholder="Main Campus" className="h-11 text-base font-bold" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                </div>
              </CardContent>
              <div className="flex justify-end gap-3 p-5 border-t border-border bg-muted/20 rounded-b-2xl">
                <Button type="button" variant="outline" size="lg" className="font-semibold" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="lg" className="font-bold" disabled={loading}>
                  {loading ? "Provisioning..." : "Provision Branch"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
