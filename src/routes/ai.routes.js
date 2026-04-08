const express = require('express');
const multer = require('multer');
const { chatWithCoach } = require('../controllers/ai.controller');
const { transcribeRecitation } = require('../controllers/transcription.controller');
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Memory storage for small audio chunks (recitations)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per recitation
});

// Strict rate limit for AI usage
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "The Coach is resting. Please try again in a few minutes."
  }
});

// Transcription specific limiter
const transcriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 30,
  message: { success: false, message: "Too many recitations. Take a small break!" }
});

router.post('/chat', protect, aiLimiter, chatWithCoach);
router.post('/transcribe', protect, transcriptionLimiter, upload.single('audio'), transcribeRecitation);

module.exports = router;
