const HifzError = require('../models/HifzError.model');

// ── SRS Constants ──────────────────────────────────────────────────────────
const CURE_THRESHOLD = 5;          // 5 consecutive correct → auto-resolve
const EASE_PENALTY   = 0.2;        // Deducted from easeFactor on wrong answer
const EASE_MIN       = 1.3;        // Minimum easeFactor floor

/**
 * Compute next interval using simplified SM-2:
 *   correct → intervalDays = Math.round(intervalDays * easeFactor), min 1
 *   wrong   → intervalDays = 1 (restart)
 */
const computeNextInterval = (intervalDays, easeFactor, wasCorrect) => {
  if (!wasCorrect) return 1;
  return Math.max(1, Math.round(intervalDays * easeFactor));
};

// ──────────────────────────────────────────────────────────────────────────
// POST /api/errors
// Log a new Hifz error
// ──────────────────────────────────────────────────────────────────────────
const createError = async (req, res, next) => {
  try {
    const { location, errorType, note, ayahText } = req.body;

    if (!location || !location.surahNumber || !location.surahName || !location.ayahNumber) {
      return res.status(400).json({
        success: false,
        message: 'Location (surahNumber, surahName, ayahNumber) is required.',
      });
    }

    const hifzError = await HifzError.create({
      user: req.user.userId,
      location,
      errorType: errorType || 'other',
      note,
      ayahText,
    });

    res.status(201).json({
      success: true,
      message: 'Error logged successfully.',
      error: hifzError,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/errors
// Get all ACTIVE errors for the authenticated user (newest first)
// ──────────────────────────────────────────────────────────────────────────
const getErrors = async (req, res, next) => {
  try {
    const errors = await HifzError.find({
      user: req.user.userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: errors.length,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/errors/due
// Get active errors whose nextReviewDate is today or in the past
// This is the "Nightly Review" queue
// ──────────────────────────────────────────────────────────────────────────
const getDueErrors = async (req, res, next) => {
  try {
    const now = new Date();

    const dueErrors = await HifzError.find({
      user: req.user.userId,
      status: 'active',
      'srs.nextReviewDate': { $lte: now },
    }).sort({ 'srs.nextReviewDate': 1 }); // Oldest due first

    res.status(200).json({
      success: true,
      count: dueErrors.length,
      errors: dueErrors,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/errors/resolved
// Get all RESOLVED (cured) errors for the user — the achievement archive
// ──────────────────────────────────────────────────────────────────────────
const getResolvedErrors = async (req, res, next) => {
  try {
    const resolved = await HifzError.find({
      user: req.user.userId,
      status: 'resolved',
    }).sort({ resolvedAt: -1 });

    res.status(200).json({
      success: true,
      count: resolved.length,
      errors: resolved,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/errors/:id/review
// Submit a binary review result: { result: "correct" | "wrong" }
// Applies SM-2 update logic and auto-resolves at threshold
// ──────────────────────────────────────────────────────────────────────────
const reviewError = async (req, res, next) => {
  try {
    const { result } = req.body;

    if (!result || !['correct', 'wrong'].includes(result)) {
      return res.status(400).json({
        success: false,
        message: 'Result must be "correct" or "wrong".',
      });
    }

    const hifzError = await HifzError.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!hifzError) {
      return res.status(404).json({
        success: false,
        message: 'Error record not found.',
      });
    }

    if (hifzError.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'This error has already been resolved.',
      });
    }

    const wasCorrect = result === 'correct';
    const srs = hifzError.srs;

    // ── Apply SM-2 update ────────────────────────────────────────
    if (wasCorrect) {
      srs.consecutiveCorrect += 1;
      srs.intervalDays = computeNextInterval(srs.intervalDays, srs.easeFactor, true);
      // Slight ease boost on correct (optional, keeps motivation)
      srs.easeFactor = Math.min(srs.easeFactor + 0.05, 4.0);
    } else {
      srs.consecutiveCorrect = 0;
      srs.intervalDays = 1;
      srs.easeFactor = Math.max(srs.easeFactor - EASE_PENALTY, EASE_MIN);
    }

    srs.totalReviews += 1;
    srs.lastReviewedAt = new Date();

    // Schedule next review
    const next = new Date();
    next.setDate(next.getDate() + srs.intervalDays);
    srs.nextReviewDate = next;

    // ── Auto-resolve at cure threshold ───────────────────────────
    let justResolved = false;
    if (srs.consecutiveCorrect >= CURE_THRESHOLD) {
      hifzError.status = 'resolved';
      hifzError.resolvedAt = new Date();
      justResolved = true;
    }

    hifzError.srs = srs;
    await hifzError.save();

    res.status(200).json({
      success: true,
      resolved: justResolved,
      message: justResolved
        ? '🎉 Error cured! Moved to your resolved archive.'
        : `Review recorded. Next review in ${srs.intervalDays} day(s).`,
      error: hifzError,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/errors/:id
// Update an error's note, errorType, or location (before any reviews)
// ──────────────────────────────────────────────────────────────────────────
const updateError = async (req, res, next) => {
  try {
    const { note, errorType, ayahText, location } = req.body;

    const hifzError = await HifzError.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { 
        ...(note !== undefined && { note }),
        ...(errorType && { errorType }),
        ...(ayahText !== undefined && { ayahText }),
        ...(location && { location }),
      },
      { new: true, runValidators: true }
    );

    if (!hifzError) {
      return res.status(404).json({
        success: false,
        message: 'Error record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Error updated successfully.',
      error: hifzError,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/errors/:id
// Permanently delete a specific error record
// ──────────────────────────────────────────────────────────────────────────
const deleteError = async (req, res, next) => {
  try {
    const hifzError = await HifzError.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!hifzError) {
      return res.status(404).json({
        success: false,
        message: 'Error record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Error deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/errors/stats
// Aggregate statistics for the user's error patterns
// ──────────────────────────────────────────────────────────────────────────
const getErrorStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [totalActive, totalResolved, byType] = await Promise.all([
      HifzError.countDocuments({ user: userId, status: 'active' }),
      HifzError.countDocuments({ user: userId, status: 'resolved' }),
      HifzError.aggregate([
        { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId), status: 'active' } },
        { $group: { _id: '$errorType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const dueCount = await HifzError.countDocuments({
      user: userId,
      status: 'active',
      'srs.nextReviewDate': { $lte: new Date() },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalActive,
        totalResolved,
        dueToday: dueCount,
        byErrorType: byType,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createError,
  getErrors,
  getDueErrors,
  getResolvedErrors,
  reviewError,
  updateError,
  deleteError,
  getErrorStats,
};
