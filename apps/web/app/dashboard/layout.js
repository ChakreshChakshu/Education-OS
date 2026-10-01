"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Check,
  Gear
} from "@phosphor-icons/react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, tenants, switchTenant, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [portalMode, setPortalMode] = useState("ADMIN");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);

      const isStudentRole = user?.role === "STUDENT" || activeTenant?.role === "STUDENT";
      const savedMode = localStorage.getItem("eos_portal_mode");
      if (savedMode) {
        setPortalMode(savedMode);
      } else if (isStudentRole) {
        setPortalMode("STUDENT");
      } else {
        setPortalMode("ADMIN");
      }
    }
  }, [user, activeTenant]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
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

  const getBreadcrumbs = (path) => {
    if (!path || path === "/dashboard") {
      return [{ label: "Overview", href: "/dashboard" }];
    }

    const clean = path.replace(/^\/dashboard\/?/, "");
    const parts = clean.split("/").filter(Boolean);

    // If inside classroom: courses/[id]/lesson/[lessonId]
    if (parts[0] === "courses" && parts.includes("lesson")) {
      const courseId = parts[1];
      return [
        { label: "Courses", href: "/dashboard/courses" },
        { label: "Classroom", href: `/dashboard/courses/${courseId}` }
      ];
    }

    // If inside course details: courses/[id]
    if (parts[0] === "courses" && parts.length === 2) {
      return [
        { label: "Courses", href: "/dashboard/courses" },
        { label: "Course Details", href: path }
      ];
    }

    const labels = {
      courses: "Courses",
      tenants: "Institutions & Branches",
      students: "Students & Cohorts",
      settings: "Settings & Config",
      overview: "Overview"
    };

    const crumbs = [];
    let currentPath = "/dashboard";
    for (const part of parts) {
      currentPath += `/${part}`;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
      const label = labels[part] || (isUuid ? `${part.slice(0, 8)}...` : part.replace(/[-_]/g, " "));
      crumbs.push({ label, href: currentPath });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-68" : "w-20"
        } border-r border-border bg-card flex flex-col transition-all duration-300 z-30`}
      >
        {/* Sidebar Header Branding */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
              <GraduationCap size={24} weight="bold" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight truncate">Education OS</span>
                <span className="text-[10px] text-muted-foreground font-mono truncate font-bold uppercase tracking-wider">
                  Enterprise LMS
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-accent"
          >
            <SidebarIcon size={20} />
          </button>
        </div>

        {/* Institution Switcher with shadcn DropdownMenu */}
        {sidebarOpen && (
          <div className="p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-accent/40 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="h-8 w-8 rounded-lg text-primary-foreground flex items-center justify-center text-xs font-black shrink-0 shadow-xs overflow-hidden border border-border/40"
                      style={activeTenant?.settings?.branding?.primaryColor ? { backgroundColor: activeTenant.settings.branding.primaryColor } : { backgroundColor: "var(--primary)" }}
                    >
                      {activeTenant?.settings?.branding?.logoUrl ? (
                        <img 
                          src={activeTenant.settings.branding.logoUrl} 
                          alt={activeTenant.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>{activeTenant?.name ? activeTenant.name.charAt(0) : "E"}</span>
                      )}
                    </div>
                    <div className="min-w-0 pr-1">
                      <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                        {activeTenant?.name || "My Academy"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">
                        {activeTenant?.branch || "Main Campus"}
                      </p>
                    </div>
                  </div>
                  <CaretUpDown size={14} className="text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel>Institutional Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {tenants && tenants.length > 0 ? (
                    tenants.map((t) => {
                      const isActive = activeTenant?.id === t.id;
                      return (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => switchTenant(t)}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="truncate">
                            <p className="font-bold text-xs truncate">{t.name}</p>
                            <span className="text-[10px] text-muted-foreground font-mono">{t.branch || "Campus"}</span>
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
                  <Link href="/dashboard/tenants" className="flex items-center gap-2 py-2 text-xs font-bold text-primary">
                    <Plus size={14} weight="bold" />
                    <span>Provision New Branch</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium"
                }`}
              >
                <Icon size={18} weight={active ? "bold" : "regular"} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

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
                  <p className="text-xs font-bold truncate leading-tight">{user?.name || "Administrator"}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">{user?.email}</p>
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
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground font-mono font-bold tracking-wider hover:text-foreground transition-colors"
            >
              EOS
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href + idx}>
                  <span className="text-muted-foreground/40 font-mono">/</span>
                  {isLast ? (
                    <span className="text-sm font-extrabold capitalize text-foreground tracking-tight">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="font-medium text-muted-foreground hover:text-foreground capitalize transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Student Portal / Admin Mode Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={togglePortalMode}
              className="text-xs font-bold gap-1.5 h-8.5 px-3 border-border hover:border-primary/50 transition-colors"
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
