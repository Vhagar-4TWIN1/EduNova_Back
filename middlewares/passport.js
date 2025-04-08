const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const { User } = require('../models/usersModel');
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
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: 'http://localhost:3000/api/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'birthday', 'location']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Facebook Profile:', profile);

    if (!profile.emails || !profile.emails[0]) {
      throw new Error('No email found in Facebook profile');
    }

    const email = profile.emails[0].value;
    let user = await User.findOne({ email });

    // Calculate age from birthday if available
    let age = 18; // default
    if (profile._json.birthday) {
      const birthDate = new Date(profile._json.birthday);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    // Get country from location if available
    const country = profile._json.location?.name || 'Unknown';

    if (!user) {
      // User does not exist, create a new one
      user = new Student({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName || '',
        email: email,
        age: age,
        country: country,
        password: await bcrypt.hash(uuidv4(), 10), // Random password
        verified: true,
        role: 'Student',
        identifier: uuidv4(),
        situation: 'Active',
        disease: 'None',
        socialCase: false,
        provider: 'facebook' // Store the provider (Facebook)
      });

      await user.save();
      console.log('New Facebook user created:', user);
    } else {
      // User exists, update the user's details (if needed)
      user.firstName = profile.name.givenName;
      user.lastName = profile.name.familyName || '';
      user.age = age;
      user.country = country;
      await user.save();
      console.log('User data updated:', user);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      process.env.TOKEN_SECRET,
      { expiresIn: '8h' }
    );

    return done(null, { user, token });
  } catch (error) {
    console.error('Facebook authentication error:', error);
    return done(error);
  }
}));


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
