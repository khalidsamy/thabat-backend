const Progress = require('../models/Progress.model');

/**
 * @desc    Get top 10 leaderboard
 * @route   GET /api/leaderboard
 * @access  Public
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const activeProgress = await Progress.find({ $or: [{ totalMemorized: { $gt: 0 } }, { streak: { $gt: 0 } }] })
      .populate('user', 'name')
      .sort({ streak: -1, doneToday: -1 })
      .limit(20);

    const leaderboard = activeProgress
      .filter((entry) => entry.user != null)
      .slice(0, 10)
      .map((entry) => {
        const nameParts = entry.user.name.split(' ');
        const anonName = nameParts.length > 1 
          ? `${nameParts[0]} ${nameParts[1][0]}.` 
          : nameParts[0];

        return {
          name: anonName || 'A Servant of Allah',
          streak: entry.streak,
          doneToday: entry.doneToday || 0,
          totalMemorized: entry.totalMemorized,
        };
      });

    res.status(200).json({
      success: true,
      leaderboard,
    });

  } catch (error) {
    next(error);
  }
};
