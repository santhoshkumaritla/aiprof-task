const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'open_ended'], required: true },
  conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
  conceptName: { type: String, required: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  questionText: { type: String, required: true },
  options: [{ type: String }], // for MCQ
  correctAnswerIndex: { type: Number }, // for MCQ
  correctAnswerText: { type: String }, // explanation or ideal answer
  rubric: {
    criteria: [{ type: String }],
    keyConcepts: [{ type: String }]
  }
});

const quizSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  targetConcepts: [{ type: String }],
  questions: [questionSchema],
  totalTargetQuestions: { type: Number, default: 7 },
  sessionAnswers: [{ type: mongoose.Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
