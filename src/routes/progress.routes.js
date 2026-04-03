const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth.middleware');

// Apply protection to all progress routes
router.use(protect);

/**
 * @desc    Get user progress
 * @route   GET /api/progress
 */
router.get('/', progressController.getProgress);

/**
 * @desc    Get user's progress for today
 * @route   GET /api/progress/today
 */
router.get('/today', progressController.getTodayProgress);

/**
 * @desc    Get user's progress analytics and stats
 * @route   GET /api/progress/stats
 */
router.get('/stats', progressController.getStats);

/**
 * @desc    Get user's weekly progress report
 * @route   GET /api/progress/weekly
 */
router.get('/weekly', progressController.getWeeklyProgress);

/**
 * @desc    Get data for progress chart (last 7 days including empty days)
 * @route   GET /api/progress/chart
 */
router.get('/chart', progressController.getChartData);

/**
 * @desc    Update user progress
 * @route   POST /api/progress/update
 */
router.post('/update', progressController.updateProgress);

module.exports = router;
