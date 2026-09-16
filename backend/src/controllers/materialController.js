const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const Material = require('../models/Material');
const MaterialChunk = require('../models/MaterialChunk');
const LearningEvent = require('../models/LearningEvent');
const jobQueue = require('../workers/jobQueue');

exports.uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF document file' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify project belongs to user (unless admin)
    const projectFilter = req.user.role === 'admin' ? { _id: projectId } : { _id: projectId, userId: req.user._id };
    const project = await Project.findOne(projectFilter);
    if (!project) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Project not found or access denied.' });
    }

    // Create Material record in 'queued' status
    const material = await Material.create({
      projectId,
      userId: req.user._id,
      originalName: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      status: 'queued',
      progress: 5
    });

    // Record Learning Event
    await LearningEvent.create({
      userId: req.user._id,
      projectId,
      eventType: 'material_uploaded',
      title: `Uploaded Material: ${material.originalName}`,
      description: `File queued for asynchronous background processing (${(material.fileSize / 1024).toFixed(1)} KB).`,
      metadata: { materialId: material._id, fileSize: material.fileSize }
    });

    // Enqueue background processing job
    await jobQueue.addJob({
      jobType: 'document_processing',
      payload: {
        materialId: material._id,
        documentName: material.originalName,
        fileSize: material.fileSize,
        fileType: material.fileType
      },
      projectId,
      userId: req.user._id
    });

    res.status(202).json({
      message: 'Document uploaded successfully and processing has been queued.',
      material
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

exports.createTextMaterial = async (req, res) => {
  try {
    const { projectId, title, content } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeTitle = title.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}-${safeTitle}.txt`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, content.trim(), 'utf-8');
    const fileSize = Buffer.byteLength(content, 'utf-8');

    const material = await Material.create({
      projectId,
      userId: req.user._id,
      originalName: `${title.trim()}.txt`,
      storedFilename: filename,
      filePath,
      fileSize,
      fileType: 'text/plain',
      status: 'queued',
      progress: 5
    });

    await LearningEvent.create({
      userId: req.user._id,
      projectId,
      eventType: 'material_uploaded',
      title: `Added Notes: ${material.originalName}`,
      description: `Notes queued for processing (${(fileSize / 1024).toFixed(1)} KB).`,
      metadata: { materialId: material._id, fileSize }
    });

    await jobQueue.addJob({
      jobType: 'document_processing',
      payload: {
        materialId: material._id,
        documentName: material.originalName,
        fileSize: material.fileSize,
        fileType: material.fileType
      },
      projectId,
      userId: req.user._id
    });

    res.status(202).json({
      message: 'Notes added successfully and processing has been queued.',
      material
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create text notes: ' + err.message });
  }
};

exports.listMaterials = async (req, res) => {
  try {
    const { projectId } = req.params;
    const materials = await Material.find({ projectId }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials: ' + err.message });
  }
};

exports.getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.materialId);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    if (req.user.role !== 'admin' && material.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    const chunks = await MaterialChunk.find({ materialId: material._id }).select('pageNumber chunkIndex tokenCount keywords').sort({ chunkIndex: 1 });

    res.json({
      material,
      chunksCount: chunks.length,
      chunksPreview: chunks.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch material: ' + err.message });
  }
};

exports.retryProcessing = async (req, res) => {
  try {
    const material = await Material.findById(req.params.materialId);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    if (req.user.role !== 'admin' && material.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    material.status = 'queued';
    material.progress = 0;
    material.errorMessage = null;
    await material.save();

    await jobQueue.addJob({
      jobType: 'document_processing',
      payload: {
        materialId: material._id,
        documentName: material.originalName,
        fileSize: material.fileSize,
        fileType: material.fileType
      },
      projectId: material.projectId,
      userId: req.user._id
    });

    res.json({ message: 'Document re-queued for processing', material });
  } catch (err) {
    res.status(500).json({ error: 'Retry failed: ' + err.message });
  }
};
