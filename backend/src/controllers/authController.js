const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_study_companion_key_2026', {
    expiresIn: '30d'
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    // Public registration is strictly for learners only (No admin signup allowed)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'user'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      // Strict role enforcement per portal
      if (expectedRole) {
        if (expectedRole === 'user' && user.role === 'admin') {
          return res.status(403).json({
            error: 'This account has Administrator privileges. It cannot log in via the Learner Portal. Please use the Admin Console window.'
          });
        }
        if (expectedRole === 'admin' && user.role !== 'admin') {
          return res.status(403).json({
            error: 'Access denied: This account is a Learner. Only Administrator accounts can log in to the Admin Console.'
          });
        }
      }

      user.lastActiveAt = new Date();
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    preferences: req.user.preferences
  });
};

exports.switchRole = async (req, res) => {
  return res.status(403).json({
    error: 'Role switching is disabled. Platform administration is strictly reserved for admin@gmail.com.'
  });
};
