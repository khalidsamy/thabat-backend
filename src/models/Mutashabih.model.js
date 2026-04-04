const mongoose = require('mongoose');

// ── Per-verse sub-document ────────────────────────────────────────────────
const verseSchema = new mongoose.Schema(
  {
    surahNumber: {
      type: Number,
      required: [true, 'Surah number is required'],
      min: [1, 'Surah number must be between 1 and 114'],
      max: [114, 'Surah number must be between 1 and 114'],
    },
    surahName: {
      type: String,
      required: [true, 'Surah name is required'],
      trim: true,
    },
    ayahNumber: {
      type: Number,
      required: [true, 'Ayah number is required'],
      min: [1, 'Ayah number must be at least 1'],
    },
    pageNumber: {
      type: Number,
      min: [1, 'Page must be between 1 and 604'],
      max: [604, 'Page must be between 1 and 604'],
    },
    // Stored directly from Quran API at log time
    ayahText: {
      type: String,
      trim: true,
    },
    // Optional per-verse mini-hint: "This one starts with وَ not فَـ"
    distinctionNote: {
      type: String,
      trim: true,
      maxlength: [300, 'Distinction note cannot exceed 300 characters'],
    },
  },
  { _id: true }
);

// ── Main Mutashabih schema ────────────────────────────────────────────────
const mutashabihSchema = new mongoose.Schema(
  {
    // ── 1. Ownership ──────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    // ── 2. Verse Group (2–5 verses) ───────────────────────────────
    verses: {
      type: [verseSchema],
      validate: {
        validator: (arr) => arr.length >= 2 && arr.length <= 5,
        message: 'A Mutashabih group must contain between 2 and 5 verses.',
      },
    },

    // ── 3. Custom Mnemonic (العلامة الذهنية) ──────────────────────
    // The user's personal trick to differentiate the whole group
    customMnemonic: {
      type: String,
      trim: true,
      maxlength: [1000, 'Mnemonic cannot exceed 1000 characters'],
    },

    // ── 4. Category (optional — for future analytics) ─────────────
    category: {
      type: String,
      enum: [
        'opening',      // Different first words (فواتح المتشابهات)
        'ending',       // Different endings (خواتيم المتشابهات)
        'middle',       // Different middle wording
        'tashkeel',     // Same words, different vowels/diacritics
        'addition',     // One verse has an extra word
        'substitution', // Similar structure but a different word
        'other',
      ],
      default: 'other',
    },

    // ── 5. Mastery-Based SRS Tracking ────────────────────────────
    //
    // Mastery Level 0–5 with fixed intervals:
    //   0 → 1 day   (just added / confusing)
    //   1 → 2 days  (still uncertain)
    //   2 → 4 days  (shaky)
    //   3 → 7 days  (usually correct)
    //   4 → 14 days (confident)
    //   5 → 30 days (maintenance — auto-mastered)
    //
    // Review rating: -1 (confused) | 0 (unsure) | +1 (distinguished)
    //
    srs: {
      masteryLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      nextReviewDate: {
        type: Date,
        default: Date.now,
        index: true,
      },
      lastReviewedAt: {
        type: Date,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },

    // ── 6. Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'mastered'],
      default: 'active',
      index: true,
    },
    masteredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the critical review queue query
mutashabihSchema.index({ user: 1, status: 1, 'srs.nextReviewDate': 1 });

const Mutashabih = mongoose.model('Mutashabih', mutashabihSchema);

module.exports = Mutashabih;
