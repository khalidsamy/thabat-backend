const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievements.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * @desc    Get user achievements
 * @route   GET /api/achievements
 * @access  Private
 */
router.get('/', protect, achievementsController.getAchievements);

module.exports = router;
