const { randomUUID } = require('crypto');

const ROOM_PASSWORD = process.env.ROOM_PASSWORD || 'angie';

function setupAuth(app) {
  app.post('/auth/login', (req, res) => {
    const { name, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    if (password !== ROOM_PASSWORD) return res.status(401).json({ error: 'Wrong password' });

    req.session.user = { id: randomUUID(), name: name.trim(), avatar: null };
    res.json(req.session.user);
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/me', (req, res) => {
    req.session.user ? res.json(req.session.user) : res.status(401).json({ error: 'Not authenticated' });
  });
}

module.exports = { setupAuth };
