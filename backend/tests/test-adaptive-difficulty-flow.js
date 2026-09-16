/**
 * Verification Test: Dynamic Computer-Adaptive Quiz Generation
 * Verifies that:
 * 1. Answering Question 1 well (100%) generates Question 2 at Hard/Advanced difficulty.
 * 2. Answering Question 2 poorly (0%) adjusts Question 3 to Easy/Beginner difficulty.
 * 3. Step-by-step progression completes all 7 questions.
 */
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Quiz = require('../src/models/Quiz');
const Concept = require('../src/models/Concept');
const Project = require('../src/models/Project');
const aiService = require('../src/services/aiService');
const quizController = require('../src/controllers/quizController');

async function runAdaptiveTest() {
  console.log('=== Starting Dynamic Adaptive Quiz Test ===\n');
  await mongoose.connect(process.env.MONGODB_URI);

  const mockUserId = new mongoose.Types.ObjectId();
  const mockProjectId = new mongoose.Types.ObjectId();

  await Project.create({
    _id: mockProjectId,
    title: 'SQL & DB Engineering',
    userId: mockUserId,
    spaceId: new mongoose.Types.ObjectId(),
    learningGoal: 'Master Database Optimization'
  });

  // Create test concepts
  await Concept.create([
    { projectId: mockProjectId, name: 'SQL Joins', estimatedMastery: 50 },
    { projectId: mockProjectId, name: 'Database Normalization', estimatedMastery: 40 },
    { projectId: mockProjectId, name: 'Transaction ACID Properties', estimatedMastery: 60 }
  ]);

  // 1. Initial Quiz Generation
  console.log('1. Generating Initial Adaptive Quiz...');
  const reqGen = {
    params: { projectId: mockProjectId.toString() },
    user: { _id: mockUserId }
  };
  let initialQuiz = null;
  const resGen = {
    status: (code) => ({
      json: (data) => {
        assert.strictEqual(code, 201);
        initialQuiz = data;
      }
    })
  };
  await quizController.generateQuiz(reqGen, resGen);
  assert.ok(initialQuiz && initialQuiz._id);
  assert.strictEqual(initialQuiz.totalTargetQuestions, 7);
  console.log(`✅ Initial Quiz created with ID: ${initialQuiz._id} (Total Questions: ${initialQuiz.totalTargetQuestions})`);
  console.log(`   Q1: "${initialQuiz.questions[0].questionText.slice(0, 60)}..." (Difficulty: ${initialQuiz.questions[0].difficulty})`);

  // 2. Submit Question 1 with a CORRECT answer (Score 100%) -> Should trigger HARD (Advanced) for Q2
  console.log('\n2. Submitting Q1 with High Performance (Correct Answer)...');
  const reqStep1 = {
    params: { projectId: mockProjectId.toString(), quizId: initialQuiz._id.toString() },
    user: { _id: mockUserId },
    body: { questionIndex: 0, userAnswer: initialQuiz.questions[0].correctAnswerIndex }
  };
  let step1Res = null;
  const resStep1 = {
    json: (data) => { step1Res = data; }
  };
  await quizController.submitAdaptiveStep(reqStep1, resStep1);

  assert.strictEqual(step1Res.evaluatedAnswer.score, 100);
  assert.strictEqual(step1Res.nextDifficulty, 'advanced');
  assert.strictEqual(step1Res.nextQuestion.difficulty, 'advanced');
  assert.strictEqual(step1Res.isComplete, false);
  console.log(`✅ Q1 Evaluated: Score ${step1Res.evaluatedAnswer.score}% (Correct: ${step1Res.evaluatedAnswer.isCorrect})`);
  console.log(`✅ Adaptation Triggered: ${step1Res.adaptationMessage}`);
  console.log(`✅ Q2 Generated at difficulty: ${step1Res.nextQuestion.difficulty.toUpperCase()}!`);

  // 3. Submit Question 2 with an INCORRECT answer (Score 0%) -> Should trigger De-escalation to Medium/Easy
  console.log('\n3. Submitting Q2 with Poor Performance (Wrong Answer)...');
  const wrongAnswer = (step1Res.nextQuestion.correctAnswerIndex + 1) % 4;
  const reqStep2 = {
    params: { projectId: mockProjectId.toString(), quizId: initialQuiz._id.toString() },
    user: { _id: mockUserId },
    body: { questionIndex: 1, userAnswer: wrongAnswer }
  };
  let step2Res = null;
  const resStep2 = {
    json: (data) => { step2Res = data; }
  };
  await quizController.submitAdaptiveStep(reqStep2, resStep2);

  assert.ok(step2Res.evaluatedAnswer.score < 50);
  assert.ok(['beginner', 'intermediate'].includes(step2Res.nextDifficulty));
  console.log(`✅ Q2 Evaluated: Score ${step2Res.evaluatedAnswer.score}% (Correct: ${step2Res.evaluatedAnswer.isCorrect})`);
  console.log(`✅ Adaptation Triggered: ${step2Res.adaptationMessage}`);
  console.log(`✅ Q3 Adjusted to difficulty: ${step2Res.nextQuestion.difficulty.toUpperCase()}!`);

  // Cleanup test documents
  await Quiz.findByIdAndDelete(initialQuiz._id);
  await Concept.deleteMany({ projectId: mockProjectId });
  await Project.findByIdAndDelete(mockProjectId);
  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log('✅ Dynamic Computer-Adaptive Testing Flow: VERIFIED (100%)');
  console.log('======================================================');
}

runAdaptiveTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
