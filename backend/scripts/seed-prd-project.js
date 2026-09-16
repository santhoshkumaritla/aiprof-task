const mongoose = require('mongoose');
const User = require('../src/models/User');
const Space = require('../src/models/Space');
const Project = require('../src/models/Project');
const Material = require('../src/models/Material');
const MaterialChunk = require('../src/models/MaterialChunk');
const Concept = require('../src/models/Concept');
const { chunkDocumentText } = require('../src/utils/chunker');

const COMPANY_PRD_TEXT = `AI Study Companion 
AI-Powered Learning & Growth Workspace 
Product Requirements Document 
Version: 3.0 - Candidate Challenge Edition 
Target: 3 - 4 Day Prototype 
Role: Full Stack AI Engineer 

1. Product Overview 
AI Study Companion is an AI-powered learning workspace designed to help users understand, 
practice, measure, and continuously improve a skill or area of knowledge. 
The product combines learning materials, an AI Tutor, adaptive assessments, concept mastery, 
growth analysis, recommendations, analytics, persistent learning context, and intelligent 
background workflows into one connected experience. 
The core idea is that learning should not be a collection of disconnected AI features. A user 
should be able to create a learning goal, provide relevant material, learn with an AI Tutor, test 
their understanding, understand their strengths and weaknesses, and receive a useful next 
action. 

The primary learning loop is: 
Create Space 
↓ 
Create Project 
↓ 
Add Learning Material 
↓ 
Process & Understand Material 
↓ 
Learn with AI Tutor 
↓ 
Take Adaptive Quiz 
↓ 
Evaluate Understanding 
↓ 
Update Concept Mastery 
↓ 
Analyze Growth 
↓ 
Recommend Next Action 
↓ 
Continue Learning 

The product should also include an Admin Dashboard that provides visibility into users, learning 
activity, AI usage, AI quality, and system health. 
The goal is not to build a full commercial learning platform in 3–4 days. The goal is to 
demonstrate strong full-stack engineering, AI engineering, product thinking, and 
architectural judgment. 

2. Product Vision & Principles 
The product should feel like a: 
Persistent, contextual, measurable AI learning companion. 
The system should continuously answer three questions: 
1. What am I learning? 
The system understands this through Spaces, Projects, goals, materials, conversations, and concepts. 
2. How well am I learning it? 
The system uses quizzes, assessments, mistakes, Tutor interactions, and mastery information as evidence. 
3. What should I do next? 
The system uses growth, learning history, weaknesses, goals, and recent activity to recommend the next useful learning action. 

Several principles are fundamental:
● Context First: AI interactions must respect the current Project. Information from unrelated Projects should not accidentally influence an answer. 
● Evidence Over Guessing: When reliable evidence is unavailable, the system should communicate uncertainty rather than confidently inventing information. 
● Persistent but Relevant Context: Important learning information should remain useful across sessions, but the system should avoid storing and retrieving unnecessary conversation history. 
● Asynchronous by Design: Long-running operations such as document processing, indexing, analytics, recommendations, and evaluations should run asynchronously where appropriate. 
● Observable AI: AI requests, failures, latency, retrieval, token usage, cost, and evaluation results should be sufficiently visible to allow the system to be investigated and debugged. 
● Safe AI Interaction: AI should interact with application functionality through controlled, validated, permission-aware interfaces rather than unrestricted access to internal systems. 

3. Product Structure 
The product is organized into Spaces and Projects. 
A Space represents a broad learning area. A Project represents a focused learning journey within that Space. 
Structure: USER ├── SPACE ├── PROJECT (Materials, Knowledge, AI Tutor, Quiz, Mastery, Growth, Analytics).
Each Project should maintain its own learning context, materials, conversations, concepts, assessments, mastery, and activity. This separation is important both for user experience and security/data isolation.

4. Spaces & Projects 
A Space can represent any broad area the user wants to explore. It requires a name and description, with optional visual customization.
A Project is the core learning workspace with a title, description, and learning goal. The Project Dashboard summarizes learning state, including overall progress, important concepts, recent activity, and recommended next steps.

5. Learning Materials & Knowledge 
Users should be able to upload learning material to a Project. PDF is the primary required format for the prototype. After upload, processing should happen asynchronously:
Upload → Queued → Processing / OCR → Content & Structure Extraction → Knowledge Extraction → Search / Retrieval Representation → Ready.
The processing system creates chunks, concepts, metadata, page references, and searchable representations. The important requirement is that the Tutor and other AI experiences can retrieve relevant information and trace it back to its source.

6. AI Tutor 
The AI Tutor is the primary learning experience operating within the current Project. It understands the user's goal, project materials, relevant concepts, previous conversation context, assessment history, and learning context.
Tutor context formula: Current Conversation + Relevant Project Knowledge + Relevant Learning Context = Context-Aware Tutor Response.

7. Grounded AI & Citations 
The Tutor prioritizes the user's Project materials when answering questions. Responses provide meaningful citations such as: Source: Machine Learning Notes — Page 14.
If the Project material does not contain enough evidence to answer reliably, the Tutor does not confidently fabricate an answer.
Question → Enough Evidence? → YES: Answer + Citation; NO: Explain Insufficient Evidence.

8. AI & Application Interaction 
The AI layer interacts with application capabilities through controlled interfaces (searching materials, reading assessment history, generating quizzes, updating learning state). The AI does not have unrestricted access to databases or privileged operations.

9. Adaptive Quiz & Assessment 
The Project provides an adaptive Quiz experience supporting:
● Multiple-choice questions (MCQs)
● Open-ended questions evaluated for understanding, accuracy, relevance, key concepts, and reasoning.
Question selection considers concepts, mastery, previous mistakes, recent performance, and difficulty. Feedback explains what the learner understood and what is missing rather than returning only a numerical score.

10. Mastery, Growth & Recommendations 
The system maintains estimated mastery levels for important concepts (0-100%). Mastery evolves as new evidence becomes available through quizzes and tutor interactions. Growth analysis categorizes concepts into Improving, Stable, and Requiring Attention, converting insights into actionable recommendations.

11. Persistent Learning Context 
The platform maintains persistent representations of learner goals, preferences, known strengths, weaknesses, learning history, and repeated mistakes, retrieving only context relevant to the current task.

12. Analytics & Event-Driven Learning 
The platform records meaningful learning events (project creation, material processing, tutor interactions, quiz attempts, mastery updates) to drive user analytics, recommendations, background workflows, and administrative visibility.

13. Intelligent Background Workflows 
Long-running workflows execute asynchronously: Material ingestion workflow, Quiz evaluation workflow, and Repeated-mistake detection workflow with retries and recovery.

14. AI Engineering, Observability & Evaluation 
Abstracts text generation, structured generation, embeddings/retrieval, evaluation, and document understanding. Tracks model, feature, latency, token usage, estimated cost, and success/failure. Includes automated AI quality evaluations across Tutor, Retrieval, Assessment, and Recommendations.

15. Reliability, Security & Performance 
Handles timeouts, provider failures, rate limits, and job failures gracefully. Strict user and project-level data isolation. Defends against prompt injection. Supports streaming Tutor responses and asynchronous task processing.

16. User & Admin Experience 
User Home answers: "Where was I, how am I doing, and what should I do next?"
Admin Dashboard provides platform-level visibility into users, spaces, projects, activity, engagement, learning analytics, AI usage, AI evaluation, background jobs, and system health.

17. Architecture & Technology 
Full-stack architecture with clear separation of concerns: Frontend, API / Application Layer, Business Logic (Learning, AI, Assessment, Analytics, Admin), Data & Knowledge (Database, Document Storage, Search/Retrieval, Learning Context), Background Processing, AI Services, Observability.

18. Testing, Deployment & Prototype Scope 
Demonstrates all must-have features: Authentication, Spaces/Projects, PDF materials, Background processing, AI Tutor, Grounded answers with citations, Unsupported-question handling, Adaptive Quiz, Open-ended assessment, Concept mastery, Growth analysis, Recommendations, Analytics, Activity tracking, and Admin Dashboard.

19. Success Criteria & Engineering Judgment 
A user can complete the entire learning loop without losing context, while administrators can inspect platform operations, AI usage, and system health.

20. Final Submission Requirements 
Working application, demo video, public GitHub repository, architecture documentation, AI usage documentation, development prompts, evaluation approach, and known limitations.

21. Creativity & Differentiation 
Focuses on good product decisions, thoughtful AI engineering, strong learning experiences, intelligent automation, reliability, and user usefulness.

22. Final Challenge Statement 
Build an AI Study Companion that feels less like a chatbot and more like a real learning partner. Don't just build what is written. Build what you believe the product should become.`;

