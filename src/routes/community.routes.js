const express = require('express');
const { postReflection, getReflections, addDua } = require('../controllers/community.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply protection to all community routes
router.use(protect);

router.post('/reflect', postReflection);
router.get('/', getReflections);
router.post('/dua/:id', addDua);

module.exports = router;
