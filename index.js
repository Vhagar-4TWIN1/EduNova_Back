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
const session = require('express-session');
const moduleRouter = require('./routers/moduleRouter');



app.use(cors({
    origin: 'http://localhost:5173',  // CORS autorisé pour le frontend React
    credentials: true,               // Autorise l'envoi de cookies
    allowedHeaders: ['Authorization', 'Content-Type'] // En-têtes autorisés
}));

  
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
app.use('/module', moduleRouter);
app.use('/api/auth', authRouter);
app.get('/', (req, res) => {
	res.json({ message: 'Hello from the server' });
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


