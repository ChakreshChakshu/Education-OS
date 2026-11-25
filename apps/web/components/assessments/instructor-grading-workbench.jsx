"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssessmentService } from "@/services/assessment-service";
import {
  FilePdf,
  SlidersHorizontal,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowsClockwise,
  MagnifyingGlass,
  ArrowSquareOut,
  ChatText,
  Sparkle,
  UploadSimple,
  User,
  X,
  Funnel,
  Check,
  DownloadSimple
} from "@phosphor-icons/react";

export function InstructorGradingWorkbench({
  courseId,
  selectedModuleId = null,
  modules = [],
  onClose = null,
  className = ""
}) {
  // Submission queue filters
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING_REVIEW | GRADED | REVISION_REQUESTED
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState(selectedModuleId || "all");

  // Submissions data
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Grading form state for active submission
  const [rubricScores, setRubricScores] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [suggestedImprovements, setSuggestedImprovements] = useState("");
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState("");

  // Load submissions from assessment service
  useEffect(() => {
    if (courseId) {
      const subs = AssessmentService.getAssignmentSubmissions(
        courseId,
        activeModuleFilter === "all" ? null : activeModuleFilter
      );
      setSubmissions(subs);
      if (subs.length > 0 && !selectedSubmissionId) {
        setSelectedSubmissionId(subs[0].id);
      }
    }
  }, [courseId, activeModuleFilter]);

  const activeSubmission = useMemo(() => {
    return submissions.find((s) => s.id === selectedSubmissionId) || submissions[0] || null;
  }, [submissions, selectedSubmissionId]);

  // Find module rubric criteria for this submission
  const targetModule = useMemo(() => {
    if (!activeSubmission) return null;
    return modules.find((m) => m.id === activeSubmission.moduleId) || null;
  }, [modules, activeSubmission]);

  const rubricCriteria = useMemo(() => {
    if (targetModule?.rubricCriteria && Array.isArray(targetModule.rubricCriteria)) {
      return targetModule.rubricCriteria;
    }
    return [
      { id: "c1", name: "Methodology & Architecture", maxPoints: 15, description: "Clear decomposition of bounded contexts." },
      { id: "c2", name: "Accuracy & Verification Proofs", maxPoints: 15, description: "Correct fault tolerance calculations." },
      { id: "c3", name: "Formatting & Style Standard", maxPoints: 5, description: "Compliance with university PDF guidelines." }
    ];
  }, [targetModule]);

  // Sync grading form state when selected submission changes
  useEffect(() => {
    if (activeSubmission) {
      setRubricScores(activeSubmission.rubricScores || {});
      setFeedbackText(activeSubmission.feedbackText || "");
      setSuggestedImprovements(activeSubmission.suggestedImprovements || "");
      setSaveSuccessNotice("");
    }
  }, [activeSubmission?.id]);

  // Compute live score from rubric sliders/inputs
  const currentTotalScore = useMemo(() => {
    return rubricCriteria.reduce((sum, c) => {
      const score = Number(rubricScores[c.id || c.name]) || 0;
      return sum + score;
    }, 0);
  }, [rubricCriteria, rubricScores]);

  const maxTotalScore = useMemo(() => {
    return rubricCriteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);
  }, [rubricCriteria]);

  const currentPercentage = maxTotalScore > 0 ? Math.round((currentTotalScore / maxTotalScore) * 100) : 0;
  const isPassing = currentPercentage >= (targetModule?.passingScore || 70);

  // Filter queue
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesStatus = statusFilter === "ALL" || sub.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Handle score slider/input update
  const handleScoreChange = (criterionId, val, max) => {
    const numeric = Math.min(max, Math.max(0, Number(val) || 0));
    setRubricScores((prev) => ({
      ...prev,
      [criterionId]: numeric
    }));
  };

  // Submit Grade
  const handleSaveGrade = (statusToSet = "GRADED") => {
    if (!activeSubmission) return;
    setIsSavingGrade(true);

    try {
      const updated = AssessmentService.gradeAssignmentSubmission({
        courseId,
        moduleId: activeSubmission.moduleId,
        submissionId: activeSubmission.id,
        rubricScores,
        rubricCriteria,
        feedbackText,
        suggestedImprovements,
        status: statusToSet
      });

      // Update local submissions queue
      const refreshed = submissions.map((s) => (s.id === updated.id ? updated : s));
      setSubmissions(refreshed);

      setSaveSuccessNotice(
        statusToSet === "REVISION_REQUESTED"
          ? "Revision requested successfully. Student has been notified."
          : `Grade published: ${updated.totalScore}/${updated.maxScore} (${updated.percentage}%)`
      );
    } catch (err) {
      console.error("Grading save error:", err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "PENDING_REVIEW").length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 bg-primary/10">
              Instructor Grading Workbench
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              {pendingCount} Pending Review
            </Badge>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Student Assessment Queue & In-Browser PDF Grader
          </h2>
        </div>

        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
            <X size={18} />
          </Button>
        )}
      </div>

      {/* Main Split-Screen Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FILTERABLE SUBMISSION QUEUE (4 Cols on LG) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
              {[
                { key: "ALL", label: "All" },
                { key: "PENDING_REVIEW", label: `Pending (${pendingCount})` },
                { key: "GRADED", label: "Graded" },
                { key: "REVISION_REQUESTED", label: "Revision" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.key
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search student or file..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Submission Queue List */}
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No submissions matching current filter.
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = sub.id === activeSubmission?.id;
                  let statusBadgeStyle = "bg-muted text-muted-foreground";
                  if (sub.status === "PENDING_REVIEW") statusBadgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/30";
                  if (sub.status === "GRADED") statusBadgeStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
                  if (sub.status === "REVISION_REQUESTED") statusBadgeStyle = "bg-destructive/10 text-destructive border-destructive/30";

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmissionId(sub.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{sub.studentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">{sub.studentEmail}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-mono uppercase ${statusBadgeStyle}`}>
                          {sub.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/50">
                        <span className="truncate max-w-[140px]">{sub.fileName}</span>
                        <span>{sub.version} · {sub.fileSizeText}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: SPLIT-SCREEN IN-BROWSER PDF VIEWER & RUBRIC SCORING WORKBENCH (8 Cols on LG) */}
        <div className="lg:col-span-8 space-y-5">
          {activeSubmission ? (
            <div className="space-y-5">
              {/* Submission Header Metadata Bar */}
              <div className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <FilePdf size={22} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{activeSubmission.studentName}</h3>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {activeSubmission.version}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {activeSubmission.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {activeSubmission.fileName} · {activeSubmission.fileSizeText} · {activeSubmission.pageCount} Pages
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activeSubmission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5"
                  >
                    <span>Full Screen</span>
                    <ArrowSquareOut size={13} weight="bold" />
                  </a>
                </div>
              </div>

              {/* SPLIT VIEW: PDF EMBEDDED READER + RUBRIC SCORING SLIDERS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Embedded PDF Viewer (7 Cols on MD) */}
                <div className="md:col-span-7 rounded-2xl overflow-hidden border border-border bg-black shadow-md flex flex-col h-[580px]">
                  <div className="p-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-zinc-300 text-xs font-mono">
                    <span className="truncate max-w-[200px]">{activeSubmission.fileName}</span>
                    <span className="text-[10px] text-zinc-500">In-Browser Embedded Viewer</span>
                  </div>

                  <iframe
                    src={`${activeSubmission.fileUrl}#toolbar=0&navpanes=0`}
                    className="w-full flex-1 border-none bg-zinc-950"
                    title="Student PDF Document"
                  />
                </div>

                {/* Rubric-Based Scoring & Feedback Commentary (5 Cols on MD) */}
                <div className="md:col-span-5 space-y-4">
                  {/* Live Rubric Scorecard */}
                  <Card className="p-4 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Rubric Scorecard</span>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground font-mono">
                          {currentTotalScore} / {maxTotalScore}
                        </span>
                        <span className={`text-xs font-bold block ${isPassing ? "text-emerald-500" : "text-amber-500"}`}>
                          {currentPercentage}% · {isPassing ? "Passing" : "Below Passing"}
                        </span>
                      </div>
                    </div>

                    {/* Criteria Sliders / Point Pickers */}
                    <div className="space-y-3.5">
                      {rubricCriteria.map((c) => {
                        const val = Number(rubricScores[c.id || c.name]) || 0;
                        const max = Number(c.maxPoints) || 10;
                        return (
                          <div key={c.id || c.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground truncate">{c.name}</span>
                              <span className="font-mono font-bold text-primary">
                                {val} / {max} pts
                              </span>
                            </div>

                            <input
                              type="range"
                              min="0"
                              max={max}
                              value={val}
                              onChange={(e) => handleScoreChange(c.id || c.name, e.target.value, max)}
                              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{c.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Instructor Feedback Commentary */}
                  <Card className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <ChatText size={14} weight="bold" className="text-primary" />
                        <span>Instructor Commentary & Rationale</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Provide pedagogical feedback on strengths, architectural proofs, and areas for improvement..."
                        className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Suggested Action Items (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Review transactional outbox deduplication patterns in Chapter 4."
                        className="h-8 text-xs"
                        value={suggestedImprovements}
                        onChange={(e) => setSuggestedImprovements(e.target.value)}
                      />
                    </div>

                    {saveSuccessNotice && (
                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle size={15} weight="bold" />
                        <span>{saveSuccessNotice}</span>
                      </div>
                    )}

                    {/* Action Buttons: Publish Grade vs Request Revision */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-border">
                      <Button
                        size="md"
                        disabled={isSavingGrade}
                        onClick={() => handleSaveGrade("GRADED")}
                        className="w-full font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check size={16} weight="bold" />
                        <span>Publish Grade & Mark Passing</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSavingGrade}
                        onClick={() => handleSaveGrade("REVISION_REQUESTED")}
                        className="w-full font-bold text-amber-400 border-amber-500/40 hover:bg-amber-500/10 gap-1.5 cursor-pointer text-xs"
                      >
                        <ArrowsClockwise size={14} weight="bold" />
                        <span>Request Student Revision (Return Assignment)</span>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground space-y-2 border-dashed">
              <FilePdf size={40} className="mx-auto text-primary/60" />
              <p className="text-sm font-semibold">Select a submission from the queue to start grading.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
