const jwt = require('jsonwebtoken');

<<<<<<< HEAD
// Middleware for token-based user authentication
exports.identifier = (req, res, next) => {
  let token;

  // Check if the request comes from a browser or another client
  if (req.headers.client === 'not-browser') {
    token = req.headers.authorization; // Authorization from header
  } else {
    token = req.cookies['Authorization']; // Authorization from cookies
  }

  // If no token is provided, return Unauthorized response
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'No token provided, authorization denied',
    });
  }

  try {
    // Remove the "Bearer" part of the token (if it exists)
    const userToken = token.split(' ')[1];

    // Verify the JWT token with the secret key
    const jwtVerified = jwt.verify(userToken, process.env.TOKEN_SECRET);

    // If the token is verified, attach the user information to the request and continue
    if (jwtVerified) {
      req.user = jwtVerified;
      return next(); // Proceed to the next middleware
    }

    // If token verification fails, throw an error
    throw new Error('Invalid token');
  } catch (error) {
    // Log the error for debugging
    console.error(error);

    // Return Unauthorized response for invalid or expired token
    return res.status(403).json({
      success: false,
      message: 'Invalid token or session expired',
    });
  }
};
=======
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
  
>>>>>>> user-crud
