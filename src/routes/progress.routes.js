const express = require('express');
const router = express.Router();
const c = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',              c.getProgress);
router.get('/today',         c.getTodayProgress);
router.get('/stats',         c.getStats);
router.get('/weekly',        c.getWeeklyProgress);
router.get('/chart',         c.getChartData);
router.get('/mastery-trend', c.getMasteryTrend);   // ← new

router.post('/update',       c.updateProgress);
router.post('/listened',     c.markListened);
router.put('/toggle-sunnah', c.toggleSunnah);
router.post('/mastery',      c.saveMastery);

module.exports = router;
