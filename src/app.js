const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Progress = require('./models/Progress.model');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'https://thabat-app-eight.vercel.app',
    ];

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

const runProgressMigration = async () => {
  try {
    const migrationResult = await Progress.updateMany(
      { longestStreak: { $exists: false } },
      [{ $set: { longestStreak: '$streak', currentSurahName: 'Al-Baqarah' } }],
    );

    if (migrationResult.modifiedCount > 0) {
      console.log(`Progress migration updated ${migrationResult.modifiedCount} records.`);
    }
  } catch (error) {
    console.warn('Progress migration skipped:', error.message);
  }
};

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (incoming, callback) => {
    if (!incoming) return callback(null, true);
    if (allowedOrigins.includes(incoming)) return callback(null, true);
    callback(new Error(`CORS: origin '${incoming}' is not allowed`));
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Thabat API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
app.use('/api/errors', require('./routes/errors.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/community', require('./routes/community.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));
app.use('/api/mutashabihat', require('./routes/mutashabihat.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 5. معالج الأخطاء العام (Global Error Handler)
app.use((err, req, res, _next) => {
  console.error(`[${req.method}] ${req.originalUrl} →`, err.message);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors)
        .map((validationError) => validationError.message)
        .join('. '),
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
    });
  }
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Internal server error',
  });
});

const runMigration = async () => {
  try {
    {
      const migrationResult = await Progress.updateMany(
        { longestStreak: { $exists: false } },
        [{ $set: { longestStreak: '$streak', currentSurahName: 'Al-Baqarah' } }],
      );

      if (migrationResult.modifiedCount > 0) {
        console.log(`Database migration updated ${migrationResult.modifiedCount} progress records.`);
      }

      return;
    }

    const result = await Progress.updateMany(
      { longestStreak: { $exists: false } },
      [{ $set: { longestStreak: "$streak", currentSurahName: "البقرة" } }]
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Database Linked & Updated: ${result.modifiedCount} records fixed.`);
    } else {
      console.log("ℹ️ Database is already up to date.");
    }
  } catch (error) {
    console.warn('Progress migration skipped:', error.message);
    console.log("⏳ Waiting for database models to load...");
  }
};

const migrationTimer = setTimeout(() => {
  void runProgressMigration();
}, 5000);

if (typeof migrationTimer.unref === 'function') {
  migrationTimer.unref();
}

module.exports = app;
