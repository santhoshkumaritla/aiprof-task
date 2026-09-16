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

    // 3. Save Quiz with 7 target questions for adaptive progression
    const quiz = await Quiz.create({
      projectId,
      userId: req.user._id,
      title: `Adaptive Assessment (${difficulty.toUpperCase()})`,
      description: `Targeting concepts: ${targetConcepts.map(c => c.name).join(', ')}`,
      targetConcepts: targetConcepts.map(c => c.name),
      questions,
      totalTargetQuestions: 7,
      sessionAnswers: []
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

/**
 * Evaluates current question and generates next question adaptively:
 * - If user scores >= 70%: escalates to Hard (advanced)
 * - If user scores < 50%: de-escalates to Easy (beginner)
 * - If user scores 50-69%: maintains Medium (intermediate)
 * Continues for 7 questions total (6 to 8 questions).
 */
exports.submitAdaptiveStep = async (req, res) => {
  try {
    const { projectId, quizId } = req.params;
    const { questionIndex, userAnswer } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const currentQ = quiz.questions[questionIndex];
    if (!currentQ) return res.status(400).json({ error: `Question index ${questionIndex} not found in quiz` });

    let isCorrect = false;
    let score = 0;
    let aiEvaluation = null;

    if (currentQ.type === 'mcq') {
      isCorrect = Number(userAnswer) === currentQ.correctAnswerIndex;
      score = isCorrect ? 100 : 0;
      aiEvaluation = {
        understandingSummary: isCorrect ? 'Correct! Accurately recognized foundational principle.' : 'Incorrect option selected.',
        accuracyLevel: isCorrect ? 'excellent' : 'inaccurate',
        coveredConcepts: isCorrect ? [currentQ.conceptName] : [],
        missingConcepts: isCorrect ? [] : [currentQ.conceptName],
        reasoningFeedback: currentQ.correctAnswerText || (isCorrect ? 'Identified the exact rule or behavior.' : 'Review options carefully.'),
        improvementAdvice: isCorrect ? 'Superb! Ready for a harder challenge.' : `Review the fundamentals of ${currentQ.conceptName}.`
      };

      // Update Concept Mastery
      if (currentQ.conceptName) {
        const delta = isCorrect ? 8 : -5;
        const concept = await Concept.findOne({ projectId, name: currentQ.conceptName });
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
      // Open-ended evaluation via AI
      aiEvaluation = await aiService.evaluateOpenEndedAnswer({
        questionText: currentQ.questionText,
        userAnswer: String(userAnswer || ''),
        conceptName: currentQ.conceptName,
        rubric: currentQ.rubric,
        userId: req.user._id,
        projectId
      });

      score = aiEvaluation.score || 0;
      isCorrect = score >= 60;

      // Update Concept Mastery
      if (currentQ.conceptName) {
        const delta = score >= 70 ? 7 : (score >= 50 ? 2 : -4);
        const concept = await Concept.findOne({ projectId, name: currentQ.conceptName });
        if (concept) {
          concept.estimatedMastery = Math.min(100, Math.max(15, concept.estimatedMastery + delta));
          concept.timesTested += 1;
          if (isCorrect) concept.timesCorrect += 1;
          concept.history.push({ score: concept.estimatedMastery, source: 'quiz', delta });
          concept.lastAssessedAt = new Date();
          await concept.save();
        }
      }
    }

    const evaluatedAnswer = {
      questionIndex,
      questionText: currentQ.questionText,
      questionType: currentQ.type,
      conceptName: currentQ.conceptName,
      conceptId: currentQ.conceptId,
      userAnswer,
      isCorrect,
      score,
      aiEvaluation
    };

    if (!Array.isArray(quiz.sessionAnswers)) quiz.sessionAnswers = [];
    const existingIdx = quiz.sessionAnswers.findIndex(a => a.questionIndex === questionIndex);
    if (existingIdx !== -1) {
      quiz.sessionAnswers[existingIdx] = evaluatedAnswer;
    } else {
      quiz.sessionAnswers.push(evaluatedAnswer);
    }

    // Adaptive rule: If performs well (>= 70%) -> Hard; if not (< 50%) -> Easy; else Medium
    let nextDifficulty = 'intermediate';
    if (score >= 70) {
      nextDifficulty = currentQ.difficulty === 'beginner' ? 'intermediate' : 'advanced';
    } else if (score < 50) {
      nextDifficulty = currentQ.difficulty === 'advanced' ? 'intermediate' : 'beginner';
    } else {
      nextDifficulty = currentQ.difficulty || 'intermediate';
    }

    const nextIndex = questionIndex + 1;
    const totalTarget = quiz.totalTargetQuestions || 7;

    if (nextIndex < totalTarget) {
      const concepts = await Concept.find({ projectId }).sort({ estimatedMastery: 1 });
      const nextConcept = (concepts.length > 0) ? concepts[nextIndex % concepts.length] : { name: currentQ.conceptName };
      const nextType = (nextIndex % 2 === 0) ? 'mcq' : 'open_ended';

      // Dynamically generate the next question if not already in questions array
      if (!quiz.questions[nextIndex]) {
        const nextQ = await aiService.generateSingleAdaptiveQuestion({
          projectId,
          userId: req.user._id,
          targetConcept: nextConcept,
          difficulty: nextDifficulty,
          questionType: nextType,
          questionNumber: nextIndex + 1,
          totalQuestions: totalTarget,
          lastPerformance: {
            score,
            wasCorrect: isCorrect,
            previousDifficulty: currentQ.difficulty
          }
        });
        quiz.questions.push(nextQ);
      } else {
        quiz.questions[nextIndex].difficulty = nextDifficulty;
      }

      await quiz.save();

      const adaptationMessage = score >= 70
        ? `Great job! You scored ${score}%. Next question adapted to Hard (${nextDifficulty.toUpperCase()}).`
        : (score < 50
            ? `Score was ${score}%. Next question adapted to Easy (${nextDifficulty.toUpperCase()}) to strengthen foundations.`
            : `Steady work (${score}%). Next question maintained at Medium (${nextDifficulty.toUpperCase()}).`);

      return res.json({
        evaluatedAnswer,
        nextQuestion: quiz.questions[nextIndex],
        nextDifficulty,
        performanceVerdict: score >= 70 ? 'strong' : (score < 50 ? 'needs_improvement' : 'steady'),
        adaptationMessage,
        questionIndex: nextIndex,
        totalQuestions: totalTarget,
        isComplete: false
      });
    }

    // Finished all questions in adaptive session
    await quiz.save();
    const totalScoreSum = quiz.sessionAnswers.reduce((acc, a) => acc + (a.score || 0), 0);
    const overallScore = Math.round(totalScoreSum / Math.max(1, quiz.sessionAnswers.length));

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      projectId,
      userId: req.user._id,
      answers: quiz.sessionAnswers,
      overallScore,
      completedAt: new Date()
    });

    const project = await Project.findById(projectId);
    if (project) {
      project.stats.quizzesTaken += 1;
      await project.save();
    }

    await RecommendationService.generateRecommendationsForProject({ projectId, userId: req.user._id });

    await LearningEvent.create({
      userId: req.user._id,
      projectId,
      eventType: 'quiz_completed',
      title: `Completed Adaptive Quiz: ${quiz.title}`,
      description: `Scored ${overallScore}% across ${quiz.sessionAnswers.length} adaptive questions.`,
      metadata: { attemptId: attempt._id, score: overallScore }
    });

    return res.json({
      evaluatedAnswer,
      isComplete: true,
      totalQuestions: totalTarget,
      overallScore,
      results: {
        ...attempt.toObject(),
        evaluatedAnswers: quiz.sessionAnswers,
        overallScore
      }
    });
  } catch (err) {
    console.error('Failed to process adaptive step:', err);
    res.status(500).json({ error: 'Failed to process adaptive step: ' + err.message });
  }
};
