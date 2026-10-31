"use client";

import React from "react";
import Link from "next/link";
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Clock, 
  User, 
  DotsThreeVertical, 
  ArrowRight 
} from "@phosphor-icons/react";
import { resolveCourseThumbnail, handleCourseImageError } from "@/lib/course-media";

export function StudentClassCard({ course }) {
  const courseId = course.courseId || course.id;
  const title = course.courseTitle || course.title || "Curriculum Course";
  const code = course.courseCode || course.code || "CS";
  const instructor = course.instructor || course.teacher?.name || "Academic Faculty";
  const lessonsCount = course.totalCount || course.modulesCount || 8;
  const credits = course.credits || 3;
  const studentsCount = course.studentCount || 30;
  const weeklyHours = course.duration || "3 Hours/Week";
  const nextLessonId = course.nextModuleId || "first";

  // Determine vibrant accent icon background
  const colors = [
    "from-blue-600 to-indigo-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-purple-600 to-pink-600"
  ];
  const colorIndex = Math.abs(title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const gradient = colors[colorIndex];

  return (
    <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between group">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={resolveCourseThumbnail(course)}
              alt={title}
              onError={(e) => handleCourseImageError(e, course)}
              className="h-12 w-12 rounded-2xl object-cover shrink-0 border border-border/60"
            />

            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5 font-medium">
                <User size={13} weight="bold" className="shrink-0" />
                <span className="truncate">{instructor}</span>
              </p>
            </div>
          </div>

          <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0">
            <DotsThreeVertical size={16} weight="bold" />
          </button>
        </div>

        {/* 2x2 Metadata Matrix */}
        <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-border/50 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <BookOpen size={15} weight="bold" className="text-muted-foreground/70" />
            <span>{lessonsCount} Lessons</span>
          </div>

          <div className="flex items-center gap-2">
            <GraduationCap size={15} weight="bold" className="text-muted-foreground/70" />
            <span>{credits} Credits</span>
          </div>

          <div className="flex items-center gap-2">
            <Users size={15} weight="bold" className="text-muted-foreground/70" />
            <span>{studentsCount} Students</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={15} weight="bold" className="text-muted-foreground/70" />
            <span>{weeklyHours}</span>
          </div>
        </div>
      </div>

      {/* Card Action Link */}
      <div className="pt-4">
        <Link 
          href={`/dashboard/courses/${courseId}/lesson/${nextLessonId}`}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-rose-500 hover:text-rose-600 dark:text-primary dark:hover:text-primary/90 hover:bg-rose-500/10 dark:hover:bg-primary/10 transition-colors cursor-pointer"
        >
          <span>View Class</span>
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
