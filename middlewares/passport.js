const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');
const bcrypt = require('bcrypt');

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          user = new User({
            email: profile.emails[0].value,
            verified: true,
            password: 'password',
            country: 'country',
            age: 20,
            firstName: profile.name.givenName,
            lastName: 'profile.name.family'

          });
          await user.save();
        }
        const token = jwt.sign(
          { userId: user._id, email: user.email, verified: user.verified },
          process.env.TOKEN_SECRET,
          { expiresIn: '8h' }
        );
        return done(null, { user, token });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: 'http://localhost:3000/api/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'birthday', 'location'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Facebook Profile:', profile);

        let user = await User.findOne({ email: profile.emails[0]?.value });

        let age = null;
        if (profile._json.birthday) {
          const birthDate = new Date(profile._json.birthday);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
        }

        let country = profile._json.location ? profile._json.location.name : 'Unknown';

        const now = Math.floor(Date.now() / 1000);
        const firstName = profile.name.givenName.toLowerCase();
        const lastName = profile.name.familyName.toUpperCase();
        const generatedPassword = `${now}${firstName}${lastName}`;

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        if (!user) {
          console.log('Creating new user...');
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0]?.value,
            age: age || 18,
            country: country,
            password: hashedPassword,
            verified: true,
          });
          await user.save();
        } else {
          user.password = hashedPassword;
          await user.save();
        }

        console.log('Generated Password (Before Hashing):', generatedPassword); // Debug
        done(null, user);
      } catch (error) {
        console.error('Error in FacebookStrategy:', error);
        done(error, null);
      }
    }
  )
);

// Serialize and Deserialize User
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
