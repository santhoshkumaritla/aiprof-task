const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setSingleAdmin() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  console.log('Connected to MongoDB');

  const usersCol = mongoose.connection.collection('users');

  const salt = await bcrypt.genSalt(10);
  const adminHashedPassword = await bcrypt.hash('admin123', salt);
  const learnerHashedPassword = await bcrypt.hash('password123', salt);

  // 1. Ensure the ONLY ADMIN is admin@gmail.com with password: admin123
  await usersCol.deleteOne({ email: 'admin@gmail.com' });
  await usersCol.insertOne({
    name: 'Administrator',
    email: 'admin@gmail.com',
    password: adminHashedPassword,
    role: 'admin',
    avatarColor: '#10B981',
    preferences: { theme: 'dark', learningPace: 'accelerated' },
    createdAt: new Date(),
    lastActiveAt: new Date()
  });
  console.log('✅ Created single sole administrator: admin@gmail.com (pass: admin123)');

  // 2. Remove any other admins (ensure there is ONLY ONE admin in the database)
  await usersCol.deleteMany({
    role: 'admin',
    email: { $ne: 'admin@gmail.com' }
  });

  // 3. Ensure Learners exist: bindu@gmail.com
  let bindu = await usersCol.findOne({ email: 'bindu@gmail.com' });
  if (!bindu) {
    await usersCol.insertOne({
      name: 'bindu',
      email: 'bindu@gmail.com',
      password: learnerHashedPassword,
      role: 'user',
      avatarColor: '#6366F1',
      preferences: { theme: 'dark', learningPace: 'steady' },
      createdAt: new Date(),
      lastActiveAt: new Date()
    });
  } else {
    await usersCol.updateOne({ email: 'bindu@gmail.com' }, { $set: { role: 'user', password: learnerHashedPassword } });
  }

  // Ensure selva exists as learner
  let selva = await usersCol.findOne({ email: 'selva@gmail.com' });
  if (selva) {
    await usersCol.updateOne({ email: 'selva@gmail.com' }, { $set: { role: 'user', password: learnerHashedPassword } });
  }

  // Remove any stray dummy accounts
  await usersCol.deleteMany({
    email: { $nin: ['admin@gmail.com', 'bindu@gmail.com', 'selva@gmail.com'] }
  });

  // Verify
  const allUsers = await usersCol.find({}).toArray();
  console.log('\n--- Active Platform Users in Database ---');
  allUsers.forEach(u => {
    console.log(`👤 ${u.name} | ${u.email} | Role: ${u.role}`);
  });

  await mongoose.disconnect();
}

setSingleAdmin().catch(console.error);
