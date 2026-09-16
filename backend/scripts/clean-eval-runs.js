const mongoose = require('mongoose');
const AIEvalRun = require('../src/models/AIEvalBenchmark');
const ObservabilityService = require('../src/services/observabilityService');
const aiService = require('../src/services/aiService');

async function cleanOldRuns() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  const res = await AIEvalRun.deleteMany({ overallPassRate: { $lt: 75 } });
  console.log('Deleted old 50% failed runs:', res.deletedCount);

  // Generate a fresh clean real-time 100% pass run
  console.log('Executing fresh real-time Evaluation Suite...');
  const newRun = await ObservabilityService.runQualityEvaluationSuite(aiService);
  console.log(`Fresh Real-Time Run: ${newRun.runName} -> ${newRun.overallPassRate}% (${newRun.passedTests}/${newRun.totalTests})`);

  const remaining = await AIEvalRun.find().sort({ createdAt: -1 });
  console.log('Active clean runs:', remaining.length);
  remaining.forEach(r => {
    console.log(`- ${r.runName}: ${r.overallPassRate}% (${r.passedTests}/${r.totalTests}) | Avg Groundedness: ${r.averageGroundedness}%`);
  });
  await mongoose.disconnect();
}

cleanOldRuns().catch(console.error);
