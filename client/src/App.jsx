import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data));
  }, []);

  if (user === undefined) return <div className="loading">Loading…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/lobby" /> : <Login />} />
        <Route path="/lobby" element={user ? <Lobby user={user} setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/game" element={user ? <Game user={user} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
