// src/auth/middleware.js
const { verify } = require('./tokens');

/**
 * Requires a valid JWT in the Authorization header.
 * On success: attaches req.user = { id, username, role } and calls next().
 * On failure: responds 401 and does NOT call next().
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = verify(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (err) {
    // We intentionally don't leak why it failed (expired vs. forged)
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Requires req.user.role to be one of the allowed roles.
 * Must be used AFTER requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };