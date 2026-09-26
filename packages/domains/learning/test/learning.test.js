const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { Score, LessonModule, StudentProgress, QuizSubmission, LessonNote } = require('../domain');
const {
  MarkLessonCompleteUseCase,
  SubmitQuizUseCase,
  SaveLessonNoteUseCase,
  GetLessonNoteUseCase
} = require('../application');

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

// In-Memory Lesson Note Repository Mock
class MockLessonNoteRepository {
  constructor() {
    this.notes = new Map();
  }

  async findByStudentAndLesson(studentUserId, lessonModuleId) {
    for (const note of this.notes.values()) {
      if (note.studentUserId === studentUserId && note.lessonModuleId === lessonModuleId) {
        return note;
      }
    }
    return null;
  }

  async save(note) {
    this.notes.set(note.id, note);
    return note;
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

test('SaveLessonNoteUseCase and GetLessonNoteUseCase persist and retrieve student notes', async () => {
  const lessonNoteRepository = new MockLessonNoteRepository();
  const lessonModuleRepository = new MockLessonModuleRepository();

  const studentUserId = crypto.randomUUID();
  const lessonModuleId = 'mod_1_lesson_1';

  const saveUseCase = new SaveLessonNoteUseCase({
    lessonNoteRepository,
    lessonModuleRepository
  });
  const getUseCase = new GetLessonNoteUseCase({
    lessonNoteRepository
  });

  // 1. Initial get when empty
  const initialGet = await getUseCase.execute({ studentUserId, lessonModuleId });
  assert.equal(initialGet.isSuccess, true);
  assert.equal(initialGet.getValue().content, '');

  // 2. Save new notes
  const saveResult = await saveUseCase.execute({
    studentUserId,
    lessonModuleId,
    content: '# Key Points\n- DDD aggregates enforce consistency boundaries.'
  });
  assert.equal(saveResult.isSuccess, true);
  assert.equal(saveResult.getValue().content, '# Key Points\n- DDD aggregates enforce consistency boundaries.');

  // 3. Retrieve saved notes
  const getAfterSave = await getUseCase.execute({ studentUserId, lessonModuleId });
  assert.equal(getAfterSave.isSuccess, true);
  assert.equal(getAfterSave.getValue().content, '# Key Points\n- DDD aggregates enforce consistency boundaries.');

  // 4. Update note content (upsert)
  const updateResult = await saveUseCase.execute({
    studentUserId,
    lessonModuleId,
    content: '# Updated Key Points\n- Transactional outbox avoids distributed 2PC.'
  });
  assert.equal(updateResult.isSuccess, true);
  assert.equal(updateResult.getValue().content, '# Updated Key Points\n- Transactional outbox avoids distributed 2PC.');
  assert.equal(updateResult.getValue().version, 2);
});
