const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { Score, LessonModule, StudentProgress, QuizSubmission } = require('../domain');
const { MarkLessonCompleteUseCase, SubmitQuizUseCase } = require('../application');

// In-Memory Lesson Module Repository Mock
class MockLessonModuleRepository {
  constructor() {
    this.modules = new Map();
  }

  async findById(id) {
    return this.modules.get(id) || null;
  }

  async save(module) {
    this.modules.set(module.id, module);
    return module;
  }
}

// In-Memory Student Progress Repository Mock
class MockStudentProgressRepository {
  constructor() {
    this.progresses = new Map();
  }

  async findByStudentAndModule(studentUserId, lessonModuleId) {
    for (const p of this.progresses.values()) {
      if (p.studentUserId === studentUserId && p.lessonModuleId === lessonModuleId) {
        return p;
      }
    }
    return null;
  }

  async save(progress) {
    this.progresses.set(progress.id, progress);
    return progress;
  }
}

test('Score ValueObject validates grade score range', () => {
  const valid = Score.create(85.5);
  assert.equal(valid.isSuccess, true);
  assert.equal(valid.getValue().value, 85.5);

  const invalidLow = Score.create(-5);
  assert.equal(invalidLow.isFailure, true);

  const invalidHigh = Score.create(105);
  assert.equal(invalidHigh.isFailure, true);
});

test('MarkLessonCompleteUseCase records student lesson completion', async () => {
  const lessonModuleRepository = new MockLessonModuleRepository();
  const studentProgressRepository = new MockStudentProgressRepository();

  const courseId = crypto.randomUUID();
  const studentUserId = crypto.randomUUID();

  // Save lesson module first
  const module = LessonModule.create({
    courseId,
    title: 'Introduction to Data Modeling',
    contentType: 'VIDEO'
  }).getValue();
  await lessonModuleRepository.save(module);

  const useCase = new MarkLessonCompleteUseCase({
    studentProgressRepository,
    lessonModuleRepository
  });

  const result = await useCase.execute({
    studentUserId,
    lessonModuleId: module.id
  });

  assert.equal(result.isSuccess, true);
  const data = result.getValue();
  assert.equal(data.alreadyCompleted, false);
  assert.equal(data.status, 'COMPLETED');

  // Verify idempotency on second call
  const secondResult = await useCase.execute({
    studentUserId,
    lessonModuleId: module.id
  });
  assert.equal(secondResult.getValue().alreadyCompleted, true);
});

test('SubmitQuizUseCase evaluates score and marks pass/fail correctly', async () => {
  const lessonModuleRepository = new MockLessonModuleRepository();
  const courseId = crypto.randomUUID();
  const studentUserId = crypto.randomUUID();

  const module = LessonModule.create({
    courseId,
    title: 'Final Assessment Quiz'
  }).getValue();
  await lessonModuleRepository.save(module);

  const useCase = new SubmitQuizUseCase({ lessonModuleRepository });

  // Passing score
  const passResult = await useCase.execute({
    studentUserId,
    lessonModuleId: module.id,
    score: 82,
    passingScore: 70
  });

  assert.equal(passResult.isSuccess, true);
  assert.equal(passResult.getValue().passed, true);
  assert.equal(passResult.getValue().score, 82);

  // Failing score
  const failResult = await useCase.execute({
    studentUserId,
    lessonModuleId: module.id,
    score: 55,
    passingScore: 70
  });

  assert.equal(failResult.isSuccess, true);
  assert.equal(failResult.getValue().passed, false);
});
