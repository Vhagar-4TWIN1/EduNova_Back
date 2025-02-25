const express = require('express');
const authController = require('../controllers/authController');
const { identifier } = require('../middlewares/identification');
const router = express.Router();
const axios = require('axios');
const passport = require('passport');
require('dotenv').config(); // Load environment variables from .env file

// Route pour démarrer l'authentification LinkedIn
router.get('/linkedin', passport.authenticate('linkedin'));

// Route de callback après l'authentification LinkedIn
router.get('/callback', passport.authenticate('linkedin', {
    failureRedirect: '/login', // Rediriger en cas d'échec
    successRedirect: '/' // Rediriger vers la page d'accueil en cas de succès
}));

router.post('/linkedinAuth', async (req, res) => {
    try {
        const { code, redirect_url } = req.body;
        if (!code || !redirect_url) {
            return res.status(400).json({ message: "Code and redirect URL are required" });
        }

        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirect_url,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            },
        });

        const { access_token } = response.data;
        res.json({ token: access_token });
    } catch (error) {
        console.error("Error during LinkedIn OAuth:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error during LinkedIn OAuth process", details: error.response ? error.response.data : error.message });
    }
});

// Routes pour la gestion des utilisateurs
const passport = require('../middlewares/passport');


router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/signout', identifier, authController.signout);

router.patch('/send-verification-code', identifier, authController.sendVerificationCode);
router.patch('/verify-verification-code', identifier, authController.verifyVerificationCode);
router.patch('/change-password', identifier, authController.changePassword);
router.patch('/send-forgot-password-code', authController.sendForgotPasswordCode);
router.patch('/verify-forgot-password-code', authController.verifyForgotPasswordCode);


router.get('/activity-logs', identifier , authController.getActivityLogs )
// Route pour démarrer l'authentification LinkedIn
router.get('/linkedin', passport.authenticate('linkedin'));

// Route de callback après l'authentification LinkedIn
router.get('/callback', passport.authenticate('linkedin', {
    failureRedirect: '/login', // Rediriger en cas d'échec
    successRedirect: '/' // Rediriger vers la page d'accueil en cas de succès
}));
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
router.post("/linkedinAuth", async (req, res) => {
    try {
      const { code, redirect_uri } = req.body;
  
      if (!code || !redirect_uri) {
        return res.status(400).json({ message: "Code and redirect URL are required" });
      }
  
      const response = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", null, {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        },
      });
  
      const { access_token } = response.data;
  
      if (!access_token) {
        return res.status(500).json({ message: "No access token received from LinkedIn" });
      }
  
      res.json({ token: access_token });
    } catch (error) {
      console.error("Error during LinkedIn OAuth:", error.response ? error.response.data : error.message);
      res.status(500).json({ message: "Error during LinkedIn OAuth process" });
    }
  });
  
  // Route pour récupérer le profil LinkedIn
  router.get("/linkedinProfile", async (req, res) => {
    try {
      const { access_token } = req.query;
  
      if (!access_token) {
        return res.status(400).json({ message: "Access token is required" });
      }
  
      // ✅ Utiliser "/userinfo" au lieu de "/me" et "/emailAddress"
      const userInfoResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
  
      res.json(userInfoResponse.data);
    } catch (error) {
      console.error("Error fetching LinkedIn profile:", error.response ? error.response.data : error.message);
      res.status(500).json({ message: "Error fetching LinkedIn profile" });
    }
  });



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
router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const { token } = req.user;

        // Send token as a cookie or JSON response
        res.cookie('Authorization', 'Bearer ' + token, {
            expires: new Date(Date.now() + 8 * 3600000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        });

        res.json({ success: true, token, message: 'Google login successful!' });
    }
);

module.exports = router;
