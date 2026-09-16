const Space = require('../models/Space');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Concept = require('../models/Concept');
const Recommendation = require('../models/Recommendation');
const LearningEvent = require('../models/LearningEvent');
const QuizAttempt = require('../models/QuizAttempt');

exports.listProjects = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'admin') {
      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      // Sole administrator manages and sees all projects by default
    } else {
      filter.userId = req.user._id;
    }

    if (req.query.spaceId) {
      filter.spaceId = req.query.spaceId;
    }

    const projects = await Project.find(filter).sort({ updatedAt: -1 }).populate('spaceId', 'title color icon').populate('userId', 'name email');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list projects: ' + err.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, description = '', learningGoal, spaceId } = req.body;

    if (!title || !learningGoal || !spaceId) {
      return res.status(400).json({ error: 'Title, learning goal, and Space ID are required' });
    }

    if (req.user.role !== 'admin') {
      const space = await Space.findOne({ _id: spaceId, userId: req.user._id });
      if (!space) {
        return res.status(403).json({ error: 'Space not found or access denied.' });
      }
    }

    const cleanTitle = title.trim();

    // Idempotency: prevent accidental double-clicks within 15 seconds from creating duplicate projects
    const recentDuplicate = await Project.findOne({
      userId: req.user._id,
      spaceId,
      title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      createdAt: { $gte: new Date(Date.now() - 15000) }
    });
    if (recentDuplicate) {
      return res.status(200).json(recentDuplicate);
    }

    const project = await Project.create({
      title: cleanTitle,
      description,
      learningGoal,
      spaceId,
      userId: req.user._id
    });

    await LearningEvent.create({
      userId: req.user._id,
      projectId: project._id,
      spaceId,
      eventType: 'project_created',
      title: `Created Project: ${project.title}`,
      description: `Learning Goal: ${learningGoal}`
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project: ' + err.message });
  }
};

exports.getProjectDashboard = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('spaceId', 'title color icon');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Gather live dashboard data
    const materials = await Material.find({ projectId: project._id }).sort({ createdAt: -1 });
    const concepts = await Concept.find({ projectId: project._id }).sort({ estimatedMastery: 1 });
    const recentEvents = await LearningEvent.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(10);
    const recommendations = await Recommendation.find({ projectId: project._id, isCompleted: false }).sort({ priority: 1, createdAt: -1 });
    const recentQuizzes = await QuizAttempt.find({ projectId: project._id }).sort({ completedAt: -1 }).limit(5);

    // Calculate aggregated stats
    const avgMastery = concepts.length > 0
      ? Math.round(concepts.reduce((acc, c) => acc + c.estimatedMastery, 0) / concepts.length)
      : 0;

    project.stats.materialsCount = materials.length;
    project.stats.conceptsCount = concepts.length;
    project.stats.averageMastery = avgMastery;
    project.progress = Math.min(100, Math.round((avgMastery * 0.7) + (Math.min(materials.length, 3) * 10)));
    await project.save();

    res.json({
      project,
      materials,
      concepts,
      recommendations,
      recentEvents,
      recentQuizzes,
      nextRecommendedAction: recommendations[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project dashboard: ' + err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, description, learningGoal, status } = req.body;
    const filter = req.user.role === 'admin'
      ? { _id: req.params.projectId }
      : { _id: req.params.projectId, userId: req.user._id };

    const project = await Project.findOneAndUpdate(
      filter,
      { $set: { title, description, learningGoal, status, updatedAt: new Date() } },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project: ' + err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.projectId }
      : { _id: req.params.projectId, userId: req.user._id };

    const project = await Project.findOneAndDelete(filter);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // Clean up materials, concepts, recommendations
    await Material.deleteMany({ projectId: project._id });
    await Concept.deleteMany({ projectId: project._id });
    await Recommendation.deleteMany({ projectId: project._id });
    res.json({ message: 'Project and all associated workspace data deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project: ' + err.message });
  }
};
