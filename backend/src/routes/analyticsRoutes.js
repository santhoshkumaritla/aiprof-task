const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

router.use(protect);

router.get('/global', analyticsController.getGlobalAnalytics);
router.get('/project/:projectId', checkProjectAccess, analyticsController.getProjectAnalytics);

module.exports = router;
