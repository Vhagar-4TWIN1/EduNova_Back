const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { lessonValidation } = require('../middlewares/validator');
const upload = require('../middlewares/upload');
const { authenticate } = require('../middlewares/passport');

router.post('/', authenticate, upload.single('file'), lessonValidation, lessonController.createLesson);
router.get('/', authenticate, lessonController.getAllLessons);
router.get('/:id', authenticate, lessonController.getLessonById);
router.put('/:id', authenticate, upload.single('file'), lessonValidation, lessonController.updateLesson);
router.delete('/:id', authenticate, lessonController.deleteLesson);
router.get('/:id/tts', authenticate, lessonController.getLessonWithTTS);
router.post('/:id/annotation', authenticate, lessonController.addAnnotation);
router.get('/:id/audio', authenticate, lessonController.getLessonAudio);



module.exports = router;
