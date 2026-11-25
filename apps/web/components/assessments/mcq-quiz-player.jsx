"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AssessmentService } from "@/services/assessment-service";
import {
  Clock,
  Flag,
  CheckCircle,
  XCircle,
  WarningCircle,
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CheckSquare,
  Sparkle,
  Trophy,
  Hourglass,
  ListBullets,
  Eye,
  ShieldCheck
} from "@phosphor-icons/react";

export function McqQuizPlayer({
  quizConfig,
  moduleId,
  studentUser,
  onCompleted,
  className = ""
}) {
  const studentId = studentUser?.id || studentUser?.userId || "student_guest";
  const studentName = studentUser?.name || "Student User";

  // 1. Fetch secured question payload (answers & is_correct stripped)
  const securedQuiz = useMemo(() => {
    return AssessmentService.getStrippedQuizForStudent(quizConfig);
  }, [quizConfig]);

  const questions = securedQuiz?.questions || [];
  const timeLimitSeconds = (securedQuiz?.timeLimitMinutes || 0) * 60;

  // Active Test State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qId]: [selectedOptionIds] }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set()); // Set of qIds
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState([]);

  const timerRef = useRef(null);

  // Load prior attempts on mount
  useEffect(() => {
    if (moduleId && studentId) {
      const attempts = AssessmentService.getStudentQuizAttempts(moduleId, studentId);
      setPreviousAttempts(attempts);
      // If student previously passed, load the latest attempt evaluation
      if (attempts.length > 0) {
        const lastAttempt = attempts[attempts.length - 1];
        if (lastAttempt?.passed) {
          setEvaluationResult(lastAttempt);
          setIsTestSubmitted(true);
        }
      }
    }
  }, [moduleId, studentId]);

  // Enforced Countdown Timer & Auto-Submission
  useEffect(() => {
    if (timeLimitSeconds <= 0 || isTestSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLimitSeconds, isTestSubmitted]);

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
    if (isTestSubmitted) return;

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

  const handleAutoSubmit = () => {
    if (isTestSubmitted) return;
    performSubmission(true);
  };

  const performSubmission = (wasTimeExpiry = false) => {
    setIsEvaluating(true);
    setShowReviewModal(false);

    try {
      // Server-side grading simulation against full answer key
      const result = AssessmentService.evaluateQuizAttempt({
        quizConfig,
        studentAnswers: selectedAnswers,
        studentUserId: studentId,
        studentName
      });

      setEvaluationResult(result);
      setIsTestSubmitted(true);

      const updatedAttempts = AssessmentService.getStudentQuizAttempts(moduleId, studentId);
      setPreviousAttempts(updatedAttempts);

      if (result.passed && onCompleted) {
        onCompleted(result);
      }
    } catch (err) {
      console.error("Quiz evaluation error:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setTimeRemaining(timeLimitSeconds);
    setIsTestSubmitted(false);
    setEvaluationResult(null);
    setCurrentQuestionIndex(0);
  };

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => selectedAnswers[k] && selectedAnswers[k].length > 0
  ).length;

  const attemptsCount = previousAttempts.length;
  const maxAttemptsAllowed = securedQuiz?.maxAttempts || 3;
  const canRetake = maxAttemptsAllowed === 0 || attemptsCount < maxAttemptsAllowed;

  // ============================================================
  // POST-SUBMISSION DETAILED RESULT SUMMARY VIEW
  // ============================================================
  if (isTestSubmitted && evaluationResult) {
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
              <Badge variant="outline" className="font-mono text-xs">
                Attempt #{attemptsCount} of {maxAttemptsAllowed === 0 ? "Unlimited" : maxAttemptsAllowed}
              </Badge>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {evaluationResult.percentage}% Score
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              You scored {evaluationResult.totalPointsEarned} out of {evaluationResult.totalPointsAvailable} points (Minimum required: {evaluationResult.passingThreshold}%)
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {canRetake && (
              <Button
                variant={isPass ? "outline" : "default"}
                size="md"
                onClick={handleRetake}
                className="gap-2 font-bold cursor-pointer"
              >
                <ArrowsClockwise size={16} weight="bold" />
                <span>Retake Assessment ({maxAttemptsAllowed === 0 ? "Unlimited" : `${maxAttemptsAllowed - attemptsCount} attempt left`})</span>
              </Button>
            )}
          </div>
        </Card>

        {/* Question-by-Question Breakdown with Rationales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-base font-bold text-foreground">Detailed Question Review & Rationales</h3>
            <span className="text-xs text-muted-foreground font-mono">
              {evaluationResult.questionSnapshots.filter(q => q.isCorrect).length} of {evaluationResult.questionSnapshots.length} Correct
            </span>
          </div>

          {evaluationResult.questionSnapshots.map((snap, idx) => {
            const isCorrect = snap.isCorrect;
            return (
              <Card
                key={snap.questionId || idx}
                className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-2xs ${
                  isCorrect 
                    ? "border-emerald-500/30 bg-card" 
                    : "border-destructive/30 bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-6 w-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      isCorrect 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase font-mono">
                      Question #{idx + 1} · {snap.pointsAwarded}/{snap.pointsAvailable} pts
                    </span>
                  </div>

                  <Badge variant={isCorrect ? "success" : "destructive"} className="text-[10px] font-bold">
                    {isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                </div>

                <p className="text-sm font-bold text-foreground leading-snug">
                  {snap.questionTitle}
                </p>

                {/* Option Review List */}
                <div className="space-y-2 pt-1">
                  {snap.optionsSnapshot.map((opt) => {
                    const wasChosen = snap.studentSelectedIds?.includes(opt.id);
                    const isRightAnswer = opt.isCorrect;

                    let rowStyle = "border-border bg-background/50 text-muted-foreground";
                    if (wasChosen && isRightAnswer) {
                      rowStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold";
                    } else if (wasChosen && !isRightAnswer) {
                      rowStyle = "border-destructive bg-destructive/10 text-destructive font-bold";
                    } else if (!wasChosen && isRightAnswer) {
                      rowStyle = "border-emerald-500/40 bg-emerald-500/5 text-emerald-300 font-semibold";
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all ${rowStyle}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="h-6 w-6 rounded-lg bg-card border border-border flex items-center justify-center font-bold text-xs shrink-0">
                            {opt.id}
                          </span>
                          <span className="truncate">{opt.label}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {wasChosen && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Your Choice
                            </Badge>
                          )}
                          {isRightAnswer && (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              ✓ Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Explanation Rationale */}
                {snap.explanation && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
                    <p className="font-bold text-primary flex items-center gap-1">
                      <Sparkle size={13} weight="bold" /> Pedagogical Explanation:
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {snap.explanation}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
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
                Secured Knowledge Assessment
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {answeredCount} of {questions.length} Answered
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-foreground">{securedQuiz?.title}</h3>
          </div>

          {/* Enforced Countdown Timer Bar */}
          {timeLimitSeconds > 0 && (
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
        {timeLimitSeconds > 0 && (
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
          ) : (
            <Button
              type="button"
              size="md"
              className="gap-2 font-bold bg-primary text-primary-foreground cursor-pointer shadow-sm"
              onClick={() => setShowReviewModal(true)}
            >
              <CheckSquare size={17} weight="bold" />
              <span>Review & Submit</span>
            </Button>
          )}
        </div>
      </div>

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
                Check your answers before submitting. Your answers will be securely snapshot and auto-graded.
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
                onClick={() => performSubmission(false)}
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
