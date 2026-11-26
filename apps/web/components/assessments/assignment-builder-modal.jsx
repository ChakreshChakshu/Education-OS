"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MediaUploader } from "@/components/ui/media-uploader";
import {
  X,
  Plus,
  Trash,
  FilePdf,
  CalendarCheck,
  SlidersHorizontal,
  CheckCircle,
  Clock,
  Sparkle,
  UploadSimple,
  ArrowSquareOut,
  Info
} from "@phosphor-icons/react";

export function AssignmentBuilderModal({ isOpen, ...props }) {
  return isOpen ? <AssignmentBuilderForm {...props} /> : null;
}

function AssignmentBuilderForm({
  onClose,
  initialAssignment,
  onSave,
  moduleTitle = ""
}) {
  // Active tab: "briefing" | "rubric" | "settings"
  const [activeTab, setActiveTab] = useState("briefing");

  // Meta
  const [title, setTitle] = useState(
    initialAssignment?.title || moduleTitle || "Homework & Problem Set Assignment"
  );
  const [instructions, setInstructions] = useState(
    initialAssignment?.instructions ||
      "Download the problem set template below. Work through the architectural proofs and upload your final synthesized response in a single PDF document before the deadline."
  );

  // Template / Question Sheet PDF
  const [templatePdfUrl, setTemplatePdfUrl] = useState(
    initialAssignment?.templatePdfUrl ||
      initialAssignment?.contentUrl ||
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  );
  const [templateFileName, setTemplateFileName] = useState(
    initialAssignment?.templateFileName || "Assignment_Briefing_Template.pdf"
  );

  // Deadline & Policies
  const [dueDate, setDueDate] = useState(() => {
    if (initialAssignment?.dueDate) return initialAssignment.dueDate;
    // Default 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(
    initialAssignment?.allowLateSubmissions !== undefined ? initialAssignment.allowLateSubmissions : true
  );
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(initialAssignment?.maxFileSizeMB || 25);

  // Rubric Criteria
  const [rubricCriteria, setRubricCriteria] = useState(() => {
    if (Array.isArray(initialAssignment?.rubricCriteria) && initialAssignment.rubricCriteria.length > 0) {
      return initialAssignment.rubricCriteria;
    }
    return [
      {
        id: "crit_1",
        name: "Methodology & Architecture Design",
        description: "Clear decomposition of bounded contexts, aggregate roots, and transactional consistency boundaries.",
        maxPoints: 15
      },
      {
        id: "crit_2",
        name: "Analytical Accuracy & Proofs",
        description: "Correct mathematical proofs or system sequence diagrams verifying fault tolerance and zero data loss.",
        maxPoints: 15
      },
      {
        id: "crit_3",
        name: "Documentation & Formatting Standard",
        description: "Adherence to institutional PDF formatting guidelines, clean typography, and legible diagrams.",
        maxPoints: 5
      }
    ];
  });

  const [passingScore, setPassingScore] = useState(initialAssignment?.passingScore || 70);

  const totalPoints = rubricCriteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

  const handleAddCriterion = () => {
    setRubricCriteria([
      ...rubricCriteria,
      {
        id: `crit_${Date.now()}`,
        name: "New Assessment Criterion",
        description: "Describe grading expectations for full points...",
        maxPoints: 10
      }
    ]);
  };

  const handleRemoveCriterion = (idx) => {
    if (rubricCriteria.length <= 1) {
      alert("An assignment must have at least one rubric criterion.");
      return;
    }
    setRubricCriteria(rubricCriteria.filter((_, i) => i !== idx));
  };

  const handleUpdateCriterion = (idx, field, value) => {
    const updated = [...rubricCriteria];
    updated[idx] = {
      ...updated[idx],
      [field]: field === "maxPoints" ? Math.max(1, parseInt(value) || 1) : value
    };
    setRubricCriteria(updated);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide an assignment title.");
      return;
    }

    const payload = {
      title,
      instructions,
      templatePdfUrl,
      templateFileName,
      dueDate,
      allowLateSubmissions,
      maxFileSizeMB: Number(maxFileSizeMB) || 25,
      rubricCriteria,
      totalPoints,
      passingScore: Number(passingScore) || 70,
      contentType: "ASSIGNMENT",
      contentUrl: templatePdfUrl
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border p-5 bg-card shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-400 border-indigo-400/30 bg-indigo-500/10">
                Type B · PDF Submission Assessment
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {rubricCriteria.length} Rubric Criteria · {totalPoints} Total Pts
              </Badge>
            </div>
            <CardTitle className="text-xl font-extrabold truncate text-foreground">
              {title || "Assignment & Rubric Authoring Workbench"}
            </CardTitle>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </CardHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/20 px-5 text-sm font-bold gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("briefing")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "briefing"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FilePdf size={17} weight="bold" />
            <span>Assignment Brief & Template PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rubric")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "rubric"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal size={17} weight="bold" />
            <span>Grading Rubric ({rubricCriteria.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarCheck size={17} weight="bold" />
            <span>Deadlines & Upload Rules</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: BRIEFING & TEMPLATE PDF */}
          {/* ============================================================ */}
          {activeTab === "briefing" && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Assignment Title</label>
                <Input
                  required
                  placeholder="e.g. Distributed Sagas & Idempotency Lab Report"
                  className="h-11 text-base font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Instructions & Problem Statement
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed guidelines for students: formatting requirements, required questions to answer, citation guidelines..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {/* Template PDF Uploader */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Question Sheet / Handout Template (PDF)
                  </label>
                  {templatePdfUrl && (
                    <a
                      href={templatePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <ArrowSquareOut size={13} weight="bold" /> Preview Current Handout
                    </a>
                  )}
                </div>

                <MediaUploader
                  accept="application/pdf"
                  onUploadSuccess={(fileUrl, fileName) => {
                    setTemplatePdfUrl(fileUrl);
                    if (fileName) setTemplateFileName(fileName);
                  }}
                />

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Or Direct Template Document URL</label>
                  <Input
                    placeholder="https://storage.provider/assignments/problem-set-1.pdf"
                    className="h-10 text-xs font-mono"
                    value={templatePdfUrl}
                    onChange={(e) => setTemplatePdfUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: GRADING RUBRIC BUILDER */}
          {/* ============================================================ */}
          {activeTab === "rubric" && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <h4 className="text-base font-bold text-foreground">Scoring Rubric Definition</h4>
                  <p className="text-xs text-muted-foreground">
                    Criteria used by instructors in the split-screen grading workbench to allocate points.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    Total: {totalPoints} Points
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1 font-bold text-xs h-8 cursor-pointer"
                    onClick={handleAddCriterion}
                  >
                    <Plus size={13} weight="bold" /> Add Criterion
                  </Button>
                </div>
              </div>

              {/* Rubric Criteria Cards */}
              <div className="space-y-3">
                {rubricCriteria.map((crit, idx) => (
                  <Card key={crit.id || idx} className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0">
                          #{idx + 1}
                        </span>
                        <Input
                          placeholder="Criterion Name (e.g. Methodology, Architectural Proof)"
                          className="h-9 text-sm font-bold flex-1"
                          value={crit.name}
                          onChange={(e) => handleUpdateCriterion(idx, "name", e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-semibold">Max Points:</span>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            className="h-9 w-20 text-center font-mono font-bold text-xs"
                            value={crit.maxPoints}
                            onChange={(e) => handleUpdateCriterion(idx, "maxPoints", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          title="Delete criterion"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        placeholder="Pedagogical grading expectations (e.g. Student must address the transactional outbox table, event dispatcher, and failure recovery)..."
                        className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        value={crit.description}
                        onChange={(e) => handleUpdateCriterion(idx, "description", e.target.value)}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: DEADLINES & UPLOAD POLICIES */}
          {/* ============================================================ */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CalendarCheck size={16} className="text-primary" weight="bold" />
                    <span>Submission Due Date & Time</span>
                  </label>
                  <Input
                    type="datetime-local"
                    className="h-10 text-xs font-mono font-bold"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Enforces countdown deadline in student viewer.</p>
                </div>

                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CheckCircle size={16} className="text-emerald-500" weight="bold" />
                    <span>Passing Score (%)</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className="h-10 text-base font-bold font-mono"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                  />
                  <p className="text-[11px] text-muted-foreground">Rubric percentage required to complete lesson.</p>
                </div>
              </div>

              {/* Upload Dropzone Settings */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Storage & MIME Validation
                </span>

                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">Maximum PDF File Size</p>
                      <p className="text-xs text-muted-foreground">
                        Enforces client-side validation against oversized file abuse.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        className="h-9 w-20 text-center font-bold font-mono text-xs"
                        value={maxFileSizeMB}
                        onChange={(e) => setMaxFileSizeMB(parseInt(e.target.value) || 25)}
                      />
                      <span className="text-xs font-bold text-muted-foreground">MB</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">Allow Late Submissions</p>
                      <p className="text-xs text-muted-foreground">
                        Marks submissions past due date as LATE_SUBMISSION in the grading queue.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowLateSubmissions}
                      onChange={(e) => setAllowLateSubmissions(e.target.checked)}
                      className="h-5 w-5 rounded border-border text-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border bg-muted/20 shrink-0">
          <div className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Rubric: {rubricCriteria.length} criteria · {totalPoints} points total · Due: {new Date(dueDate).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" size="md" onClick={onClose} className="font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              size="md"
              className="font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
              onClick={handleSave}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
