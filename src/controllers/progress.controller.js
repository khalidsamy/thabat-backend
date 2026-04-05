const Progress = require('../models/Progress.model');
const User = require('../models/User.model');

// ─── helpers ──────────────────────────────────────────────────────────────

const todayDate = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

const diffDays = (a, b) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

// ─── GET /api/progress ────────────────────────────────────────────────────

// ─── REPLACE getProgress in progress.controller.js ───────────────────────
//
// Original returned a plain object literal for new users. This version
// creates and persists the Progress document on first load so all subsequent
// calls find a real record, preventing any stale-UI edge cases.

exports.getProgress = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let progress = await Progress.findOne({ user: userId });

    // First-time user: create a default Progress document immediately
    // so the dashboard never has to work from a plain object.
    if (!progress) {
      progress = await Progress.create({
        user: userId,
        currentPage: 1,
        totalMemorized: 0,
        dailyTarget: 1,
        streak: 0,
        longestStreak: 0,
        doneToday: 0,
        sunnahCompletedToday: false,
        history: [],
      });

      return res.status(200).json({
        success: true,
        progress: {
          ...progress.toObject(),
          masteryPercent: 0,
        },
      });
    }

    // Daily reset
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = progress.lastUpdate
      ? new Date(
          new Date(progress.lastUpdate).getFullYear(),
          new Date(progress.lastUpdate).getMonth(),
          new Date(progress.lastUpdate).getDate()
        )
      : null;

    if (!lastDate || today.getTime() > lastDate.getTime()) {
      progress.doneToday = 0;
      progress.sunnahCompletedToday = false;
      progress.lastUpdate = today;
      await progress.save();
    }

    const masteryPercent = Math.min(
      100,
      Math.round(((progress.totalMemorized || 0) / (progress.totalMushafPages || 604)) * 100)
    );

    res.status(200).json({
      success: true,
      progress: { ...progress.toObject(), masteryPercent },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/progress/today ──────────────────────────────────────────────

exports.getTodayProgress = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({ user: req.user.userId });
    if (!progress) return res.status(200).json({ success: true, today: { done: 0, target: 1, completed: false } });

    const today = todayDate();
    const lastDate = progress.lastUpdate
      ? new Date(new Date(progress.lastUpdate).getFullYear(), new Date(progress.lastUpdate).getMonth(), new Date(progress.lastUpdate).getDate())
      : null;
    const isToday = lastDate && today.getTime() === lastDate.getTime();

    res.status(200).json({
      success: true,
      today: { done: isToday ? progress.doneToday : 0, target: progress.dailyTarget, completed: (isToday ? progress.doneToday : 0) >= progress.dailyTarget },
    });
  } catch (e) { next(e); }
};

// ─── GET /api/progress/stats ──────────────────────────────────────────────

exports.getStats = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({ user: req.user.userId });
    if (!progress) return res.status(200).json({ success: true, stats: { totalMemorized: 0, currentPage: 1, streak: 0, longestStreak: 0, completionRate: 0 } });

    const completionRate = progress.streak > 0 && progress.dailyTarget > 0
      ? Math.round(Math.min(Math.max((progress.totalMemorized / (progress.dailyTarget * progress.streak)) * 100, 0), 100))
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalMemorized: progress.totalMemorized,
        currentPage: progress.currentPage,
        streak: progress.streak,
        longestStreak: progress.longestStreak || 0,
        completionRate,
        masteryPercent: Math.min(100, Math.round((progress.totalMemorized / (progress.totalMushafPages || 604)) * 100)),
      },
    });
  } catch (e) { next(e); }
};

// ─── GET /api/progress/weekly ─────────────────────────────────────────────

exports.getWeeklyProgress = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({ user: req.user.userId });
    if (!progress?.history?.length) {
      return res.status(200).json({ success: true, weekly: { daysActive: 0, pagesMemorized: 0, consistencyScore: 0 } });
    }

    const today = todayDate();
    const cutoff = new Date(today.getTime() - 6 * 86400000);
    const week = progress.history.filter(e => {
      const d = new Date(e.date).getTime();
      return d >= cutoff.getTime() && d <= today.getTime();
    });

    const daysActive = week.filter(e => e.pages > 0).length;
    res.status(200).json({
      success: true,
      weekly: {
        daysActive,
        pagesMemorized: week.reduce((s, e) => s + e.pages, 0),
        consistencyScore: Math.round((daysActive / 7) * 100),
      },
    });
  } catch (e) { next(e); }
};

// ─── GET /api/progress/chart ──────────────────────────────────────────────

