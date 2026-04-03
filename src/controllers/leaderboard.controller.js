const Progress = require('../models/Progress.model');

/**
 * @desc    Get top 10 leaderboard
 * @route   GET /api/leaderboard
 * @access  Public
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const activeProgress = await Progress.find({ totalMemorized: { $gt: 0 } })
      .populate('user', 'name')
      .sort({ longestStreak: -1, totalMemorized: -1 })
      .limit(20);

    const leaderboard = activeProgress
      .filter((entry) => entry.user != null)
      .slice(0, 10)
      .map((entry) => ({
        name: entry.user.name,
        streak: entry.streak,
        longestStreak: entry.longestStreak || 0,
        totalMemorized: entry.totalMemorized,
      }));

    res.status(200).json({
      success: true,
      leaderboard,
    });

  } catch (error) {
    next(error);
  }
};
