"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkle,
  BookOpen,
  Users,
  Certificate,
  Clock,
  ArrowRight,
  MagnifyingGlass,
  CheckCircle,
  PlayCircle,
  Star,
  ShieldCheck,
  X,
  GraduationCap
} from "@phosphor-icons/react";
import { ApiClient } from "@/lib/api";

export default function StorefrontClient({ tenant, initialCourses, slug }) {
  const [courses] = useState(initialCourses || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [enrollingCourse, setEnrollingCourse] = useState(null);
  const [enrollForm, setEnrollForm] = useState({ name: "", email: "" });
  const [enrollStatus, setEnrollStatus] = useState({ loading: false, success: false, error: null });

  // Filter courses by search and level
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.shortDescription && c.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "ALL" || c.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollForm.email || !enrollForm.name) return;

    setEnrollStatus({ loading: true, success: false, error: null });
    const res = await ApiClient.enrollStorefront(slug, {
      courseId: enrollingCourse.id,
      email: enrollForm.email,
      name: enrollForm.name
    });

    if (res.success) {
      setEnrollStatus({ loading: false, success: true, error: null });
    } else {
      setEnrollStatus({ loading: false, success: false, error: res.error || "Failed to complete enrollment." });
    }
  };

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-900/40 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkle size={14} weight="fill" />
            <span>Accredited Self-Paced Academy</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Level up your career with courses from{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-emerald-400">
              {tenant.name}
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {tenant.branding?.tagline || "Industry-verified curricula, self-paced interactive modules, and verifiable graduation certificates."}
          </p>

          {/* Social Proof Stats Strip */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <span className="text-2xl font-bold text-white block">10,000+</span>
              <span className="text-xs text-zinc-400">Graduated Students</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <span className="text-2xl font-bold text-emerald-400 block">4.9 / 5.0</span>
              <span className="text-xs text-zinc-400">Average Student Rating</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <span className="text-2xl font-bold text-indigo-400 block">100%</span>
              <span className="text-xs text-zinc-400">Self-Paced Learning</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <span className="text-2xl font-bold text-white block">Official</span>
              <span className="text-xs text-zinc-400">Verifiable Certificate</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COURSE CATALOG SECTION */}
      <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              Course Catalog
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Available Courses & Programs
            </h2>
            <p className="text-sm text-zinc-400">
              Select a course to view full curriculum, syllabus details, and free preview lessons.
            </p>
          </div>

          {/* Search & Level Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
              />
            </div>

            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
              {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                    selectedLevel === level
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {level.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl space-y-3">
            <BookOpen size={36} className="text-zinc-600 mx-auto" />
            <h3 className="text-lg font-semibold text-zinc-300">No courses match your criteria</h3>
            <p className="text-xs text-zinc-500">Try adjusting your search terms or level filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group flex flex-col justify-between rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 transition-all overflow-hidden shadow-lg shadow-black/20"
              >
                <div>
                  {/* Card Thumbnail / Header */}
                  <div className="relative h-44 bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-950 flex flex-col justify-between p-4 border-b border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-zinc-800/90 text-indigo-300 border border-zinc-700/60">
                        {course.code}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {course.level.toLowerCase()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Certificate size={15} className="text-indigo-400" />
                        {course.credits} Credits · Certificate Included
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                      {course.shortDescription || "Comprehensive module syllabus covering fundamental theory and hands-on laboratory application."}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-5 pt-0 border-t border-zinc-800/50 mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500 block">Tuition</span>
                    <span className="text-xl font-extrabold text-white">
                      ${((course.price || 4900) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <PlayCircle size={15} />
                      Syllabus
                    </Link>
                    <button
                      onClick={() => setEnrollingCourse(course)}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-indigo-600/20 active:scale-95"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. WHY LEARN WITH US */}
      <section id="curriculum" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">The Experience</span>
          <h2 className="text-3xl font-bold tracking-tight text-white">Why Study With {tenant.name}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <PlayCircle size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-bold text-white">HLS Adaptive Streaming</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Crystal-clear adaptive bitrate playback on all devices. Watch syllabus previews instantly without an account.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Certificate size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-bold text-white">Verifiable Credentials</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Upon passing course quizzes, receive a cryptographically signed completion certificate shareable on LinkedIn.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock size={26} weight="duotone" />
            </div>
            <h3 className="text-lg font-bold text-white">Lifetime Access & Updates</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Learn on your schedule. Re-watch lectures, download study notes, and receive all future course updates for life.
            </p>
          </div>
        </div>
      </section>

      {/* 4. STUDENT REVIEWS */}
      <section id="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">Verified Feedback</span>
          <h2 className="text-3xl font-bold tracking-tight text-white">What Our Students Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "The curriculum is rigorous and practical. Within 2 weeks of finishing, I applied the concepts directly at work.",
              author: "Alex Morgan",
              role: "Senior Systems Engineer"
            },
            {
              quote: "The video lectures are concise and high-production. Being able to preview modules before paying made this an easy choice.",
              author: "Elena Rostova",
              role: "Product Designer"
            },
            {
              quote: "Top-tier educational quality. The quizzes actually tested understanding instead of just rote memorization.",
              author: "Marcus Chen",
              role: "Full-Stack Developer"
            }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} size={16} weight="fill" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 italic">"{item.quote}"</p>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <span className="text-xs font-semibold text-white block">{item.author}</span>
                <span className="text-[11px] text-zinc-500 block">{item.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">Got Questions?</span>
          <h2 className="text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How do I access course materials after enrolling?",
              a: "Once enrolled, your student account is instantly provisioned. You can sign in using the Student Portal in the top navigation to view your enrolled courses, lessons, and quizzes."
            },
            {
              q: "Is there a money-back guarantee?",
              a: "Yes. All courses come with a 30-day, no-questions-asked refund guarantee if you have completed less than 50% of the syllabus."
            },
            {
              q: "Can I watch lesson previews before buying?",
              a: "Yes! Click into any course syllabus to watch introductory preview lessons streamed directly in high-definition HLS."
            }
          ].map((faq, i) => (
            <div key={i} className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <h4 className="text-base font-semibold text-white">{faq.q}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. QUICK ENROLLMENT MODAL */}
      {enrollingCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <button
              onClick={() => {
                setEnrollingCourse(null);
                setEnrollStatus({ loading: false, success: false, error: null });
              }}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>

            {enrollStatus.success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} weight="fill" />
                </div>
                <h3 className="text-xl font-bold text-white">Enrollment Successful!</h3>
                <p className="text-sm text-zinc-400">
                  Welcome to <strong>{enrollingCourse.title}</strong>! Your account has been provisioned.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
                  >
                    Go to Student Portal
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase text-indigo-400">Direct Enrollment</span>
                  <h3 className="text-xl font-bold text-white">Enroll in {enrollingCourse.title}</h3>
                  <p className="text-xs text-zinc-400">
                    Tuition: <strong className="text-white">${((enrollingCourse.price || 4900) / 100).toFixed(2)}</strong> (One-time payment)
                  </p>
                </div>

                {enrollStatus.error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {enrollStatus.error}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={enrollForm.name}
                      onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1">Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={enrollForm.email}
                      onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                      placeholder="jane@university.edu"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={enrollStatus.loading}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    {enrollStatus.loading ? "Provisioning..." : "Confirm & Complete Enrollment"}
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 text-center">
                  Instant activation. Encrypted 256-bit checkout with 30-day refund policy.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
