const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-prof-task';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] Local/Atlas MongoDB unavailable (${error.message}). Trying in-memory fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memory = await MongoMemoryServer.create();
      const memoryUri = memory.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.warn('[Database] Using mongodb-memory-server. Data will not persist after restart.');
      return conn;
    } catch (fallbackErr) {
      console.error('[Database Error] In-memory fallback failed:', fallbackErr.message);
      console.warn('[Database] Install mongodb-memory-server or start MongoDB / set MONGODB_URI.');
      throw error;
    }
  }
};

module.exports = connectDB;
