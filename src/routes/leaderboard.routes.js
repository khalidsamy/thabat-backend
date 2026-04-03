const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');

/**
 * @desc    Get top 10 leaderboard
 * @route   GET /api/leaderboard
 */
router.get('/', leaderboardController.getLeaderboard);

module.exports = router;
