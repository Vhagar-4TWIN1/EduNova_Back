const express = require('express');
const router = express.Router();
const { createBadge, getBadges, getBadge, updateBadge, deleteBadge, upload } = require('../controllers/badgeController'); // ✅ Import `upload`

// Use Multer middleware before `createBadge`
router.post('/badges', upload.single('image'), createBadge);
router.get('/badges', getBadges);
router.get('/badges/:id', getBadge);
router.put('/badges/:id', updateBadge);
router.delete('/badges/:id', deleteBadge);

module.exports = router;
