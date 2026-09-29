"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  MagnifyingGlass, 
  GraduationCap, 
  CheckCircle, 
  X, 
  Trash,
  BookOpen,
  Trophy,
  Plus,
  Funnel,
  ArrowsClockwise,
  Check,
  Clock,
  Sparkle,
  FolderPlus,
  ArrowSquareOut
} from "@phosphor-icons/react";

export default function StudentsPage() {
  const { activeTenant } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED'

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [submittingEnroll, setSubmittingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Create Batch Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchTerm, setBatchTerm] = useState("Spring 2026");
  const [batchCapacity, setBatchCapacity] = useState(50);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchError, setBatchError] = useState("");

  // Fetch all initial data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [enrollRes, courseRes] = await Promise.all([
        ApiClient.getEnrollments(),
        ApiClient.getCourses()
      ]);

      if (enrollRes?.success && Array.isArray(enrollRes.data)) {
        setEnrollments(enrollRes.data);
      }

      if (courseRes?.success && Array.isArray(courseRes.data)) {
        setCourses(courseRes.data);
        if (courseRes.data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(courseRes.data[0].id);
        }
      }

      const batchRes = await ApiClient.getBatches();
      if (batchRes?.success && Array.isArray(batchRes.data)) {
        setBatches(batchRes.data);
      }
    } catch (err) {
      console.error("Failed to load roster data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [activeTenant, fetchData]);

  // Load batches when selected course changes in modal
  useEffect(() => {
    async function loadCourseBatches() {
      if (!selectedCourseId) return;
      const res = await ApiClient.getBatches(selectedCourseId);
      if (res?.success && Array.isArray(res.data)) {
        setBatches(res.data);
        if (res.data.length > 0) {
          setSelectedBatchId(res.data[0].id);
        } else {
          setSelectedBatchId("");
        }
      }
    }
    loadCourseBatches();
  }, [selectedCourseId]);

  // Handle student enrollment submit
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    setEnrollError("");

    if (!studentName.trim() || !studentEmail.trim() || !selectedCourseId) {
      setEnrollError("Please provide student name, email, and choose a course.");
      return;
    }

    setSubmittingEnroll(true);
    try {
      const res = await ApiClient.enrollStudent({
        tenantId: activeTenant?.id,
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim().toLowerCase(),
        courseId: selectedCourseId,
        batchId: selectedBatchId || null
      });

      if (res?.success) {
        setIsEnrollModalOpen(false);
        setStudentName("");
        setStudentEmail("");
        await fetchData(true);
      } else {
        setEnrollError(res?.error || "Failed to enroll student.");
      }
    } catch (err) {
      setEnrollError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingEnroll(false);
    }
  };

  // Handle create batch submit
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setBatchError("");

    if (!batchName.trim() || !selectedCourseId) {
      setBatchError("Please enter a cohort name and select a course.");
      return;
    }

    setSubmittingBatch(true);
    try {
      const res = await ApiClient.createBatch({
        courseId: selectedCourseId,
        name: batchName.trim(),
        term: batchTerm.trim(),
        capacity: Number(batchCapacity) || 50
      });

      if (res?.success && res.data) {
        setIsBatchModalOpen(false);
        setBatchName("");
        // Select the newly created batch
        setSelectedBatchId(res.data.id);
        const updatedBatches = await ApiClient.getBatches(selectedCourseId);
        if (updatedBatches?.success) setBatches(updatedBatches.data);
      } else {
        setBatchError(res?.error || "Failed to create cohort batch.");
      }
    } catch (err) {
      setBatchError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Quick update enrollment status
  const handleStatusChange = async (enrollmentId, newStatus) => {
    try {
      // Optimistic update
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: newStatus } : e))
      );
      await ApiClient.updateEnrollment(enrollmentId, { status: newStatus });
    } catch (err) {
      console.error("Status update failed:", err);
      fetchData(true);
    }
  };

  // Filtered roster
  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      !search ||
      (e.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.studentEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.courseTitle || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.batchName || "").toLowerCase().includes(search.toLowerCase());

    const matchesCourse =
      selectedCourseFilter === "ALL" || e.courseId === selectedCourseFilter;

    const matchesBatch =
      selectedBatchFilter === "ALL" || e.batchId === selectedBatchFilter;

    const matchesStatus =
      statusFilter === "ALL" || e.status === statusFilter;

    return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
  });

  // Derived metrics
  const activeCount = enrollments.filter((e) => e.status === "ACTIVE").length;
  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
  const avgProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((acc, e) => acc + (e.progressPercentage || 0), 0) /
            enrollments.length
        )
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 md:p-7 rounded-2xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
              {activeTenant?.name || "Institution"}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="font-mono text-[11px] font-bold">
              Neon PostgreSQL Sync
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Students & Cohort Roster
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage course enrollments, cohort batches, and real-time student curriculum progression.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-10 px-3 font-semibold gap-1.5"
          >
            <ArrowsClockwise size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
            className="h-10 px-3 font-semibold gap-1.5"
          >
            <FolderPlus size={16} weight="bold" />
            <span>+ New Cohort</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            className="h-10 px-4 font-bold gap-2 shadow-xs"
          >
            <UserPlus size={18} weight="bold" />
            <span>Enroll Student</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border bg-card">
          <CardContent className="p-2 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Enrollments
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {enrollments.length}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={24} weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-border bg-card">
          <CardContent className="p-2 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Students
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
                {activeCount}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <GraduationCap size={24} weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-border bg-card">
          <CardContent className="p-2 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Course Completions
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                {completedCount}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle size={24} weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-border bg-card">
          <CardContent className="p-2 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Average Progress
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                {avgProgress}%
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Trophy size={24} weight="bold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by student name, email, course, or cohort..."
            className="pl-10 h-10 text-xs rounded-xl bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-xl border border-input bg-background font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ""}{c.title}
              </option>
            ))}
          </select>

          {/* Status Segmented Pills */}
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
            {[
              { key: "ALL", label: "All" },
              { key: "ACTIVE", label: "Active" },
              { key: "COMPLETED", label: "Completed" },
              { key: "DROPPED", label: "Dropped" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === tab.key
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <Card className="p-16 text-center border-border bg-card rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-semibold">Loading student roster from Neon DB...</p>
        </Card>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="p-16 text-center flex flex-col items-center justify-center space-y-4 border-dashed border-2 border-border/80 rounded-2xl bg-card">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users size={32} weight="bold" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold text-foreground">
              {enrollments.length === 0 ? "No Students Enrolled Yet" : "No Matching Students Found"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {enrollments.length === 0
                ? `The roster for ${activeTenant?.name || "your institution"} is currently empty. Click "Enroll Student" to register a student and assign them to a course cohort.`
                : "No student enrollments match your current search query or filter selection."}
            </p>
          </div>
          {enrollments.length === 0 && (
            <Button
              onClick={() => setIsEnrollModalOpen(true)}
              size="sm"
              className="gap-2 font-bold mt-2"
            >
              <UserPlus size={16} weight="bold" /> Enroll First Student
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card p-0 rounded-2xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-muted/40 border-b border-border uppercase font-bold text-muted-foreground text-[11px] tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Enrolled Course</th>
                  <th className="p-4">Cohort / Batch</th>
                  <th className="p-4">Curriculum Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Enrolled Date</th>
                  <th className="p-4 text-right pr-6">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEnrollments.map((e) => {
                  const initial = (e.studentName || "S").charAt(0).toUpperCase();
                  const pct = e.progressPercentage || 0;

                  return (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      {/* Student Info */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initial}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-bold text-foreground truncate">{e.studentName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {e.studentEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground line-clamp-1">{e.courseTitle}</p>
                          {e.courseCode && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                              {e.courseCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cohort / Batch */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground font-mono text-[11px] font-bold">
                          <span>{e.batchName || "General Cohort"}</span>
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-[140px] max-w-[200px]">
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct === 100
                                  ? "bg-emerald-500"
                                  : pct > 50
                                  ? "bg-primary"
                                  : "bg-primary/80"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-foreground shrink-0">
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <select
                          value={e.status}
                          onChange={(evt) => handleStatusChange(e.id, evt.target.value)}
                          className={`text-[11px] font-bold font-mono px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                            e.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : e.status === "ACTIVE"
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="DROPPED">DROPPED</option>
                        </select>
                      </td>

                      {/* Enrolled Date */}
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">
                        {e.enrolledAt
                          ? new Date(e.enrolledAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-6">
                        <a
                          href={`/dashboard/courses/${e.courseId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                        >
                          <span>Course</span>
                          <ArrowSquareOut size={13} weight="bold" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ENROLL STUDENT MODAL */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-popover border-border shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-bold">Enroll Student in Course</CardTitle>
                <CardDescription className="text-xs">
                  Register student into {activeTenant?.name || "Institution"} and assign to a cohort batch.
                </CardDescription>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <form onSubmit={handleEnrollStudent}>
              <CardContent className="space-y-4 pt-5">
                {enrollError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                    {enrollError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Student Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Alex Morgan"
                    className="h-10 text-xs font-medium"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Student Email Address *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="alex.morgan@student.edu"
                    className="h-10 text-xs"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Course *
                    </label>
                    <select
                      required
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                      {courses.length > 0 ? (
                        courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} {c.code ? `(${c.code})` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">No courses available</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Cohort Batch
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEnrollModalOpen(false);
                          setIsBatchModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        + New
                      </button>
                    </div>
                    <select
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                    >
                      <option value="">General Cohort (Self-Paced)</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.term ? `[${b.term}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>

              <div className="flex justify-end gap-2.5 p-4 border-t border-border bg-muted/20 rounded-b-2xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submittingEnroll}
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingEnroll || !studentName.trim() || !studentEmail.trim()}
                  className="font-bold gap-1.5"
                >
                  {submittingEnroll ? (
                    <>
                      <ArrowsClockwise size={14} className="animate-spin" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Confirm Enrollment</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-popover border-border shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-bold">Create Cohort Batch</CardTitle>
                <CardDescription className="text-xs">
                  Create a structured cohort for group progression and milestones.
                </CardDescription>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateBatch}>
              <CardContent className="space-y-4 pt-5">
                {batchError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                    {batchError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Associated Course *
                  </label>
                  <select
                    required
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Cohort Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. 2026 Q2 Architecture Cohort"
                    className="h-10 text-xs font-medium"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Term
                    </label>
                    <Input
                      placeholder="Spring 2026"
                      className="h-10 text-xs"
                      value={batchTerm}
                      onChange={(e) => setBatchTerm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Capacity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      className="h-10 text-xs font-mono"
                      value={batchCapacity}
                      onChange={(e) => setBatchCapacity(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>

              <div className="flex justify-end gap-2.5 p-4 border-t border-border bg-muted/20 rounded-b-2xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submittingBatch}
                  onClick={() => setIsBatchModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingBatch || !batchName.trim()}
                  className="font-bold gap-1.5"
                >
                  {submittingBatch ? (
                    <>
                      <ArrowsClockwise size={14} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Create Cohort</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
