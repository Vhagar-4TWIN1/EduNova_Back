<<<<<<< HEAD
const axios = require('axios');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');
const app = express();
const badgeRouter = require('./routers/badgeRouter');
const moduleRouter = require('./routers/moduleRouter');
const userRouter = require('./routers/userRouter');
const authRouter = require('./routers/authRouter');
const lessonRouter = require('./routers/lessonRouter');
const passport = require('./middlewares/passport');
const session = require('express-session');
const { User } = require('./models/usersModel'); // <-- make sure this is the correct path
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const levelRoutes = require('./routers/levelRouter');
const questionRouter = require('./routers/questionRoutes');
const googleClassroomRouter = require('./routers/googleClassroomRouter');
=======
const axios = require("axios");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");
const app = express();
const badgeRouter = require("./routers/badgeRouter");
const moduleRouter = require("./routers/moduleRouter");
const userRouter = require("./routers/userRouter");
const authRouter = require("./routers/authRouter");
const lessonRouter = require("./routers/lessonRouter");
const passport = require("./middlewares/passport");
const session = require("express-session");
const levelRoutes = require("./routers/levelRouter");
const questionRouter = require("./routers/questionRoutes");
const aiRoute = require("./routers/aiRouter");
const userProgressRoutes = require("./routers/userProgressRoutes");
const performanceRoutes = require('./routers/performanceRouter');
>>>>>>> origin/main


console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);
console.log("Session Secret:", process.env.SESSION_SECRET);

app.use(bodyParser.json({ limit: '50mb' }));  // Adjust size as needed
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: 'http://localhost:5173',  // CORS autorisé pour le frontend React
    credentials: true,               // Autorise l'envoi de cookies
<<<<<<< HEAD
    allowedHeaders: ['Authorization', 'Content-Type'] // En-têtes autorisés
=======
    allowedHeaders: ['Authorization', 'Content-Type' , 'recaptcha-token' , 'x-access-token'] // En-têtes autorisés
>>>>>>> origin/main
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
<<<<<<< HEAD
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });
=======
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
>>>>>>> origin/main

// Session setup

app.use(
<<<<<<< HEAD
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // En mode développement, mettez secure: false
            httpOnly: true, // Cela empêche l'accès aux cookies via JavaScript
            sameSite: 'strict', // Vous pouvez aussi essayer 'lax' si cela pose problème
            maxAge: 3600000, // Durée de validité du cookie (1 heure ici)
        },
    })
);

app.use('/module', moduleRouter);
app.use(passport.initialize());
app.use(passport.session());
// Routes
app.use('/api/level', levelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/google', googleClassroomRouter);
app.use('/api/users', userRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/badges', badgeRouter);
app.get('/', (req, res) => {
    res.json({ message: 'Hello from the server' });
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.get('/oauth', (req, res) => {
    const redirect_uri = 'http://localhost:3000/auth';
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_uri}&scope=user:email`);
  });
  
  app.get('/auth', async (req, res) => {
    const { code } = req.query;
    try {
      const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      }, {
        headers: { accept: 'application/json' },
      });
  
      const token = tokenRes.data.access_token;
      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      const emailsRes = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${token}` },
      });
  
      const githubUser = userRes.data;
      const primaryEmail = emailsRes.data.find(email => email.primary && email.verified)?.email 
                  || emailsRes.data[0]?.email 
                  || `${githubUser.login}@github.com`;
  
      let user = await User.findOne({ email: primaryEmail });
  
      if (!user) {
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
        user = new User({
          firstName: githubUser.name?.split(' ')[0] || githubUser.login,
          lastName: githubUser.name?.split(' ')[1] || '',
          email: primaryEmail,
          password: hashedPassword,
          country: 'Unknown',
          role: 'Student',
          photo: githubUser.avatar_url,
        });
      
        await user.save();
      }
  
      const jwtToken = jwt.sign({
        userId: user._id,
        email: user.email,
        role: user.role,
      }, process.env.TOKEN_SECRET, { expiresIn: '8h' });
  
      res.redirect(`${FRONTEND_URL}/home?token=${jwtToken}`);
    } catch (err) {
      console.error('GitHub OAuth Error:', err.response?.data || err.message || err);
      res.status(500).json({ error: 'GitHub OAuth failed', details: err.response?.data || err.message });
    }
  });

