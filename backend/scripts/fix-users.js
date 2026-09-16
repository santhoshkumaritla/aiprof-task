const mongoose = require('mongoose');

async function fixUsers() {
  await mongoose.connect('mongodb://localhost:27017/ai-prof-task');
  console.log('Connected to MongoDB');

  const binduRes = await mongoose.connection.collection('users').updateOne(
    { email: 'bindu@gmail.com' },
    { $set: { role: 'user' } }
  );
  console.log('Updated bindu to role: user ->', binduRes);

  const selvaRes = await mongoose.connection.collection('users').updateOne(
    { email: 'selva@gmail.com' },
    { $set: { role: 'user' } }
  );
  console.log('Updated selva to role: user ->', selvaRes);

  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log('\nCurrent database users:');
  users.forEach(u => {
    console.log(`- ${u.name} (${u.email}) => role: ${u.role}`);
  });

  await mongoose.disconnect();
}

fixUsers().catch(console.error);
