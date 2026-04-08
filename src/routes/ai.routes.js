const express = require('express');
const { chatWithCoach } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Strict rate limit for AI usage (10 requests per 10 minutes per IP)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "The Coach is resting. Please try again in a few minutes."
  }
});

router.post('/chat', protect, aiLimiter, chatWithCoach);

module.exports = router;
