const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Concept = require('../models/Concept');
const Project = require('../models/Project');
const LearningEvent = require('../models/LearningEvent');
const aiService = require('../services/aiService');
const RecommendationService = require('../services/recommendationService');

exports.generateQuiz = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 1. Fetch concepts for this project, prioritizing weaker concepts
    let concepts = await Concept.find({ projectId }).sort({ estimatedMastery: 1 });

    // If no concepts exist yet, create initial fundamental ones
    if (concepts.length === 0) {
      concepts = await Concept.insertMany([
        { projectId, name: 'Core Architecture', estimatedMastery: 45, status: 'requiring_attention' },
        { projectId, name: 'Data Pipeline', estimatedMastery: 55, status: 'stable' },
        { projectId, name: 'Execution Optimization', estimatedMastery: 40, status: 'requiring_attention' }
      ]);
    }

    // Select top 3-4 target concepts
    const targetConcepts = concepts.slice(0, 4);

    // Determine difficulty adaptively based on average mastery
    const avgMastery = Math.round(targetConcepts.reduce((acc, c) => acc + c.estimatedMastery, 0) / targetConcepts.length);
    let difficulty = 'intermediate';
    if (avgMastery < 50) difficulty = 'beginner';
    else if (avgMastery > 75) difficulty = 'advanced';

    // 2. Generate Questions via AI Service
    const questions = await aiService.generateAdaptiveQuiz({
      projectId,
      userId: req.user._id,
      targetConcepts,
      difficulty
    });

    // 3. Save Quiz
    const quiz = await Quiz.create({
      projectId,
      userId: req.user._id,
      title: `Adaptive Assessment (${difficulty.toUpperCase()})`,
      description: `Targeting concepts: ${targetConcepts.map(c => c.name).join(', ')}`,
      targetConcepts: targetConcepts.map(c => c.name),
      questions
    });

    await LearningEvent.create({
      userId: req.user._id,
      projectId,
      eventType: 'quiz_generated',
      title: `Generated Adaptive Quiz`,
      description: `Created ${questions.length} questions targeting ${targetConcepts.length} concepts at ${difficulty} difficulty.`,
      metadata: { quizId: quiz._id, difficulty }
    });

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate quiz: ' + err.message });
  }
};

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { projectId, quizId } = req.params;
    const { answers } = req.body; // Array of { questionIndex, userAnswer }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const evaluatedAnswers = [];
    let totalScoreSum = 0;

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const userSubmission = answers?.find(a => a.questionIndex === i) || { userAnswer: '' };
      const rawAnswer = userSubmission.userAnswer !== undefined && userSubmission.userAnswer !== null ? userSubmission.userAnswer : '';

      if (q.type === 'mcq') {
        const isCorrect = Number(rawAnswer) === q.correctAnswerIndex;
        const score = isCorrect ? 100 : 0;
        totalScoreSum += score;

        evaluatedAnswers.push({
          questionIndex: i,
          questionText: q.questionText,
          questionType: 'mcq',
          conceptName: q.conceptName,
          conceptId: q.conceptId,
          userAnswer: rawAnswer,
          isCorrect,
          score,
          aiEvaluation: {
            understandingSummary: isCorrect ? 'Correct! Strong understanding of the core concept.' : 'Incorrect option selected.',
            accuracyLevel: isCorrect ? 'excellent' : 'inaccurate',
            coveredConcepts: isCorrect ? [q.conceptName] : [],
            missingConcepts: isCorrect ? [] : [q.conceptName],
            reasoningFeedback: q.correctAnswerText || (isCorrect ? 'Accurately recognized foundational principle.' : 'Review options carefully.'),
            improvementAdvice: isCorrect ? 'Great job!' : `Review the fundamentals of ${q.conceptName}.`
          }
        });

        // Update Concept Mastery
        if (q.conceptName) {
          const delta = isCorrect ? 8 : -5;
          const concept = await Concept.findOne({ projectId, name: q.conceptName });
          if (concept) {
            concept.estimatedMastery = Math.min(100, Math.max(15, concept.estimatedMastery + delta));
            concept.timesTested += 1;
            if (isCorrect) concept.timesCorrect += 1;
            concept.history.push({ score: concept.estimatedMastery, source: 'quiz', delta });
            concept.lastAssessedAt = new Date();
            await concept.save();
          }
        }
      } else {
        // Open-ended question evaluation with AI
        const openEvaluation = await aiService.evaluateOpenEndedAnswer({
          questionText: q.questionText,
          userAnswer: String(userSubmission.userAnswer || ''),
          conceptName: q.conceptName,
          rubric: q.rubric,
          userId: req.user._id,
          projectId
        });

        totalScoreSum += openEvaluation.score;

        evaluatedAnswers.push({
          questionIndex: i,
          questionText: q.questionText,
          questionType: 'open_ended',
          conceptName: q.conceptName,
          conceptId: q.conceptId,
          userAnswer: userSubmission.userAnswer,
          isCorrect: openEvaluation.score >= 60,
          score: openEvaluation.score,
          aiEvaluation: openEvaluation
        });

        // Update Concept Mastery
        if (q.conceptName) {
          const delta = openEvaluation.score >= 70 ? 7 : (openEvaluation.score >= 50 ? 2 : -4);
          const concept = await Concept.findOne({ projectId, name: q.conceptName });
          if (concept) {
            concept.estimatedMastery = Math.min(100, Math.max(15, concept.estimatedMastery + delta));
            concept.timesTested += 1;
            if (openEvaluation.score >= 60) concept.timesCorrect += 1;
            concept.history.push({ score: concept.estimatedMastery, source: 'quiz', delta });
            concept.lastAssessedAt = new Date();
            await concept.save();
          }
        }
      }
    }

    const overallScore = Math.round(totalScoreSum / Math.max(1, quiz.questions.length));

    // Save Attempt
    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      projectId,
      userId: req.user._id,
      answers: evaluatedAnswers,
      overallScore,
      completedAt: new Date()
    });

    // Update Project Stats
    const project = await Project.findById(projectId);
    if (project) {
      project.stats.quizzesTaken += 1;
      await project.save();
    }

    // Trigger recommendations update based on new assessment results
    await RecommendationService.generateRecommendationsForProject({ projectId, userId: req.user._id });

    // Record Learning Event
    await LearningEvent.create({
      userId: req.user._id,
      projectId,
      eventType: 'quiz_completed',
      title: `Completed Quiz: ${quiz.title}`,
      description: `Scored ${overallScore}% across ${quiz.questions.length} questions. Concept mastery updated.`,
      metadata: { attemptId: attempt._id, score: overallScore }
    });

    res.status(201).json({
      attempt,
      overallScore,
      evaluatedAnswers
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quiz attempt: ' + err.message });
  }
};

exports.getQuizHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const attempts = await QuizAttempt.find({ projectId, userId: req.user._id })
      .populate('quizId', 'title targetConcepts')
      .sort({ completedAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history: ' + err.message });
  }
};
