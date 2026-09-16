const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  score: { type: Number, required: true },
  source: { type: String, enum: ['quiz', 'tutor_eval', 'initial_assessment', 'practice'], default: 'quiz' },
  delta: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const conceptSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  estimatedMastery: { type: Number, default: 40, min: 0, max: 100 },
  status: {
    type: String,
    enum: ['improving', 'stable', 'requiring_attention'],
    default: 'stable'
  },
  timesTested: { type: Number, default: 0 },
  timesCorrect: { type: Number, default: 0 },
  history: [historyEntrySchema],
  lastAssessedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

conceptSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate status dynamically based on history if available
  if (this.history && this.history.length >= 2) {
    const recent = this.history.slice(-3);
    const deltas = recent.map(h => h.delta || 0);
    const sum = deltas.reduce((a, b) => a + b, 0);
    if (this.estimatedMastery < 50 || sum < -5) {
      this.status = 'requiring_attention';
    } else if (sum > 5) {
      this.status = 'improving';
    } else {
      this.status = 'stable';
    }
  } else if (this.estimatedMastery < 50) {
    this.status = 'requiring_attention';
  }
  next();
});

module.exports = mongoose.model('Concept', conceptSchema);
