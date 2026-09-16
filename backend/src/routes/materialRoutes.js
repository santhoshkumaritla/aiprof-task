const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const materialController = require('../controllers/materialController');
const { protect } = require('../middleware/auth');
const { checkProjectAccess } = require('../middleware/projectIsolation');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB max support (covers 67MB, 100MB+ files)
});

const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large. Maximum supported upload size is 300MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.use(protect);

router.post('/upload', uploadMiddleware, materialController.uploadMaterial);
router.post('/text', checkProjectAccess, materialController.createTextMaterial);
router.get('/project/:projectId', checkProjectAccess, materialController.listMaterials);
router.get('/:materialId', materialController.getMaterial);
router.post('/:materialId/retry', materialController.retryProcessing);

module.exports = router;
