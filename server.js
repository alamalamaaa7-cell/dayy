require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const db = require('./db');
const { requireAuth, requireAdmin, verifyToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 80;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Attach current user (if any) to all views
app.use((req, res, next) => {
  const token = req.cookies.snaplam_token;
  res.locals.user = token ? verifyToken(token) : null;
  next();
});

app.use('/', authRoutes);
app.use('/api', require('./routes/download')(io));
app.use('/api/admin', require('./routes/admin')(io));

app.get('/', (req, res) => res.redirect(res.locals.user ? '/dashboard' : '/login'));

app.get('/dashboard', requireAuth, (req, res) => {
  const history = db.prepare(
    'SELECT * FROM downloads WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).all(req.user.id);
  res.render('dashboard', { user: req.user, history });
});

app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  const logs = db.prepare('SELECT * FROM downloads ORDER BY id DESC LIMIT 200').all();
  const users = db.prepare('SELECT id, username, role, theme, created_at FROM users ORDER BY id DESC').all();
  res.render('admin', { user: req.user, logs, users });
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Halaman tidak ditemukan.', user: res.locals.user });
});

require('./socket/index.js')(io);

server.listen(PORT, () => {
  console.log(`[SnapLam] Server berjalan di port ${PORT}`);
});
