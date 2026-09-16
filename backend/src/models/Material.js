const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storedFilename: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, default: 'application/pdf' },
  status: {
    type: String,
    enum: ['queued', 'processing', 'ready', 'failed'],
    default: 'queued',
    index: true
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  errorMessage: { type: String, default: null },
  pagesCount: { type: Number, default: 0 },
  chunksCount: { type: Number, default: 0 },
  extractedConcepts: [{ type: String }],
  summary: { type: String, default: '' },
  processedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

materialSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Material', materialSchema);
