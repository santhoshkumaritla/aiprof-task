const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

router.use(protect);

// AI Config endpoints accessible to authenticated users
router.get('/ai-config', adminController.getAIConfig);
router.post('/ai-config', adminController.updateAIConfig);
router.post('/ai-config/test', adminController.testAIConnection);

// Admin-only endpoints
router.use(requireAdmin);
router.get('/overview', adminController.getOverview);
router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.inspectUser);
router.get('/observability', adminController.getAIUsageObservability);
router.get('/jobs', adminController.listBackgroundJobs);
router.post('/jobs/:jobId/retry', adminController.retryJob);
router.post('/evaluation/run', adminController.runAIEvalSuite);
router.get('/evaluation/history', adminController.getAIEvalHistory);

module.exports = router;
