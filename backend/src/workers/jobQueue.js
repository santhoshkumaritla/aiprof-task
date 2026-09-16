const BackgroundJob = require('../models/BackgroundJob');
const DocumentService = require('../services/documentService');
const RecommendationService = require('../services/recommendationService');
const Concept = require('../models/Concept');

class JobQueue {
  constructor() {
    this.isProcessing = false;
    this.pollInterval = null;
  }

  /**
   * Enqueue a new background task
   */
  async addJob({ jobType, payload, projectId = null, userId = null, maxAttempts = 3 }) {
    const job = await BackgroundJob.create({
      jobType,
      payload,
      projectId,
      userId,
      maxAttempts,
      status: 'queued',
      progress: 0
    });

    console.log(`[JobQueue] Queued job #${job._id} of type '${jobType}'`);
    // Trigger tick immediately
    setImmediate(() => this.processNextJob());
    return job;
  }

  /**
   * Starts worker poller
   */
  startWorker(intervalMs = 3000) {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.processNextJob(), intervalMs);
    console.log('[JobQueue] Background worker started.');
  }

  /**
   * Picks up and processes the next queued job
   */
  async processNextJob() {
    if (this.isProcessing) return;

    try {
      const job = await BackgroundJob.findOne({ status: 'queued' }).sort({ createdAt: 1 });
      if (!job) return;

      this.isProcessing = true;
      job.status = 'processing';
      job.startedAt = new Date();
      job.attempts += 1;
      job.progress = 10;
      await job.save();

      console.log(`[JobQueue] Processing job #${job._id} (${job.jobType}), attempt ${job.attempts}/${job.maxAttempts}`);

      let result = null;

      if (job.jobType === 'document_processing') {
        const { materialId } = job.payload;
        result = await DocumentService.processPdfMaterial(materialId);
        // After processing document, trigger initial recommendations
        if (job.projectId && job.userId) {
          await RecommendationService.generateRecommendationsForProject({
            projectId: job.projectId,
            userId: job.userId
          });
        }
      } else if (job.jobType === 'growth_analysis') {
        const { projectId, userId } = job.payload;
        result = await RecommendationService.generateRecommendationsForProject({ projectId, userId });
      } else if (job.jobType === 'quiz_evaluation') {
        // Evaluate quiz mastery updates
        const { projectId, results } = job.payload;
        if (results && Array.isArray(results)) {
          for (const item of results) {
            if (item.conceptName) {
              const delta = item.isCorrect ? 8 : -5;
              const concept = await Concept.findOne({ projectId, name: item.conceptName });
              if (concept) {
                concept.estimatedMastery = Math.min(100, Math.max(10, concept.estimatedMastery + delta));
                concept.timesTested += 1;
                if (item.isCorrect) concept.timesCorrect += 1;
                concept.history.push({ score: concept.estimatedMastery, source: 'quiz', delta });
                concept.lastAssessedAt = new Date();
                await concept.save();
              }
            }
          }
        }
        result = { success: true, processedItems: results?.length || 0 };
      }

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = new Date();
      await job.save();

      console.log(`[JobQueue] Completed job #${job._id} successfully`);
    } catch (err) {
      console.error(`[JobQueue Error] Job failed:`, err.message);
      try {
        const currentJob = await BackgroundJob.findOne({ status: 'processing' });
        if (currentJob) {
          currentJob.lastError = err.message;
          if (currentJob.attempts < currentJob.maxAttempts) {
            currentJob.status = 'queued'; // retry
            console.log(`[JobQueue] Will retry job #${currentJob._id}`);
          } else {
            currentJob.status = 'failed';
            console.log(`[JobQueue] Job #${currentJob._id} marked as failed after ${currentJob.attempts} attempts`);
          }
          await currentJob.save();
        }
      } catch (saveErr) {
        console.error('[JobQueue Error] Failed to update job status:', saveErr);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

const queueInstance = new JobQueue();
queueInstance.startWorker();

module.exports = queueInstance;
