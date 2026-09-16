const Conversation = require('../models/Conversation');
const Project = require('../models/Project');
const Material = require('../models/Material');
const LearningEvent = require('../models/LearningEvent');
const RetrievalService = require('../services/retrievalService');
const aiService = require('../services/aiService');

exports.getConversation = async (req, res) => {
  try {
    const { projectId } = req.params;
    let conversation = await Conversation.findOne({ projectId, userId: req.user._id });

    if (!conversation) {
      conversation = await Conversation.create({
        projectId,
        userId: req.user._id,
        messages: [
          {
            role: 'assistant',
            content: `Hello! I am your AI Study Companion for this project. Ask me any question, request an intuitive explanation with examples, or test your understanding based on your uploaded project materials.`,
            citations: [],
            isUnsupported: false
          }
        ]
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversation: ' + err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let conversation = await Conversation.findOne({ projectId, userId: req.user._id });
    if (!conversation) {
      conversation = await Conversation.create({ projectId, userId: req.user._id, messages: [] });
    }

    // 1. Add User Message
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    const materials = await Material.find({ projectId, status: 'ready' }).select('originalName pagesCount chunksCount extractedConcepts summary').lean();

    // 2. Retrieve Evidence Chunks strictly from Project Materials
    const evidenceChunks = await RetrievalService.searchEvidence({
      projectId,
      query: message
    });

    // 3. Generate Grounded AI Response
    const tutorResponse = await aiService.generateTutorResponse({
      userPrompt: message,
      evidenceChunks,
      learningGoal: project.learningGoal,
      projectTitle: project.title,
      materials,
      conversationHistory: conversation.messages.slice(-8),
      userId: req.user._id,
      projectId: project._id
    });

    // 4. Record Assistant Message
    const assistantMessage = {
      role: 'assistant',
      content: tutorResponse.text,
      citations: tutorResponse.citations || [],
      isUnsupported: tutorResponse.isUnsupported || false,
      unsupportedReason: tutorResponse.unsupportedReason || null,
      modelUsed: aiService.primaryModel,
      timestamp: new Date()
    };

    conversation.messages.push(assistantMessage);
    await conversation.save();

    // Increment tutor interaction count on project
    project.stats.tutorInteractions += 1;
    await project.save();

    // 5. Record Learning Event
    await LearningEvent.create({
      userId: req.user._id,
      projectId: project._id,
      eventType: 'tutor_interaction',
      title: 'Tutor Query & Response',
      description: `Question: "${message.slice(0, 50)}..." (${tutorResponse.citations?.length || 0} citations)`,
      metadata: {
        isUnsupported: tutorResponse.isUnsupported,
        citationsCount: tutorResponse.citations?.length || 0
      }
    });

    res.json({
      message: assistantMessage,
      conversation
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process tutor message: ' + err.message });
  }
};

exports.streamMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let conversation = await Conversation.findOne({ projectId, userId: req.user._id });
    if (!conversation) {
      conversation = await Conversation.create({ projectId, userId: req.user._id, messages: [] });
    }

    conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });

    const materials = await Material.find({ projectId, status: 'ready' }).select('originalName pagesCount chunksCount extractedConcepts summary').lean();

    const evidenceChunks = await RetrievalService.searchEvidence({
      projectId,
      query: message
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const tutorResponse = await aiService.generateTutorResponse({
      userPrompt: message,
      evidenceChunks,
      learningGoal: project.learningGoal,
      projectTitle: project.title,
      materials,
      conversationHistory: conversation.messages.slice(-8),
      userId: req.user._id,
      projectId: project._id,
      onToken: (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }
    });

    const assistantMessage = {
      role: 'assistant',
      content: tutorResponse.text,
      citations: tutorResponse.citations || [],
      isUnsupported: tutorResponse.isUnsupported || false,
      unsupportedReason: tutorResponse.unsupportedReason || null,
      modelUsed: aiService.primaryModel,
      timestamp: new Date()
    };

    conversation.messages.push(assistantMessage);
    await conversation.save();

    project.stats.tutorInteractions += 1;
    await project.save();

    await LearningEvent.create({
      userId: req.user._id,
      projectId: project._id,
      eventType: 'tutor_interaction',
      title: 'Tutor Query & Response',
      description: `Question: "${message.slice(0, 50)}..." (${tutorResponse.citations?.length || 0} citations)`,
      metadata: {
        isUnsupported: tutorResponse.isUnsupported,
        citationsCount: tutorResponse.citations?.length || 0,
        streamed: true
      }
    });

    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream tutor message: ' + err.message });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
};

exports.clearConversation = async (req, res) => {
  try {
    const { projectId } = req.params;
    await Conversation.findOneAndDelete({ projectId, userId: req.user._id });
    res.json({ message: 'Conversation history reset' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear conversation: ' + err.message });
  }
};
