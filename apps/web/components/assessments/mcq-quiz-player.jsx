"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { ApiClient } from "@/lib/api";
import {
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CheckSquare,
  Trophy,
  Hourglass
} from "@phosphor-icons/react";

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getQuestions(quiz) {
  const questions = quiz?.questions?.length
    ? quiz.questions
    : quiz?.question ? [{
        id: "q_legacy_1",
        title: quiz.question,
        questionType: "SINGLE_CHOICE",
        points: 10,
        options: (quiz.options || []).map((option) => ({
          id: option.id || option.key,
          key: option.key,
          label: option.label || option.text
        }))
      }] : [];
  const ordered = quiz?.shuffleQuestions ? shuffle(questions) : questions;
  return ordered.map((question) => ({
    ...question,
    options: quiz?.shuffleOptions ? shuffle(question.options) : question.options
  }));
}

export function McqQuizPlayer({
  quizConfig,
  moduleId,
  preview = false,
  onCompleted,
  className = ""
}) {
  const timeLimitSeconds = (quizConfig?.timeLimitMinutes ?? quizConfig?.timeLimit ?? 0) * 60;
  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(() => getQuestions(quizConfig), [quizConfig]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const submitting = useRef(false);
  const autoSubmitted = useRef(false);

  const performSubmission = useCallback(async () => {
    if (preview || submitting.current || evaluationResult) return;
    submitting.current = true;
    setIsEvaluating(true);
    setShowReviewModal(false);
    setSubmissionError("");

    try {
      const response = await ApiClient.submitQuiz({ lessonModuleId: moduleId, answers: selectedAnswers });
      if (!response.success) {
        setSubmissionError(response.error || "Could not submit quiz. Try again.");
        return;
      }

      setEvaluationResult(response.data);
      if (response.data.passed) onCompleted?.(response.data);
    } finally {
      submitting.current = false;
      setIsEvaluating(false);
    }
  }, [preview, moduleId, selectedAnswers, evaluationResult, onCompleted]);

  useEffect(() => {
    if (preview || timeLimitSeconds <= 0 || evaluationResult || timeRemaining <= 0) return;
    const timer = setTimeout(() => setTimeRemaining((remaining) => remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [preview, timeLimitSeconds, evaluationResult, timeRemaining]);

  useEffect(() => {
    if (timeLimitSeconds <= 0 || timeRemaining > 0 || autoSubmitted.current || !questions.length) return;
    autoSubmitted.current = true;
    void performSubmission();
  }, [timeLimitSeconds, timeRemaining, questions.length, performSubmission]);

  const formatTimer = (totalSec) => {
    if (totalSec <= 0) return "00:00";
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const timerPercent = timeLimitSeconds > 0 
    ? Math.max(0, Math.min(100, Math.round((timeRemaining / timeLimitSeconds) * 100))) 
    : 100;

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const currentQId = currentQuestion?.id;

  // Option selection
  const handleSelectOption = (optId) => {
    if (submitting.current || evaluationResult) return;

    if (currentQuestion?.questionType === "MULTIPLE_CHOICE") {
      const currentSelected = selectedAnswers[currentQId] || [];
      const isAlready = currentSelected.includes(optId);
      const next = isAlready 
        ? currentSelected.filter(id => id !== optId) 
        : [...currentSelected, optId];
      setSelectedAnswers({ ...selectedAnswers, [currentQId]: next });
    } else {
      // SINGLE_CHOICE or TRUE_FALSE
      setSelectedAnswers({ ...selectedAnswers, [currentQId]: [optId] });
    }
  };

  const toggleFlagQuestion = (qId) => {
    const next = new Set(flaggedQuestions);
    if (next.has(qId)) {
      next.delete(qId);
    } else {
      next.add(qId);
    }
    setFlaggedQuestions(next);
  };

  const handleRetake = () => {
    setAttempt((previous) => previous + 1);
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setTimeRemaining(timeLimitSeconds);
    setEvaluationResult(null);
    setCurrentQuestionIndex(0);
    autoSubmitted.current = false;
  };

  const answeredCount = Object.values(selectedAnswers).filter((answers) => answers.length > 0).length;
  const maxAttempts = quizConfig?.maxAttempts;

  if (!questions.length) {
    return <p className="text-sm text-muted-foreground">This quiz has no questions available.</p>;
  }

  // ============================================================
  // POST-SUBMISSION DETAILED RESULT SUMMARY VIEW
  // ============================================================
  if (evaluationResult) {
    const isPass = evaluationResult.passed;
    return (
      <div className={`space-y-6 max-w-3xl mx-auto py-2 animate-in fade-in duration-200 ${className}`}>
        {/* Scorecard Hero Banner */}
        <Card className={`p-6 md:p-8 rounded-2xl border text-center space-y-4 shadow-sm ${
          isPass 
            ? "border-emerald-500/30 bg-emerald-500/5 text-foreground" 
            : "border-amber-500/30 bg-amber-500/5 text-foreground"
        }`}>
          <div className="flex justify-center">
            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center shadow-xs ${
              isPass 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            }`}>
              {isPass ? <Trophy size={42} weight="bold" /> : <Hourglass size={42} weight="bold" />}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Badge variant={isPass ? "success" : "secondary"} className="text-xs font-mono font-bold uppercase px-3 py-1">
                {isPass ? "Assessment Passed" : "Passing Threshold Not Met"}
              </Badge>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {evaluationResult.score}% Score
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              You scored {evaluationResult.totalPointsEarned} out of {evaluationResult.totalPointsAvailable} points (Minimum required: {evaluationResult.passingScore}%)
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {(!maxAttempts || attempt + 1 < maxAttempts) && (
              <Button
                variant={isPass ? "outline" : "default"}
                size="md"
                onClick={handleRetake}
                className="gap-2 font-bold cursor-pointer"
              >
                <ArrowsClockwise size={16} weight="bold" />
                <span>Retake Assessment</span>
              </Button>
            )}
          </div>
        </Card>

      </div>
    );
  }

  // ============================================================
  // ACTIVE TEST-TAKING EXPERIENCE
  // ============================================================
  return (
    <div className={`space-y-5 max-w-3xl mx-auto py-2 ${className}`}>
      {/* Top Test Header: Title, Countdown Timer, Security Badge */}
      <Card className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/30">
                {preview ? "Quiz preview" : "Knowledge Assessment"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {answeredCount} of {questions.length} Answered
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-foreground">{quizConfig?.title || "Knowledge Assessment"}</h3>
          </div>

          {/* Enforced Countdown Timer Bar */}
          {!preview && timeLimitSeconds > 0 && (
            <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border border-border shrink-0">
              <Clock
                size={20}
                weight="bold"
                className={timeRemaining < 60 ? "text-destructive animate-pulse" : timeRemaining < 300 ? "text-amber-500" : "text-primary"}
              />
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-tight">Time Remaining</span>
                <span className="text-base font-extrabold font-mono tracking-tight text-foreground">
                  {formatTimer(timeRemaining)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timer Progress Bar */}
        {!preview && timeLimitSeconds > 0 && (
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeRemaining < 60 ? "bg-destructive" : timeRemaining < 300 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}
      </Card>

      {/* Multi-Question Navigator Grid & Flag Bar */}
      <div className="p-3.5 rounded-2xl border border-border bg-card/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Questions:</span>
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const isAnswered = selectedAnswers[q.id]?.length > 0;
            const isFlagged = flaggedQuestions.has(q.id);

            let btnStyle = "border-border bg-background text-foreground hover:border-primary/50";
            if (isCurrent) {
              btnStyle = "ring-2 ring-primary border-primary bg-primary/20 text-primary font-extrabold";
            } else if (isFlagged) {
              btnStyle = "border-amber-500/70 bg-amber-500/20 text-amber-400 font-bold";
            } else if (isAnswered) {
              btnStyle = "border-primary/60 bg-primary/10 text-primary font-bold";
            }

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`h-8 w-8 rounded-xl border text-xs flex items-center justify-center transition-all cursor-pointer relative ${btnStyle}`}
                title={`Question ${idx + 1}${isFlagged ? " (Flagged)" : ""}${isAnswered ? " (Answered)" : ""}`}
              >
                <span>{idx + 1}</span>
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Flag for Review Toggle */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => toggleFlagQuestion(currentQId)}
          className={`h-8 text-xs font-bold gap-1.5 cursor-pointer ${
            flaggedQuestions.has(currentQId)
              ? "border-amber-500 text-amber-400 bg-amber-500/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flag size={14} weight={flaggedQuestions.has(currentQId) ? "fill" : "bold"} />
          <span>{flaggedQuestions.has(currentQId) ? "Flagged for Review" : "Flag for Review"}</span>
        </Button>
      </div>

      {/* Current Active Question Card */}
      {currentQuestion && (
        <Card className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-extrabold text-xs">
                #{currentQuestionIndex + 1}
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
                {currentQuestion.questionType} · {currentQuestion.points} Point{currentQuestion.points !== 1 ? "s" : ""}
              </span>
            </div>

            {currentQuestion.questionType === "MULTIPLE_CHOICE" && (
              <Badge variant="secondary" className="text-[10px]">
                Select all that apply
              </Badge>
            )}
          </div>

          <h4 className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {currentQuestion.title}
          </h4>

          {/* Options List */}
          <div className="space-y-2.5 pt-1">
            {currentQuestion.options?.map((opt) => {
              const currentSelected = selectedAnswers[currentQId] || [];
              const isSelected = currentSelected.includes(opt.id);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground font-bold shadow-xs"
                      : "border-border bg-background hover:border-foreground/30 text-foreground font-medium"
                  }`}
                >
                  <span
                    className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {opt.key || opt.id}
                  </span>
                  <span className="text-sm flex-1 leading-snug">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Navigation Buttons: Previous, Next, Submit */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          className="gap-2 font-bold cursor-pointer"
        >
          <ArrowLeft size={16} weight="bold" /> Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              type="button"
              size="md"
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="gap-2 font-bold cursor-pointer"
            >
              <span>Next Question</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : !preview && (
            <Button
              type="button"
              size="md"
              className="gap-2 font-bold bg-primary text-primary-foreground cursor-pointer shadow-sm"
              disabled={isEvaluating}
              onClick={() => setShowReviewModal(true)}
            >
              <CheckSquare size={17} weight="bold" />
              <span>{isEvaluating ? "Grading..." : "Review & Submit"}</span>
            </Button>
          )}
        </div>
      </div>

      {submissionError && <p role="alert" className="text-sm text-destructive">{submissionError}</p>}

      {/* Pre-Submission Review Dialog */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <Badge variant="outline" className="font-mono text-xs text-primary">
                Final Review
              </Badge>
              <CardTitle className="text-xl font-bold">Submit Assessment?</CardTitle>
              <p className="text-xs text-muted-foreground">
                Check your answers before submitting. Your answers will be graded when you submit.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="font-bold text-foreground">{questions.length}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Answered:</span>
                <span className="font-bold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Unanswered:</span>
                <span className="font-bold text-amber-400">{questions.length - answeredCount}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Flagged for Review:</span>
                <span className="font-bold text-primary">{flaggedQuestions.size}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowReviewModal(false)}
                className="font-semibold cursor-pointer"
              >
                Back to Questions
              </Button>
              <Button
                size="md"
                disabled={isEvaluating}
                onClick={performSubmission}
                className="font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                {isEvaluating ? "Grading..." : "Confirm & Submit"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
