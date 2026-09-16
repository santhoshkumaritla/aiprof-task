const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  feature: {
    type: String,
    enum: [
      'tutor_chat',
      'concept_extraction',
      'document_summary',
      'quiz_generation',
      'answer_evaluation',
      'recommendation_generation',
      'evaluation_benchmark'
    ],
    required: true,
    index: true
  },
  model: { type: String, required: true },
  provider: { type: String, default: 'gemini' }, // gemini, openai, heuristic
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  estimatedCostUsd: { type: Number, default: 0 },
  latencyMs: { type: Number, required: true },
  status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
  errorMessage: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
