const Concept = require('../models/Concept');
const Recommendation = require('../models/Recommendation');
const RecommendationService = require('../services/recommendationService');

exports.getProjectMastery = async (req, res) => {
  try {
    const { projectId } = req.params;
    const concepts = await Concept.find({ projectId }).sort({ estimatedMastery: -1 });

    const improving = concepts.filter(c => c.status === 'improving');
    const stable = concepts.filter(c => c.status === 'stable');
    const requiringAttention = concepts.filter(c => c.status === 'requiring_attention');

    const averageMastery = concepts.length > 0
      ? Math.round(concepts.reduce((sum, c) => sum + c.estimatedMastery, 0) / concepts.length)
      : 0;

    // Timeline data for growth analysis
    const growthTimeline = concepts.map(c => ({
      conceptName: c.name,
      currentMastery: c.estimatedMastery,
      status: c.status,
      history: c.history
    }));

    res.json({
      concepts,
      averageMastery,
      breakdown: {
        improvingCount: improving.length,
        stableCount: stable.length,
        requiringAttentionCount: requiringAttention.length
      },
      growthTimeline
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mastery data: ' + err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { projectId } = req.params;
    let recommendations = await Recommendation.find({ projectId, isCompleted: false }).sort({ priority: 1, createdAt: -1 });

    // If none exist, generate fresh ones
    if (recommendations.length === 0) {
      recommendations = await RecommendationService.generateRecommendationsForProject({
        projectId,
        userId: req.user._id
      });
    }

    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations: ' + err.message });
  }
};

exports.completeRecommendation = async (req, res) => {
  try {
    const { recId } = req.params;
    const rec = await Recommendation.findByIdAndUpdate(
      recId,
      { isCompleted: true },
      { new: true }
    );
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    res.json(rec);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update recommendation: ' + err.message });
  }
};

exports.triggerGrowthAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const recs = await RecommendationService.generateRecommendationsForProject({
      projectId,
      userId: req.user._id
    });
    res.json({ message: 'Growth analysis completed', recommendations: recs });
  } catch (err) {
    res.status(500).json({ error: 'Growth analysis failed: ' + err.message });
  }
};
