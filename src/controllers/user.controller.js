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

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile (e.g., target Surah, review pace)
 * @route   PATCH /api/user/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, currentTargetSurah, reviewPace } = req.body;
    
    // Find and update the user
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update optional fields
    if (name) user.name = name;
    if (currentTargetSurah) user.currentTargetSurah = currentTargetSurah;
    if (reviewPace) user.reviewPace = reviewPace;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currentTargetSurah: user.currentTargetSurah,
        reviewPace: user.reviewPace
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 */
exports.changePassword = async (req, res, next) => {
    // Basic stub for password change as it was in the routes
    res.status(501).json({ success: false, message: 'Password change not yet implemented.' });
};
