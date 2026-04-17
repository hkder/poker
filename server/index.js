require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require('path');
const { setupAuth } = require('./auth');
const { setupSocket } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// Trust Railway's proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  transports: ['websocket', 'polling'],
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
});

app.use(express.json());
app.use(sessionMiddleware);

setupAuth(app);

// Share session with socket.io
const wrap = m => (socket, next) => m(socket.request, socket.request.res || {}, next);
io.use(wrap(sessionMiddleware));
io.use((socket, next) => {
  socket.request.user = socket.request.session?.user || null;
  next();
});

setupSocket(io);

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
      res.sendFile(path.join(dist, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
