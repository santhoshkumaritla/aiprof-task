const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_study_companion_key_2026');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    // If running in development/demo mode without token, check for demo header or fallback to demo user
    if (process.env.NODE_ENV !== 'production' && req.headers['x-demo-user']) {
      const demoUser = await User.findOne({ email: req.headers['x-demo-user'] });
      if (demoUser) {
        req.user = demoUser;
        return next();
      }
    }
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Administrator privileges required' });
  }
};

module.exports = { protect, requireAdmin };
