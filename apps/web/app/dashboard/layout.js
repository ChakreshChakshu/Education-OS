"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  SquaresFour, 
  BookOpen, 
  Users,
  SignOut,
  Bell,
  Sun,
  Moon,
  Sidebar as SidebarIcon
} from "@phosphor-icons/react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeTenant, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
    }
  }, []);

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

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: SquaresFour },
    { name: "Course Manager", href: "/dashboard/courses", icon: BookOpen },
    { name: "Students", href: "/dashboard/students", icon: Users }
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
        {/* Sidebar Header Branding */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <GraduationCap size={24} weight="bold" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight truncate">Education OS</span>
                <span className="text-xs text-muted-foreground font-mono truncate font-medium">Enterprise Portal</span>
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

        {/* Institution Badge */}
        {sidebarOpen && activeTenant && (
          <div className="p-4 border-b border-border">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
              Active Institution
            </label>
            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-background">
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold shrink-0">
                {activeTenant.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold truncate">{activeTenant.name}</p>
                <p className="text-xs text-muted-foreground truncate font-medium">{activeTenant.branch || 'Main Campus'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground font-semibold"
                }`}
              >
                <Icon size={20} weight={active ? "bold" : "regular"} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Badge */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {user ? user.name?.charAt(0) : "A"}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold truncate">{user ? user.name : "Administrator"}</p>
                <p className="text-xs text-muted-foreground truncate font-medium">{user ? user.email : "admin@institution.edu"}</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
          >
            <SignOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground font-mono font-medium">EOS</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-base font-bold capitalize">
              {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3 font-mono font-semibold">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live API Connected
            </Badge>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:border-foreground/30 transition-colors cursor-pointer flex items-center justify-center bg-background"
            >
              {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-700" />}
            </button>

            <button className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:border-foreground/30 transition-colors cursor-pointer bg-background">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
