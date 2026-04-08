const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    anonymizedName: {
      type: String,
      required: true,
    },
    milestoneType: {
      type: String,
      enum: ['JUZ_COMPLETE', 'KHATMA_COMPLETE', 'EXAM_PASSED', 'STREAK_7', 'STREAK_30'],
      required: true,
    },
    milestoneValue: {
      type: String, // e.g. "Juz 1", "30 Days"
    },
    cheersCount: {
      type: Number,
      default: 0,
    },
    cheeredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
