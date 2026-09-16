const mongoose = require('mongoose');

const materialChunkSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pageNumber: { type: Number, required: true },
  chunkIndex: { type: Number, required: true },
  content: { type: String, required: true },
  tokenCount: { type: Number, default: 0 },
  keywords: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

materialChunkSchema.index({ projectId: 1, content: 'text' });

module.exports = mongoose.model('MaterialChunk', materialChunkSchema);