exports.getChartData = async (req, res, next) => {
  try {
    const progress = await Progress.findOne({ user: req.user.userId });
    const today = todayDate();
    const chart = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const entry = progress?.history?.find(e => new Date(e.date).getTime() === d.getTime());
      chart.push({
        date: d.toISOString().slice(0, 10),
        pages: entry?.pages || 0,
      });
    }

    res.status(200).json({ success: true, chart });
  } catch (e) { next(e); }
};

// ─── GET /api/progress/mastery-trend ─────────────────────────────────────
// Returns last 7 days of recitation mastery scores for the weekly trend chart.

exports.getMasteryTrend = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.masteryHistory?.length) {
      return res.status(200).json({ success: true, trend: [] });
    }

    const today = todayDate();
    const trend = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);

      const dayScores = user.masteryHistory.filter(h => {
        const hd = new Date(h.date);
        return hd.toISOString().slice(0, 10) === dateStr;
      });

      const avg = dayScores.length
        ? Math.round(dayScores.reduce((s, h) => s + h.score, 0) / dayScores.length)
        : null;

      trend.push({ date: dateStr, avgScore: avg, sessions: dayScores.length });
    }

    res.status(200).json({ success: true, trend });
  } catch (e) { next(e); }
};

// ─── POST /api/progress/update ────────────────────────────────────────────

exports.updateProgress = async (req, res, next) => {
  try {
    const { pages } = req.body;
    if (!pages || typeof pages !== 'number' || pages <= 0) {
      return res.status(400).json({ success: false, message: 'Positive number of pages required' });
    }

    let progress = await Progress.findOne({ user: req.user.userId });
    if (!progress) progress = new Progress({ user: req.user.userId });

    const totalPages = progress.totalMushafPages || 604;
    progress.currentPage    = Math.min(progress.currentPage + pages, totalPages);
    progress.totalMemorized = Math.min(progress.totalMemorized + pages, totalPages);

    const today = todayDate();

    if (progress.lastUpdate) {
      const last = new Date(progress.lastUpdate);
      const lastD = new Date(last.getFullYear(), last.getMonth(), last.getDate());
      const diff = diffDays(today, lastD);

      if      (diff === 1) { progress.streak += 1; progress.doneToday = pages; }
      else if (diff  >  1) { progress.streak  = 1; progress.doneToday = pages; }
      else                  { progress.doneToday += pages; }
    } else {
      progress.streak = 1;
      progress.doneToday = pages;
    }

    // longestStreak is now always persisted correctly
    progress.longestStreak = Math.max(progress.longestStreak || 0, progress.streak);

    const existIdx = progress.history.findIndex(e => new Date(e.date).getTime() === today.getTime());
    if (existIdx > -1) progress.history[existIdx].pages += pages;
    else               progress.history.push({ date: today, pages });

    const cutoff = new Date(today.getTime() - 60 * 86400000);
    progress.history = progress.history.filter(e => new Date(e.date).getTime() >= cutoff.getTime());

    progress.lastUpdate = today;
    await progress.save();

    res.status(200).json({ success: true, progress });
  } catch (e) { next(e); }
};

// ─── PUT /api/progress/toggle-sunnah ─────────────────────────────────────

exports.toggleSunnah = async (req, res, next) => {
  try {
    let progress = await Progress.findOne({ user: req.user.userId });
    if (!progress) progress = new Progress({ user: req.user.userId });

    progress.sunnahCompletedToday = !progress.sunnahCompletedToday;
    progress.lastUpdate = todayDate();
    await progress.save();

    res.status(200).json({ success: true, sunnahCompletedToday: progress.sunnahCompletedToday });
  } catch (e) { next(e); }
};

// ─── POST /api/progress/mastery ───────────────────────────────────────────
// Also syncs currentSurahName on the Progress document so the dashboard
// header can display it without a User collection join.

exports.saveMastery = async (req, res, next) => {
  try {
    const { score, surah } = req.body;
    if (score === undefined || !surah) {
      return res.status(400).json({ success: false, message: 'score and surah are required' });
    }

    // Save to User masteryHistory (used by mastery-trend)
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.masteryHistory.push({ score, surah, date: new Date() });
    if (user.masteryHistory.length > 50) user.masteryHistory = user.masteryHistory.slice(-50);
    await user.save();

    // Sync currentSurahName on Progress document
    await Progress.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { currentSurahName: surah } },
      { upsert: true }
    );

    res.status(200).json({ success: true });
  } catch (e) { next(e); }
};