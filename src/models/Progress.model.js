const mongoose = require('mongoose');

/**
 * Progress Schema
 * Tracks user memorization, review daily targets, and streak history.
 */
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
      min: [1, 'Total pages must be at least 1'],
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
    sunnahCompletedToday: {
      type: Boolean,
      default: false,
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
