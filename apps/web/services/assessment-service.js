/**
 * Assessment Service for EducationOS
 * Supports Type A (MCQ-Style Quiz with zero client-side leakage & auto-grading)
 * and Type B (PDF Submission-Style Assessment with versioning & instructor rubric workbench).
 */

// Simulated SHA-256 hash generator for uploaded submission files
function generateFileHash(fileOrName) {
  const seed = (typeof fileOrName === 'string' ? fileOrName : fileOrName.name) + '_' + Date.now();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${hex}${hex}${hex}`.slice(0, 40);
}

// Fisher-Yates array shuffle helper
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class AssessmentService {
  // ==========================================
  // TYPE A: MCQ QUIZ ENGINE
  // ==========================================

  /**
   * Securely strips is_correct flags and explanations from the quiz payload
   * so the client cannot inspect network or state for answers before submitting.
   */
  static getStrippedQuizForStudent(quizConfig) {
    if (!quizConfig) return null;

    let rawQuestions = [];
    if (Array.isArray(quizConfig.questions) && quizConfig.questions.length > 0) {
      rawQuestions = quizConfig.questions;
    } else if (quizConfig.question) {
      // Legacy single-question format normalization
      rawQuestions = [{
        id: "q_legacy_1",
        questionType: "SINGLE_CHOICE",
        title: quizConfig.question,
        points: 10,
        options: (quizConfig.options || []).map((opt) => ({
          id: opt.key || opt.id,
          label: opt.text || opt.label,
          key: opt.key
        }))
      }];
    }

    // 1. Shuffling per attempt if configured
    let questionsToProcess = quizConfig.shuffleQuestions 
      ? shuffleArray(rawQuestions) 
      : [...rawQuestions];

    // 2. Strip answer keys and explanations from payload delivered to student
    const securedQuestions = questionsToProcess.map((q, idx) => {
      let options = (q.options || []).map((o) => ({
        id: o.id || o.key || `opt_${idx}`,
        label: o.label || o.text || "",
        key: o.key || o.id
      }));

      if (quizConfig.shuffleOptions) {
        options = shuffleArray(options);
      }

      return {
        id: q.id || `q_${idx + 1}`,
        questionType: q.questionType || (q.options?.length === 2 ? "TRUE_FALSE" : "SINGLE_CHOICE"),
        title: q.title || q.question || "",
        description: q.description || "",
        points: Number(q.points) || 1,
        options
        // is_correct, explanation, correct keys are NEVER returned in student payload!
      };
    });

    return {
      title: quizConfig.title || "Interactive Knowledge Assessment",
      description: quizConfig.description || "Answer all questions and submit for instant automated grading.",
      timeLimitMinutes: quizConfig.timeLimitMinutes || quizConfig.timeLimit || 0, // 0 = unlimited
      passingScore: quizConfig.passingScore || 70,
      maxAttempts: quizConfig.maxAttempts || 3, // 0 = unlimited
      questions: securedQuestions
    };
  }

  /**
   * Server-side grading simulation:
   * Evaluates submitted answer options against authoritative answer key in quizConfig,
   * creates immutable question_snapshot & correct_answer_snapshot, and computes weighted score.
   */
  static evaluateQuizAttempt({
    quizConfig,
    studentAnswers, // Map of { [questionId]: [selectedOptionIds] } or { [questionId]: selectedOptionId }
    studentUserId,
    studentName = "Student User"
  }) {
    if (!quizConfig) {
      throw new Error("Quiz configuration missing for evaluation.");
    }

    const rawQuestions = Array.isArray(quizConfig.questions) && quizConfig.questions.length > 0
      ? quizConfig.questions
      : [{
          id: "q_legacy_1",
          questionType: "SINGLE_CHOICE",
          title: quizConfig.question,
          points: 10,
          options: (quizConfig.options || []).map(o => ({
            id: o.key || o.id,
            label: o.text || o.label,
            isCorrect: (o.key || o.id) === quizConfig.correct
          })),
          correct: quizConfig.correct,
          explanation: "In clean Domain-Driven Design, the Aggregate Root enforces all internal state invariants."
        }];

    let totalPointsAvailable = 0;
    let totalPointsEarned = 0;
    const questionSnapshots = [];

    rawQuestions.forEach((q, idx) => {
      const qId = q.id || `q_${idx + 1}`;
      const qPoints = Number(q.points) || 1;
      totalPointsAvailable += qPoints;

      // Extract correct answer keys for this question
      let correctOptionIds = [];
      if (Array.isArray(q.options)) {
        correctOptionIds = q.options
          .filter(o => o.isCorrect === true || o.key === q.correct || o.id === q.correct)
          .map(o => o.id || o.key);
      } else if (q.correct) {
        correctOptionIds = [q.correct];
      }

      // Extract student selected answers
      const studentAnsRaw = studentAnswers[qId];
      let studentSelectedIds = [];
      if (Array.isArray(studentAnsRaw)) {
        studentSelectedIds = studentAnsRaw;
      } else if (studentAnsRaw !== undefined && studentAnsRaw !== null) {
        studentSelectedIds = [studentAnsRaw];
      }

      // Check correctness
      let isCorrect = false;
      if (q.questionType === "MULTIPLE_CHOICE") {
        // All correct options selected and no extra incorrect ones
        const allCorrectChosen = correctOptionIds.every(id => studentSelectedIds.includes(id));
        const noIncorrectChosen = studentSelectedIds.every(id => correctOptionIds.includes(id));
        isCorrect = allCorrectChosen && noIncorrectChosen && correctOptionIds.length > 0;
      } else {
        // SINGLE_CHOICE or TRUE_FALSE
        isCorrect = studentSelectedIds.length === 1 && correctOptionIds.includes(studentSelectedIds[0]);
      }

      const pointsAwarded = isCorrect ? qPoints : 0;
      totalPointsEarned += pointsAwarded;

      // Immutable Snapshot for attempt answer
      questionSnapshots.push({
        questionId: qId,
        questionType: q.questionType || "SINGLE_CHOICE",
        questionTitle: q.title || q.question || "",
        pointsAvailable: qPoints,
        pointsAwarded,
        isCorrect,
        studentSelectedIds,
        correctOptionIds,
        optionsSnapshot: (q.options || []).map(o => ({
          id: o.id || o.key,
          label: o.label || o.text || "",
          isCorrect: correctOptionIds.includes(o.id || o.key)
        })),
        explanation: q.explanation || "Review curriculum materials for this topic."
      });
    });

    const percentage = totalPointsAvailable > 0 
      ? Math.round((totalPointsEarned / totalPointsAvailable) * 100) 
      : 100;
    
    const passingThreshold = quizConfig.passingScore || 70;
    const passed = percentage >= passingThreshold;

    const attemptResult = {
      attemptId: `att_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      studentUserId,
      studentName,
      totalPointsEarned,
      totalPointsAvailable,
      percentage,
      passingThreshold,
      passed,
      questionSnapshots
    };

    // Save to LocalStorage attempt history
    if (typeof window !== "undefined" && studentUserId) {
      const storageKey = `eos_quiz_attempts_${quizConfig.id || "default"}_${studentUserId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      existing.push(attemptResult);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    }

    return attemptResult;
  }

  /**
   * Retrieves previous attempts for this student on this quiz
   */
  static getStudentQuizAttempts(moduleId, studentUserId) {
    if (typeof window === "undefined" || !studentUserId) return [];
    const storageKey = `eos_quiz_attempts_${moduleId || "default"}_${studentUserId}`;
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) {
      return [];
    }
  }

  // ==========================================
  // TYPE B: PDF SUBMISSION & GRADING WORKBENCH
  // ==========================================

  /**
   * Generates or fetches assignments submissions for an instructor's course queue
   */
  static getAssignmentSubmissions(courseId, moduleId) {
    if (typeof window === "undefined") return [];
    const storageKey = `eos_submissions_${courseId}_${moduleId || "all"}`;
    let submissions = [];
    try {
      submissions = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) {
      submissions = [];
    }

    // Seed realistic sample submissions if none exist yet for instructor evaluation
    if (submissions.length === 0) {
      submissions = [
        {
          id: "sub_1",
          courseId,
          moduleId,
          studentUserId: "std_alex_1",
          studentName: "Alex Vance",
          studentEmail: "alex.vance@university.edu",
          submittedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          status: "PENDING_REVIEW", // PENDING_REVIEW | GRADED | REVISION_REQUESTED | LATE_SUBMISSION
          version: "v1",
          fileName: "Domain_Architecture_LabReport_Alex.pdf",
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileSizeBytes: 2420000,
          fileSizeText: "2.31 MB",
          fileHash: "sha256_b49a7c390543e4981d32bf6e5d89f104278a2e1c",
          pageCount: 4,
          rubricScores: {},
          totalScore: null,
          maxScore: 35,
          percentage: null,
          feedbackText: "",
          suggestedImprovements: "",
          annotatedFileUrl: null
        },
        {
          id: "sub_2",
          courseId,
          moduleId,
          studentUserId: "std_elena_2",
          studentName: "Elena Rostova",
          studentEmail: "elena.r@mit.edu",
          submittedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
          status: "GRADED",
          version: "v1",
          fileName: "Distributed_Sagas_CaseStudy_Elena.pdf",
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileSizeBytes: 3890000,
          fileSizeText: "3.71 MB",
          fileHash: "sha256_e1c87519bc042a983e291bf02874bc2981da47fe",
          pageCount: 6,
          rubricScores: {
            methodology: 10,
            accuracy: 18,
            formatting: 5
          },
          totalScore: 33,
          maxScore: 35,
          percentage: 94,
          passed: true,
          feedbackText: "Outstanding architectural decomposition! The transactional outbox boundary diagram is exemplary.",
          suggestedImprovements: "Consider exploring idempotent consumer deduplication windows for high-throughput queues.",
          annotatedFileUrl: null,
          gradedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
        },
        {
          id: "sub_3",
          courseId,
          moduleId,
          studentUserId: "std_marcus_3",
          studentName: "Marcus Thorne",
          studentEmail: "m.thorne@stanford.edu",
          submittedAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
          status: "REVISION_REQUESTED",
          version: "v1",
          fileName: "System_Design_Thorne_Draft.pdf",
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          fileSizeBytes: 1450000,
          fileSizeText: "1.38 MB",
          fileHash: "sha256_3fa98e10943bf0245a981cde90184fae91024bd3",
          pageCount: 2,
          rubricScores: {
            methodology: 4,
            accuracy: 8,
            formatting: 2
          },
          totalScore: 14,
          maxScore: 35,
          percentage: 40,
          passed: false,
          feedbackText: "The submission is missing Section 3 on compensation actions during partial rollback.",
          suggestedImprovements: "Please add the missing compensations flow diagram and re-submit your PDF before the deadline extension.",
          annotatedFileUrl: null,
          gradedAt: new Date(Date.now() - 3600 * 1000 * 30).toISOString()
        }
      ];
      localStorage.setItem(storageKey, JSON.stringify(submissions));
    }

    return submissions;
  }

  /**
   * Submits a student PDF assignment with metadata, hash, and versioning
   */
  static submitStudentAssignment({
    courseId,
    moduleId,
    studentUserId,
    studentName,
    studentEmail,
    file,
    fileUrl,
    pageCount = 3
  }) {
    if (typeof window === "undefined") return null;
    const storageKey = `eos_submissions_${courseId}_${moduleId || "all"}`;
    const all = this.getAssignmentSubmissions(courseId, moduleId);

    const existingIndex = all.findIndex(s => s.studentUserId === studentUserId && s.moduleId === moduleId);
    const existing = existingIndex !== -1 ? all[existingIndex] : null;

    const nextVersion = existing ? `v${parseInt(existing.version.replace('v', '') || '1') + 1}` : 'v1';
    const fileHash = generateFileHash(file || "assignment.pdf");
    const fileSizeBytes = file?.size || 2500000;
    const fileSizeText = `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

    const newSubmission = {
      id: existing ? existing.id : `sub_${Date.now()}`,
      courseId,
      moduleId,
      studentUserId,
      studentName: studentName || "Student User",
      studentEmail: studentEmail || "student@educationos.io",
      submittedAt: new Date().toISOString(),
      status: "PENDING_REVIEW",
      version: nextVersion,
      fileName: file?.name || "Assignment_Submission.pdf",
      fileUrl: fileUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileSizeBytes,
      fileSizeText,
      fileHash,
      pageCount,
      rubricScores: {},
      totalScore: null,
      maxScore: existing?.maxScore || 35,
      percentage: null,
      feedbackText: "",
      suggestedImprovements: "",
      annotatedFileUrl: null
    };

    if (existingIndex !== -1) {
      all[existingIndex] = newSubmission;
    } else {
      all.unshift(newSubmission);
    }

    localStorage.setItem(storageKey, JSON.stringify(all));

    // Also persist student receipt locally
    const studentReceiptKey = `eos_student_receipt_${moduleId}_${studentUserId}`;
    localStorage.setItem(studentReceiptKey, JSON.stringify(newSubmission));

    return newSubmission;
  }

  /**
   * Gets the single student's active submission for this assignment
   */
  static getStudentAssignmentSubmission(courseId, moduleId, studentUserId) {
    if (typeof window === "undefined" || !studentUserId) return null;
    const studentReceiptKey = `eos_student_receipt_${moduleId}_${studentUserId}`;
    try {
      const receipt = localStorage.getItem(studentReceiptKey);
      if (receipt) return JSON.parse(receipt);
    } catch (e) {}

    const all = this.getAssignmentSubmissions(courseId, moduleId);
    return all.find(s => s.studentUserId === studentUserId) || null;
  }

  /**
   * Instructor grades a submission with rubric points, commentary, and optional annotated attachment
   */
  static gradeAssignmentSubmission({
    courseId,
    moduleId,
    submissionId,
    rubricScores,
    rubricCriteria = [],
    feedbackText,
    suggestedImprovements,
    annotatedFileUrl,
    status = "GRADED" // "GRADED" | "REVISION_REQUESTED"
  }) {
    if (typeof window === "undefined") return null;
    const storageKey = `eos_submissions_${courseId}_${moduleId || "all"}`;
    const all = this.getAssignmentSubmissions(courseId, moduleId);

    const index = all.findIndex(s => s.id === submissionId);
    if (index === -1) throw new Error("Submission not found in grading queue.");

    let totalPoints = 0;
    let maxPoints = 0;

    rubricCriteria.forEach(c => {
      maxPoints += Number(c.maxPoints) || 10;
      totalPoints += Number(rubricScores[c.id || c.name]) || 0;
    });

    if (maxPoints === 0) maxPoints = 35; // Fallback
    const percentage = Math.round((totalPoints / maxPoints) * 100);
    const passed = percentage >= 70;

    const updated = {
      ...all[index],
      status: status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "GRADED",
      rubricScores,
      totalScore: totalPoints,
      maxScore: maxPoints,
      percentage,
      passed,
      feedbackText: feedbackText || "",
      suggestedImprovements: suggestedImprovements || "",
      annotatedFileUrl: annotatedFileUrl || null,
      gradedAt: new Date().toISOString()
    };

    all[index] = updated;
    localStorage.setItem(storageKey, JSON.stringify(all));

    // Also update student receipt
    const studentReceiptKey = `eos_student_receipt_${updated.moduleId}_${updated.studentUserId}`;
    localStorage.setItem(studentReceiptKey, JSON.stringify(updated));

    return updated;
  }
}
