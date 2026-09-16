const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
  materialName: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  excerpt: { type: String, required: true }
});

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  citations: [citationSchema],
  isUnsupported: { type: Boolean, default: false },
  unsupportedReason: { type: String, default: null },
  modelUsed: { type: String, default: 'gemini-3.8-flash' },
  latencyMs: { type: Number, default: 0 },
  tokensUsed: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Tutor Session' },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

conversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
