const express = require('express');
const authController = require('../controllers/authController');
const { identifier } = require('../middlewares/identification');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const passport = require('passport');


router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', identifier, authController.signout);
router.post('/ocr', ocrController.uploadImage);
router.post('/upload-image', ocrController.uploadImage);
router.get('/users', authController.getAllUsers);
router.get("/facebook", passport.authenticate('facebook', { scope: ['email', 'public_profile', 'user_birthday', 'user_location'] }));


router.get("/facebook/callback", 
  passport.authenticate('facebook', { session: false }),
  (req, res) => {
    const { token } = req.user;

    // Envoyer le token sous forme de cookie ou de réponse JSON
    res.cookie('Authorization', 'Bearer ' + token, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({ success: true, token, message: 'Facebook login successful!' });
  }
);



router.post("/student-info", authController.studentInfo);

// Route pour les informations des enseignants
router.post("/teacher-info", authController.teacherInfo);


router.patch(
	'/send-verification-code',
	identifier,
	authController.sendVerificationCode
);
router.patch(
	'/verify-verification-code',
	identifier,
	authController.verifyVerificationCode
);
router.patch('/change-password', identifier, authController.changePassword);
router.patch(
	'/send-forgot-password-code',
	authController.sendForgotPasswordCode
);
router.patch(
	'/verify-forgot-password-code',
	authController.verifyForgotPasswordCode
);

module.exports = router;
