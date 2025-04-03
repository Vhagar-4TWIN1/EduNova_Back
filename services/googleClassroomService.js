const { google } = require('googleapis');
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
};
