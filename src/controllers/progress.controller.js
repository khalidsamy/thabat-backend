const Progress = require('../models/Progress.model');

/**
 * @desc    Get current user progress
 * @route   GET /api/progress
 * @access  Private
 */
exports.getProgress = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    let progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(200).json({
        success: true,
        progress: {
          user: userId,
          currentPage: 1,
          totalMemorized: 0,
          dailyTarget: 1,
          streak: 0,
          sunnahCompletedToday: false,
        },
      });
    }

    // Daily reset logic for trackers and progress
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastUpdateDate = progress.lastUpdate ? new Date(progress.lastUpdate.getFullYear(), progress.lastUpdate.getMonth(), progress.lastUpdate.getDate()) : null;

    if (!lastUpdateDate || today.getTime() > lastUpdateDate.getTime()) {
      progress.doneToday = 0;
      progress.sunnahCompletedToday = false;
      progress.lastUpdate = today;
      await progress.save();
    }

    const masteryPercent = Math.min(100, Math.round(((progress.totalMemorized || 0) / 604) * 100));

    res.status(200).json({
      success: true,
      progress: {
        ...progress.toObject(),
        masteryPercent
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's progress for today vs daily target
 * @route   GET /api/progress/today
 * @access  Private
 */
exports.getTodayProgress = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(200).json({
        success: true,
        today: {
          done: 0,
          target: 1,
          completed: false,
        },
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastUpdate = progress.lastUpdate ? new Date(progress.lastUpdate) : null;
    const lastUpdateDate = lastUpdate
      ? new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate())
      : null;

    const isToday =
      lastUpdateDate && today.getTime() === lastUpdateDate.getTime();

    const done = isToday ? progress.doneToday : 0;
    const target = progress.dailyTarget;

    res.status(200).json({
      success: true,
      today: {
        done,
        target,
        completed: done >= target,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's progress analytics and stats
 * @route   GET /api/progress/stats
 * @access  Private
 */
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const progress = await Progress.findOne({ user: userId });

    if (!progress) {
      return res.status(200).json({
        success: true,
        stats: {
          totalMemorized: 0,
          currentPage: 1,
          streak: 0,
          longestStreak: 0,
          completionRate: 0,
        },
      });
    }

    let completionRate = 0;
    if (progress.streak > 0 && progress.dailyTarget > 0) {
      const rateRaw = (progress.totalMemorized / (progress.dailyTarget * progress.streak)) * 100;
      completionRate = Math.round(Math.min(Math.max(rateRaw, 0), 100));
    }

    const masteryPercent = Math.min(100, Math.round(((progress.totalMemorized || 0) / 604) * 100));

    res.status(200).json({
      success: true,
      stats: {
        totalMemorized: progress.totalMemorized,
        currentPage: progress.currentPage,
        streak: progress.streak,
        longestStreak: progress.longestStreak || 0,
        completionRate,
        masteryPercent
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's weekly progress report
 * @route   GET /api/progress/weekly
 * @access  Private
 */
exports.getWeeklyProgress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const progress = await Progress.findOne({ user: userId });

    if (!progress || !progress.history || progress.history.length === 0) {
      return res.status(200).json({
        success: true,
        weekly: {
          daysActive: 0,
          pagesMemorized: 0,
          consistencyScore: 0,
        },
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const cutoffDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

    const weeklyHistory = progress.history.filter(
      (entry) => entry.date.getTime() >= cutoffDate.getTime() && entry.date.getTime() <= today.getTime()
    );

    const daysActive = weeklyHistory.filter(entry => entry.pages > 0).length;
    const pagesMemorized = weeklyHistory.reduce((sum, entry) => sum + entry.pages, 0);
    const consistencyScore = Math.round((daysActive / 7) * 100);

    res.status(200).json({
      success: true,
      weekly: {
        daysActive,
        pagesMemorized,
        consistencyScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get data for progress chart (last 7 days including empty days)
 * @route   GET /api/progress/chart
 * @access  Private
 */
exports.getChartData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const progress = await Progress.findOne({ user: userId });

    const chartData = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      
      const historyEntry = progress && progress.history 
        ? progress.history.find(entry => entry.date.getTime() === targetDate.getTime())
        : null;

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      
      chartData.push({
        date: `${year}-${month}-${day}`,
        pages: historyEntry ? historyEntry.pages : 0
      });
    }

    res.status(200).json({
      success: true,
      chart: chartData
    });
  } catch (error) {
    next(error);
  }
};


// POST /api/progress/update - Update progress and streak
exports.updateProgress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { pages } = req.body;

    if (!pages || typeof pages !== 'number' || pages <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a positive number of pages',
      });
    }

    let progress = await Progress.findOne({ user: userId });

    if (!progress) {
      progress = new Progress({ user: userId });
    }

    progress.currentPage += pages;
    progress.totalMemorized += pages;

    progress.currentPage = Math.min(progress.currentPage, 604);
    progress.totalMemorized = Math.min(progress.totalMemorized, 604);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (progress.lastUpdate) {
      const lastUpdate = new Date(progress.lastUpdate);
      const lastUpdateDate = new Date(
        lastUpdate.getFullYear(),
        lastUpdate.getMonth(),
        lastUpdate.getDate()
      );

      const diffInTime = today.getTime() - lastUpdateDate.getTime();
      const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));

      if (diffInDays === 1) {
        progress.streak += 1;
        progress.doneToday = pages;
      } else if (diffInDays > 1) {
        progress.streak = 1;
        progress.doneToday = pages;
      } else if (diffInDays === 0) {
        progress.doneToday += pages;
      }
    } else {
      progress.streak = 1;
      progress.doneToday = pages;
    }

    progress.longestStreak = Math.max(progress.longestStreak || 0, progress.streak);

    const existingEntryIndex = progress.history.findIndex(
      (entry) => entry.date.getTime() === today.getTime()
    );

    if (existingEntryIndex > -1) {
      progress.history[existingEntryIndex].pages += pages;
    } else {
      progress.history.push({ date: today, pages });
    }

    const cutoffDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    progress.history = progress.history.filter(
      (entry) => entry.date.getTime() >= cutoffDate.getTime()
    );

    progress.lastUpdate = today;
    await progress.save();

    res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Sunnah prayer completion state
 * @route   PUT /api/progress/toggle-sunnah
 * @access  Private
 */
exports.toggleSunnah = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let progress = await Progress.findOne({ user: userId });

    if (!progress) {
      progress = new Progress({ user: userId });
    }

    progress.sunnahCompletedToday = !progress.sunnahCompletedToday;
    
    // Mark date for reset consistency
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    progress.lastUpdate = today;
    
    await progress.save();

    res.status(200).json({
      success: true,
      sunnahCompletedToday: progress.sunnahCompletedToday,
    });
  } catch (error) {
    next(error);
  }
};
