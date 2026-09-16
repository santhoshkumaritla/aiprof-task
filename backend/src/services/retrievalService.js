const MaterialChunk = require('../models/MaterialChunk');
const Material = require('../models/Material');
const { scoreChunks, isOverviewQuery, detectPageIntent } = require('../utils/retrievalScoring');

class RetrievalService {
  /**
   * Searches for relevant chunks strictly scoped within a project
   */
  static async searchEvidence({ projectId, query, topK = null, minScoreThreshold = 0.15 }) {
    if (!query || !projectId) return [];

    const chunks = await MaterialChunk.find({ projectId }).lean();
    if (!chunks || chunks.length === 0) return [];

    const materials = await Material.find({ projectId }).select('_id originalName').lean();
    const materialMap = {};
    materials.forEach((m) => {
      materialMap[m._id.toString()] = m.originalName;
    });

    const isOverview = isOverviewQuery(query);
    const pageIntent = detectPageIntent(query);
    const hasPageIntent = pageIntent !== null;
    const isRange = typeof pageIntent === 'object' && pageIntent !== null && pageIntent.start !== undefined;
    const resolvedTopK = topK || (isRange ? Math.min(10, pageIntent.end - pageIntent.start + 3) : (hasPageIntent ? 3 : (isOverview ? 6 : 4)));

    return scoreChunks(chunks, query, { minScoreThreshold, materialMap, topK: resolvedTopK });
  }
}

module.exports = RetrievalService;
