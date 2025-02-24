const passport = require('passport'); 
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/usersModel');
const bcrypt = require('bcrypt'); 

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:3000/api/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "birthday", "location"], // Ajouter birthday et location
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Facebook Profile:", profile);

        let user = await User.findOne({ email: profile.emails[0]?.value });

        // Calcul de l'âge à partir de la date de naissance
        let age = null;
        if (profile._json.birthday) {
          const birthDate = new Date(profile._json.birthday);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
        }

       
        let country = profile._json.location ? profile._json.location.name : "Unknown";

        const now = Math.floor(Date.now() / 1000); // Temps en secondes
        const firstName = profile.name.givenName.toLowerCase(); // Prénom en minuscule
        const lastName = profile.name.familyName.toUpperCase(); // Nom en majuscule
        const generatedPassword = `${now}${firstName}${lastName}`;

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        if (!user) {
          console.log("Creating new user...");
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0]?.value,
            age: age || 18, // Valeur par défaut si non fournie
            country: country,
            password: hashedPassword, 
            verified: true,
          });

          await user.save();
        } else {
          // Mise à jour du mot de passe si l'utilisateur existe déjà
          user.password = hashedPassword;
          await user.save();
        }

        console.log("Generated Password (Before Hashing):", generatedPassword); // Debug
        done(null, user);
      } catch (error) {
        console.error("Error in FacebookStrategy:", error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 
