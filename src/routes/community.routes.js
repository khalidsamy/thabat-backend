const express = require('express');
const { postReflection, getReflections, addDua, getCommunityStats, sendEncouragement } = require('../controllers/community.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply protection to all community routes
router.use(protect);

router.post('/reflect', postReflection);
router.get('/', getReflections);
router.get('/stats', getCommunityStats);
router.post('/dua/:id', addDua);
router.post('/cheer/:id', sendEncouragement);

module.exports = router;
