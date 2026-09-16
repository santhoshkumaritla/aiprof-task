const Space = require('../models/Space');
const Project = require('../models/Project');
const LearningEvent = require('../models/LearningEvent');

exports.listSpaces = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const spaces = await Space.find(filter).sort({ updatedAt: -1 });

    // Attach project counts to each space with strict learner isolation
    const spacesWithCounts = await Promise.all(
      spaces.map(async (space) => {
        const projectFilter = req.user.role === 'admin'
          ? { spaceId: space._id }
          : { spaceId: space._id, userId: req.user._id };

        const projectCount = await Project.countDocuments(projectFilter);
        const projects = await Project.find(projectFilter).select('title progress stats learningGoal');
        const avgProgress = projects.length > 0
          ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
          : 0;

        return {
          ...space.toObject(),
          projectCount,
          avgProgress,
          recentProjects: projects
        };
      })
    );

    res.json(spacesWithCounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list spaces: ' + err.message });
  }
};

exports.createSpace = async (req, res) => {
  try {
    const { title, description = '', icon = 'BookOpen', color = '#6366F1' } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Space title is required' });
    }

    const space = await Space.create({
      title,
      description,
      icon,
      color,
      userId: req.user._id
    });

    await LearningEvent.create({
      userId: req.user._id,
      spaceId: space._id,
      eventType: 'project_created',
      title: `Created Space: ${space.title}`,
      description: `Broad learning area initiated.`
    });

    res.status(201).json(space);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create space: ' + err.message });
  }
};

exports.getSpace = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.spaceId }
      : { _id: req.params.spaceId, userId: req.user._id };

    const space = await Space.findOne(filter);
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    const projectFilter = req.user.role === 'admin'
      ? { spaceId: space._id }
      : { spaceId: space._id, userId: req.user._id };

    const projects = await Project.find(projectFilter).sort({ updatedAt: -1 });
    res.json({
      ...space.toObject(),
      projects
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve space: ' + err.message });
  }
};

exports.updateSpace = async (req, res) => {
  try {
    const { title, description, icon, color } = req.body;
    const filter = req.user.role === 'admin'
      ? { _id: req.params.spaceId }
      : { _id: req.params.spaceId, userId: req.user._id };

    const space = await Space.findOneAndUpdate(
      filter,
      { $set: { title, description, icon, color, updatedAt: new Date() } },
      { new: true }
    );
    if (!space) return res.status(404).json({ error: 'Space not found' });
    res.json(space);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update space: ' + err.message });
  }
};

exports.deleteSpace = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.spaceId }
      : { _id: req.params.spaceId, userId: req.user._id };

    const space = await Space.findOneAndDelete(filter);
    if (!space) return res.status(404).json({ error: 'Space not found' });
    // Also cleanup projects under this space
    await Project.deleteMany({ spaceId: space._id });
    res.json({ message: 'Space and associated projects removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete space: ' + err.message });
  }
};
