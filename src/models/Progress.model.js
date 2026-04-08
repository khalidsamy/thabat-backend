const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    currentPage: {
      type: Number,
      default: 1,
      min: [1, 'Current page cannot be less than 1'],
    },
    totalMushafPages: {
      type: Number,
      default: 604,
    },
    totalMemorized: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyTarget: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastUpdate: Date,
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    // longestStreak was referenced in the controller but absent from the schema,
    // causing every progress.save() to silently discard the value.
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    doneToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    sunnahCompletedToday: {
      type: Boolean,
      default: false,
    },
    // Denormalized here so the dashboard header can show it without a User join.
    currentSurahName: {
      type: String,
      default: '',
    },
    history: [
      {
        date:  { type: Date, required: true },
        pages: { type: Number, default: 0 },
        listenedSurahs: [
          {
            surahNumber: { type: Number, required: true },
            surahName: { type: String, default: '' },
            reciter: { type: String, default: '' },
            reciterName: { type: String, default: '' },
            listenedAt: { type: Date, default: Date.now },
            tag: { type: String, default: 'listened' },
          },
        ],
      },
    ],
    // ─── Revision Methodology (Sheikh Alaa Hamed) ─────────────────────────
    revisionCompletedToday: {
      type: Boolean,
      default: false,
    },
    revisionGoal: {
      type: String,
      enum: ['1_JUZ', '2_JUZ', 'HIZB', 'RUB_EL_HIZB', 'NONE'],
      default: 'NONE',
    },
    // Track surahs that need extra attention (The 3-Error Wall)
    weakSurahs: [
      {
        surahNumber: { type: Number },
        surahName: { type: String },
        lastFailed: { type: Date },
        errorCount: { type: Number, default: 0 },
      },
    ],
    // Map of surahNumber -> consecutive error count for current session
    // Using a simple object/map for tracking.
    errorCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    khatmasCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Progress', progressSchema);
