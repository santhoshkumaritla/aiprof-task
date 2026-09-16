const User = require('../models/User');
const Space = require('../models/Space');
const Project = require('../models/Project');
const Material = require('../models/Material');
const MaterialChunk = require('../models/MaterialChunk');
const Concept = require('../models/Concept');
const QuizAttempt = require('../models/QuizAttempt');
const LearningEvent = require('../models/LearningEvent');
const BackgroundJob = require('../models/BackgroundJob');
const AIUsageLog = require('../models/AIUsageLog');
const AIEvalRun = require('../models/AIEvalBenchmark');
const ObservabilityService = require('../services/observabilityService');
const aiService = require('../services/aiService');
const jobQueue = require('../workers/jobQueue');

exports.getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSpaces = await Space.countDocuments();
    const totalProjects = await Project.countDocuments();
    const totalMaterials = await Material.countDocuments();
    const totalJobs = await BackgroundJob.countDocuments();
    const activeJobs = await BackgroundJob.countDocuments({ status: { $in: ['queued', 'processing'] } });
    const failedJobs = await BackgroundJob.countDocuments({ status: 'failed' });

    const aiStats = await ObservabilityService.getUsageStats();

    res.json({
      platform: {
        totalUsers,
        totalSpaces,
        totalProjects,
        totalMaterials,
        totalJobs,
        activeJobs,
        failedJobs,
        systemStatus: 'healthy',
        nodeVersion: process.version,
        uptimeSeconds: Math.round(process.uptime())
      },
      aiObservability: aiStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin overview: ' + err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const enriched = await Promise.all(
      users.map(async (u) => {
        const projectsCount = await Project.countDocuments({ userId: u._id });
        const quizzesCount = await QuizAttempt.countDocuments({ userId: u._id });
        const aiCallsCount = await AIUsageLog.countDocuments({ userId: u._id });

        return {
          ...u.toObject(),
          projectsCount,
          quizzesCount,
          aiCallsCount
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users: ' + err.message });
  }
};

exports.inspectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const spaces = await Space.find({ userId });
    const projects = await Project.find({ userId });
    const quizAttempts = await QuizAttempt.find({ userId }).sort({ completedAt: -1 }).limit(10);
    const recentEvents = await LearningEvent.find({ userId }).sort({ createdAt: -1 }).limit(20);
    const aiUsage = await AIUsageLog.find({ userId }).sort({ createdAt: -1 }).limit(25);

    res.json({
      user,
      spaces,
      projects,
      quizAttempts,
      recentEvents,
      aiUsage
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect user: ' + err.message });
  }
};

exports.getAIUsageObservability = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await ObservabilityService.getUsageStats({ timeWindowDays: days });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve AI observability metrics: ' + err.message });
  }
};

exports.listBackgroundJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const jobs = await BackgroundJob.find(filter)
      .populate('projectId', 'title learningGoal')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const obj = job.toObject();
        let documentName = job.payload?.documentName || null;
        let fileSize = job.payload?.fileSize || null;
        let fileType = job.payload?.fileType || null;
        let chunksCount = 0;
        let conceptsCount = 0;

        if (job.payload?.materialId) {
          const material = await Material.findById(job.payload.materialId);
          if (material) {
            documentName = documentName || material.originalName;
            fileSize = fileSize || material.fileSize;
            fileType = fileType || material.fileType;
            chunksCount = await MaterialChunk.countDocuments({ materialId: material._id });
            conceptsCount = await Concept.countDocuments({ projectId: material.projectId });
          }
        }

        const durationMs = (job.completedAt && job.startedAt)
          ? (new Date(job.completedAt) - new Date(job.startedAt))
          : (job.completedAt ? (new Date(job.completedAt) - new Date(job.createdAt)) : null);

        obj.documentDetails = {
          name: documentName || (job.jobType === 'document_processing' ? 'Course Material Document' : 'Platform Task'),
          fileSize: fileSize ? (fileSize / 1024).toFixed(1) + ' KB' : null,
          fileType: fileType || (documentName?.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
          chunksCount,
          conceptsCount,
          durationMs
        };

        return obj;
      })
    );

    res.json(enrichedJobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list background jobs: ' + err.message });
  }
};

exports.retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await BackgroundJob.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.status = 'queued';
    job.attempts = 0;
    job.lastError = null;
    job.progress = 0;
    await job.save();

    setImmediate(() => jobQueue.processNextJob());

    res.json({ message: `Job #${job._id} re-queued for processing`, job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retry job: ' + err.message });
  }
};

exports.runAIEvalSuite = async (req, res) => {
  try {
    console.log('[AdminController] Initiating AI Quality Evaluation Suite...');
    const evalRun = await ObservabilityService.runQualityEvaluationSuite(aiService);
    res.json({
      message: 'AI Quality Evaluation Suite completed successfully',
      evalRun
    });
  } catch (err) {
    res.status(500).json({ error: 'Evaluation run failed: ' + err.message });
  }
};

exports.getAIEvalHistory = async (req, res) => {
  try {
    const runs = await AIEvalRun.find().sort({ createdAt: -1 }).limit(10);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI evaluation runs: ' + err.message });
  }
};

exports.getAIConfig = async (req, res) => {
  try {
    res.json({
      hasGeminiKey: Boolean(aiService.geminiApiKey),
      keySuspended: aiService.keySuspended,
      geminiKeyMasked: aiService.geminiApiKey ? `${aiService.geminiApiKey.slice(0, 6)}...${aiService.geminiApiKey.slice(-4)}` : null,
      geminiModel: aiService.geminiModel,
      hasOpenAIKey: Boolean(aiService.openaiApiKey),
      primaryModel: aiService.primaryModel,
      provider: (aiService.geminiApiKey && !aiService.keySuspended) ? 'gemini' : (aiService.openaiApiKey ? 'openai' : 'intelligent-content-engine')
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI config: ' + err.message });
  }
};

exports.updateAIConfig = async (req, res) => {
  try {
    const { geminiApiKey, geminiModel, openaiApiKey } = req.body;
    const updated = aiService.updateConfig({ geminiApiKey, geminiModel, openaiApiKey });
    res.json({
      message: 'AI configuration updated successfully',
      config: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AI config: ' + err.message });
  }
};

exports.testAIConnection = async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const targetKey = apiKey || aiService.geminiApiKey;
    const targetModel = model || aiService.geminiModel;

    const result = await aiService.testGeminiConnection(targetKey, targetModel);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
