const Concept = require('../models/Concept');
const Material = require('../models/Material');
const MaterialChunk = require('../models/MaterialChunk');
const Recommendation = require('../models/Recommendation');
const LearningEvent = require('../models/LearningEvent');

class RecommendationService {
  /**
   * Generates tailored next-action recommendations based on current learner state
   */
  static async generateRecommendationsForProject({ projectId, userId }) {
    // 1. Fetch concepts for this project
    const concepts = await Concept.find({ projectId }).sort({ estimatedMastery: 1 });
    if (!concepts || concepts.length === 0) return [];

    // Find materials for context linking
    const materials = await Material.find({ projectId, status: 'ready' });
    const chunks = await MaterialChunk.find({ projectId }).limit(50);

    const generated = [];

    // Identify weak concepts (<60% mastery or requiring_attention)
    const weakConcepts = concepts.filter(c => c.estimatedMastery < 60 || c.status === 'requiring_attention');
    const stableConcepts = concepts.filter(c => c.estimatedMastery >= 60 && c.estimatedMastery < 80);

    // Target weak concept #1: Recommend Review Material
    if (weakConcepts.length > 0) {
      const topWeak = weakConcepts[0];
      // Find chunk mentioning this concept
      const chunkMatch = chunks.find(ch => ch.content.toLowerCase().includes(topWeak.name.toLowerCase()));
      const pageNum = chunkMatch ? chunkMatch.pageNumber : 1;
      const matName = materials[0]?.originalName || 'Course Notes';

      const recReview = await Recommendation.create({
        projectId,
        userId,
        title: `Review Core Concept: ${topWeak.name}`,
        reason: `Your estimated mastery for ${topWeak.name} is currently ${topWeak.estimatedMastery}%. Reviewing the foundational source material will strengthen your conceptual base.`,
        actionType: 'review_material',
        targetConceptName: topWeak.name,
        targetConceptId: topWeak._id,
        targetPageNumber: pageNum,
        materialName: matName,
        priority: 'high'
      });
      generated.push(recReview);

      // Target weak concept #2 or practice quiz
      const recPractice = await Recommendation.create({
        projectId,
        userId,
        title: `Take Adaptive Practice Quiz on ${topWeak.name}`,
        reason: `Targeted practice questions will test your application of ${topWeak.name} and provide detailed AI feedback to boost your mastery.`,
        actionType: 'practice_quiz',
        targetConceptName: topWeak.name,
        targetConceptId: topWeak._id,
        priority: 'high'
      });
      generated.push(recPractice);
    }

    // Stable concept recommendation: Tutor deep dive
    if (stableConcepts.length > 0) {
      const topStable = stableConcepts[0];
      const recTutor = await Recommendation.create({
        projectId,
        userId,
        title: `Deep-Dive Conversation: ${topStable.name}`,
        reason: `Your understanding of ${topStable.name} is solid (${topStable.estimatedMastery}%). Ask the AI Tutor for edge-case scenarios or practical trade-offs to reach full mastery.`,
        actionType: 'tutor_deep_dive',
        targetConceptName: topStable.name,
        targetConceptId: topStable._id,
        priority: 'medium'
      });
      generated.push(recTutor);
    }

    // Record Event
    if (generated.length > 0) {
      await LearningEvent.create({
        userId,
        projectId,
        eventType: 'recommendation_generated',
        title: `Generated ${generated.length} Learning Recommendations`,
        description: `Prioritized next steps targeting ${weakConcepts[0]?.name || 'current concepts'}.`,
        metadata: { recommendationsCount: generated.length }
      });
    }

    return generated;
  }
}

module.exports = RecommendationService;
