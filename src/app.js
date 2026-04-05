const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
    'http://localhost:5173',
    'https://thabat-app-eight.vercel.app'
  ];

app.use(cors({
  origin: (incoming, callback) => {
    if (!incoming) return callback(null, true); // curl / Postman / SSR
    if (allowedOrigins.includes(incoming)) return callback(null, true);
    callback(new Error(`CORS: origin '${incoming}' is not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Thabat API is running', ts: new Date().toISOString() });
});

app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/progress',  require('./routes/progress.routes'));
app.use('/api/errors',    require('./routes/errors.routes'));
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// 5. معالج الأخطاء العام (Global Error Handler)
app.use((err, req, res, next) => {
  console.error(`[${req.method}] ${req.originalUrl} →`, err.message);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `An account with this ${field} already exists` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join('. ') });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
  }
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Internal server error',
  });
});

const runMigration = async () => {
  try {
    const Progress = mongoose.model('Progress'); 
    
    const result = await Progress.updateMany(
      { longestStreak: { $exists: false } },
      [{ $set: { longestStreak: "$streak", currentSurahName: "البقرة" } }]
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Database Linked & Updated: ${result.modifiedCount} records fixed.`);
    } else {
      console.log("ℹ️ Database is already up to date.");
    }
  } catch (err) {
    console.log("⏳ Waiting for database models to load...");
  }
};

setTimeout(runMigration, 5000);

module.exports = app;