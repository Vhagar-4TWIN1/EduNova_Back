const jwt = require('jsonwebtoken');

const setTokenCookie = (res, user) => {
  const token = jwt.sign(
    { userId: user._id, email: user.email, verified: user.verified },
    process.env.TOKEN_SECRET,
    { expiresIn: '8h' }
  );
  
  res.cookie('Authorization', 'Bearer ' + token, {
    httpOnly: process.env.NODE_ENV === 'production',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 8 * 3600000, // 8 hours
  });

  return token;
};

module.exports = setTokenCookie;
