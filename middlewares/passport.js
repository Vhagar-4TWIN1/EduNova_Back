const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');  // Assuming you have the correct model for User

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

passport.serializeUser((user, done) => {
    done(null, user);
});


passport.deserializeUser((obj, done) => {
    done(null, obj); 
});

module.exports = passport;
