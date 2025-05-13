const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const { User ,Student} = require("../models/usersModel");
const ActivityLog = require("../models/activityLog");
const {evaluateAndAssignBadges} = require("../controllers/userController");
const bcrypt = require('bcrypt');
const { signin } = require("../controllers/authController");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');
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
            // 👇 Crée un nouvel utilisateur en tant que Student (discriminator)
            user = new Student({
              email: profile.emails[0].value,
              verified: true,
              password: 'password',  // à remplacer par un token temporaire ou rien du tout
              country: country || "Unknown",
              age: null,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              role: 'Student', // même si c'est redondant, utile pour cohérence
              photo: "localhost:3000/" + savedPath,
              identifier: null,
              situation: "",
              disease: "",
              socialCase: false
            });
            await ActivityLog.create({
                  userId: user._id,
                  email: user.email,
                  ipAddress:  'Unknown',
                  userAgent:  'Unknown',
                  action: 'SIGNUP',
                });
                console.log("✅ Activity Log Created:", JSON.stringify(user, null, 2));
                await evaluateAndAssignBadges(user._id);
            await user.save();
             
            
            console.log("✅ New Student Created:", JSON.stringify(user, null, 2));
          }
          else {
                    console.log("Existing User:", JSON.stringify(user, null, 2));
                  }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, email: user.email, verified: user.verified,role: user.role,firstName:user.firstName,lastName:user.lastName,photo:user.photo },
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
