const Space = require('../models/Space');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Concept = require('../models/Concept');
const QuizAttempt = require('../models/QuizAttempt');
const LearningEvent = require('../models/LearningEvent');
const AIUsageLog = require('../models/AIUsageLog');

exports.getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;

    const quizAttempts = await QuizAttempt.find({ projectId }).sort({ completedAt: 1 });
    const events = await LearningEvent.find({ projectId }).sort({ createdAt: -1 }).limit(30);
    const concepts = await Concept.find({ projectId });
    const aiLogs = await AIUsageLog.find({ projectId });

    const totalAIInvocations = aiLogs.length;
    const avgScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((acc, q) => acc + q.overallScore, 0) / quizAttempts.length)
      : 0;

    res.json({
      quizAttempts: quizAttempts.map(q => ({
        date: q.completedAt,
        score: q.overallScore,
        questionsCount: q.answers.length
      })),
      conceptsDistribution: {
        improving: concepts.filter(c => c.status === 'improving').length,
        stable: concepts.filter(c => c.status === 'stable').length,
        requiringAttention: concepts.filter(c => c.status === 'requiring_attention').length
      },
      avgScore,
      totalQuizzes: quizAttempts.length,
      totalAIInvocations,
      recentEvents: events
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project analytics: ' + err.message });
  }
};

exports.getGlobalAnalytics = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const targetUserId = req.query.userId;

    // Platform admin manages and inspects the entire platform by default
    // If a specific targetUserId is supplied, filter by that user
    // Otherwise regular learners view their personal metrics
    const filter = targetUserId
      ? { userId: targetUserId }
      : (isAdmin ? {} : { userId: req.user._id });

    const spacesCount = await Space.countDocuments(filter);
    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .populate('spaceId', 'title color icon')
      .populate('userId', 'name email');
    const materialsCount = await Material.countDocuments(filter);

    // Concept calculation: platform-wide for admin, or scoped to user's projects
    const conceptFilter = (isAdmin && !targetUserId)
      ? {}
      : { projectId: { $in: projects.map(p => p._id) } };

    const allConcepts = await Concept.find(conceptFilter);
    const allQuizAttempts = await QuizAttempt.find(filter).sort({ completedAt: -1 });
    const recentEvents = await LearningEvent.find(filter).sort({ createdAt: -1 }).limit(100);

    // Calculate real aggregated concept mastery directly from database
    const avgMastery = allConcepts.length > 0
      ? Math.round(allConcepts.reduce((acc, c) => acc + (c.estimatedMastery || 0), 0) / allConcepts.length)
      : 0;

    // Calculate real aggregated quiz scores directly from database
    const avgQuizScore = allQuizAttempts.length > 0
      ? Math.round(allQuizAttempts.reduce((acc, q) => acc + (q.overallScore || 0), 0) / allQuizAttempts.length)
      : 0;

    // Real weakest concepts requiring attention
    const weakAreas = allConcepts
      .filter(c => (c.estimatedMastery || 0) < 60 || c.status === 'requiring_attention')
      .sort((a, b) => (a.estimatedMastery || 0) - (b.estimatedMastery || 0))
      .slice(0, 5)
      .map(c => ({
        id: c._id,
        name: c.name,
        estimatedMastery: c.estimatedMastery || 0,
        projectId: c.projectId,
        status: c.status
      }));

    // Weekly activity distribution (past 7 days) from real LearningEvents
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    recentEvents.forEach(e => {
      const eventDate = new Date(e.createdAt);
      const diffDays = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        dayCounts[6 - diffDays]++;
      }
    });

    // Real study hours dynamically derived from real quizzes & learning events
    const rawHours = (allQuizAttempts.length * 0.35) + (recentEvents.length * 0.15);
    const estimatedStudyHours = Number(Math.max(rawHours > 0 ? 0.5 : 0, rawHours).toFixed(1));

    res.json({
      summary: {
        totalSpaces: spacesCount,
        totalProjects: projects.length,
        totalMaterials: materialsCount,
        totalQuizzesTaken: allQuizAttempts.length,
        averageMastery: avgMastery,
        averageQuizScore: avgQuizScore,
        estimatedStudyHours
      },
      weakAreas,
      weeklyActivity: dayCounts,
      recentProjects: projects.slice(0, 4),
      recentEvents: recentEvents.slice(0, 15),
      isPlatformWide: isAdmin && !targetUserId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global analytics: ' + err.message });
  }
};
