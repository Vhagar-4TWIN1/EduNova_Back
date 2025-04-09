const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const { User } = require("../models/usersModel");
const bcrypt = require('bcrypt');
const { signin } = require("../controllers/authController");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
passport.authenticateJWT = passport.authenticate("jwt", { session: false });

// ✅ JWT STRATEGY
const JWT_SECRET = process.env.TOKEN_SECRET;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      console.log("📥 Decoded JWT payload:", jwtPayload); // 👈 Add this line
      const user = await User.findById(jwtPayload.userId);
      if (user) return done(null, user);
      return done(null, false);
    } catch (err) {
      console.error("❌ JWT Strategy error:", err);
      return done(err, false);
    }
  })
);


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
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error('No email found in Google profile'), null);
        }
        let user = await User.findOne({ email: profile.emails[0].value });
         // Define the uploads directory (relative path)
    const uploadsDir = path.join(__dirname, "../uploads/profiles");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Function to download the image
    const downloadImage = async (url) => {
      try {
        const filename = `${Date.now()}-${Math.floor(
          Math.random() * 1000000000
        )}.jpg`; // Unique filename
        const relativePath = `uploads/profiles/${filename}`;
        const absolutePath = path.join(uploadsDir, filename);

        const response = await axios({
          url,
          responseType: "stream",
        });

        const writer = fs.createWriteStream(absolutePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        console.log("✅ Image downloaded successfully:", relativePath);
        return relativePath; // ✅ Return relative path instead of absolute path
      } catch (error) {
        console.error("❌ Error downloading image:", error);
        return null;
      }
    };
        const savedPath = await downloadImage(profile.photos[0].value);

    if (!savedPath) {
      console.log("⚠️ No image downloaded, using default avatar.");
    }
        
        const country = profile.placesLived && profile.placesLived.length > 0
  ? profile.placesLived[0].value  // Extract first location
  : "Unknown"; // Default if not available
        if (!user) {
          // Create new user if doesn't exist
          user = new User({
            email: profile.emails[0].value,
            verified: true,
            password: 'password',  // You should eventually allow the user to reset this
            country:country ,     // You might want to collect this info later
            age: 20,                // Collect or set age based on user input later
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            role: 'Student',
            photo: savedPath

          });
          await user.save();
          console.log("New User Created:", JSON.stringify(user, null, 2));
        } else {
          console.log("Existing User:", JSON.stringify(user, null, 2));
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, email: user.email, verified: user.verified,firstName:user.firstName,lastName:user.lastName,photo:user.photo },
          process.env.TOKEN_SECRET,
          { expiresIn: '8h' }
        );

        // Pass user and token to the next middleware
        return done(null, { user, token });

      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
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
