"use client";

import React from "react";
import Link from "next/link";
import { SquaresFour } from "@phosphor-icons/react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS = {
  courses: "Courses",
  tenants: "Institutions & Branches",
  students: "Students & Cohorts",
  settings: "Settings & Config",
  overview: "Overview",
  learn: "Classroom"
};

export function getBreadcrumbTrail(path) {
  if (!path || path === "/dashboard") {
    return [];
  }

  const clean = path.replace(/^\/dashboard\/?/, "");
  const parts = clean.split("/").filter(Boolean);

  // Classroom pattern: /dashboard/courses/[id]/lesson/[lessonId] or .../learn
  if (parts[0] === "courses" && (parts.includes("lesson") || parts.includes("learn"))) {
    const courseId = parts[1];
    return [
      { label: "Courses", href: "/dashboard/courses" },
      { label: "Classroom", href: `/dashboard/courses/${courseId}` }
    ];
  }

  // Course Details pattern: /dashboard/courses/[id]
  if (parts[0] === "courses" && parts.length === 2) {
    return [
      { label: "Courses", href: "/dashboard/courses" },
      { label: "Course Details", href: path }
    ];
  }

  const crumbs = [];
  let currentPath = "/dashboard";
  for (const part of parts) {
    currentPath += `/${part}`;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
    const label = ROUTE_LABELS[part] || (isUuid ? `${part.slice(0, 8)}...` : part.replace(/[-_]/g, " "));
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function DashboardBreadcrumb({ tenant, pathname }) {
  const crumbs = getBreadcrumbTrail(pathname);
  const isRoot = crumbs.length === 0;

  return (
    <Breadcrumb className="text-xs">
      <BreadcrumbList className="flex items-center gap-2">
        {/* Root Dashboard Anchor */}
        <BreadcrumbItem>
          {isRoot ? (
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <SquaresFour size={14} weight="bold" className="text-primary shrink-0" />
              <span>Dashboard</span>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <SquaresFour size={14} weight="bold" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span className="group-hover:text-foreground">Dashboard</span>
            </Link>
          )}
        </BreadcrumbItem>

        {/* Trail Items */}
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.href + idx}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="capitalize max-w-[160px] sm:max-w-[240px] truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <Link
                    href={crumb.href}
                    className="capitalize font-medium text-muted-foreground hover:text-foreground transition-colors max-w-[120px] sm:max-w-[180px] truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
