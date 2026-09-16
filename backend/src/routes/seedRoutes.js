const express = require('express');
const router = express.Router();
const seedController = require('../controllers/seedController');

// Open endpoint to populate initial demo data for test evaluators
router.post('/demo', seedController.seedDemoData);

module.exports = router;
