require('dotenv').config();
console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRouter = require('./routers/authRouter');
const app = express();
const passport = require('./middlewares/passport');
const session = require('express-session');
console.log("Session Secret:", process.env.SESSION_SECRET);

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((error) => {
		console.error('MongoDB connection error:', error);
	});

// **Move session setup above passport middleware**
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,
}));

// **Initialize Passport and session middleware after session setup**
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRouter);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }), 
  (req, res) => {
    res.json({
      message: 'Login successful!',
      user: req.user.user,
      token: req.user.token,
    });
  }
);

app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on port ${process.env.PORT || 3000}...`);
});