// LinkedIn OAuth Strategy
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID, // Clé API LinkedIn
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET, // Secret LinkedIn
    callbackURL: 'http://localhost:5173/auth/linkedin/callback', // URL de redirection après l'authentification
    scope: ['r_emailaddress', 'r_liteprofile'], // Permissions demandées
}, async (token, tokenSecret, profile, done) => {
    try {
        // Enregistrez ou mettez à jour l'utilisateur dans votre base de données
        const existingUser = await User.findOne({ email: profile.emails[0].value });

        if (!existingUser) {
            const newUser = new User({
                email: profile.emails[0].value,
                linkedInId: profile.id,
                name: profile.displayName,
                token,
            });
            await newUser.save();
            return done(null, newUser);
=======
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // En mode développement, mettez secure: false
      httpOnly: true, // Cela empêche l'accès aux cookies via JavaScript
      sameSite: "strict", // Vous pouvez aussi essayer 'lax' si cela pose problème
      maxAge: 3600000, // Durée de validité du cookie (1 heure ici)
    },
  })
);

app.use("/module", moduleRouter);
app.use(passport.initialize());
app.use(passport.session());
// Routes
app.use('/api/performance', performanceRoutes);
app.use("/api/level", levelRoutes);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/lessons", lessonRouter);
app.use("/api/badges", badgeRouter);
app.use("/api/ai", aiRoute);
app.use("/api/progress", userProgressRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Hello from the server" });
});

// LinkedIn OAuth Strategy
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID, // Clé API LinkedIn
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET, // Secret LinkedIn
      callbackURL: "http://localhost:5173/auth/linkedin/callback", // URL de redirection après l'authentification
      scope: ["r_emailaddress", "r_liteprofile"], // Permissions demandées
    },
    async (token, tokenSecret, profile, done) => {
      try {
        // Enregistrez ou mettez à jour l'utilisateur dans votre base de données
        const existingUser = await User.findOne({
          email: profile.emails[0].value,
        });

        if (!existingUser) {
          const newUser = new User({
            email: profile.emails[0].value,
            linkedInId: profile.id,
            name: profile.displayName,
            token,
          });
          await newUser.save();
          return done(null, newUser);
>>>>>>> origin/main
        }

        // Retourner l'utilisateur existant
        return done(null, existingUser);
<<<<<<< HEAD
    } catch (error) {
        console.error(error);
        return done(error, null);
    }
}));

// Sérialisation de l'utilisateur
passport.serializeUser((user, done) => {
    done(null, user.id);
=======
      } catch (error) {
        console.error(error);
        return done(error, null);
      }
    }
  )
);

// Sérialisation de l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user.id);
>>>>>>> origin/main
});

// Désérialisation de l'utilisateur
passport.deserializeUser(async (id, done) => {
<<<<<<< HEAD
    const user = await User.findById(id);
    done(null, user);
});



app.use('/api/questions', questionRouter);
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }), 
  (req, res) => {
    res.json({
      message: 'Login successful!',
=======
  const user = await User.findById(id);
  done(null, user);
});

app.use("/api/questions", questionRouter);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    res.json({
      message: "Login successful!",
>>>>>>> origin/main
      user: req.user.user,
      token: req.user.token,
    });
  }
);

app.listen(process.env.PORT || 3000, () => {
<<<<<<< HEAD
	console.log(`Listening on port ${process.env.PORT || 3000}...`);
=======
  console.log(`Listening on port ${process.env.PORT || 3000}...`);
>>>>>>> origin/main
});
