"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ArrowSquareOut,
  Copy,
  Key,
  LinkSimple,
  CaretDown,
  CaretRight,
  CaretUp
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
  const [enrollSuccessResult, setEnrollSuccessResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

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
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setEnrollSuccessResult({
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim().toLowerCase(),
          temporaryPassword: res.data?.temporaryPassword,
          activationToken: res.data?.activationToken,
          activationUrl: res.data?.activationToken ? `${origin}/activate?token=${res.data.activationToken}` : null
        });
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

  // Remove enrollment from cohort
  const handleDeleteEnrollment = async (enrollmentId, studentName) => {
    if (!confirm(`Are you sure you want to remove ${studentName || "this student"} from the course cohort?`)) {
      return;
    }
    try {
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      await ApiClient.deleteEnrollment(enrollmentId);
    } catch (err) {
      console.error("Failed to delete enrollment:", err);
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

  // Group filtered enrollments by unique student (eliminates duplicate student rows)
  const groupedStudents = useMemo(() => {
    const map = new Map();
    for (const e of filteredEnrollments) {
      const key = e.studentUserId || e.studentEmail || e.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          studentUserId: e.studentUserId,
          studentName: e.studentName || "Student",
          studentEmail: e.studentEmail || "",
          enrollments: []
        });
      }
      map.get(key).enrollments.push(e);
    }

    return Array.from(map.values()).map((student) => {
      const totalProg = student.enrollments.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0);
      const avgProg = student.enrollments.length > 0 ? Math.round(totalProg / student.enrollments.length) : 0;
      const hasActive = student.enrollments.some((en) => en.status === "ACTIVE");
      const allCompleted = student.enrollments.length > 0 && student.enrollments.every((en) => en.status === "COMPLETED");
      const earliestEnrollment = student.enrollments.reduce((earliest, en) => {
        if (!earliest) return en.enrolledAt;
        if (!en.enrolledAt) return earliest;
        return new Date(en.enrolledAt) < new Date(earliest) ? en.enrolledAt : earliest;
      }, null);

      return {
        ...student,
        avgProgress: avgProg,
        hasActive,
        allCompleted,
        earliestEnrollment
      };
    });
  }, [filteredEnrollments]);

  // Expandable rows state
  const [expandedStudentKeys, setExpandedStudentKeys] = useState(new Set());

  const toggleStudentExpand = (key) => {
    setExpandedStudentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allExpandableKeys = useMemo(() => {
    return groupedStudents.filter((s) => s.enrollments.length > 1).map((s) => s.key);
  }, [groupedStudents]);

  const isAllExpanded = allExpandableKeys.length > 0 && allExpandableKeys.every((k) => expandedStudentKeys.has(k));

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedStudentKeys(new Set());
    } else {
      setExpandedStudentKeys(new Set(allExpandableKeys));
    }
  };

  // Helper to open enroll modal with pre-filled student information
  const handleEnrollExistingStudent = (name, email) => {
    setStudentName(name);
    setStudentEmail(email);
    setEnrollError("");
    setEnrollSuccessResult(null);
    setIsEnrollModalOpen(true);
  };

  // Derived metrics (accurately distinguishing unique students from enrollments)
  const uniqueStudentsCount = useMemo(() => {
    const set = new Set();
    enrollments.forEach((e) => {
      const key = e.studentUserId || e.studentEmail;
      if (key) set.add(key);
    });
    return set.size;
  }, [enrollments]);

  const activeStudentsCount = useMemo(() => {
    const set = new Set();
    enrollments.filter((e) => e.status === "ACTIVE").forEach((e) => {
      const key = e.studentUserId || e.studentEmail;
      if (key) set.add(key);
    });
    return set.size;
  }, [enrollments]);

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
            onClick={() => {
              setStudentName("");
              setStudentEmail("");
              setEnrollError("");
              setEnrollSuccessResult(null);
              setIsEnrollModalOpen(true);
            }}
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
                Total Students
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {uniqueStudentsCount}
                </p>
                <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                  ({enrollments.length} {enrollments.length === 1 ? 'enrollment' : 'enrollments'})
                </span>
              </div>
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
                {activeStudentsCount}
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

        {/* Filters and Controls */}
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

          {/* Expand / Collapse All (if multi-course students exist) */}
          {allExpandableKeys.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleExpandAll}
              className="h-10 px-3 text-xs font-semibold gap-1.5"
            >
              {isAllExpanded ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
              <span>{isAllExpanded ? "Collapse All" : "Expand All"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <Card className="p-16 text-center border-border bg-card rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-semibold">Loading student roster from Neon DB...</p>
        </Card>
      ) : groupedStudents.length === 0 ? (
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
              onClick={() => {
                setStudentName("");
                setStudentEmail("");
                setEnrollError("");
                setEnrollSuccessResult(null);
                setIsEnrollModalOpen(true);
              }}
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
                  <th className="p-4">Enrolled Course(s)</th>
                  <th className="p-4">Cohort / Batch</th>
                  <th className="p-4">Curriculum Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Enrolled Date</th>
                  <th className="p-4 text-right pr-6">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {groupedStudents.map((student) => {
                  const initial = (student.studentName || "S").charAt(0).toUpperCase();
                  const hasMultiple = student.enrollments.length > 1;
                  const isExpanded = expandedStudentKeys.has(student.key);
                  const single = !hasMultiple ? student.enrollments[0] : null;
                  const pct = !hasMultiple ? (single?.progressPercentage || 0) : student.avgProgress;

                  return (
                    <React.Fragment key={student.key}>
                      <tr
                        className={`transition-colors ${
                          hasMultiple ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"
                        } ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={(e) => {
                          if (e.target.closest("select, button, a, input")) return;
                          if (hasMultiple) toggleStudentExpand(student.key);
                        }}
                      >
                        {/* Student Info */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            {hasMultiple ? (
                              <button
                                type="button"
                                onClick={(evt) => {
                                  evt.stopPropagation();
                                  toggleStudentExpand(student.key);
                                }}
                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                title={isExpanded ? "Collapse course details" : "Expand course details"}
                              >
                                {isExpanded ? (
                                  <CaretDown size={16} weight="bold" className="text-primary" />
                                ) : (
                                  <CaretRight size={16} weight="bold" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}
                            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {initial}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-foreground truncate">{student.studentName}</p>
                                {hasMultiple && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                    {student.enrollments.length} courses
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono truncate">
                                {student.studentEmail}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Course(s) */}
                        <td className="p-4">
                          {!hasMultiple ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground line-clamp-1">{single?.courseTitle}</p>
                              {single?.courseCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                                  {single.courseCode}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[260px]">
                              {student.enrollments.map((en) => (
                                <span
                                  key={en.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-semibold truncate max-w-[200px]"
                                  title={en.courseTitle}
                                >
                                  {en.courseCode ? `[${en.courseCode}] ` : ""}{en.courseTitle}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Cohort / Batch */}
                        <td className="p-4">
                          {!hasMultiple ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground font-mono text-[11px] font-bold">
                              <span>{single?.batchName || "General Cohort"}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(evt) => {
                                evt.stopPropagation();
                                toggleStudentExpand(student.key);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground font-mono text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <span>{student.enrollments.length} Cohorts</span>
                              <CaretDown
                                size={12}
                                weight="bold"
                                className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </button>
                          )}
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
                              {pct}% {hasMultiple && <span className="text-[9px] text-muted-foreground font-normal">(avg)</span>}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          {!hasMultiple ? (
                            <select
                              value={single?.status || "ACTIVE"}
                              onChange={(evt) => handleStatusChange(single.id, evt.target.value)}
                              className={`text-[11px] font-bold font-mono px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                                single?.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                  : single?.status === "ACTIVE"
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="DROPPED">DROPPED</option>
                            </select>
                          ) : (
                            <div className="flex items-center gap-1">
                              {student.allCompleted ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                  ALL COMPLETED
                                </span>
                              ) : student.hasActive ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/30">
                                  ACTIVE ({student.enrollments.filter((e) => e.status === "ACTIVE").length})
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                                  MIXED
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Enrolled Date */}
                        <td className="p-4 font-mono text-[11px] text-muted-foreground">
                          {(!hasMultiple ? single?.enrolledAt : student.earliestEnrollment)
                            ? new Date(!hasMultiple ? single?.enrolledAt : student.earliestEnrollment).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {!hasMultiple ? (
                              <>
                                <a
                                  href={`/dashboard/courses/${single?.courseId}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                                >
                                  <span>Course</span>
                                  <ArrowSquareOut size={13} weight="bold" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEnrollment(single?.id, student.studentName)}
                                  title="Remove student from cohort"
                                  className="p-1.5 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash size={14} weight="bold" />
                                </button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    toggleStudentExpand(student.key);
                                  }}
                                  className="h-8 text-[11px] font-bold gap-1 text-primary hover:bg-primary/10"
                                >
                                  <span>{isExpanded ? "Hide" : "Courses"}</span>
                                  {isExpanded ? (
                                    <CaretUp size={13} weight="bold" />
                                  ) : (
                                    <CaretDown size={13} weight="bold" />
                                  )}
                                </Button>
                                <button
                                  type="button"
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    handleEnrollExistingStudent(student.studentName, student.studentEmail);
                                  }}
                                  title="Enroll in another course"
                                  className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                >
                                  <Plus size={14} weight="bold" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Course Breakdown Sub-table */}
                      {hasMultiple && isExpanded && (
                        <tr className="bg-muted/20 border-b border-border/80">
                          <td colSpan={7} className="p-0">
                            <div className="p-4 pl-14 pr-6 space-y-3 bg-muted/15 border-l-4 border-l-primary/60 my-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BookOpen size={16} className="text-primary" weight="bold" />
                                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    {student.studentName}&apos;s Enrolled Courses & Cohorts ({student.enrollments.length})
                                  </h4>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEnrollExistingStudent(student.studentName, student.studentEmail)}
                                  className="h-7 text-[11px] font-bold gap-1 rounded-lg"
                                >
                                  <Plus size={12} weight="bold" />
                                  <span>+ Enroll in Another Course</span>
                                </Button>
                              </div>

                              <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-xs">
                                <table className="w-full text-left text-xs font-medium">
                                  <thead className="bg-muted/50 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase font-mono">
                                    <tr>
                                      <th className="py-2.5 px-4">Course</th>
                                      <th className="py-2.5 px-4">Cohort / Batch</th>
                                      <th className="py-2.5 px-4">Curriculum Progress</th>
                                      <th className="py-2.5 px-4">Status</th>
                                      <th className="py-2.5 px-4">Enrolled Date</th>
                                      <th className="py-2.5 px-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {student.enrollments.map((en) => {
                                      const enPct = en.progressPercentage || 0;
                                      return (
                                        <tr key={en.id} className="hover:bg-muted/30 transition-colors">
                                          <td className="py-3 px-4">
                                            <div className="space-y-0.5">
                                              <p className="font-bold text-foreground">{en.courseTitle}</p>
                                              {en.courseCode && (
                                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                                                  {en.courseCode}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-[11px] font-bold">
                                              {en.batchName || "General Cohort"}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 min-w-[120px] max-w-[160px]">
                                              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-300 ${
                                                    enPct === 100
                                                      ? "bg-emerald-500"
                                                      : enPct > 50
                                                      ? "bg-primary"
                                                      : "bg-primary/80"
                                                  }`}
                                                  style={{ width: `${enPct}%` }}
                                                />
                                              </div>
                                              <span className="text-[11px] font-mono font-bold text-foreground">
                                                {enPct}%
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3 px-4">
                                            <select
                                              value={en.status}
                                              onChange={(evt) => handleStatusChange(en.id, evt.target.value)}
                                              className={`text-[11px] font-bold font-mono px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                                                en.status === "COMPLETED"
                                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                  : en.status === "ACTIVE"
                                                  ? "bg-primary/10 text-primary border-primary/30"
                                                  : "bg-muted text-muted-foreground border-border"
                                              }`}
                                            >
                                              <option value="ACTIVE">ACTIVE</option>
                                              <option value="COMPLETED">COMPLETED</option>
                                              <option value="DROPPED">DROPPED</option>
                                            </select>
                                          </td>
                                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                                            {en.enrolledAt
                                              ? new Date(en.enrolledAt).toLocaleDateString(undefined, {
                                                  year: "numeric",
                                                  month: "short",
                                                  day: "numeric"
                                                })
                                              : "—"}
                                          </td>
                                          <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <a
                                                href={`/dashboard/courses/${en.courseId}`}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                                              >
                                                <span>Course</span>
                                                <ArrowSquareOut size={13} weight="bold" />
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteEnrollment(en.id, student.studentName)}
                                                title="Remove student from cohort"
                                                className="p-1.5 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                              >
                                                <Trash size={14} weight="bold" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                <CardTitle className="text-lg font-bold">
                  {enrollSuccessResult ? "Student Credentials & Access" : "Enroll Student in Course"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {enrollSuccessResult 
                    ? "Share either the activation link or temporary password with the student."
                    : `Register student into ${activeTenant?.name || "Institution"} and assign to a cohort batch.`}
                </CardDescription>
              </div>
              <button
                onClick={() => {
                  setIsEnrollModalOpen(false);
                  setEnrollSuccessResult(null);
                  setStudentName("");
                  setStudentEmail("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </CardHeader>

            {enrollSuccessResult ? (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={26} weight="fill" className="shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground">
                      {enrollSuccessResult.studentName} Successfully Enrolled!
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Linked to {activeTenant?.name || "Campus Portal"} with email <span className="font-semibold text-foreground">{enrollSuccessResult.studentEmail}</span>.
                    </p>
                  </div>
                </div>

                {/* OPTION 1: ACTIVATION LINK */}
                {enrollSuccessResult.activationUrl && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <LinkSimple size={16} weight="bold" />
                        <span>Option 1: Student Activation Link (Recommended)</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20 text-primary font-semibold">
                        Self-Service
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Student opens this link to set their own permanent password and jump straight into their courses:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={enrollSuccessResult.activationUrl}
                        className="flex-1 h-9 px-3 text-[11px] font-mono rounded-lg border border-border bg-background text-foreground select-all focus:outline-none"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(enrollSuccessResult.activationUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="h-9 font-semibold text-xs gap-1.5 shrink-0"
                      >
                        {copiedLink ? <Check size={14} weight="bold" className="text-emerald-400" /> : <Copy size={14} />}
                        {copiedLink ? "Copied!" : "Copy Link"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* OPTION 2: TEMPORARY PASSWORD */}
                {enrollSuccessResult.temporaryPassword && (
                  <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Key size={16} weight="duotone" className="text-amber-500" />
                        <span>Option 2: Direct Login with Temporary Password</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Instant Access
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Student can log in at <span className="font-semibold text-foreground">/login</span> using their email and this temporary password:
                    </p>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                      <span className="font-mono text-xs font-bold text-foreground tracking-wider px-2">
                        {enrollSuccessResult.temporaryPassword}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(enrollSuccessResult.temporaryPassword);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                        }}
                        className="h-8 text-xs gap-1.5"
                      >
                        {copiedPassword ? <Check size={13} weight="bold" className="text-emerald-500" /> : <Copy size={13} />}
                        {copiedPassword ? "Copied!" : "Copy Password"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setEnrollSuccessResult(null);
                      setIsEnrollModalOpen(false);
                      setStudentName("");
                      setStudentEmail("");
                    }}
                    className="font-bold text-xs px-5 h-9"
                  >
                    Done & Close
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
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
