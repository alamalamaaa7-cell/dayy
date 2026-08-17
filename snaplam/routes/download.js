const express = require('express');
const db = require('../db');
const { requireAuthApi } = require('../middleware/auth');

const router = express.Router();
const DOWNLOAD_API_URL = process.env.DOWNLOAD_API_URL || 'https://dl.valore.web.id/api/download';
const API_TIMEOUT_MS = 30000;

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'Facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'Twitter/X';
  return 'Lainnya';
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// A "real" media link: a non-empty string that is itself a valid http(s) URL.
// This is the single source of truth for whether a download actually succeeded -
// we never trust a bare "success: true" flag from the upstream API on its own.
function isRealMediaUrl(val) {
  if (!val || typeof val !== 'string') return false;
  return isValidUrl(val.trim());
}

// Upstream response shapes vary a lot between providers, so we probe every
// field we've seen used in the wild instead of assuming one fixed schema.
function extractResultUrl(data, resolution) {
  if (!data || typeof data !== 'object') return null;

  const direct = [
    data.url, data.result, data.download_url, data.downloadUrl,
    data.dl, data.link, data.video, data.hd, data.no_watermark
  ];
  for (const candidate of direct) {
    if (isRealMediaUrl(candidate)) return candidate.trim();
  }

  const nested = data.data;
  if (nested) {
    if (typeof nested === 'string' && isRealMediaUrl(nested)) return nested.trim();
    if (!Array.isArray(nested) && typeof nested === 'object') {
      const nestedCandidates = [
        nested.url, nested.result, nested.download_url, nested.downloadUrl,
        nested.hd, nested.sd, nested.no_watermark, nested.play, nested.link
      ];
      for (const candidate of nestedCandidates) {
        if (isRealMediaUrl(candidate)) return candidate.trim();
      }
    }
  }

  // Array-of-formats style responses: [{url, quality/resolution}, ...]
  const listCandidates = [
    Array.isArray(nested) ? nested : null,
    Array.isArray(data.medias) ? data.medias : null,
    Array.isArray(data.formats) ? data.formats : null,
    Array.isArray(data.items) ? data.items : null,
    Array.isArray(data.results) ? data.results : null
  ].find(Boolean);

  if (listCandidates && listCandidates.length) {
    const wanted = String(resolution || '').replace(/[^0-9]/g, '');
    let match = null;
    if (wanted) {
      match = listCandidates.find((item) => {
        const q = String(item?.quality || item?.resolution || item?.label || '').replace(/[^0-9]/g, '');
        return q === wanted && isRealMediaUrl(item?.url || item?.link || item?.download_url);
      });
    }
    const pick = match || listCandidates.find((item) => isRealMediaUrl(item?.url || item?.link || item?.download_url));
    if (pick) {
      const candidate = pick.url || pick.link || pick.download_url;
      if (isRealMediaUrl(candidate)) return candidate.trim();
    }
  }

  return null;
}

module.exports = function (io) {
  router.post('/download', requireAuthApi, async (req, res) => {
    const { url, resolution } = req.body;
    const user = req.user;
    const userRoom = `user:${user.id}`;
    const res_ = resolution || '720p';
    // Detected up front (even for an invalid url) so every log line below,
    // including validation failures, can carry full context to the global feed.
    const platform = url && isValidUrl(url) ? detectPlatform(url) : 'Tidak diketahui';

    const log = (message, level = 'info') => {
      const payload = { message, level, time: new Date().toISOString() };
      io.to(userRoom).emit('terminal:log', payload);
      io.to('admin').emit('admin:log', { ...payload, username: user.username });
      // Broadcast to every logged-in user (everyone in the 'chat' room) so the
      // dashboard's global live-activity feed shows real, detailed lines -
      // not just a platform name - for every user's downloads in realtime.
      io.to('chat').emit('activity:log', {
        ...payload,
        username: user.username,
        platform,
        resolution: res_,
        url
      });
    };

    if (!url || !isValidUrl(url)) {
      log('URL tidak valid. Pastikan link dimulai dengan http:// atau https://', 'error');
      return res.status(400).json({ ok: false, status: 'gagal', message: 'URL tidak valid' });
    }

    log(`Menerima permintaan unduhan dari ${platform} (${res_})...`, 'info');
    log('Menghubungi server SnapLam API...', 'info');

    // Everything defaults to "gagal" - it only flips to "sukses" once we have
    // an actual, verified media URL in hand. Never the other way around.
    let record = {
      status: 'gagal',
      result_url: null,
      message: 'Gagal memproses unduhan.'
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      let apiRes;
      try {
        apiRes = await fetch(DOWNLOAD_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': 'cli-' + Date.now()
          },
          body: JSON.stringify({ url, resolution: res_ }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      log(`Menerima respons dari server (HTTP ${apiRes.status})...`, 'info');

      let data = null;
      let rawText = '';
      try {
        rawText = await apiRes.text();
        data = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        data = null;
      }

      if (!apiRes.ok) {
        record.status = 'gagal';
        record.message = `Server API merespons error (HTTP ${apiRes.status}).`;
        log(record.message, 'error');
      } else if (!data) {
        record.status = 'gagal';
        record.message = 'Respons server API tidak valid (bukan JSON).';
        log(record.message, 'error');
      } else if (data.error || data.status === false || data.success === false) {
        record.status = 'gagal';
        record.message = data.message || data.error || 'API menolak permintaan.';
        log(`Gagal: ${record.message}`, 'error');
      } else {
        log('Memproses hasil media...', 'info');
        const resultUrl = extractResultUrl(data, res_);

        if (resultUrl) {
          record.status = 'sukses';
          record.result_url = resultUrl;
          record.message = 'Unduhan berhasil diproses.';
          log('Sukses! Link media ditemukan dan siap diunduh.', 'success');
        } else {
          // API said "ok" but never actually gave us a usable file link -
          // that is a failure from the user's point of view, full stop.
          record.status = 'gagal';
          record.result_url = null;
          record.message = 'API tidak mengembalikan link video/media yang valid.';
          log(record.message, 'error');
        }
      }
    } catch (err) {
      record.status = 'gagal';
      record.result_url = null;
      record.message = err.name === 'AbortError'
        ? 'Timeout menghubungi server API. Coba lagi beberapa saat.'
        : `Gagal menghubungi server API: ${err.message}`;
      log(record.message, 'error');
    }

    const info = db.prepare(
      `INSERT INTO downloads (user_id, username, url, platform, resolution, status, result_url, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, user.username, url, platform, res_, record.status, record.result_url, record.message);

    log(
      record.status === 'sukses'
        ? `Selesai. Riwayat disimpan (#${info.lastInsertRowid}).`
        : `Dihentikan dengan status gagal. Riwayat disimpan (#${info.lastInsertRowid}).`,
      record.status === 'sukses' ? 'success' : 'error'
    );

    res.json({
      ok: record.status === 'sukses',
      id: info.lastInsertRowid,
      platform,
      resolution: res_,
      status: record.status,
      result_url: record.result_url,
      message: record.message
    });
  });

  router.get('/history', requireAuthApi, (req, res) => {
    const rows = db.prepare(
      'SELECT * FROM downloads WHERE user_id = ? ORDER BY id DESC LIMIT 100'
    ).all(req.user.id);
    res.json({ ok: true, data: rows });
  });

  return router;
};
