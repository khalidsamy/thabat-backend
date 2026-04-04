const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createMutashabih,
  getMutashabihat,
  getDueMutashabihat,
  getMasteredMutashabihat,
  reviewMutashabih,
  updateMutashabih,
  deleteMutashabih,
  getMutashabihStats,
} = require('../controllers/mutashabihat.controller');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/mutashabihat
 * @desc    Log a new Mutashabih group (min 2 verses)
 * @access  Private
 */
router.post('/', createMutashabih);

/**
 * @route   GET /api/mutashabihat
 * @desc    Get all active Mutashabihat for the user
 * @access  Private
 */
router.get('/', getMutashabihat);

/**
 * @route   GET /api/mutashabihat/stats
 * @desc    Aggregated analytics (category counts, mastery distribution)
 * @access  Private
 */
router.get('/stats', getMutashabihStats);

/**
 * @route   GET /api/mutashabihat/due
 * @desc    Get Mutashabihat due for review today
 * @access  Private
 */
router.get('/due', getDueMutashabihat);

/**
 * @route   GET /api/mutashabihat/mastered
 * @desc    Get all mastered (archived) Mutashabihat
 * @access  Private
 */
router.get('/mastered', getMasteredMutashabihat);

/**
 * @route   PUT /api/mutashabihat/:id/review
 * @desc    Submit 3-way mastery review { rating: -1 | 0 | 1 }
 * @access  Private
 */
router.put('/:id/review', reviewMutashabih);

/**
 * @route   PUT /api/mutashabihat/:id
 * @desc    Edit mnemonic, category, or distinction notes
 * @access  Private
 */
router.put('/:id', updateMutashabih);

/**
 * @route   DELETE /api/mutashabihat/:id
 * @desc    Delete a Mutashabih group permanently
 * @access  Private
 */
router.delete('/:id', deleteMutashabih);

module.exports = router;
