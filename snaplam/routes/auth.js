const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

function alreadyLoggedIn(req) {
  const token = req.cookies.snaplam_token;
  return token ? verifyToken(token) : null;
}

router.get('/login', (req, res) => {
  if (alreadyLoggedIn(req)) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.get('/register', (req, res) => {
  if (alreadyLoggedIn(req)) return res.redirect('/dashboard');
  res.render('register', { error: null });
});

router.post('/register', (req, res) => {
  const { username, password, confirm } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'Username dan password wajib diisi.' });
  }
  if (username.trim().length < 3) {
    return res.render('register', { error: 'Username minimal 3 karakter.' });
  }
  if (password.length < 5) {
    return res.render('register', { error: 'Password minimal 5 karakter.' });
  }
  if (password !== confirm) {
    return res.render('register', { error: 'Konfirmasi password tidak sama.' });
  }
  const uname = username.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
  if (existing) {
    return res.render('register', { error: 'Username sudah digunakan.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password, role, theme) VALUES (?, ?, ?, ?)')
    .run(uname, hash, 'user', 'abu');
  const user = { id: info.lastInsertRowid, username: uname, role: 'user', theme: 'abu' };
  const token = signToken(user);
  res.cookie('snaplam_token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
  res.redirect('/dashboard');
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'Username dan password wajib diisi.' });
  }
  const uname = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(uname);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Username atau password salah.' });
  }
  const token = signToken(user);
  res.cookie('snaplam_token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
  res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
});

router.get('/logout', (req, res) => {
  res.clearCookie('snaplam_token');
  res.redirect('/login');
});

router.post('/theme', (req, res) => {
  const token = req.cookies.snaplam_token;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ ok: false });
  const allowed = ['abu', 'biru', 'putih', 'orange', 'emas'];
  const { theme } = req.body;
  if (!allowed.includes(theme)) return res.status(400).json({ ok: false, message: 'Tema tidak valid' });
  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, payload.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  const newToken = signToken(user);
  res.cookie('snaplam_token', newToken, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
  res.json({ ok: true, theme });
});

module.exports = router;
