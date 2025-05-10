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
const VideoCallRouter = require("./routers/videCallRouter");
const badgeRouter = require("./routers/badgeRouter");
const moduleRouter = require("./routers/moduleRouter");
const userRouter = require("./routers/userRouter");
const authRouter = require("./routers/authRouter");
const lessonRouter = require("./routers/lessonRouter");
const { Server } = require("socket.io");
const passport = require("./middlewares/passport");
const { User } = require("./models/usersModel");
const bcrypt = require("bcrypt");
const { WebSocketServer } = require("ws");
const http = require("http");
const httpServer = http.createServer(app);

const jwt = require("jsonwebtoken");
const levelRoutes = require("./routers/levelRouter");
const questionRouter = require("./routers/questionRoutes");
const googleClassroomRouter = require("./routers/googleClassroomRouter");
const axios = require("axios");
const cron = require("node-cron");
const schedulerRouter = require("./routers/schedulerRouter");
const { google } = require("googleapis");
const server = http.createServer(app);
const ipRoutes = require("./routers/ipRoutes");
const GeminiRoutes = require("./routers/GeminiRoutes");

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
const chatSocketHandler = require("./routers/chatRouter");
chatSocketHandler(io);
const translateRouter = require("./routers/translateRouter");
const languageToolRouter = require("./routers/langToolRouter");
const realTimeSubRouter = require("./routers/realTimeSubRouter");
const stickyNoteRoutes = require("./routers/stickyNoteRoutes");
const CalendarEvent = require("./models/calendarEvent");
const annotationRoutes = require("./routers/annotationRoutes");
const musicRouter = require("./routers/musicRouter");

const setupEventRoutes = require("./routers/calendarEventRouter");
const setupSkillTreeRoutes = require("./routers/skillTreeRouter");

const performanceRoutes = require("./routers/performanceRouter");
const quizRoutes = require("./routers/quiz");
const VideoCall = require("./models/videoCall");
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helmet can be used for extra security headers (if needed)
// app.use(helmet());

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/resumes",
  express.static(path.join(__dirname, "resumes"), {
    setHeaders: (res) => {
      res.set("Content-Type", "application/pdf");
    },
  })
);
// Connect to MongoDB
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
      secure: process.env.NODE_ENV === "production", // secure flag for production
      httpOnly: true,
      sameSite: "strict",
      maxAge: 3600000, // 1 hour
    },
  })
);

// Initialize Passport for authentication and manage sessions
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/performance", performanceRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/performance", performanceRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/level", levelRoutes);
app.use("/api/forum", forumRouter);

app.use("/api/auth", authRouter);
app.use("/api/google", googleClassroomRouter);
app.use("/api/users", userRouter);
app.use("/api/lessons", lessonRouter);
app.use("/api/badges", badgeRouter);
app.use("/api/ai", aiRoute);
app.use("/api/progress", userProgressRoutes);
app.use("/api/scheduler", schedulerRouter);
app.use("/api/translate", translateRouter);
app.use("/api/ip", ipRoutes);
app.use("/api/languageTool", languageToolRouter);
app.use("/api/subtitles", realTimeSubRouter);
app.use("/api/stickynotes", stickyNoteRoutes);
app.use("/api/gemini", GeminiRoutes);
app.use("/api/music", musicRouter);
app.use("/music", musicRouter);
app.use("/music", express.static(path.join(__dirname, "music")));
app.use("/module", moduleRouter);

app.get("/", (req, res) => {
  res.json({ message: "Hello from the server" });
});
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
app.use("/api/events", setupEventRoutes(wss));
app.use("/api/skill-tree", setupSkillTreeRoutes(wss));
//app.use("/api/videCall",VideoCallRouter);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.get("/oauth", (req, res) => {
  const redirect_uri = "http://localhost:3000/auth";
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_uri}&scope=user:email`
  );
});
//app.use("/api/lessons", annotationRoutes);

app.get("/auth", async (req, res) => {
  const { code } = req.query;
  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      },
      {
        headers: { accept: "application/json" },
      }
    );

    const token = tokenRes.data.access_token;
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
    });
    const emailsRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `token ${token}` },
    });

    const githubUser = userRes.data;
    const primaryEmail =
      emailsRes.data.find((email) => email.primary && email.verified)?.email ||
      emailsRes.data[0]?.email ||
      `${githubUser.login}@github.com`;

    let user = await User.findOne({ email: primaryEmail });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = new User({
        firstName: githubUser.name?.split(" ")[0] || githubUser.login,
        lastName: githubUser.name?.split(" ")[1] || "",
        email: primaryEmail,
        password: hashedPassword,
        country: "Unknown",
        role: "Student",
        photo: githubUser.avatar_url,
      });

      await user.save();
    }

    const jwtToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: "8h" }
    );

    res.redirect(`${FRONTEND_URL}/home?token=${jwtToken}`);
  } catch (err) {
    console.error(
      "GitHub OAuth Error:",
      err.response?.data || err.message || err
    );
    res.status(500).json({
      error: "GitHub OAuth failed",
      details: err.response?.data || err.message,
    });
  }
});
// LinkedIn OAuth Strategy
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "http://localhost:5173/auth/linkedin/callback",
      scope: ["r_emailaddress", "r_liteprofile"],
    },
    async (token, tokenSecret, profile, done) => {
      try {
        // Check if the user already exists and update or create accordingly
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
        return done(null, existingUser);
      } catch (error) {
        console.error("LinkedIn OAuth Error:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize and deserialize users for session management
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Facebook OAuth callback route (assuming you've set up the corresponding strategy)
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
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const { type } = JSON.parse(message.toString());
      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err) {
      console.error("Error parsing WS message:", err);
    }
  });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Listening (HTTP + WS) on port ${PORT}…`);
});
cron.schedule("*/1 * * * *", async () => {
  try {
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const upcoming = await CalendarEvent.find({
      start: { $gte: now, $lte: in30min },
      readyEmitted: { $ne: true },
    });

    for (const ev of upcoming) {
      wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "events:ready",
              payload: {
                id: ev._id,
                title: ev.title,
                start: ev.start,
                lessonId: ev.lessonId,
                duration: ev.durationMin,
              },
            })
          );
        }
      });
    }
  } catch (err) {
    console.error("Cron reminder error:", err);
  }
});
