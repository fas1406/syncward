// src/auth/tokens.js
const jwt = require('jsonwebtoken');

function sign(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in .env');
  }
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
}

function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { sign, verify };