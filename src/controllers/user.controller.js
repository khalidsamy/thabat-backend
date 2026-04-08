const bcrypt = require('bcrypt');
const User = require('../models/User.model');

/**
 * @desc    Get current user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Update user profile (e.g., target Surah, review pace)
 * @route   PATCH /api/user/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { 
      name, 
      currentTargetSurah, 
      reviewPace, 
      setupCompleted, 
      hifzStatus, 
      currentGoal, 
      dailyCapacity, 
      revisionIntensity 
    } = req.body;
    
    // Find and update the user
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update optional fields
    if (name !== undefined) user.name = name.trim();
    if (currentTargetSurah !== undefined) user.currentTargetSurah = currentTargetSurah.trim();
    if (reviewPace !== undefined) user.reviewPace = reviewPace;
    if (setupCompleted !== undefined) user.setupCompleted = setupCompleted;
    if (hifzStatus !== undefined) user.hifzStatus = hifzStatus;
    if (currentGoal !== undefined) user.currentGoal = currentGoal;
    if (dailyCapacity !== undefined) user.dailyCapacity = dailyCapacity;
    if (revisionIntensity !== undefined) user.revisionIntensity = revisionIntensity;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toObject()
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Change user password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.user.userId).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from the current password.',
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    return next(error);
  }
};
