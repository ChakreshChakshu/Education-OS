"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssessmentService } from "@/services/assessment-service";
import {
  FilePdf,
  CalendarCheck,
  UploadSimple,
  CheckCircle,
  Clock,
  WarningCircle,
  ArrowSquareOut,
  Sparkle,
  Hourglass,
  ArrowsClockwise,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  ChatText,
  FileText
} from "@phosphor-icons/react";

export function AssignmentSubmissionPlayer({
  assignmentConfig,
  courseId,
  moduleId,
  studentUser,
  onCompleted,
  className = ""
}) {
  const studentId = studentUser?.id || studentUser?.userId || "student_guest";
  const studentName = studentUser?.name || "Student User";
  const studentEmail = studentUser?.email || "student@educationos.io";

  const fileInputRef = useRef(null);

  // Assignment configuration
  const title = assignmentConfig?.title || "Homework & Problem Set Submission";
  const instructions =
    assignmentConfig?.instructions ||
    "Please download the problem set template, complete your analysis, and upload your final synthesized response in a single PDF document.";
  const templatePdfUrl = assignmentConfig?.templatePdfUrl || assignmentConfig?.contentUrl;
  const dueDate = assignmentConfig?.dueDate || new Date(Date.now() + 86400000 * 5).toISOString();
  const maxFileSizeMB = assignmentConfig?.maxFileSizeMB || 25;
  const rubricCriteria = assignmentConfig?.rubricCriteria || [
    { id: "c1", name: "Methodology & Architecture", maxPoints: 15, description: "Clear decomposition of aggregates." },
    { id: "c2", name: "Accuracy & Proofs", maxPoints: 15, description: "Correct fault-tolerant proofs." },
    { id: "c3", name: "Documentation & Formatting", maxPoints: 5, description: "Clean PDF formatting." }
  ];
  const passingScore = assignmentConfig?.passingScore || 70;

  // Active submission state
  const [submission, setSubmission] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Load existing student submission on mount
  useEffect(() => {
    if (courseId && moduleId && studentId) {
      const existing = AssessmentService.getStudentAssignmentSubmission(courseId, moduleId, studentId);
      if (existing) {
        setSubmission(existing);
        if (existing.passed && onCompleted) {
          onCompleted(existing);
        }
      }
    }
  }, [courseId, moduleId, studentId, onCompleted]);

  // Handle Drag & Drop validation
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFileUpload(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const processFileUpload = (file) => {
    setErrorMessage("");

    // MIME Validation: strict application/pdf
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Invalid file type: Only PDF documents (.pdf) are permitted for homework submission.");
      return;
    }

    // Size Validation
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`File exceeds the maximum size limit of ${maxFileSizeMB} MB.`);
      return;
    }

    // Simulate Direct-to-Storage Presigned Upload with progress bar
    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          finishUpload(file);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const finishUpload = (file) => {
    // Generate object URL for in-browser viewing
    const fileUrl = URL.createObjectURL(file);

    const newSub = AssessmentService.submitStudentAssignment({
      courseId,
      moduleId,
      studentUserId: studentId,
      studentName,
      studentEmail,
      file,
      fileUrl,
      pageCount: 4
    });

    setSubmission(newSub);
    setIsUploading(false);
    setUploadProgress(0);
    setShowReplaceConfirm(false);
  };

  const isGraded = submission?.status === "GRADED";
  const isRevisionRequested = submission?.status === "REVISION_REQUESTED";
  const isPendingReview = submission?.status === "PENDING_REVIEW";

  const totalRubricPoints = rubricCriteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

  return (
    <div className={`space-y-6 max-w-3xl mx-auto py-2 ${className}`}>
      {/* 1. Assignment Briefing Card */}
      <Card className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-400 border-indigo-400/30 bg-indigo-500/10">
                PDF Homework Assessment
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {totalRubricPoints} Total Points · Passing: {passingScore}%
              </Badge>
            </div>
            <h3 className="text-xl font-extrabold text-foreground">{title}</h3>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border shrink-0">
            <Clock size={18} className="text-primary" weight="bold" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-tight">Due Deadline</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground">Assignment Prompt & Instructions:</p>
          <p>{instructions}</p>
        </div>

        {/* Question Sheet Download Link */}
        {templatePdfUrl && (
          <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FilePdf size={22} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                  {assignmentConfig?.templateFileName || "Assignment_Question_Sheet_Template.pdf"}
                </p>
                <span className="text-[10px] text-muted-foreground font-mono">Instructor Prompt Handout (PDF)</span>
              </div>
            </div>

            <a
              href={templatePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 shrink-0"
            >
              <span>Download Question Sheet</span>
              <ArrowSquareOut size={14} weight="bold" />
            </a>
          </div>
        )}

        {/* Rubric Criteria Accordion / Card */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <SlidersHorizontal size={14} weight="bold" />
            <span>Grading Rubric Breakdown ({rubricCriteria.length} Criteria)</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {rubricCriteria.map((c) => (
              <div key={c.id || c.name} className="p-3 rounded-xl border border-border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {c.maxPoints} pts
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Status Banners: Graded OR Revision Requested OR Pending Review */}
      {isGraded && (
        <Card className={`p-6 rounded-2xl border space-y-4 shadow-xs ${
          submission.passed 
            ? "border-emerald-500/40 bg-emerald-500/5" 
            : "border-destructive/40 bg-destructive/5"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                submission.passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              }`}>
                <CheckCircle size={28} weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={submission.passed ? "success" : "destructive"} className="text-xs font-bold uppercase">
                    {submission.passed ? "Graded · Passed" : "Graded · Needs Revision"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Graded on {new Date(submission.gradedAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-lg font-extrabold text-foreground">
                  Score: {submission.totalScore} / {submission.maxScore} ({submission.percentage}%)
                </h4>
              </div>
            </div>
          </div>

          {/* Instructor Feedback Commentary */}
          {submission.feedbackText && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ChatText size={15} weight="bold" className="text-primary" />
                <span>Instructor Commentary & Evaluation:</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{submission.feedbackText}</p>
              {submission.suggestedImprovements && (
                <div className="pt-2 border-t border-border/60 text-xs">
                  <span className="font-semibold text-primary">Suggested Action Items: </span>
                  <span className="text-muted-foreground">{submission.suggestedImprovements}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {isRevisionRequested && (
        <Card className="p-5 rounded-2xl border border-amber-500/40 bg-amber-500/5 space-y-3">
          <div className="flex items-start gap-3">
            <WarningCircle size={24} weight="bold" className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30">
                Action Required · Revision Requested
              </Badge>
              <h4 className="text-sm font-bold text-foreground">Instructor requested a revision for this assignment</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {submission.feedbackText || "Please revise your work based on feedback and upload an updated PDF before the extended deadline."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Direct-to-Storage Dropzone & Version Control */}
      {(!submission || isRevisionRequested || showReplaceConfirm) ? (
        <Card className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">
              {submission ? "Upload Revised Document (Draft & Version Control)" : "Submit Homework PDF"}
            </h4>
            <span className="text-xs text-muted-foreground font-mono">Max: {maxFileSizeMB} MB · Format: PDF Only</span>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive font-medium flex items-center gap-2">
              <WarningCircle size={16} weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Interactive Drag & Drop Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-3 cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/50 bg-background/50 hover:bg-muted/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <UploadSimple size={28} weight="bold" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Drag & Drop your completed PDF here, or <span className="text-primary underline">browse local files</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Standard PDF (application/pdf) up to {maxFileSizeMB} MB. Uploaded directly to secure cloud storage.
              </p>
            </div>

            {/* Upload Progress Animation */}
            {isUploading && (
              <div className="w-full max-w-xs space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Uploading to Object Storage...</span>
                  <span className="font-bold text-primary">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* 4. Active Submission Receipt & Metadata View */
        <Card className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                Receipt Verified
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                Version {submission.version}
              </Badge>
              <Badge variant={isPendingReview ? "outline" : "default"} className="text-xs font-bold">
                {submission.status.replace("_", " ")}
              </Badge>
            </div>

            {/* Replace / Re-upload before deadline */}
            {!isGraded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplaceConfirm(true)}
                className="gap-1.5 font-bold text-xs h-8 cursor-pointer"
              >
                <ArrowsClockwise size={13} weight="bold" />
                <span>Replace Submission</span>
              </Button>
            )}
          </div>

          {/* Submission Metadata Receipt Grid */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FilePdf size={22} weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{submission.fileName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {submission.fileSizeText} · {submission.pageCount} Pages · Submitted on{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/20 bg-card shrink-0"
              >
                <Eye size={14} weight="bold" /> View PDF
              </a>
            </div>

            <div className="pt-2 border-t border-border flex flex-col sm:flex-row justify-between text-[11px] font-mono text-muted-foreground gap-1">
              <span className="truncate">Cryptographic Hash: {submission.fileHash}</span>
              <span className="text-emerald-500 font-bold shrink-0">✓ Immutable Receipt Generated</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
