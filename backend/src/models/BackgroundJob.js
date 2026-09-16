const mongoose = require('mongoose');

const backgroundJobSchema = new mongoose.Schema({
  jobType: {
    type: String,
    enum: ['document_processing', 'quiz_evaluation', 'growth_analysis', 'recommendation_generation'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
    index: true
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BackgroundJob', backgroundJobSchema);
