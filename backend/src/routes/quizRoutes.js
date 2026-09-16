const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

router.use(protect);

router.post('/generate/:projectId', checkProjectAccess, quizController.generateQuiz);
router.post('/step/:projectId/:quizId', checkProjectAccess, quizController.submitAdaptiveStep);
router.post('/submit/:projectId/:quizId', checkProjectAccess, quizController.submitQuizAttempt);
router.get('/history/:projectId', checkProjectAccess, quizController.getQuizHistory);

module.exports = router;
