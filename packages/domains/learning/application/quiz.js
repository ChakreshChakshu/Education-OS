function numericValue(value) {
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function positiveNumber(value, fallback) {
  const number = numericValue(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return null;

  const questions = Array.isArray(quiz.questions) && quiz.questions.length
    ? quiz.questions
    : quiz.question ? [{ ...quiz, id: 'q_legacy_1', title: quiz.question, points: 10 }] : [];

  const threshold = numericValue(quiz.passingScore ?? 70);
  return {
    title: text(quiz.title, 'Knowledge Assessment'),
    description: text(quiz.description),
    timeLimitMinutes: positiveNumber(quiz.timeLimitMinutes ?? quiz.timeLimit, 0),
    passingScore: Number.isFinite(threshold) && threshold >= 0 && threshold <= 100 ? threshold : 70,
    maxAttempts: Number.isSafeInteger(quiz.maxAttempts) && quiz.maxAttempts >= 0 ? quiz.maxAttempts : 3,
    shuffleQuestions: Boolean(quiz.shuffleQuestions),
    shuffleOptions: Boolean(quiz.shuffleOptions),
    questions: questions.map((question, questionIndex) => {
      const correctKey = text(question?.correct) || text(question?.correctOption);
      const options = Array.isArray(question?.options) ? question.options : [];
      return {
        id: text(question?.id) || `q_${questionIndex + 1}`,
        title: text(question?.title) || text(question?.question),
        questionType: text(question?.questionType) || 'SINGLE_CHOICE',
        points: positiveNumber(question?.points, 1),
        options: options.map((option, optionIndex) => {
          const id = text(option?.id) || text(option?.key) || `opt_${optionIndex + 1}`;
          return {
            id,
            key: text(option?.key) || String.fromCharCode(65 + optionIndex),
            label: text(option?.label) || text(option?.text),
            correct: option?.isCorrect === true ||
              (correctKey !== '' && (id === correctKey || option?.key === correctKey))
          };
        })
      };
    })
  };
}

function studentQuiz(quiz) {
  const normalized = normalizeQuiz(quiz);
  if (!normalized) return null;
  return {
    ...normalized,
    questions: normalized.questions.map((question) => ({
      ...question,
      options: question.options.map(({ id, key, label }) => ({ id, key, label }))
    }))
  };
}

function gradeQuiz(quiz, answers) {
  const normalized = normalizeQuiz(quiz);
  if (!normalized?.questions.length) return { error: 'Quiz has no configured questions.' };
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { error: 'Quiz answers are required.' };
  }

  const questions = new Map(normalized.questions.map((question) => [question.id, question]));
  if (questions.size !== normalized.questions.length) return { error: 'Quiz configuration is invalid.' };

  let totalPointsAvailable = 0;
  let totalPointsEarned = 0;
  for (const questionId of Object.keys(answers)) {
    if (!questions.has(questionId)) return { error: 'Quiz answers contain an unknown question.' };
  }
  for (const question of questions.values()) {
    const optionIds = new Set(question.options.map((option) => option.id));
    const correct = question.options.filter((option) => option.correct);
    const multiple = question.questionType === 'MULTIPLE_CHOICE';
    if (optionIds.size !== question.options.length || !correct.length || (!multiple && correct.length !== 1)) {
      return { error: 'Quiz configuration is invalid.' };
    }
    const selected = Object.hasOwn(answers, question.id) ? answers[question.id] : [];
    if (!Array.isArray(selected) || (!multiple && selected.length > 1) ||
        new Set(selected).size !== selected.length || selected.some((id) => !optionIds.has(id))) {
      return { error: 'Quiz answers contain an invalid option selection.' };
    }

    totalPointsAvailable += question.points;
    if (selected.length === correct.length && correct.every((option) => selected.includes(option.id))) {
      totalPointsEarned += question.points;
    }
  }
  return {
    score: 100 * (totalPointsEarned / totalPointsAvailable),
    passingScore: normalized.passingScore,
    totalPointsAvailable,
    totalPointsEarned
  };
}

module.exports = { gradeQuiz, studentQuiz };
