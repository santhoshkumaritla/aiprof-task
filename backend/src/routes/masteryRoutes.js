const express = require('express');
const router = express.Router();
const masteryController = require('../controllers/masteryController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

router.use(protect);

router.get('/:projectId', checkProjectAccess, masteryController.getProjectMastery);
router.get('/:projectId/recommendations', checkProjectAccess, masteryController.getRecommendations);
router.post('/recommendations/:recId/complete', masteryController.completeRecommendation);
router.post('/:projectId/growth-analysis', checkProjectAccess, masteryController.triggerGrowthAnalysis);

module.exports = router;
