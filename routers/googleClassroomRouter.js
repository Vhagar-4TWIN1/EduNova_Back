const express = require('express');
const { google } = require('googleapis');
const Lesson = require('../models/lesson');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/google/auth/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  'https://www.googleapis.com/auth/drive'
];

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.tokens });
});

router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    res.redirect('http://localhost:5173/dashboard/select-google-lessons?success=true');
  } catch (err) {
    console.error("❌ Google auth error:", err);
    res.redirect('http://localhost:5173/dashboard/lessons-list?error=auth_failed');
  }
});

router.get('/lessons-temp', async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).json({ error: "No Google tokens found" });

    oauth2Client.setCredentials(req.session.tokens);
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const coursesRes = await classroom.courses.list();
    const tempLessons = [];

    for (const course of coursesRes.data.courses || []) {
      const courseWorkRes = await classroom.courses.courseWork.list({ courseId: course.id });

      for (const work of courseWorkRes.data.courseWork || []) {
        let fileUrl = null;
        let typeLesson = "text";

        if (work.materials?.length) {
          for (const material of work.materials) {
            if (material.driveFile) {
              try {
                const driveFile = material.driveFile.driveFile;
                await drive.permissions.create({
                  fileId: driveFile.id,
                  requestBody: { role: 'reader', type: 'anyone' },
                });
                const driveMeta = await drive.files.get({
                  fileId: driveFile.id,
                  fields: 'mimeType',
                });
                const mimeType = driveMeta.data.mimeType;
                fileUrl = `https://drive.google.com/file/d/${driveFile.id}/preview`;
                typeLesson = mimeType.startsWith("video/") ? "video"
                            : mimeType.startsWith("audio/") ? "audio"
                            : mimeType.startsWith("image/") ? "photo"
                            : mimeType === "application/pdf" ? "pdf"
                            : "file";
                break;
              } catch (e) {
                console.warn("⚠️ Could not fetch drive file metadata:", e.response?.data?.error?.message);
                continue;
              }
            } else if (material.link) {
              fileUrl = material.link.url;
              typeLesson = "link";
              break;
            } else if (material.youtubeVideo) {
              fileUrl = material.youtubeVideo.alternateLink;
              typeLesson = "video";
              break;
            }
          }
        }

        if (!fileUrl) continue;

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
    if (!req.session.tokens) return res.status(401).json({ error: "No Google tokens found" });

    const { lessonIds } = req.body;
    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty lessonIds' });
    }

    oauth2Client.setCredentials(req.session.tokens);
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const importedLessons = [];

    const coursesRes = await classroom.courses.list();
    for (const course of coursesRes.data.courses || []) {
      const courseWorksRes = await classroom.courses.courseWork.list({ courseId: course.id });
      for (const work of courseWorksRes.data.courseWork || []) {
        if (!lessonIds.includes(work.id)) continue;

        let fileUrl = null;
        let typeLesson = "text";

        if (work.materials?.length) {
          for (const material of work.materials) {
            if (material.driveFile) {
              try {
                const driveFile = material.driveFile.driveFile;
                await drive.permissions.create({
                  fileId: driveFile.id,
                  requestBody: { role: 'reader', type: 'anyone' },
                });
                const driveMeta = await drive.files.get({
                  fileId: driveFile.id,
                  fields: 'mimeType',
                });
                const mimeType = driveMeta.data.mimeType;
                fileUrl = `https://drive.google.com/file/d/${driveFile.id}/preview`;
                typeLesson = mimeType.startsWith("video/") ? "video"
                            : mimeType.startsWith("audio/") ? "audio"
                            : mimeType.startsWith("image/") ? "photo"
                            : mimeType === "application/pdf" ? "pdf"
                            : "file";
                break;
              } catch (e) {
                console.warn("⚠️ Could not fetch drive file metadata:", e.response?.data?.error?.message);
                continue;
              }
            } else if (material.link) {
              fileUrl = material.link.url;
              typeLesson = "link";
              break;
            } else if (material.youtubeVideo) {
              fileUrl = material.youtubeVideo.alternateLink;
              typeLesson = "video";
              break;
            }
          }
        }

        if (!fileUrl) continue;

        const newLesson = new Lesson({
          title: work.title || 'Untitled',
          content: work.description?.trim() || 'No content provided by Google',
          fileUrl,
          typeLesson,
          LMScontent: 'google-classroom',
        });

        await newLesson.save();
        importedLessons.push(newLesson);
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
