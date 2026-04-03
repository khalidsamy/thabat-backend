const jwt = require('jsonwebtoken');

/**
 * @desc    Middleware to protect routes by verifying JWT
 * @returns 401 if token is missing or invalid
 */
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error('[AUTH ERROR] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};
