const express = require('express');
const authController = require('../controllers/authController');
const { identifier } = require('../middlewares/identification');
const router = express.Router();
const axios = require('axios');
const passport = require('../middlewares/passport');
require('dotenv').config(); // Load environment variables from .env file
const User=require('../models/usersModel')
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const ActivityLog= require('../models/activityLog')
const {transport,transport2} = require('../middlewares/sendMail');

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  (req, res) => {
      const { token } = req.user;

      res.cookie('Authorization', 'Bearer ' + token, {
          expires: new Date(Date.now() + 8 * 3600000),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
      });

      res.json({ success: true, token, message: 'Google login successful!' });
  }
);




// Routes pour la gestion des utilisateurs
const ocrController = require('../controllers/ocrController');



router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', identifier, authController.signout);

router.patch('/send-verification-code', identifier, authController.sendVerificationCode);
router.patch('/verify-verification-code', identifier, authController.verifyVerificationCode);
router.patch('/change-password', identifier, authController.changePassword);
router.patch('/send-forgot-password-code', authController.sendForgotPasswordCode);
router.patch('/verify-forgot-password-code', authController.verifyForgotPasswordCode);


router.get('/activity-logs', authController.getActivityLogs )
// Route pour démarrer l'authentification LinkedIn

// Route pour démarrer l'authentification LinkedIn

//******************************************************************************Linkedin********************************************************* */

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const generateRandomPassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};
// Route pour démarrer l'authentification LinkedIn
router.get("/linkedin", (req, res) => {
  const linkedInAuthURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=openid%20profile%20email`;
  res.redirect(linkedInAuthURL);
});

// Callback après la connexion
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code de connexion manquant" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI, 
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const userEmail = profileResponse.data.email;
    const userName = profileResponse.data.name;
    const userCountry = profileResponse.data.locale.country;
    let user = await User.findOne({ email: userEmail });

    if (!user) {

      const randomPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = new User({
        nom: userName,
        email: userEmail,
        country:userCountry,
        password:hashedPassword
      });
      await user.save();
    }
// Générer un token JWT
const token = jwt.sign(
  {
    userId: user._id,
    email: user.email,
    verified: user.verified,
  },
  process.env.TOKEN_SECRET,
  { expiresIn: "8h" }
);

res.redirect(`http://localhost:5173/home?token=${token}`);



} catch (error) {
res.status(500).json({ error: "Échec de l'authentification LinkedIn" });
}
});

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

router.get('/activity-logs', identifier, authController.getActivityLogs);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


module.exports = router;
