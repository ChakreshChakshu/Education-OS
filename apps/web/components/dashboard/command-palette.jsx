"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MagnifyingGlass,
  SquaresFour,
  BookOpen,
  Buildings,
  Users,
  Gear,
  GraduationCap,
  Plus,
  Sun,
  Moon,
  SignOut,
  ArrowUpRight,
  Sparkle,
  ArrowBendDownLeft,
  X,
  UserPlus
} from "@phosphor-icons/react";

export function CommandPalette({ open, onOpenChange }) {
  const router = useRouter();
  const { user, activeTenant, tenants, switchTenant, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [courses, setCourses] = useState([]);
  const inputRef = useRef(null);

  // Fetch courses on mount for search
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await ApiClient.getCourses();
        if (res?.success && Array.isArray(res.data)) {
          setCourses(res.data);
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
    loadCourses();
  }, []);

  // Reset search and selection on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / slash)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Navigation Items
  const navItems = [
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Overview",
      subtitle: "Dashboard metrics & active campus feed",
      icon: SquaresFour,
      shortcut: "G O",
      action: () => router.push("/dashboard")
    },
    {
      id: "nav-courses",
      category: "Navigation",
      title: "Course Manager",
      subtitle: "Curriculum modules, syllabus & lectures",
      icon: BookOpen,
      shortcut: "G C",
      action: () => router.push("/dashboard/courses")
    },
    {
      id: "nav-tenants",
      category: "Navigation",
      title: "Institutions & Branches",
      subtitle: "Multi-tenant boundaries & campus branding",
      icon: Buildings,
      shortcut: "G T",
      action: () => router.push("/dashboard/tenants")
    },
    {
      id: "nav-students",
      category: "Navigation",
      title: "Students & Cohorts",
      subtitle: "Enrollment rosters, batches & progress",
      icon: Users,
      shortcut: "G S",
      action: () => router.push("/dashboard/students")
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "Settings & Configuration",
      subtitle: "Personal profile, credentials & security",
      icon: Gear,
      shortcut: "G P",
      action: () => router.push("/dashboard/settings")
    }
  ];

  // Quick Actions
  const actionItems = [
    {
      id: "action-new-course",
      category: "Actions",
      title: "Create New Course",
      subtitle: "Open course creation dialog",
      icon: Plus,
      action: () => {
        router.push("/dashboard/courses?action=new");
      }
    },
    {
      id: "action-enroll-student",
      category: "Actions",
      title: "Enroll Student",
      subtitle: "Register student into course cohort",
      icon: UserPlus,
      action: () => {
        router.push("/dashboard/students?action=enroll");
      }
    },
    {
      id: "action-toggle-theme",
      category: "Actions",
      title: "Toggle Light / Dark Mode",
      subtitle: "Switch dashboard appearance theme",
      icon: Sun,
      action: () => {
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        if (isDark) {
          root.classList.remove("dark");
          localStorage.setItem("theme", "light");
        } else {
          root.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
      }
    },
    {
      id: "action-public-portal",
      category: "Actions",
      title: "Open Public Campus Website",
      subtitle: `https://${activeTenant?.slug || 'portal'}.education-os.edu`,
      icon: ArrowUpRight,
      action: () => {
        window.open(`/t/${activeTenant?.slug || 'portal'}/courses`, "_blank");
      }
    },
    {
      id: "action-logout",
      category: "Actions",
      title: "Sign Out",
      subtitle: `Signed in as ${user?.email || 'User'}`,
      icon: SignOut,
      action: () => {
        logout();
        router.push("/login");
      }
    }
  ];

  // Course Search Results
  const courseItems = courses.map((c) => ({
    id: `course-${c.id}`,
    category: "Courses",
    title: c.title,
    subtitle: `${c.code || "COURSE"} • ${c.credits ? `${c.credits} Credits` : "Curriculum"} • ${c.duration || "Self-Paced"}`,
    icon: BookOpen,
    badge: c.code,
    action: () => router.push(`/dashboard/courses/${c.id}`)
  }));

  // Tenant / Campus Switcher Results
  const tenantItems = (tenants || []).map((t) => ({
    id: `tenant-${t.id}`,
    category: "Workspaces",
    title: t.name,
    subtitle: `${t.branch || "Main Campus"} • /${t.slug}`,
    icon: Buildings,
    badge: activeTenant?.id === t.id ? "Current" : "Switch",
    action: () => switchTenant(t)
  }));

  // Filtered Results
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...navItems, ...actionItems, ...courseItems, ...tenantItems];
    if (!q) {
      // Default: Show Nav + Actions
      return [...navItems, ...actionItems.slice(0, 3)];
    }
    return all.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = (item.subtitle || "").toLowerCase().includes(q);
      const categoryMatch = item.category.toLowerCase().includes(q);
      const badgeMatch = (item.badge || "").toLowerCase().includes(q);
      return titleMatch || subtitleMatch || categoryMatch || badgeMatch;
    });
  }, [query, courses, tenants, activeTenant]);

  // Handle arrow key navigation and Enter
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        executeItem(filteredItems[selectedIndex]);
      }
    }
  };

  const executeItem = (item) => {
    onOpenChange(false);
    item.action?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border border-border/80 shadow-2xl bg-card rounded-2xl gap-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-muted/20">
          <MagnifyingGlass size={18} className="text-muted-foreground shrink-0" weight="bold" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, course code (e.g. FSD-01), campus, or setting..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={14} weight="bold" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-semibold">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="h-10 w-10 rounded-xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                <MagnifyingGlass size={20} />
              </div>
              <p className="text-xs font-bold text-foreground">No matching commands or courses</p>
              <p className="text-[11px] text-muted-foreground">Try searching &quot;courses&quot;, &quot;students&quot;, &quot;theme&quot;, or &quot;campus&quot;.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon size={16} weight="bold" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant={isSelected ? "secondary" : "outline"}
                            className="text-[9px] font-mono font-bold py-0 px-1.5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate font-medium ${
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd
                        className={`hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowBendDownLeft size={13} className="text-primary-foreground/80 shrink-0" weight="bold" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono text-[9px] bg-background px-1 py-0.5 rounded border border-border">↑</kbd>
              <kbd className="font-mono text-[9px] bg-background px-1 py-0.5 rounded border border-border">↓</kbd>
              <span className="hidden sm:inline">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono text-[9px] bg-background px-1 py-0.5 rounded border border-border">↵</kbd>
              <span className="hidden sm:inline">Select</span>
            </span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-[10px]">
            <Sparkle size={12} className="text-primary" weight="fill" />
            <span>EducationOS Command Engine</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
