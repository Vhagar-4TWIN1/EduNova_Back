const { google } = require('googleapis');
<<<<<<< HEAD

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
);

exports.getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
};

exports.setCredentialsFromCode = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

exports.getClassroomClient = (auth) => {
  return google.classroom({ version: 'v1', auth });
=======
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/classroom.courses'],
});

const classroom = google.classroom({ version: 'v1', auth });

exports.createCourse = async (title, description, ownerId) => {
  try {
    const res = await classroom.courses.create({
      requestBody: {
        name: title,
        description: description,
        ownerId: ownerId, // Replace with actual admin email
        courseState: 'ACTIVE',
      },
    });
    return res.data;
  } catch (error) {
    throw new Error('Google Classroom Error: ' + error.message);
  }
>>>>>>> origin/main
};
