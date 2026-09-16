const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', spaceController.listSpaces);
router.post('/', spaceController.createSpace);
router.get('/:spaceId', spaceController.getSpace);
router.put('/:spaceId', spaceController.updateSpace);
router.delete('/:spaceId', spaceController.deleteSpace);

module.exports = router;
