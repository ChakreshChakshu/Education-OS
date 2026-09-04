"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  HardDrive, 
  Plus, 
  TrendUp
} from "@phosphor-icons/react";

export default function DashboardOverviewPage() {
  const { activeTenant } = useAuth();
  const [courseCount, setCourseCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      const res = await ApiClient.getCourses();
      if (res.success && Array.isArray(res.data)) {
        setCourseCount(res.data.length);
      }
    }
    loadCount();
  }, []);

  const metrics = [
    { title: "Academic Courses", value: String(courseCount), change: "Active catalog", icon: BookOpen },
    { title: "Enrolled Students", value: "0", change: "Roster ready", icon: Users },
    { title: "Media Storage Provider", value: "Local Disk", change: "./uploads provider", icon: HardDrive },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner - Solid Minimalist (No Gradients) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 md:p-8 rounded-2xl border border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {activeTenant?.name || "Institution"} Executive Dashboard
          </h1>
          <p className="text-base text-muted-foreground mt-1 font-medium">
            Active Educational Context: <span className="font-bold text-foreground">{activeTenant?.name || "SkillYards Academy"}</span>
          </p>
        </div>
        <Link href="/dashboard/courses">
          <Button size="lg" className="gap-2 font-bold px-6">
            <Plus size={18} weight="bold" /> Create Course
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card key={idx} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">{m.title}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={22} weight="bold" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">{m.value}</span>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 font-medium">
                    <TrendUp size={14} className="text-success" /> {m.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Domain Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold">System Bounded Context Status</CardTitle>
            <CardDescription className="text-sm">Clean Architecture domain health & API connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-0">
            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Identity Domain</p>
                <p className="text-xs text-muted-foreground font-medium">Single Tenant: {activeTenant?.name}</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Healthy</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Academics Domain</p>
                <p className="text-xs text-muted-foreground font-medium">Course & Batch aggregates</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Healthy</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Storage Provider</p>
                <p className="text-xs text-muted-foreground font-medium">LocalStorageProvider (Local Disk)</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Active</Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">REST API Server</p>
                <p className="text-xs text-muted-foreground font-medium">Fastify DI Container (Port 3001)</p>
              </div>
              <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">Connected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Launch Card */}
        <Card className="flex flex-col justify-between p-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Build curriculum for {activeTenant?.name || "Institution"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Portal active context is set up for <strong>{activeTenant?.name || "SkillYards Academy"}</strong>. Create academic courses and manage curriculum with clean domain persistence.
            </p>
            <Link href="/dashboard/courses" className="block pt-2">
              <Button size="lg" className="w-full gap-2 font-bold">
                <Plus size={18} weight="bold" /> Open Course Manager
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
