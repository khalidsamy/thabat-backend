const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createError,
  getErrors,
  getDueErrors,
  getResolvedErrors,
  reviewError,
  updateError,
  deleteError,
  getErrorStats,
} = require('../controllers/errors.controller');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/errors
 * @desc    Log a new Hifz error
 * @access  Private
 */
router.post('/', createError);

/**
 * @route   GET /api/errors
 * @desc    Get all active errors for authenticated user
 * @access  Private
 */
router.get('/', getErrors);

/**
 * @route   GET /api/errors/stats
 * @desc    Get error pattern statistics
 * @access  Private
 */
router.get('/stats', getErrorStats);

/**
 * @route   GET /api/errors/due
 * @desc    Get errors due for review today (the nightly review queue)
 * @access  Private
 */
router.get('/due', getDueErrors);

/**
 * @route   GET /api/errors/resolved
 * @desc    Get all resolved (cured) errors — the achievement archive
 * @access  Private
 */
router.get('/resolved', getResolvedErrors);

/**
 * @route   PUT /api/errors/:id/review
 * @desc    Submit a binary review result { result: "correct" | "wrong" }
 * @access  Private
 */
router.put('/:id/review', reviewError);

/**
 * @route   PUT /api/errors/:id
 * @desc    Edit an error's note, type, or location
 * @access  Private
 */
router.put('/:id', updateError);

/**
 * @route   DELETE /api/errors/:id
 * @desc    Delete a specific error record permanently
 * @access  Private
 */
router.delete('/:id', deleteError);

module.exports = router;
