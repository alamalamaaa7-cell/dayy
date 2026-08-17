const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'snaplam_default_secret_change_me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, theme: user.theme },
    SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

// Page middleware: redirect to /login if not authenticated
function requireAuth(req, res, next) {
  const token = req.cookies.snaplam_token;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.redirect('/login');
  req.user = payload;
  res.locals.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).render('error', { message: 'Akses ditolak. Khusus Admin.', user: req.user || null });
  }
  next();
}

// API middleware: JSON 401 instead of redirect
function requireAuthApi(req, res, next) {
  const token = req.cookies.snaplam_token;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  req.user = payload;
  next();
}

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, requireAuthApi, SECRET };
