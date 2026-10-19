"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Certificate,
  Clock,
  PlayCircle,
  LockSimple,
  CheckCircle,
  ShieldCheck,
  Star,
  Sparkle,
  ArrowRight,
  X
} from "@phosphor-icons/react";
import HlsVideoPlayer from "@/components/media/HlsVideoPlayer";
import { ApiClient } from "@/lib/api";

export default function CourseDetailClient({ course, tenant, slug }) {
  const [activePreviewModule, setActivePreviewModule] = useState(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ name: "", email: "" });
  const [enrollStatus, setEnrollStatus] = useState({ loading: false, success: false, error: null });

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollForm.email || !enrollForm.name) return;

    setEnrollStatus({ loading: true, success: false, error: null });
    const res = await ApiClient.enrollStorefront(slug, {
      courseId: course.id,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Back button */}
      <div>
        <Link
          href={`/`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to Course Catalog
        </Link>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Left Column: Syllabus & Course Info (2 cols) */}
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {course.code}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                {course.level.toLowerCase()}
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Certificate size={15} className="text-indigo-400" />
                {course.credits} Credits
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-base text-zinc-300 leading-relaxed">
              {course.shortDescription || course.description}
            </p>
          </div>

          {/* Key Course Outcomes */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkle size={18} className="text-amber-400" />
              What You Will Master
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                <span>Production architectural best practices</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                <span>Hands-on coding challenges & quizzes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                <span>Industry credential signed by faculty</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                <span>Self-paced access with lifetime updates</span>
              </li>
            </ul>
          </div>

          {/* Interactive Syllabus Accordion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Curriculum & Lesson Modules
              </h2>
              <span className="text-xs text-zinc-400">
                {course.modules?.length || 3} Modules
              </span>
            </div>

            <div className="space-y-3">
              {(course.modules && course.modules.length > 0
                ? course.modules
                : [
                    {
                      id: "mod-1",
                      order: 1,
                      title: "1. Core Architectural Foundations & Environment Setup",
                      contentType: "VIDEO",
                      isPreview: true,
                      contentUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                    },
                    {
                      id: "mod-2",
                      order: 2,
                      title: "2. Data Modeling & High-Throughput Storage",
                      contentType: "VIDEO",
                      isPreview: false
                    },
                    {
                      id: "mod-3",
                      order: 3,
                      title: "3. Cryptographic Verification & Graduation Capstone",
                      contentType: "QUIZ",
                      isPreview: false
                    }
                  ]
              ).map((mod, idx) => (
                <div
                  key={mod.id || idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {mod.order || idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{mod.title}</h4>
                      <span className="text-xs text-zinc-500 capitalize">{mod.contentType?.toLowerCase() || "video"} lesson</span>
                    </div>
                  </div>

                  <div>
                    {mod.isPreview ? (
                      <button
                        onClick={() => setActivePreviewModule(mod)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <PlayCircle size={15} weight="bold" />
                        Free Preview
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500 px-3 py-1.5">
                        <LockSimple size={14} />
                        Enrolled Only
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Purchase Card (1 col) */}
        <div className="sticky top-24 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6 shadow-2xl">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-indigo-400">Tuition & Enrollment</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                ${((course.price || 4900) / 100).toFixed(2)}
              </span>
              <span className="text-xs text-zinc-400">One-time payment</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setIsEnrollModalOpen(true)}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
            >
              Enroll Now
              <ArrowRight size={16} weight="bold" />
            </button>

            <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              30-Day Money-Back Guarantee
            </p>
          </div>

          <div className="border-t border-zinc-800 pt-5 space-y-3 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-200 block">This course includes:</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PlayCircle size={15} className="text-indigo-400" />
                <span>On-demand HLS streaming video</span>
              </div>
              <div className="flex items-center gap-2">
                <Certificate size={15} className="text-emerald-400" />
                <span>Verifiable Certificate of Completion</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-indigo-400" />
                <span>Full lifetime access</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 text-center">
            <span className="text-[11px] text-zinc-500">
              Offered by <strong>{tenant.name}</strong> on EducationOS
            </span>
          </div>
        </div>
      </div>

      {/* Free Preview Video Modal */}
      {activePreviewModule && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">
                  Free Syllabus Preview
                </span>
                <h3 className="text-lg font-bold text-white">{activePreviewModule.title}</h3>
              </div>
              <button
                onClick={() => setActivePreviewModule(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <HlsVideoPlayer
                src={activePreviewModule.contentUrl || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"}
                autoPlay={true}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-400">
                Liking what you see? Enroll now to unlock all {course.modules?.length || 3} modules and quizzes.
              </p>
              <button
                onClick={() => {
                  setActivePreviewModule(null);
                  setIsEnrollModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                Enroll in Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <button
              onClick={() => {
                setIsEnrollModalOpen(false);
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
                <h3 className="text-xl font-bold text-white">Enrollment Confirmed!</h3>
                <p className="text-sm text-zinc-400">
                  You are now enrolled in <strong>{course.title}</strong>. Your student account is active.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
                  >
                    Open Student Portal
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase text-indigo-400">Checkout</span>
                  <h3 className="text-xl font-bold text-white">Enroll in {course.title}</h3>
                  <p className="text-xs text-zinc-400">
                    Tuition: <strong className="text-white">${((course.price || 4900) / 100).toFixed(2)}</strong> (One-time payment)
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
                    {enrollStatus.loading ? "Enrolling..." : "Confirm & Enroll"}
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 text-center">
                  Instant student account provisioning. 30-day refund policy.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
