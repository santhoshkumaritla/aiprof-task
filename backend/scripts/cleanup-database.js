const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function cleanupDatabase() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  console.log('Connected to MongoDB');

  const usersCol = mongoose.connection.collection('users');
  const spacesCol = mongoose.connection.collection('spaces');
  const projectsCol = mongoose.connection.collection('projects');
  const materialsCol = mongoose.connection.collection('materials');
  const chunksCol = mongoose.connection.collection('chunks');
  const conceptsCol = mongoose.connection.collection('concepts');
  const quizCol = mongoose.connection.collection('quizzes');
  const attemptsCol = mongoose.connection.collection('quizattempts');
  const eventsCol = mongoose.connection.collection('learningevents');
  const jobsCol = mongoose.connection.collection('backgroundjobs');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 1. Ensure primary Admin exists: itlasanthoshkumar@gmail.com
  let adminUser = await usersCol.findOne({ email: 'itlasanthoshkumar@gmail.com' });
  if (!adminUser) {
    const res = await usersCol.insertOne({
      name: 'Santhosh (Admin)',
      email: 'itlasanthoshkumar@gmail.com',
      password: hashedPassword,
      role: 'admin',
      avatarColor: '#10B981',
      preferences: { theme: 'dark', learningPace: 'accelerated' },
      createdAt: new Date(),
      lastActiveAt: new Date()
    });
    adminUser = await usersCol.findOne({ _id: res.insertedId });
  } else {
    await usersCol.updateOne(
      { _id: adminUser._id },
      { $set: { role: 'admin', name: 'Santhosh (Admin)', password: hashedPassword } }
    );
  }
  console.log('✅ Admin account configured:', adminUser.email, 'Role:', 'admin');

  // 2. Ensure primary Learner exists: bindu@gmail.com
  let binduUser = await usersCol.findOne({ email: 'bindu@gmail.com' });
  if (!binduUser) {
    const res = await usersCol.insertOne({
      name: 'bindu',
      email: 'bindu@gmail.com',
      password: hashedPassword,
      role: 'user',
      avatarColor: '#6366F1',
      preferences: { theme: 'dark', learningPace: 'steady' },
      createdAt: new Date(),
      lastActiveAt: new Date()
    });
    binduUser = await usersCol.findOne({ _id: res.insertedId });
  } else {
    await usersCol.updateOne(
      { _id: binduUser._id },
      { $set: { role: 'user', name: 'bindu', password: hashedPassword } }
    );
  }
  console.log('✅ Learner account configured:', binduUser.email, 'Role:', 'user');

  // 3. Ensure second Learner exists: selva@gmail.com
  let selvaUser = await usersCol.findOne({ email: 'selva@gmail.com' });
  if (selvaUser) {
    await usersCol.updateOne(
      { _id: selvaUser._id },
      { $set: { role: 'user', name: 'selva', password: hashedPassword } }
    );
    console.log('✅ Learner account configured:', selvaUser.email, 'Role:', 'user');
  }

  // 4. Remove all dummy / unwanted test accounts (ONLY ONE ADMIN REMAINS: itlasanthoshkumar@gmail.com)
  const allowedEmails = ['itlasanthoshkumar@gmail.com', 'bindu@gmail.com', 'selva@gmail.com'];
  const deleteResult = await usersCol.deleteMany({
    email: { $nin: allowedEmails }
  });
  console.log(`🗑️ Removed ${deleteResult.deletedCount} dummy / duplicate accounts.`);

  // 5. Transfer all orphaned spaces & projects to bindu and admin
  // So Bindu has full access to the PRD project and Machine Learning materials!
  const prdProject = await projectsCol.findOne({ title: { $regex: /PRD/i } });
  if (prdProject) {
    await projectsCol.updateMany(
      { title: { $regex: /PRD/i } },
      { $set: { userId: binduUser._id } }
    );
  }

  // Re-assign spaces to bindu
  await spacesCol.updateMany(
    { title: { $in: ['Machine Learning & AI', 'AI Engineering & Product Architecture'] } },
    { $set: { userId: binduUser._id } }
  );

  // Print remaining active users
  const activeUsers = await usersCol.find({}).toArray();
  console.log('\n--- Active Clean Platform Users ---');
  activeUsers.forEach(u => {
    console.log(`👤 ${u.name} | Email: ${u.email} | Role: ${u.role}`);
  });

  await mongoose.disconnect();
}

cleanupDatabase().catch(console.error);
