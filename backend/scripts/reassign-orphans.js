const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  const dbs = mongoose.connection.db;
  const admin = await dbs.collection('users').findOne({ email: 'admin@gmail.com' });
  const users = await dbs.collection('users').find().toArray();
  const validIds = users.map(u => u._id);

  const collections = ['spaces', 'projects', 'materials', 'quizattempts', 'learningevents', 'aiusagelogs'];
  for (const c of collections) {
    const res = await dbs.collection(c).updateMany(
      { userId: { $nin: validIds } },
      { $set: { userId: admin._id } }
    );
    console.log(c, 'reassigned:', res.modifiedCount);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