async function seedPrdProject() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  console.log('Connected to MongoDB for PRD seeding...');

  // Target all users so everyone has access to the official PRD workspace
  const users = await User.find({});
  for (const user of users) {
    console.log(`Setting up PRD workspace for user: ${user.name} (${user.email})...`);

    // 1. Find or create "Product Engineering & AI" Space
    let space = await Space.findOne({ userId: user._id, title: 'AI Engineering & Product Architecture' });
    if (!space) {
      space = await Space.create({
        userId: user._id,
        title: 'AI Engineering & Product Architecture',
        description: 'Product requirements, full-stack architecture, grounded AI tutors, and evaluation benchmarks.',
        icon: 'Bot',
        color: '#6366F1'
      });
    }

    // 2. Find or create Project for PRD
    let project = await Project.findOne({ userId: user._id, title: 'AI Study Companion (PRD v3.0)' });
    if (!project) {
      project = await Project.create({
        spaceId: space._id,
        userId: user._id,
        title: 'AI Study Companion (PRD v3.0)',
        description: 'Official Product Requirements Document (v3.0) for the AI Study Companion candidate challenge.',
        learningGoal: 'Master full-stack AI engineering, grounded RAG citations, adaptive assessment, concept mastery, and AI observability',
        progress: 75,
        stats: {
          materialsCount: 1,
          conceptsCount: 6,
          quizzesTaken: 1,
          tutorInteractions: 5,
          averageMastery: 70
        }
      });
    }

    // 3. Create or Update Material
    let material = await Material.findOne({ projectId: project._id, originalName: 'AI_Study_Companion_PRD_v3.0.txt' });
    if (!material) {
      material = await Material.create({
        projectId: project._id,
        userId: user._id,
        originalName: 'AI_Study_Companion_PRD_v3.0.txt',
        storedFilename: 'AI_Study_Companion_PRD_v3.0.txt',
        filePath: 'uploads/AI_Study_Companion_PRD_v3.0.txt',
        fileSize: Buffer.byteLength(COMPANY_PRD_TEXT, 'utf-8'),
        fileType: 'text/plain',
        status: 'ready',
        progress: 100,
        pagesCount: 4,
        chunksCount: 0,
        extractedConcepts: [
          'Asynchronous Document Ingestion',
          'Grounded AI & Page Citations',
          'Adaptive Assessment Engine',
          'Concept Mastery & Growth Analysis',
          'AI Engineering & Observability',
          'Data Isolation & Persistent Context'
        ],
        summary: 'Official PRD v3.0 specifying architecture, primary learning loop, RAG pipeline, and observability.',
        processedAt: new Date()
      });
    }

    // 4. Create chunks
    await MaterialChunk.deleteMany({ materialId: material._id });
    const chunks = chunkDocumentText(COMPANY_PRD_TEXT, {
      numPages: 4,
      materialId: material._id,
      projectId: project._id,
      userId: user._id,
      originalName: material.originalName
    });
    await MaterialChunk.insertMany(chunks);
    material.chunksCount = chunks.length;
    await material.save();

    // 5. Create Concepts
    const prdConcepts = [
      { name: 'Asynchronous Document Ingestion', desc: 'Background PDF parsing, semantic chunking, and searchable representation', mastery: 85 },
      { name: 'Grounded AI & Page Citations', desc: 'Strict evidence retrieval with page citations and unsupported query refusal', mastery: 90 },
      { name: 'Adaptive Assessment Engine', desc: 'Dynamic MCQ and open-ended question synthesis with AI rubric evaluation', mastery: 75 },
      { name: 'Concept Mastery & Growth Analysis', desc: 'Continuous knowledge estimation (0-100%) and actionable recommendations', mastery: 65 },
      { name: 'AI Engineering & Observability', desc: 'Latency, token counting, cost tracking, and automated evaluation suites', mastery: 80 },
      { name: 'Data Isolation & Persistent Context', desc: 'Project-level sandbox boundaries and multi-session learner context preservation', mastery: 70 }
    ];

    for (const c of prdConcepts) {
      const existing = await Concept.findOne({ projectId: project._id, name: c.name });
      if (!existing) {
        await Concept.create({
          projectId: project._id,
          name: c.name,
          description: c.desc,
          estimatedMastery: c.mastery,
          status: c.mastery >= 75 ? 'improving' : 'stable',
          timesTested: 2,
          timesCorrect: 2,
          history: [{ score: c.mastery, source: 'initial_assessment', delta: 0 }]
        });
      }
    }
  }

  console.log('✅ Successfully seeded PRD project across all users!');
  process.exit(0);
}

seedPrdProject().catch(err => {
  console.error(err);
  process.exit(1);
});
