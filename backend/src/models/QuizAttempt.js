const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ['mcq', 'open_ended'], required: true },
  conceptName: { type: String, required: true },
  conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
  userAnswer: { type: mongoose.Schema.Types.Mixed, default: '' }, // number for MCQ index, string for open-ended
  isCorrect: { type: Boolean }, // for MCQ
  score: { type: Number, min: 0, max: 100 }, // percentage score for the question
  aiEvaluation: {
    understandingSummary: { type: String },
    accuracyLevel: { type: String, enum: ['excellent', 'good', 'partial', 'inaccurate'] },
    coveredConcepts: [{ type: String }],
    missingConcepts: [{ type: String }],
    reasoningFeedback: { type: String },
    improvementAdvice: { type: String }
  }
});

const quizAttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answers: [answerSchema],
  overallScore: { type: Number, default: 0, min: 0, max: 100 },
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
