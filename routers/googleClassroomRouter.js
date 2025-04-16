const express = require('express');
const { google } = require('googleapis');
const Lesson = require('../models/lesson');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID1,
  process.env.GOOGLE_CLIENT_SECRET1,
  'http://localhost:3000/api/google/auth/callback' // ✅ Match frontend port
);

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
];

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/check-auth', (req, res) => {
  if (req.session.tokens) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Update the auth callback to properly handle tokens
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in session
    req.session.tokens = tokens;
    
    // Redirect to selection page with success
    res.redirect(`http://localhost:5173/dashboard/select-google-lessons?success=true`);
  } catch (err) {
    console.error("❌ Google auth error:", err);
    res.redirect(`http://localhost:5173/dashboard/lessons?error=auth_failed`);
  }
});

router.get('/lessons-temp', async (req, res) => {
  try {
    if (!req.session.tokens) {
      return res.status(401).json({ error: "No Google tokens found" });
    }

    oauth2Client.setCredentials(req.session.tokens);
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

    const coursesRes = await classroom.courses.list();
    const tempLessons = [];

    for (const course of coursesRes.data.courses || []) {
      const courseWorkRes = await classroom.courses.courseWork.list({ courseId: course.id });

      for (const work of courseWorkRes.data.courseWork || []) {
        let fileUrl = work.alternateLink;
        let typeLesson = "text"; // fallback type

        if (work.materials && work.materials.length > 0) {
          for (const material of work.materials) {
            if (material.driveFile) {
              const driveFile = material.driveFile.driveFile;
              const mimeType = driveFile?.mimeType || "";

              if (mimeType.startsWith("video/")) {
                typeLesson = "video";
              } else if (mimeType.startsWith("audio/")) {
                typeLesson = "audio";
              } else if (mimeType.startsWith("image/")) {
                typeLesson = "photo";
              } else if (mimeType === "application/pdf") {
                typeLesson = "pdf";
              } else {
                typeLesson = "file";
              }

              fileUrl = driveFile.alternateLink;
              break;
            }

            if (material.link) {
              typeLesson = "link";
              fileUrl = material.link.url;
              break;
            }

            if (material.youtubeVideo) {
              typeLesson = "video";
              fileUrl = material.youtubeVideo.alternateLink;
              break;
            }

            if (material.form) {
              typeLesson = "form";
              fileUrl = material.form.formUrl;
              break;
            }
          }
        }

        tempLessons.push({
          _id: work.id,
          title: work.title || "Untitled",
          content: work.description || "No content provided by Google",
          fileUrl,
          typeLesson,
        });
      }
    }

    res.json(tempLessons);
  } catch (err) {
    console.error('Google fetch error:', err);
    res.status(500).json({ error: "Failed to fetch Classroom lessons" });
  }
});



router.post('/import-lessons', async (req, res) => {
  try {
    if (!req.session.tokens) {
      return res.status(401).json({ error: "No Google tokens found" });
    }

    const { lessonIds } = req.body; // array of Google Classroom assignment IDs

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty lessonIds' });
    }

    oauth2Client.setCredentials(req.session.tokens);
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

    const importedLessons = [];

    const coursesRes = await classroom.courses.list();
    const allCourses = coursesRes.data.courses || [];

    for (const course of allCourses) {
      const courseWorksRes = await classroom.courses.courseWork.list({
        courseId: course.id,
      });

      for (const work of courseWorksRes.data.courseWork || []) {
        if (lessonIds.includes(work.id)) {
          const newLesson = new Lesson({
            title: work.title || 'Untitled',
            content: work.description?.trim() || 'No content provided by Google',
            typeLesson: 'text',
            fileUrl: work.alternateLink,
            LMScontent: 'google-classroom',
          });

          await newLesson.save();
          importedLessons.push(newLesson);
        }
      }
    }

    res.status(201).json({
      message: 'Selected lessons imported successfully',
      data: importedLessons,
    });
  } catch (err) {
    console.error('❌ Import error:', err);
    res.status(500).json({ error: 'Import failed', details: err.message });
  }
});
  

module.exports = router;
