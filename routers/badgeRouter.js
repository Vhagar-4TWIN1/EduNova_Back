const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { createBadge, getBadges, getBadge, updateBadge, deleteBadge, upload } = require('../controllers/badgeController'); // ✅ Import `upload`
router.post('/create', upload.single('image'), createBadge);
router.get('/badges', getBadges);
router.get('/badges/:id', getBadge);
router.put('/badges/:id', updateBadge);
router.delete('/badges/:id', deleteBadge);
=======
const { createBadge, getBadges, getBadge, updateBadge, deleteBadge, upload } = require('../controllers/badgeController');   
router.post('/', upload.single('image'), createBadge);
router.get('/', getBadges);
router.get('/:id', getBadge);
router.put('/:id', updateBadge);
router.delete('/:id', deleteBadge);

>>>>>>> origin/main
module.exports = router;
