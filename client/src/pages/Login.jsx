import { useState } from 'react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    onLogin(data);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-suits">♠ ♥ ♦ ♣</div>
        <h1>Poker</h1>
        <p>Texas Hold'em — play with friends</p>
        <form onSubmit={submit} className="login-form">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Joining…' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
