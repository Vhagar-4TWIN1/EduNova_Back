require('dotenv').config();
console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);
<<<<<<< HEAD

const axios=require('axios')
const path=require('path')
=======
>>>>>>> origin/Connecton-history-+Activity-Logs
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Routers
const authRouter = require('./routers/authRouter');
const userRouter = require('./routers/userRouter');

const app = express();
const session = require('express-session');



app.use(cors({
    origin: 'http://localhost:5173',  // CORS autorisé pour le frontend React
    credentials: true,               // Autorise l'envoi de cookies
    allowedHeaders: ['Authorization', 'Content-Type'] // En-têtes autorisés
}));

  
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('static'))



mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((error) => {
		console.error('MongoDB connection error:', error);
	});

app.use('/api/auth', authRouter);
// Add the user routes
app.use('/api/users', userRouter);

app.get('/', (req, res) => {
	res.json({ message: 'Hello from the server' });
});

app.get('/oauth',(req,res) =>{
	res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}`)
});
app.get('/auth',({query:{code}},res) =>{
 const body = {
	client_id:process.env.CLIENT_ID,
	client_secret:process.env.CLIENT_SECRET,
	code
 }
 const opts={Headers:{accept:'application/json'}}
 axios.post('https://github.com/login/oauth/access_token',body,opts)
 .then((_res) => _res.data.access_token)
 .then((token) => {
	res.redirect(`/?token=${token}`)
 })
});
app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on port ${process.env.PORT || 3000}...`); // FIXED string interpolation
});


const passport = require('passport');
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

// Configurez la stratégie LinkedIn
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
        }

        // Retourner l'utilisateur existant
        return done(null, existingUser);
    } catch (error) {
        console.error(error);
        return done(error, null);
    }
}));

// Sérialisation de l'utilisateur
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Désérialisation de l'utilisateur
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});


app.use(
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
app.use(passport.initialize());
app.use(passport.session());


