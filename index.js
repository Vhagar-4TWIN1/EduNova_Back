const axios = require('axios');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('./middlewares/passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Routers and Models
const badgeRouter = require('./routers/badgeRouter');
const moduleRouter = require('./routers/moduleRouter');
const userRouter = require('./routers/userRouter');
const authRouter = require('./routers/authRouter');
const lessonRouter = require('./routers/lessonRouter');
const levelRoutes = require('./routers/levelRouter');
const questionRouter = require('./routers/questionRoutes');
const googleClassroomRouter = require('./routers/googleClassroomRouter');
const { User } = require('./models/usersModel'); // <-- ensure this path is correct
const GeminiRoutes = require('./routers/GeminiRoutes');
const musicRouter = require('./routers/musicRouter');

// Debug log the environment variables
console.log("MongoDB URI:", process.env.MONGODB_URI);
console.log("Port:", process.env.PORT);
console.log("Session Secret:", process.env.SESSION_SECRET);

// Body parser configuration with size limits
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration (allowing credentials)
app.use(cors({
    origin: 'http://localhost:5173',  // Adjust based on your frontend URL
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type','recaptcha-token']
}));

// Additional middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helmet can be used for extra security headers (if needed)
// app.use(helmet());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/resumes', express.static(path.join(__dirname, 'resumes'), {
    setHeaders: (res) => {
      res.set('Content-Type', 'application/pdf');
    }
  }));
// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production', // secure flag for production
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
        },
    })
);

// Initialize Passport for authentication and manage sessions
app.use(passport.initialize());
app.use(passport.session());

// Mount routers
app.use('/module', moduleRouter);
app.use('/api/level', levelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/google', googleClassroomRouter);
app.use('/api/users', userRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/badges', badgeRouter);
app.use('/api/questions', questionRouter);
app.use('/api/ai', GeminiRoutes);

//music baby 
app.use('/api/music', musicRouter);
app.use('/music', musicRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/music', express.static(path.join(__dirname, 'music')));
// Home route

app.get('/', (req, res) => {
    res.json({ message: 'Hello from the server' });
});

// GitHub OAuth endpoints
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
        const primaryEmail = emailsRes.data.find(email => email.primary && email.verified)?.email ||
                             emailsRes.data[0]?.email ||
                             `${githubUser.login}@github.com`;
  
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
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: 'http://localhost:5173/auth/linkedin/callback',
    scope: ['r_emailaddress', 'r_liteprofile'],
}, async (token, tokenSecret, profile, done) => {
    try {
        // Check if the user already exists and update or create accordingly
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
        }
        return done(null, existingUser);
    } catch (error) {
        console.error('LinkedIn OAuth Error:', error);
        return done(error, null);
    }
}));

// Serialize and deserialize users for session management
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// Facebook OAuth callback route (assuming you've set up the corresponding strategy)
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }), 
  (req, res) => {
    res.json({
      message: 'Login successful!',
      user: req.user.user,
      token: req.user.token,
    });
  }
);

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}...`);
});
