const Mutashabih = require('../models/Mutashabih.model');

// ── Mastery Level → interval in days ────────────────────────────────────
const MASTERY_INTERVALS = {
  0: 1,   // Confusing     → review tomorrow
  1: 2,   // Uncertain     → 2 days
  2: 4,   // Shaky         → 4 days
  3: 7,   // Usually good  → 1 week
  4: 14,  // Confident     → 2 weeks
  5: 30,  // Mastered      → 30 days (maintenance)
};

const MASTERY_THRESHOLD = 5; // Auto-master when reached

/**
 * Calculate nextReviewDate based on current mastery level.
 */
const scheduleNextReview = (masteryLevel) => {
  const days = MASTERY_INTERVALS[masteryLevel] ?? 1;
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
};

// ──────────────────────────────────────────────────────────────────────────
// POST /api/mutashabihat
// Log a new Mutashabih group (minimum 2 verses required)
// ──────────────────────────────────────────────────────────────────────────
const createMutashabih = async (req, res, next) => {
  try {
    const { verses, customMnemonic, category } = req.body;

    if (!Array.isArray(verses) || verses.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 verses are required to create a Mutashabih group.',
      });
    }

    // Validate each verse has required fields
    for (const v of verses) {
      if (!v.surahNumber || !v.surahName || !v.ayahNumber) {
        return res.status(400).json({
          success: false,
          message: 'Each verse must include surahNumber, surahName, and ayahNumber.',
        });
      }
    }

    const mutashabih = await Mutashabih.create({
      user: req.user.userId,
      verses,
      customMnemonic,
      category: category || 'other',
    });

    res.status(201).json({
      success: true,
      message: 'Mutashabih group logged successfully.',
      mutashabih,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/mutashabihat
// Get all ACTIVE Mutashabihat for the authenticated user
// ──────────────────────────────────────────────────────────────────────────
const getMutashabihat = async (req, res, next) => {
  try {
    const records = await Mutashabih.find({
      user: req.user.userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      mutashabihat: records,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/mutashabihat/due
// Get active Mutashabihat whose nextReviewDate is today or in the past
// ──────────────────────────────────────────────────────────────────────────
const getDueMutashabihat = async (req, res, next) => {
  try {
    const now = new Date();

    const due = await Mutashabih.find({
      user: req.user.userId,
      status: 'active',
      'srs.nextReviewDate': { $lte: now },
    }).sort({ 'srs.nextReviewDate': 1 });

    res.status(200).json({
      success: true,
      count: due.length,
      mutashabihat: due,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/mutashabihat/mastered
// Get all MASTERED (archived) Mutashabihat
// ──────────────────────────────────────────────────────────────────────────
const getMasteredMutashabihat = async (req, res, next) => {
  try {
    const mastered = await Mutashabih.find({
      user: req.user.userId,
      status: 'mastered',
    }).sort({ masteredAt: -1 });

    res.status(200).json({
      success: true,
      count: mastered.length,
      mutashabihat: mastered,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/mutashabihat/:id/review
// Submit a 3-way mastery review:
//   { rating: -1 }  → Still Confused → masteryLevel-- (floor 0)
//   { rating:  0 }  → Unsure        → masteryLevel unchanged
//   { rating: +1 }  → Distinguished → masteryLevel++ (ceil 5 → auto-master)
// ──────────────────────────────────────────────────────────────────────────
const reviewMutashabih = async (req, res, next) => {
  try {
    const { rating } = req.body;

    if (![-1, 0, 1].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be -1 (confused), 0 (unsure), or 1 (distinguished).',
      });
    }

    const record = await Mutashabih.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mutashabih record not found.',
      });
    }

    if (record.status === 'mastered') {
      return res.status(400).json({
        success: false,
        message: 'This Mutashabih group has already been mastered.',
      });
    }

    const srs = record.srs;

    // ── Apply rating ─────────────────────────────────────────────
    const prevLevel = srs.masteryLevel;

    if (rating === 1) {
      srs.masteryLevel = Math.min(srs.masteryLevel + 1, MASTERY_THRESHOLD);
    } else if (rating === -1) {
      // Drop back but not below 0; never reset completely to avoid discouraging
      srs.masteryLevel = Math.max(srs.masteryLevel - 1, 0);
    }
    // rating === 0: masteryLevel stays the same — short reschedule to push it soon

    srs.totalReviews += 1;
    srs.lastReviewedAt = new Date();

    // ── For "Unsure" (0), use a short fixed interval instead of normal schedule
    if (rating === 0) {
      const shortNext = new Date();
      shortNext.setDate(shortNext.getDate() + 1);
      srs.nextReviewDate = shortNext;
    } else {
      srs.nextReviewDate = scheduleNextReview(srs.masteryLevel);
    }

    record.srs = srs;

    // ── Auto-master at threshold ──────────────────────────────────
    let justMastered = false;
    if (srs.masteryLevel >= MASTERY_THRESHOLD && rating === 1) {
      record.status = 'mastered';
      record.masteredAt = new Date();
      justMastered = true;
    }

    await record.save();

    const levelLabel = ['Confusing', 'Uncertain', 'Shaky', 'Usually Good', 'Confident', 'Mastered'];

    res.status(200).json({
      success: true,
      mastered: justMastered,
      message: justMastered
        ? '🌟 Mastered! This Mutashabih has been moved to your archive.'
        : rating === 0
        ? `Noted as unsure. Review scheduled for tomorrow.`
        : rating === 1
        ? `Great! Mastery level: ${levelLabel[srs.masteryLevel]}. Next review in ${MASTERY_INTERVALS[srs.masteryLevel]} day(s).`
        : `Reset. Mastery level: ${levelLabel[srs.masteryLevel]}. Review again tomorrow.`,
      mutashabih: record,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PUT /api/mutashabihat/:id
// Edit mnemonic, category, or per-verse distinction notes
// ──────────────────────────────────────────────────────────────────────────
const updateMutashabih = async (req, res, next) => {
  try {
    const { customMnemonic, category, verses } = req.body;

    const record = await Mutashabih.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      {
        ...(customMnemonic !== undefined && { customMnemonic }),
        ...(category && { category }),
        ...(verses && { verses }),
      },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mutashabih record not found.',
      });
    }

    res.status(200).json({ success: true, mutashabih: record });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/mutashabihat/:id
// Permanently delete a Mutashabih group
// ──────────────────────────────────────────────────────────────────────────
const deleteMutashabih = async (req, res, next) => {
  try {
    const record = await Mutashabih.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mutashabih record not found.',
      });
    }

    res.status(200).json({ success: true, message: 'Mutashabih group deleted.' });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/mutashabihat/stats
// Aggregated analytics: count by category, mastery distribution
// ──────────────────────────────────────────────────────────────────────────
const getMutashabihStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { Types } = require('mongoose');
    const objectId = Types.ObjectId.createFromHexString(userId);

    const [totalActive, totalMastered, byCategory, masteryDistribution, dueCount] = await Promise.all([
      Mutashabih.countDocuments({ user: userId, status: 'active' }),
      Mutashabih.countDocuments({ user: userId, status: 'mastered' }),
      Mutashabih.aggregate([
        { $match: { user: objectId, status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Mutashabih.aggregate([
        { $match: { user: objectId, status: 'active' } },
        { $group: { _id: '$srs.masteryLevel', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Mutashabih.countDocuments({
        user: userId,
        status: 'active',
        'srs.nextReviewDate': { $lte: new Date() },
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalActive,
        totalMastered,
        dueToday: dueCount,
        byCategory,
        masteryDistribution,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMutashabih,
  getMutashabihat,
  getDueMutashabihat,
  getMasteredMutashabihat,
  reviewMutashabih,
  updateMutashabih,
  deleteMutashabih,
  getMutashabihStats,
};
