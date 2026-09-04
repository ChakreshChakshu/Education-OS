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
  Globe
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional Tenant Organizations</h1>
          <p className="text-sm text-muted-foreground">Manage multi-tenant isolation, branch campuses, and domain partitioning</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} /> Provision New Branch
        </Button>
      </div>

      {/* Tenant List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tenants.map((t) => {
          const isActive = activeTenant?.id === t.id;
          return (
            <Card key={t.id} className={`${isActive ? "border-primary shadow-md bg-accent/10" : "hover:border-primary/40"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isActive ? "default" : "outline"} className="text-[10px] font-mono">
                    {isActive ? "ACTIVE CONTEXT" : "SEPARATE TENANT"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">/{t.slug}</span>
                </div>
                <CardTitle className="text-xl font-bold mt-2 flex items-center gap-2">
                  <Buildings size={22} className="text-primary" /> {t.name}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-1">
                  <MapPin size={14} /> Branch: <span className="font-semibold text-foreground">{t.branch}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs py-2 border-t border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Shield size={14} /> Isolation Boundary</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {isActive ? (
                    <Badge variant="success" className="gap-1 py-1">
                      <Check size={14} /> Currently Selected
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => switchTenant(t)}>
                      Switch to Context
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-popover border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Provision Tenant Branch</CardTitle>
                <CardDescription>Create isolated tenant aggregate & default branch</CardDescription>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </CardHeader>
            <form onSubmit={handleCreateTenant}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Institution Name</label>
                  <Input required placeholder="Oxford Institute of Technology" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tenant Slug (Unique Domain Handle)</label>
                  <Input required placeholder="oxford-tech" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Default Branch Organization Name</label>
                  <Input placeholder="Main Campus" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                </div>
              </CardContent>
              <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/20">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
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
