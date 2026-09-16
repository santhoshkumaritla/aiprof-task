const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  learningGoal: { type: String, required: true, trim: true },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  stats: {
    materialsCount: { type: Number, default: 0 },
    conceptsCount: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    tutorInteractions: { type: Number, default: 0 },
    averageMastery: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
