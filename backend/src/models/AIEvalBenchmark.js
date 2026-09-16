const mongoose = require('mongoose');

const evalMetricSchema = new mongoose.Schema({
  testSuite: { type: String, enum: ['tutor_groundedness', 'unsupported_handling', 'assessment_grading', 'recommendation_relevance'], required: true },
  testCaseName: { type: String, required: true },
  inputPrompt: { type: String, required: true },
  expectedBehavior: { type: String, required: true },
  actualResponseExcerpt: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, required: true }, // 0 to 100
  passed: { type: Boolean, required: true },
  citationsFound: { type: Number, default: 0 },
  groundednessScore: { type: Number, min: 0, max: 100 },
  latencyMs: { type: Number, default: 0 },
  evaluatedAt: { type: Date, default: Date.now }
});

const aiEvalRunSchema = new mongoose.Schema({
  runName: { type: String, required: true },
  overallPassRate: { type: Number, required: true },
  averageGroundedness: { type: Number, required: true },
  totalTests: { type: Number, required: true },
  passedTests: { type: Number, required: true },
  modelEvaluated: { type: String, required: true },
  results: [evalMetricSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIEvalRun', aiEvalRunSchema);
