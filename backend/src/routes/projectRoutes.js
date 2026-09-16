const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

router.use(protect);

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.get('/:projectId', checkProjectAccess, projectController.getProjectDashboard);
router.put('/:projectId', checkProjectAccess, projectController.updateProject);
router.delete('/:projectId', checkProjectAccess, projectController.deleteProject);

module.exports = router;
