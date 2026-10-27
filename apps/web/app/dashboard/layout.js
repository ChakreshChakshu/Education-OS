"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TenantLogo } from "@/components/ui/tenant-logo";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { MobileAppBanner } from "@/components/dashboard/mobile-app-banner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { 
  GraduationCap, 
  SquaresFour, 
  BookOpen, 
  Users,
  Buildings,
  SignOut,
  Bell,
  Sun,
  Moon,
  Sidebar as SidebarIcon,
  CaretUpDown,
  Plus,
  Gear,
  ArrowUpRight,
  Globe,
  Check
} from "@phosphor-icons/react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, tenants, switchTenant, loading, notEnrolledInSubdomain, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [portalMode, setPortalMode] = useState("ADMIN");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
        setIsDark(false);
      } else {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      }

      const isStudentRole = user?.role === "STUDENT" || activeTenant?.role === "STUDENT";
      if (isStudentRole) {
        setPortalMode("STUDENT");
        localStorage.setItem("eos_portal_mode", "STUDENT");
      } else {
        const savedMode = localStorage.getItem("eos_portal_mode");
        if (savedMode) {
          setPortalMode(savedMode);
        } else {
          setPortalMode("ADMIN");
        }
      }
    }
  }, [user, activeTenant]);

  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // If user is visiting an institution subdomain where they are not enrolled:
  if (notEnrolledInSubdomain) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <LockSimple size={28} weight="bold" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-amber-400">403 · Access Restricted</span>
            <h2 className="text-2xl font-bold text-white">Enrollment Required</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You are signed in as <strong>{user.email}</strong>, but your account is not enrolled in <strong>{notEnrolledInSubdomain}</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20"
            >
              Browse & Enroll in Courses
            </Link>
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
            >
              Sign In with Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.remove("dark");
        localStorage.setItem("theme", "light");
        setIsDark(false);
      } else {
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
        setIsDark(true);
      }
    }
  };

  const togglePortalMode = () => {
    const next = portalMode === "ADMIN" ? "STUDENT" : "ADMIN";
    setPortalMode(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("eos_portal_mode", next);
      window.dispatchEvent(new CustomEvent("eos_portal_mode_change", { detail: next }));
    }
  };

  const navItems = portalMode === "STUDENT" ? [
    { name: "My Learning", href: "/dashboard", icon: GraduationCap },
    { name: "Course Catalog", href: "/dashboard/courses", icon: BookOpen },
    { name: "Settings & Profile", href: "/dashboard/settings", icon: Gear }
  ] : [
    { name: "Overview", href: "/dashboard", icon: SquaresFour },
    { name: "Course Manager", href: "/dashboard/courses", icon: BookOpen },
    { name: "Institutions & Branches", href: "/dashboard/tenants", icon: Buildings },
    { name: "Students & Cohorts", href: "/dashboard/students", icon: Users },
    { name: "Settings & Config", href: "/dashboard/settings", icon: Gear }
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-68" : "w-20"
        } border-r border-border bg-card flex flex-col transition-all duration-300 z-30`}
      >
        {/* Sidebar Header Branding - Full Horizontal Space */}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="flex-1 min-w-0 flex items-center overflow-hidden"
            title={activeTenant?.name || "Education OS"}
          >
            <TenantLogo
              tenant={activeTenant}
              size={sidebarOpen ? "full" : "sm"}
              className="w-full"
            />
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-accent shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <SidebarIcon size={18} />
          </button>
        </div>

        {/* Institution Switcher with shadcn DropdownMenu */}
        <div className={`p-3 border-b border-border ${sidebarOpen ? "" : "flex justify-center"}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {sidebarOpen ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-accent/40 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TenantLogo tenant={activeTenant} size="sm" showBadge />
                    <div className="min-w-0 pr-1">
                      <p className="text-xs font-bold truncate group-hover:text-primary transition-colors text-foreground">
                        {activeTenant?.name || "Institution Workspace"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {activeTenant?.branch || "Main Campus"}
                      </p>
                    </div>
                  </div>
                  <CaretUpDown size={14} className="text-muted-foreground shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  title={activeTenant?.name || "Switch Institution"}
                  className="p-1 rounded-xl hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
                >
                  <TenantLogo tenant={activeTenant} size="sm" showBadge />
                </button>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64" align={sidebarOpen ? "start" : "center"}>
              <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Institutional Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {tenants && tenants.length > 0 ? (
                  tenants.map((t) => {
                    const isActive = activeTenant?.id === t.id;
                    return (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => switchTenant(t)}
                        className="flex items-center justify-between gap-2.5 py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TenantLogo tenant={t} size="xs" />
                          <div className="truncate">
                            <p className="font-bold text-xs truncate text-foreground">{t.name}</p>
                            <span className="text-[10px] text-muted-foreground font-mono">{t.branch || "Campus"}</span>
                          </div>
                        </div>
                        {isActive && <Check size={14} weight="bold" className="text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <div className="p-2 text-xs text-muted-foreground">Default Workspace Active</div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/tenants" className="flex items-center gap-2 py-2 text-xs font-bold text-primary cursor-pointer">
                  <Plus size={14} weight="bold" />
                  <span>Manage Institutions</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground font-semibold"
                }`}
              >
                <Icon size={20} weight={active ? "bold" : "regular"} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Companion App Card */}
        {sidebarOpen && <MobileAppBanner />}

        {/* Sidebar Footer User Badge with DropdownMenu */}
        <div className="p-3 border-t border-border">
          {sidebarOpen ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {user?.name ? user.name.charAt(0) : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <p className="text-sm font-bold truncate leading-tight">{user?.name || "Administrator"}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                <SignOut size={16} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex justify-center p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
            >
              <SignOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
          <DashboardBreadcrumb tenant={activeTenant} pathname={pathname} />

          <div className="flex items-center gap-3">
            {/* Direct Link to Tenant's Public Course Website */}
            <Link
              href={`/t/${activeTenant?.slug || 'apex-main'}/courses`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors shadow-2xs"
              title="Preview this institution's public course website"
            >
              <Buildings size={14} className="text-primary" weight="bold" />
              <span>Public Portal</span>
              <ArrowUpRight size={13} weight="bold" />
            </Link>

            {/* Student Portal / Admin Mode Switcher - Only available to instructors & administrators */}
            {!(user?.role === "STUDENT" || activeTenant?.role === "STUDENT") && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePortalMode}
                className="text-xs font-bold gap-1.5 h-8.5 px-3 border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                {portalMode === "ADMIN" ? (
                  <>
                    <GraduationCap size={16} weight="bold" className="text-primary" />
                    <span className="hidden sm:inline">Student View</span>
                  </>
                ) : (
                  <>
                    <SquaresFour size={16} weight="bold" className="text-primary" />
                    <span className="hidden sm:inline">Admin View</span>
                  </>
                )}
              </Button>
            )}

            <Badge variant="outline" className="text-[11px] gap-1.5 py-1 px-3 font-mono font-bold border-border">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Neon Cloud Live</span>
            </Badge>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-accent transition-colors cursor-pointer flex items-center justify-center bg-card shadow-2xs"
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
            </button>

            <button className="p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-accent transition-colors cursor-pointer bg-card shadow-2xs">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
