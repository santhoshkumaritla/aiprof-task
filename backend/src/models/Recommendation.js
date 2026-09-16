const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  reason: { type: String, required: true },
  actionType: {
    type: String,
    enum: ['review_material', 'practice_quiz', 'tutor_deep_dive', 'concept_reinforce'],
    default: 'review_material'
  },
  targetConceptName: { type: String, default: null },
  targetConceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', default: null },
  targetPageNumber: { type: Number, default: null },
  materialName: { type: String, default: null },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
