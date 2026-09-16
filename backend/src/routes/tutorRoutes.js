const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

router.use(protect);

router.get('/conversation/:projectId', checkProjectAccess, tutorController.getConversation);
router.post('/message/:projectId', checkProjectAccess, tutorController.sendMessage);
router.post('/stream/:projectId', checkProjectAccess, tutorController.streamMessage);
router.delete('/conversation/:projectId', checkProjectAccess, tutorController.clearConversation);

module.exports = router;
