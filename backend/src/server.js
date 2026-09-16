const express = require('express');
const cors = require('cors');
const path = require('path');
const net = require('net');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');

const findAvailablePort = (preferredPort) => new Promise((resolve, reject) => {
  const tester = net.createServer();

  tester.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      resolve(findAvailablePort(preferredPort + 1));
      return;
    }
    reject(err);
  });

  tester.listen(preferredPort, () => {
    const { port } = tester.address();
    tester.close(() => resolve(port));
  });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const materialRoutes = require('./routes/materialRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const quizRoutes = require('./routes/quizRoutes');
const masteryRoutes = require('./routes/masteryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const seedRoutes = require('./routes/seedRoutes');
const jobQueue = require('./workers/jobQueue');
const { rateLimit } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const preferredPort = Number(process.env.PORT) || 5000;

// Enable CORS for development and production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 180 }));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Study Companion Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/mastery', masteryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seed', seedRoutes);

app.use(notFound);
app.use(errorHandler);

// Connect to Database and start listening
connectDB()
  .then(async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const PORT = (isProduction && process.env.PORT) ? Number(process.env.PORT) : await findAvailablePort(preferredPort);
    app.listen(PORT, '0.0.0.0', () => {
      jobQueue.startWorker();
      console.log(`[AI Study Companion Server] Running on port ${PORT}`);
      console.log(`[AI] Primary model: ${process.env.GEMINI_MODEL || 'gemini-3.5-flash'}`);
    });
  })
  .catch((err) => {
    console.error('Fatal DB connection error, exiting:', err);
    process.exit(1);
  });
