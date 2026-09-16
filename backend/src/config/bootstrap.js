const User = require('../models/User');

/**
 * Automatically ensures default administrative and learner accounts exist upon database connection.
 * Guarantees zero downtime or authentication issues on fresh deployments (e.g. Render / Heroku / Atlas).
 */
async function ensureDefaultAccounts() {
  try {
    const adminAccounts = [
      {
        email: 'admin@gmail.com',
        name: 'Administrator',
        password: 'admin123',
        role: 'admin',
        avatarColor: '#10B981'
      },
      {
        email: 'admin@aistudy.test',
        name: 'Platform Admin',
        password: 'admin123',
        role: 'admin',
        avatarColor: '#10B981'
      },
      {
        email: 'itlasanthoshkumar@gmail.com',
        name: 'Santhosh (Admin)',
        password: 'admin123',
        role: 'admin',
        avatarColor: '#10B981'
      }
    ];

    for (const acc of adminAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        await User.create(acc);
        console.log(`[Bootstrap] Created admin account: ${acc.email}`);
      } else {
        user.role = 'admin';
        const matches = await user.matchPassword(acc.password);
        if (!matches) {
          user.password = acc.password;
        }
        await user.save();
        console.log(`[Bootstrap] Verified/Updated admin account: ${acc.email}`);
      }
    }

    // Also ensure default learner
    let learner = await User.findOne({ email: 'bindu@gmail.com' });
    if (!learner) {
      await User.create({
        name: 'bindu',
        email: 'bindu@gmail.com',
        password: 'password123',
        role: 'user',
        avatarColor: '#6366F1'
      });
      console.log('[Bootstrap] Created learner account: bindu@gmail.com');
    }
  } catch (err) {
    console.error('[Bootstrap] Failed to ensure default accounts:', err.message);
  }
}

module.exports = ensureDefaultAccounts;
