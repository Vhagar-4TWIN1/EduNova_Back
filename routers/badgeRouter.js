const express = require('express');
const router = express.Router();
const { createBadge, getBadges, getBadge, updateBadge, deleteBadge, upload } = require('../controllers/badgeController'); // ✅ Import `upload`
router.post('/create', upload.single('image'), createBadge);
router.get('/badges', getBadges);
router.get('/badges/:id', getBadge);
router.put('/badges/:id', updateBadge);
router.delete('/badges/:id', deleteBadge);
module.exports = router;
