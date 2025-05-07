const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");
const app = express();
const forumRouter = require("./routers/forumRouter");

const badgeRouter = require("./routers/badgeRouter");
const moduleRouter = require("./routers/moduleRouter");
const userRouter = require("./routers/userRouter");
const authRouter = require("./routers/authRouter");
const lessonRouter = require("./routers/lessonRouter");
const http = require("http");
const { Server } = require("socket.io");
const passport = require("./middlewares/passport");
const { User } = require("./models/usersModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const levelRoutes = require("./routers/levelRouter");
const questionRouter = require("./routers/questionRoutes");
const googleClassroomRouter = require("./routers/googleClassroomRouter");
const axios = require("axios");
const { google } = require("googleapis");
const server = http.createServer(app);
const ipRoutes = require("./routers/ipRoutes");

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // allow your frontend
    credentials: true,
  },
});

const session = require("express-session");
const aiRoute = require("./routers/aiRouter");
const userProgressRoutes = require("./routers/userProgressRoutes");
const performanceRoutes = require("./routers/performanceRouter");
const chatSocketHandler = require("./routers/chatRouter");
chatSocketHandler(io);
const translateRouter = require("./routers/translateRouter");
const languageToolRouter = require("./routers/langToolRouter");
const realTimeSubRouter = require("./routers/realTimeSubRouter");
const stickyNoteRoutes = require("./routers/stickyNoteRoutes");

console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);
console.log("Session Secret:", process.env.SESSION_SECRET);

app.use(bodyParser.json({ limit: "50mb" })); // Adjust size as needed
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173", // CORS autorisé pour le frontend React
    credentials: true, // Autorise l'envoi de cookies
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "recaptcha-token",
      "x-access-token",
    ], // En-têtes autorisés
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from uploads directory
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

// Session setup

app.use(
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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/performance", performanceRoutes);
app.use("/api/level", levelRoutes);
app.use("/api/forum", forumRouter);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/lessons", lessonRouter);
app.use("/api/badges", badgeRouter);
app.use("/api/ai", aiRoute);
app.use("/api/progress", userProgressRoutes);
app.use("/api/translate", translateRouter);
app.use("/api/ip", ipRoutes);
app.use("/api/languageTool", languageToolRouter);
app.use("/api/subtitles", realTimeSubRouter);
app.use("/api/stickynotes", stickyNoteRoutes);
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
        }

        // Retourner l'utilisateur existant
        return done(null, existingUser);
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
});

// Désérialisation de l'utilisateur
passport.deserializeUser(async (id, done) => {
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
      user: req.user.user,
      token: req.user.token,
    });
  }
);

///////Dashboard google analythic
const analytics = google.analyticsdata("v1beta");

app.get("/api/analytics", async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "credentials.json",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const authClient = await auth.getClient();

    const response = await analytics.properties.runReport({
      auth: authClient,
      property: `properties/485035007`,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "pageTitle" }],
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "userEngagementDuration" },
        ],
        limit: 10,
      },
    });

    res.json(formatData(response.data));
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

function formatData(data) {
  // Transformez les données GA4 dans un format adapté à vos graphiques
  const sessions = [];
  const pages = [];

  data.rows.forEach((row) => {
    sessions.push({
      date: row.dimensionValues[0].value,
      sessions: row.metricValues[0].value,
      users: row.metricValues[1].value,
    });

    pages.push({
      pageTitle: row.dimensionValues[1].value || "(not set)",
      pageViews: row.metricValues[1].value,
    });
  });

  return { sessions, pages };
}

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}...`);
});
