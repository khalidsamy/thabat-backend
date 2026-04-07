const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getUserProfile,
  updateProfile,
  changePassword,
} = require('../controllers/user.controller');

router.get('/profile', protect, getUserProfile);
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
