const express = require('express');
const db = require('../db');
const { requireAuthApi } = require('../middleware/auth');

const router = express.Router();

function requireAdminApi(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Khusus admin.' });
  }
  next();
}

module.exports = function (io) {
  router.get('/logs', requireAuthApi, requireAdminApi, (req, res) => {
    const rows = db.prepare(
      `SELECT d.id, d.username, d.url, d.platform, d.resolution, d.status, d.message, d.created_at
       FROM downloads d ORDER BY d.id DESC LIMIT 200`
    ).all();
    res.json({ ok: true, data: rows });
  });

  router.get('/users', requireAuthApi, requireAdminApi, (req, res) => {
    const rows = db.prepare(
      `SELECT id, username, role, theme, created_at FROM users ORDER BY id DESC`
    ).all();
    res.json({ ok: true, data: rows });
  });

  router.post('/notify', requireAuthApi, requireAdminApi, (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ ok: false, message: 'Pesan notifikasi kosong.' });
    }
    db.prepare('INSERT INTO notifications (message, from_admin) VALUES (?, ?)')
      .run(message.trim(), req.user.username);
    io.emit('notif:broadcast', {
      message: message.trim(),
      from: req.user.username,
      time: new Date().toISOString()
    });
    res.json({ ok: true });
  });

  router.get('/stats', requireAuthApi, requireAdminApi, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    const totalDownloads = db.prepare('SELECT COUNT(*) c FROM downloads').get().c;
    const success = db.prepare("SELECT COUNT(*) c FROM downloads WHERE status = 'sukses'").get().c;
    const failed = db.prepare("SELECT COUNT(*) c FROM downloads WHERE status != 'sukses'").get().c;
    res.json({ ok: true, data: { totalUsers, totalDownloads, success, failed } });
  });

  return router;
};
