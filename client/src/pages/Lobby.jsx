import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

export default function Lobby({ user, setUser }) {
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();
    socket.on('tables_list', setTables);
    socket.on('table_state', () => navigate('/game'));
    return () => { socket.off('tables_list'); socket.off('table_state'); };
  }, [navigate]);

  const createTable = () => socket.emit('create_table', { name: tableName || undefined });
  const joinTable = (id) => socket.emit('join_table', { tableId: id });
  const logout = () => fetch('/auth/logout', { credentials: 'include' }).then(() => { socket.disconnect(); setUser(null); });

  return (
    <div className="lobby">
      <header className="lobby-header">
        <h1>♠ Poker Lobby</h1>
        <div className="user-bar">
          {user.avatar && <img src={user.avatar} alt="" className="avatar-sm" />}
          <span>{user.name}</span>
          <button onClick={logout} className="btn-ghost">Logout</button>
        </div>
      </header>

      <div className="lobby-body">
        <div className="create-section">
          <h2>New Table</h2>
          <div className="create-row">
            <input
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              placeholder="Table name (optional)"
              onKeyDown={e => e.key === 'Enter' && createTable()}
            />
            <button onClick={createTable} className="btn-primary">Create</button>
          </div>
        </div>

        <div className="tables-section">
          <h2>Open Tables</h2>
          {tables.length === 0
            ? <p className="empty">No tables yet — create one above!</p>
            : tables.map(t => (
              <div key={t.id} className="table-row">
                <div className="table-info">
                  <strong>{t.name}</strong>
                  <span className="muted">{t.playerCount}/{t.maxPlayers} players · {t.phase}</span>
                </div>
                {t.phase === 'waiting' && t.playerCount < t.maxPlayers
                  ? <button onClick={() => joinTable(t.id)} className="btn-primary">Join</button>
                  : <span className="badge">{t.phase === 'waiting' ? 'Full' : 'In game'}</span>
                }
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
