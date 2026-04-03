const Progress = require('../models/Progress.model');

/**
 * @desc    Get user achievements
 * @route   GET /api/achievements
 * @access  Private
 */
exports.getAchievements = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const progress = await Progress.findOne({ user: userId });

    const currentStreak = progress ? progress.streak : 0;
    const bestStreak = progress ? Math.max(progress.longestStreak || 0, currentStreak) : 0;
    const totalMemorized = progress ? progress.totalMemorized : 0;

    const achievements = [
      { title: 'Beginner', unlocked: bestStreak >= 3 },
      { title: 'Consistent', unlocked: bestStreak >= 7 },
      { title: 'Warrior', unlocked: bestStreak >= 30 },
      { title: 'Halfway', unlocked: totalMemorized >= 50 },
      { title: 'Master', unlocked: totalMemorized >= 604 },
    ];

    res.status(200).json({
      success: true,
      achievements,
    });
  } catch (error) {
    next(error);
  }
};
