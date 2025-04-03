const axios = require('axios');
require('dotenv').config();

const BLACKBOARD_BASE_URL = process.env.BLACKBOARD_BASE_URL;
const CLIENT_ID = process.env.BLACKBOARD_CLIENT_ID;
const CLIENT_SECRET = process.env.BLACKBOARD_CLIENT_SECRET;

let ACCESS_TOKEN = '';

const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `${BLACKBOARD_BASE_URL}/learn/api/public/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET,
        },
      }
    );
    ACCESS_TOKEN = response.data.access_token;
  } catch (error) {
    throw new Error('Blackboard Auth Error: ' + error.message);
  }
};

exports.createCourse = async (title, description) => {
  try {
    if (!ACCESS_TOKEN) await getAccessToken();

    const res = await axios.post(
      `${BLACKBOARD_BASE_URL}/learn/api/public/v1/courses`,
      {
        courseId: `course-${Date.now()}`,
        name: title,
        description: description,
        availability: { available: 'Yes' },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      await getAccessToken();
      return this.createCourse(title, description);
    }
    throw new Error('Blackboard Error: ' + error.message);
  }
};
