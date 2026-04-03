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
      max: [604, 'Current page cannot exceed 604 (Quran total pages)'],
    },
    totalMemorized: {
      type: Number,
      default: 0,
      min: [0, 'Total memorized cannot be negative'],
    },
    dailyTarget: {
      type: Number,
      default: 1,
      min: [1, 'Daily target must be at least 1'],
    },
    lastUpdate: {
      type: Date,
    },
    streak: {
      type: Number,
      default: 0,
      min: [0, 'Streak cannot be negative'],
    },
    doneToday: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
    },
    history: [
      {
        date: {
          type: Date,
          required: true,
        },
        pages: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
