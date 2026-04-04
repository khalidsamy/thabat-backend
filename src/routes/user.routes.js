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

/**
 * @desc    Update user profile (Name)
 * @route   PUT /api/user/profile
 * @access  Private
 */
router.put('/profile', protect, updateProfile);

/**
 * @desc    Change user password
 * @route   PUT /api/user/password
 * @access  Private
 */
router.put('/password', protect, changePassword);

module.exports = router;
