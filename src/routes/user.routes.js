const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User.model');

const { 
  getUserProfile, 
  updateProfile, 
  changePassword 
} = require('../controllers/user.controller');

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
router.get('/profile', protect, getUserProfile);
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

/**
 * @desc    Change user password
 * @route   PUT /api/user/password
 * @access  Private
 */
router.put('/password', protect, changePassword);

module.exports = router;
