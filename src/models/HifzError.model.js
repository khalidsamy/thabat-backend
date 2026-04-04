const mongoose = require('mongoose');

const hifzErrorSchema = new mongoose.Schema(
  {
    // ── 1. Ownership ────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },

    // ── 2. Quran Location ───────────────────────────────────────
    location: {
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
        min: [1, 'Page number must be between 1 and 604'],
        max: [604, 'Page number must be between 1 and 604'],
      },
      juzNumber: {
        type: Number,
        min: [1, 'Juz must be between 1 and 30'],
        max: [30, 'Juz must be between 1 and 30'],
      },
    },

    // ── 3. The Mistake ──────────────────────────────────────────
    errorType: {
      type: String,
      enum: [
        'wrong_word',       // Said a completely wrong word
        'tashkeel',         // Wrong Harakat/Vowels (fatha/damma/kasra)
        'tajweed',          // Missed Madd, Ghunnah, Shaddah, etc.
        'added_word',       // Added a word that isn't there
        'skipped_word',     // Dropped/forgot a word
        'nasya',            // Completely blanked out (نسي)
        'wrong_transition', // Confused transition between ayahs
        'mutashabih',       // Confused with a similar-sounding ayah
        'other',
      ],
      default: 'other',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    // Stored directly to avoid external API dependency during review sessions
    ayahText: {
      type: String,
      trim: true,
    },

    // ── 4. SRS Engine (Simplified SM-2) ─────────────────────────
    srs: {
      nextReviewDate: {
        type: Date,
        default: Date.now, // Due immediately on creation
        index: true,
      },
      intervalDays: {
        type: Number,
        default: 1,        // Grows: 1 → 3 → 7 → 14 → 30
      },
      consecutiveCorrect: {
        type: Number,
        default: 0,        // Reaches 5 → auto-resolve
        min: 0,
      },
      easeFactor: {
        type: Number,
        default: 2.5,      // SM-2 multiplier, floor at 1.3
        min: 1.3,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      lastReviewedAt: {
        type: Date,
      },
    },

    // ── 5. Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the most critical query: "Give me all active errors
// due for review today for user X" — runs on every review session load.
hifzErrorSchema.index({ user: 1, status: 1, 'srs.nextReviewDate': 1 });

const HifzError = mongoose.model('HifzError', hifzErrorSchema);

module.exports = HifzError;
