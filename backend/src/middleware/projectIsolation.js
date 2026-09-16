const Project = require('../models/Project');

const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Admins can access any project for inspection; regular users only their own
    if (req.user.role !== 'admin' && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this project workspace' });
    }

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify project access: ' + err.message });
  }
};

module.exports = { checkProjectAccess };
