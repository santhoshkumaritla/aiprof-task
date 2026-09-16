const User = require('../models/User');
const Space = require('../models/Space');
const Project = require('../models/Project');
const Material = require('../models/Material');
const MaterialChunk = require('../models/MaterialChunk');
const Concept = require('../models/Concept');
const Recommendation = require('../models/Recommendation');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const LearningEvent = require('../models/LearningEvent');
const AIUsageLog = require('../models/AIUsageLog');

exports.seedDemoData = async (req, res) => {
  try {
    // 1. Create or Find Real Users
    let demoUser = await User.findOne({ email: 'bindu@gmail.com' });
    if (!demoUser) {
      demoUser = await User.create({
        name: 'bindu',
        email: 'bindu@gmail.com',
        password: 'password123',
        role: 'user',
        avatarColor: '#6366F1'
      });
    } else {
      demoUser.role = 'user';
      await demoUser.save();
    }

    let mainAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (!mainAdmin) {
      mainAdmin = await User.create({
        name: 'Administrator',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin',
        avatarColor: '#10B981'
      });
    } else {
      mainAdmin.role = 'admin';
      const matches = await mainAdmin.matchPassword('admin123');
      if (!matches) mainAdmin.password = 'admin123';
      await mainAdmin.save();
    }

    let adminUser = await User.findOne({ email: 'itlasanthoshkumar@gmail.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Santhosh (Admin)',
        email: 'itlasanthoshkumar@gmail.com',
        password: 'admin123',
        role: 'admin',
        avatarColor: '#10B981'
      });
    } else {
      adminUser.role = 'admin';
      await adminUser.save();
    }

    // Check if data already exists for demoUser
    const existingProjects = await Project.countDocuments({ userId: demoUser._id });
    if (existingProjects > 0 && !req.query.force) {
      return res.json({
        message: 'Workspace is already seeded!',
        demoUser: { email: demoUser.email, password: 'password123' },
        adminUser: { email: adminUser.email, password: 'password123' }
      });
    }

    // 2. Create Spaces
    const aiSpace = await Space.create({
      title: 'Machine Learning & AI',
      description: 'Foundational concepts in deep learning, architectures, and optimization algorithms.',
      userId: demoUser._id,
      icon: 'Cpu',
      color: '#6366F1'
    });

    const sysSpace = await Space.create({
      title: 'System Design & Distributed Cloud',
      description: 'Distributed consistency, horizontal scalability, and resilient microservices.',
      userId: demoUser._id,
      icon: 'Server',
      color: '#0EA5E9'
    });

    // 3. Create Project
    const project = await Project.create({
      title: 'Deep Learning & Neural Architectures',
      description: 'Master backpropagation, gradient descent dynamics, activation functions, and attention layers.',
      learningGoal: 'Master backpropagation, gradient dynamics, and modern attention mechanisms with zero conceptual gaps.',
      spaceId: aiSpace._id,
      userId: demoUser._id,
      progress: 68,
      stats: {
        materialsCount: 1,
        conceptsCount: 4,
        quizzesTaken: 2,
        tutorInteractions: 8,
        averageMastery: 66
      }
    });

    // 4. Create Material & Chunks
    const sampleTextP1 = `Deep Learning Fundamentals & Backpropagation.
Page 1: Introduction to Gradient Descent.
Gradient descent is an optimization algorithm used to minimize a loss function by iteratively moving in the direction of steepest descent. In deep neural networks, the learning rate dictates the step size taken towards the minimum. If the learning rate is too large, oscillation occurs; if too small, convergence is prohibitively slow. Stochastic Gradient Descent (SGD) introduces mini-batch sampling to provide stochastic approximations of the true gradient.`;

    const sampleTextP2 = `Page 2: Backpropagation and the Chain Rule.
Backpropagation is the foundational algorithm for calculating the partial derivatives of the cost function with respect to any weight or bias in a multilayer perceptron. It systematically applies the mathematical chain rule backwards from the output layer to the input layer. A primary failure mode is the vanishing gradient problem, where gradients become exponentially small as they propagate backwards through deep layers, halting weight updates.`;

    const material = await Material.create({
      projectId: project._id,
      userId: demoUser._id,
      originalName: 'Deep_Learning_Notes_v1.pdf',
      storedFilename: 'Deep_Learning_Notes_v1.pdf',
      filePath: 'uploads/Deep_Learning_Notes_v1.pdf',
      fileSize: 48200,
      status: 'ready',
      progress: 100,
      pagesCount: 2,
      chunksCount: 2,
      extractedConcepts: ['Gradient Descent', 'Backpropagation', 'Vanishing Gradient Problem', 'Learning Rate Scheduling'],
      summary: 'Comprehensive lecture notes covering gradient descent optimization and mathematical chain rule backpropagation.',
      processedAt: new Date()
    });

    await MaterialChunk.create([
      {
        materialId: material._id,
        projectId: project._id,
        userId: demoUser._id,
        pageNumber: 1,
        chunkIndex: 0,
        content: sampleTextP1,
        tokenCount: 95,
        keywords: ['gradient', 'descent', 'optimization', 'learning', 'rate']
      },
      {
        materialId: material._id,
        projectId: project._id,
        userId: demoUser._id,
        pageNumber: 2,
        chunkIndex: 1,
        content: sampleTextP2,
        tokenCount: 110,
        keywords: ['backpropagation', 'chain', 'rule', 'vanishing', 'gradient']
      }
    ]);

    // 5. Create Concepts with Mastery Levels
    const concepts = await Concept.insertMany([
      {
        projectId: project._id,
        name: 'Gradient Descent',
        description: 'Iterative optimization algorithm for minimizing neural network loss.',
        estimatedMastery: 84,
        status: 'improving',
        timesTested: 3,
        timesCorrect: 3,
        history: [
          { score: 65, source: 'initial_assessment', delta: 0, timestamp: new Date(Date.now() - 86400000 * 3) },
          { score: 75, source: 'quiz', delta: 10, timestamp: new Date(Date.now() - 86400000 * 2) },
          { score: 84, source: 'quiz', delta: 9, timestamp: new Date(Date.now() - 86400000) }
        ]
      },
      {
        projectId: project._id,
        name: 'Backpropagation',
        description: 'Applying chain rule backwards through network layers to calculate gradients.',
        estimatedMastery: 72,
        status: 'stable',
        timesTested: 2,
        timesCorrect: 2,
        history: [
          { score: 62, source: 'initial_assessment', delta: 0, timestamp: new Date(Date.now() - 86400000 * 3) },
          { score: 72, source: 'quiz', delta: 10, timestamp: new Date(Date.now() - 86400000) }
        ]
      },
      {
        projectId: project._id,
        name: 'Vanishing Gradient Problem',
        description: 'Exponential decay of gradient magnitudes across deep layer architectures.',
        estimatedMastery: 42,
        status: 'requiring_attention',
        timesTested: 2,
        timesCorrect: 0,
        history: [
          { score: 48, source: 'initial_assessment', delta: 0, timestamp: new Date(Date.now() - 86400000 * 3) },
          { score: 42, source: 'quiz', delta: -6, timestamp: new Date(Date.now() - 86400000) }
        ]
      },
      {
        projectId: project._id,
        name: 'Learning Rate Scheduling',
        description: 'Dynamically altering step sizes during training to guarantee convergence.',
        estimatedMastery: 65,
        status: 'stable',
        timesTested: 1,
        timesCorrect: 1,
        history: [
          { score: 65, source: 'initial_assessment', delta: 0, timestamp: new Date(Date.now() - 86400000) }
        ]
      }
    ]);

    // 6. Create Recommendations
    await Recommendation.create([
      {
        projectId: project._id,
        userId: demoUser._id,
        title: 'Review Vanishing Gradient Mitigation on Page 2',
        reason: 'Your estimated mastery for Vanishing Gradient Problem is 42%. Review the mathematical chain rule section to understand why gradients diminish in deep networks.',
        actionType: 'review_material',
        targetConceptName: 'Vanishing Gradient Problem',
        targetConceptId: concepts[2]._id,
        targetPageNumber: 2,
        materialName: 'Deep_Learning_Notes_v1.pdf',
        priority: 'high'
      },
      {
        projectId: project._id,
        userId: demoUser._id,
        title: 'Complete Adaptive Practice Quiz on Optimization',
        reason: 'Reinforce the relationship between learning rate schedules and stochastic gradient convergence.',
        actionType: 'practice_quiz',
        targetConceptName: 'Gradient Descent',
        targetConceptId: concepts[0]._id,
        priority: 'medium'
      }
    ]);

    // 7. Seed Sample Quiz & Attempt
    const quiz = await Quiz.create({
      projectId: project._id,
      userId: demoUser._id,
      title: 'Neural Networks & Optimization Checkpoint',
      targetConcepts: ['Gradient Descent', 'Vanishing Gradient Problem'],
      questions: [
        {
          type: 'mcq',
          conceptName: 'Gradient Descent',
          difficulty: 'intermediate',
          questionText: 'What is the primary risk of setting the learning rate excessively high in Gradient Descent?',
          options: [
            'Oscillation and failure to converge towards the global minimum',
            'Severe vanishing gradient in early layers',
            'Overfitting on small batch distributions',
            'Immediate memory exhaustion during backward propagation'
          ],
          correctAnswerIndex: 0,
          correctAnswerText: 'Excessive learning rates cause divergent oscillations across the loss surface.'
        },
        {
          type: 'open_ended',
          conceptName: 'Vanishing Gradient Problem',
          difficulty: 'intermediate',
          questionText: 'Explain why the vanishing gradient problem occurs when using sigmoid activations in deep networks.',
          correctAnswerText: 'Sigmoid derivative has a maximum value of 0.25, so multiplying through many layers causes gradients to decay towards zero.',
          rubric: {
            criteria: ['Derivative bounds', 'Chain rule multiplication'],
            keyConcepts: ['sigmoid', 'derivative', 'chain rule']
          }
        }
      ]
    });

    await QuizAttempt.create({
      quizId: quiz._id,
      projectId: project._id,
      userId: demoUser._id,
      overallScore: 75,
      completedAt: new Date(Date.now() - 3600000 * 4),
      answers: [
        {
          questionIndex: 0,
          questionText: quiz.questions[0].questionText,
          questionType: 'mcq',
          conceptName: 'Gradient Descent',
          userAnswer: 0,
          isCorrect: true,
          score: 100,
          aiEvaluation: {
            understandingSummary: 'Correct! Clearly identified oscillation and divergence risks.',
            accuracyLevel: 'excellent',
            coveredConcepts: ['Gradient Descent'],
            missingConcepts: [],
            reasoningFeedback: 'Solid understanding of hyperparameter tuning dynamics.'
          }
        },
        {
          questionIndex: 1,
          questionText: quiz.questions[1].questionText,
          questionType: 'open_ended',
          conceptName: 'Vanishing Gradient Problem',
          userAnswer: 'The sigmoid function flattens out and when you multiply derivatives across layers it gets very small.',
          isCorrect: false,
          score: 50,
          aiEvaluation: {
            understandingSummary: 'Partial understanding of layer-wise multiplication.',
            accuracyLevel: 'partial',
            coveredConcepts: ['layers'],
            missingConcepts: ['sigmoid derivative max value 0.25', 'chain rule'],
            reasoningFeedback: 'You correctly identified derivative multiplication, but omitted why the maximum derivative of 0.25 causes exponential decay.',
            improvementAdvice: 'Review Page 2 notes on backpropagation and activation derivatives.'
          }
        }
      ]
    });

    // 8. Learning Events
    await LearningEvent.create([
      {
        userId: demoUser._id,
        projectId: project._id,
        spaceId: aiSpace._id,
        eventType: 'project_created',
        title: 'Project Initialized',
        description: 'Deep Learning & Neural Architectures workspace established.'
      },
      {
        userId: demoUser._id,
        projectId: project._id,
        eventType: 'material_processed',
        title: 'Processed Deep_Learning_Notes_v1.pdf',
        description: 'Extracted 2 searchable chunks and 4 concepts with page citations.'
      },
      {
        userId: demoUser._id,
        projectId: project._id,
        eventType: 'quiz_completed',
        title: 'Completed Optimization Checkpoint Quiz',
        description: 'Scored 75%. Concept mastery updated.'
      }
    ]);

    // 9. AI Usage Logs
    await AIUsageLog.create([
      {
        userId: demoUser._id,
        projectId: project._id,
        feature: 'tutor_chat',
        model: 'gemini-3.8-flash',
        promptTokens: 420,
        completionTokens: 210,
        totalTokens: 630,
        estimatedCostUsd: 0.000189,
        latencyMs: 780,
        status: 'success'
      },
      {
        userId: demoUser._id,
        projectId: project._id,
        feature: 'answer_evaluation',
        model: 'gemini-3.8-flash',
        promptTokens: 380,
        completionTokens: 185,
        totalTokens: 565,
        estimatedCostUsd: 0.000168,
        latencyMs: 840,
        status: 'success'
      }
    ]);

    res.json({
      message: 'Demo workspace successfully seeded with complete learning loop!',
      demoUser: { email: demoUser.email, password: 'password123' },
      adminUser: { email: adminUser.email, password: 'admin123' },
      projectId: project._id,
      spaceId: aiSpace._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed demo data: ' + err.message });
  }
};
