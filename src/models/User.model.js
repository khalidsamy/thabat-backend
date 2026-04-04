const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },
    /**
     * User's preferred review pace in days (7, 10, or 14)
     */
    reviewPace: {
      type: Number,
      enum: [7, 10, 14],
      default: 10,
    },
    currentTargetSurah: {
      type: String,
      default: 'Al-Baqarah',
    },
    masteryHistory: [
      {
        score: Number,
        surah: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
