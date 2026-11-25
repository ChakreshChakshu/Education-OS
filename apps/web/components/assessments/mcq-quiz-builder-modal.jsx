"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  X,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Clock,
  Sparkle,
  SlidersHorizontal,
  Eye,
  CheckSquare,
  RadioButton,
  ToggleLeft,
  Question,
  Info,
  ArrowsClockwise
} from "@phosphor-icons/react";

export function McqQuizBuilderModal({
  isOpen,
  onClose,
  initialQuiz,
  onSave,
  moduleTitle = ""
}) {
  if (!isOpen) return null;

  // Active builder tab: "questions" | "settings" | "preview"
  const [activeTab, setActiveTab] = useState("questions");

  // Quiz Header / Meta
  const [title, setTitle] = useState(initialQuiz?.title || moduleTitle || "Module Knowledge Check");
  const [description, setDescription] = useState(
    initialQuiz?.description || "Answer all questions. Passing score is required to unlock subsequent course modules."
  );

  // Settings
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initialQuiz?.timeLimitMinutes !== undefined ? initialQuiz.timeLimitMinutes : (initialQuiz?.timeLimit || 15)
  );
  const [passingScore, setPassingScore] = useState(initialQuiz?.passingScore || 70);
  const [maxAttempts, setMaxAttempts] = useState(
    initialQuiz?.maxAttempts !== undefined ? initialQuiz.maxAttempts : 3
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(initialQuiz?.shuffleQuestions));
  const [shuffleOptions, setShuffleOptions] = useState(Boolean(initialQuiz?.shuffleOptions));

  // Multi-Question State
  const [questions, setQuestions] = useState(() => {
    if (Array.isArray(initialQuiz?.questions) && initialQuiz.questions.length > 0) {
      return initialQuiz.questions;
    }
    // Normalize legacy single-question quiz if present
    if (initialQuiz?.question) {
      const correctKey = initialQuiz.correct || "A";
      return [
        {
          id: "q_1",
          questionType: "SINGLE_CHOICE",
          title: initialQuiz.question,
          points: 10,
          explanation: "In Domain-Driven Design, consistency boundaries are strictly maintained by the Aggregate Root.",
          options: (initialQuiz.options || [
            { key: "A", text: "Domain Aggregate Root" },
            { key: "B", text: "Database ORM Model" },
            { key: "C", text: "REST API Endpoint Route" },
            { key: "D", text: "Microservice Container" }
          ]).map((opt, i) => ({
            id: opt.key || `opt_${i}`,
            key: opt.key || String.fromCharCode(65 + i),
            label: opt.text || opt.label || "",
            isCorrect: (opt.key || String.fromCharCode(65 + i)) === correctKey
          }))
        }
      ];
    }

    // Default starter question
    return [
      {
        id: "q_1",
        questionType: "SINGLE_CHOICE",
        title: "What is the primary architectural boundary for transaction consistency in Domain-Driven Design?",
        points: 10,
        explanation: "The Aggregate Root encapsulates domain entities and ensures all business invariant rules are validated in a single atomic transaction.",
        options: [
          { id: "opt_1", key: "A", label: "Domain Aggregate Root", isCorrect: true },
          { id: "opt_2", key: "B", label: "Relational Database Foreign Key", isCorrect: false },
          { id: "opt_3", key: "C", label: "GraphQL Schema Resolver", isCorrect: false },
          { id: "opt_4", key: "D", label: "API Gateway Reverse Proxy", isCorrect: false }
        ]
      }
    ];
  });

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Preview testing state
  const [previewAnswers, setPreviewAnswers] = useState({});

  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  const handleAddQuestion = (type = "SINGLE_CHOICE") => {
    const newQ = {
      id: `q_${Date.now()}`,
      questionType: type,
      title: "",
      points: 10,
      explanation: "",
      options:
        type === "TRUE_FALSE"
          ? [
              { id: "opt_tf_1", key: "A", label: "True", isCorrect: true },
              { id: "opt_tf_2", key: "B", label: "False", isCorrect: false }
            ]
          : [
              { id: `opt_${Date.now()}_1`, key: "A", label: "First Option", isCorrect: true },
              { id: `opt_${Date.now()}_2`, key: "B", label: "Second Option", isCorrect: false },
              { id: `opt_${Date.now()}_3`, key: "C", label: "Third Option", isCorrect: false },
              { id: `opt_${Date.now()}_4`, key: "D", label: "Fourth Option", isCorrect: false }
            ]
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setActiveQuestionIndex(updated.length - 1);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      alert("An assessment must have at least one question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, idx - 1));
  };

  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
    setActiveQuestionIndex(targetIdx);
  };

  const updateActiveQuestion = (field, value) => {
    const updated = [...questions];
    updated[activeQuestionIndex] = {
      ...updated[activeQuestionIndex],
      [field]: value
    };
    setQuestions(updated);
  };

  const handleOptionChange = (optIdx, field, value) => {
    const updated = [...questions];
    const currentQ = { ...updated[activeQuestionIndex] };
    const opts = [...currentQ.options];

    if (field === "isCorrect") {
      if (currentQ.questionType === "SINGLE_CHOICE" || currentQ.questionType === "TRUE_FALSE") {
        // Only one correct option
        opts.forEach((o, i) => {
          o.isCorrect = i === optIdx;
        });
      } else {
        // MULTIPLE_CHOICE checkboxes
        opts[optIdx] = { ...opts[optIdx], isCorrect: value };
      }
    } else {
      opts[optIdx] = { ...opts[optIdx], [field]: value };
    }

    currentQ.options = opts;
    updated[activeQuestionIndex] = currentQ;
    setQuestions(updated);
  };

  const handleAddOption = () => {
    const updated = [...questions];
    const currentQ = { ...updated[activeQuestionIndex] };
    const nextKey = String.fromCharCode(65 + currentQ.options.length);
    currentQ.options = [
      ...currentQ.options,
      { id: `opt_${Date.now()}`, key: nextKey, label: "", isCorrect: false }
    ];
    updated[activeQuestionIndex] = currentQ;
    setQuestions(updated);
  };

  const handleRemoveOption = (optIdx) => {
    const updated = [...questions];
    const currentQ = { ...updated[activeQuestionIndex] };
    if (currentQ.options.length <= 2) {
      alert("A question must have at least two choices.");
      return;
    }
    currentQ.options = currentQ.options.filter((_, i) => i !== optIdx);
    updated[activeQuestionIndex] = currentQ;
    setQuestions(updated);
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleSaveQuiz = (e) => {
    e.preventDefault();
    if (!title) {
      alert("Please provide an assessment title.");
      return;
    }

    // Validation: check each question has at least one correct option
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        alert(`Question #${i + 1} is missing a question prompt.`);
        setActiveQuestionIndex(i);
        setActiveTab("questions");
        return;
      }
      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        alert(`Question #${i + 1} has no correct answer selected. Please choose the correct choice.`);
        setActiveQuestionIndex(i);
        setActiveTab("questions");
        return;
      }
    }

    const payload = {
      title,
      description,
      timeLimitMinutes: Number(timeLimitMinutes) || 0,
      passingScore: Number(passingScore) || 70,
      maxAttempts: Number(maxAttempts) || 0,
      shuffleQuestions,
      shuffleOptions,
      totalPoints,
      questions,
      // Backwards-compatible legacy single-question summary
      question: questions[0]?.title || "",
      options: questions[0]?.options.map((o) => ({ key: o.key, text: o.label })) || [],
      correct: questions[0]?.options.find((o) => o.isCorrect)?.key || "A"
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
              <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 bg-primary/10">
                Type A · MCQ Assessment Engine
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono font-bold">
                {questions.length} Question{questions.length !== 1 ? "s" : ""} · {totalPoints} Total Pts
              </Badge>
            </div>
            <CardTitle className="text-xl font-extrabold truncate text-foreground">
              {title || "Assessment Authoring Workbench"}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </CardHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/20 px-5 text-sm font-bold gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "questions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckSquare size={17} weight="bold" />
            <span>Questions & Answer Key ({questions.length})</span>
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
            <SlidersHorizontal size={17} weight="bold" />
            <span>Settings & Rules</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "preview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye size={17} weight="bold" />
            <span>Interactive Student Preview</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: QUESTION BUILDER */}
          {/* ============================================================ */}
          {activeTab === "questions" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Question Navigator */}
              <div className="md:col-span-4 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Question Index ({questions.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-bold gap-1 cursor-pointer"
                      onClick={() => handleAddQuestion("SINGLE_CHOICE")}
                    >
                      <Plus size={12} weight="bold" /> Add Question
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {questions.map((q, idx) => {
                    const isSelected = idx === activeQuestionIndex;
                    return (
                      <div
                        key={q.id || idx}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`h-6 w-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {q.title || `Untitled Question ${idx + 1}`}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {q.questionType} · {q.points} pt{q.points !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Order & Delete */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 text-destructive/70 hover:text-destructive cursor-pointer"
                            title="Delete question"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Question Editor */}
              <div className="md:col-span-8 space-y-4 bg-muted/20 p-5 rounded-2xl border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      Editing Question #{activeQuestionIndex + 1}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Question Type Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-semibold">Type:</span>
                      <select
                        value={activeQuestion?.questionType || "SINGLE_CHOICE"}
                        onChange={(e) => updateActiveQuestion("questionType", e.target.value)}
                        className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-bold text-foreground"
                      >
                        <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice (Checkboxes)</option>
                        <option value="TRUE_FALSE">True / False</option>
                      </select>
                    </div>

                    {/* Points Weighting */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-semibold">Points:</span>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        className="h-8 w-16 text-center font-bold text-xs"
                        value={activeQuestion?.points || 1}
                        onChange={(e) => updateActiveQuestion("points", Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>
                </div>

                {/* Question Title Prompt */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Question Prompt</span>
                    <span className="text-[11px] font-mono text-primary font-normal">Markdown / Rich text supported</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. What is the role of an Aggregate Root in clean DDD architecture?"
                    className="h-11 text-sm font-semibold"
                    value={activeQuestion?.title || ""}
                    onChange={(e) => updateActiveQuestion("title", e.target.value)}
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Answer Choices & Correct Key
                    </span>
                    {activeQuestion?.questionType !== "TRUE_FALSE" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs font-bold text-primary gap-1 cursor-pointer"
                        onClick={handleAddOption}
                      >
                        <Plus size={12} weight="bold" /> Add Option
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {activeQuestion?.options?.map((opt, optIdx) => {
                      const isCorrect = opt.isCorrect;
                      return (
                        <div
                          key={opt.id || optIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-border bg-background"
                          }`}
                        >
                          {/* Radio / Checkbox indicator button */}
                          <button
                            type="button"
                            onClick={() => handleOptionChange(optIdx, "isCorrect", !isCorrect)}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-colors ${
                              isCorrect
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            title={isCorrect ? "Marked as Correct Answer" : "Click to mark as correct answer"}
                          >
                            {isCorrect ? "✓" : opt.key || String.fromCharCode(65 + optIdx)}
                          </button>

                          <Input
                            placeholder={`Option ${opt.key || String.fromCharCode(65 + optIdx)} text...`}
                            className="h-9 text-xs font-medium flex-1 bg-transparent border-none focus-visible:ring-1"
                            value={opt.label}
                            onChange={(e) => handleOptionChange(optIdx, "label", e.target.value)}
                          />

                          {/* Delete option */}
                          {activeQuestion?.questionType !== "TRUE_FALSE" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(optIdx)}
                              className="p-1 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                              title="Delete option"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Click the letter button to designate the correct answer key.
                    {activeQuestion?.questionType === "MULTIPLE_CHOICE" && " You can mark multiple options as correct."}
                  </p>
                </div>

                {/* Pedagogical Explanation & Rationale */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Sparkle size={14} className="text-primary" weight="bold" />
                    <span>Pedagogical Explanation & Rationale</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide an explanation revealed to students post-submission to reinforce learning (e.g. 'Aggregate Roots encapsulate domain entities to guarantee invariant consistency...')"
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground font-normal resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    value={activeQuestion?.explanation || ""}
                    onChange={(e) => updateActiveQuestion("explanation", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: SETTINGS & POLICIES */}
          {/* ============================================================ */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Assessment Title</label>
                <Input
                  required
                  placeholder="e.g. Unit 3 Architectural Assessment Quiz"
                  className="h-11 text-base font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Description & Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Instructions presented to student before starting the countdown timer..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Clock size={15} className="text-primary" weight="bold" />
                    <span>Time Limit (Mins)</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 = Unlimited"
                    className="h-10 text-base font-bold font-mono"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-muted-foreground">0 disables countdown auto-submission.</p>
                </div>

                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-500" weight="bold" />
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
                  <p className="text-[11px] text-muted-foreground">Threshold to mark module complete.</p>
                </div>

                <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                  <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <ArrowsClockwise size={15} className="text-indigo-400" weight="bold" />
                    <span>Max Attempts</span>
                  </label>
                  <select
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 0)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm font-bold text-foreground"
                  >
                    <option value={1}>1 Attempt (Strict Exam)</option>
                    <option value={3}>3 Attempts (Recommended)</option>
                    <option value={5}>5 Attempts</option>
                    <option value={0}>Unlimited Attempts</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">Enforces student retake ceiling.</p>
                </div>
              </div>

              {/* Shuffling & Integrity Toggles */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Security & Anti-Collusion Randomization
                </span>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Shuffle Question Order</p>
                    <p className="text-xs text-muted-foreground">
                      Randomizes question order per student attempt to prevent side-by-side cheating.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="h-5 w-5 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Shuffle Options Order</p>
                    <p className="text-xs text-muted-foreground">
                      Randomizes choice letter positions (A, B, C, D) dynamically per attempt.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="h-5 w-5 rounded border-border text-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: FAST INTERACTIVE PREVIEW */}
          {/* ============================================================ */}
          {activeTab === "preview" && (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-foreground">{title}</h4>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {timeLimitMinutes > 0 ? `${timeLimitMinutes} Mins` : "Untimed"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-5">
                {questions.map((q, idx) => (
                  <Card key={q.id || idx} className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-primary uppercase font-mono">
                        Question #{idx + 1} ({q.points} pt{q.points !== 1 ? "s" : ""})
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.questionType}
                      </Badge>
                    </div>
                    <h5 className="text-sm font-bold text-foreground">{q.title}</h5>

                    <div className="space-y-2 pt-1">
                      {q.options?.map((opt) => {
                        const isSelected = previewAnswers[q.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setPreviewAnswers({
                                ...previewAnswers,
                                [q.id]: opt.id
                              })
                            }
                            className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border bg-background text-foreground hover:border-primary/40"
                            }`}
                          >
                            <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                              {opt.key}
                            </span>
                            <span className="flex-1">{opt.label}</span>
                            {opt.isCorrect && (
                              <span className="text-[10px] text-emerald-500 font-bold shrink-0">
                                (Author Key)
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
                        <strong>Pedagogical Rationale:</strong> {q.explanation}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border bg-muted/20 shrink-0">
          <div className="text-xs text-muted-foreground font-medium hidden sm:inline">
            {questions.length} questions configured · {totalPoints} total points · Passing threshold: {passingScore}%
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" size="md" onClick={onClose} className="font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              size="md"
              className="font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
              onClick={handleSaveQuiz}
            >
              Save Assessment
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
