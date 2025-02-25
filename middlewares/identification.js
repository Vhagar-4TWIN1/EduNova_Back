const jwt = require('jsonwebtoken');

// middlewares/identification.js
exports.identifier = (req, res, next) => {
	let token;

	if (req.headers.client === 'not-browser') {
	  token = req.headers.authorization;
	} else {
	  token = req.cookies['Authorization'];
	}
	if (!token) {
	  return res.status(403).json({ success: false, message: 'Unauthorized' });
	}
	try {
	  const userToken = token.split(' ')[1];
	  const jwtVerified = jwt.verify(userToken, process.env.TOKEN_SECRET);
	  if (jwtVerified) {
		req.user = jwtVerified;
		return next();
	  }
	  throw new Error('Invalid token');
	} catch (error) {
	  console.log(error);
	  return res.status(403).json({ success: false, message: 'Unauthorized' });
	}
  };
  
