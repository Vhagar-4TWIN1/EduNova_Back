// routers/schedulerRouter.js
const express = require('express');
const { autoSchedule } = require('../controllers/schedulerController');

const router = express.Router();

// POST /api/scheduler/auto-schedule
router.post('/auto-schedule', autoSchedule);

module.exports = router;
