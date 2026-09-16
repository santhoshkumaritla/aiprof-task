const mongoose = require('mongoose');

const learningEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null },
  eventType: {
    type: String,
    enum: [
      'project_created',
      'material_uploaded',
      'material_processed',
      'material_failed',
      'tutor_interaction',
      'quiz_generated',
      'quiz_completed',
      'mastery_updated',
      'recommendation_generated',
      'recommendation_completed'
    ],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('LearningEvent', learningEventSchema);
