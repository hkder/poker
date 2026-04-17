const GoogleStrategy = require('passport-google-oauth20').Strategy;

function setupAuth(app, passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  }, (accessToken, refreshToken, profile, done) => {
    done(null, {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value,
    });
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
  );

  app.get('/auth/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
  });

  app.get('/api/me', (req, res) => {
    req.user ? res.json(req.user) : res.status(401).json({ error: 'Not authenticated' });
  });
}

module.exports = { setupAuth };
