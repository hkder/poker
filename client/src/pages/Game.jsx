import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import PokerTable from '../components/PokerTable';
import BettingControls from '../components/BettingControls';

export default function Game({ user }) {
  const [tableState, setTableState] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editingChips, setEditingChips] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.on('table_state', setTableState);
    socket.on('error', msg => { setError(msg); setTimeout(() => setError(null), 3000); });
    socket.emit('request_state');
    return () => { socket.off('table_state'); socket.off('error'); };
  }, []);

  const leaveTable = () => { socket.emit('leave_table'); navigate('/lobby'); };
  const startGame = () => socket.emit('start_game');
  const sendAction = (action, amount) => socket.emit('player_action', { action, amount });

  const copyLink = () => {
    const url = `${window.location.origin}/lobby?code=${tableState.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const adjustChips = (playerId, amount) => {
    socket.emit('admin_adjust_chips', { playerId, amount });
  };

  if (!tableState) return <div className="loading">Connecting…</div>;

  const myPlayer = tableState.players.find(p => p.id === user.id) ?? null;
  const currentPlayer = tableState.players[tableState.currentPlayerIndex] ?? null;
  const isMyTurn = !!currentPlayer && currentPlayer.id === user.id && !myPlayer?.folded && !myPlayer?.allIn;
  const isHost = tableState.players[0]?.id === user.id;
  const inBetting = !['waiting', 'showdown'].includes(tableState.phase);

  return (
    <div className="game-page">
      <div className="game-topbar">
        <span className="table-name">{tableState.name}</span>
        <span className="room-code-badge">{tableState.code}</span>
        <span className="phase-badge">{tableState.phase}</span>
        <div className="topbar-actions">
          <button onClick={copyLink} className="btn-ghost btn-sm">
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
          {isHost && tableState.phase === 'waiting' && (
            <button onClick={() => setEditingChips(e => !e)} className="btn-ghost btn-sm">
              {editingChips ? 'Done' : 'Edit Chips'}
            </button>
          )}
          <button onClick={leaveTable} className="btn-ghost btn-sm">Leave</button>
        </div>
      </div>

      {error && <div className="error-toast">{error}</div>}

      <PokerTable tableState={tableState} userId={user.id} />

      {editingChips && (
        <div className="chip-editor">
          <strong>Adjust chips (host only)</strong>
          {tableState.players.map(p => (
            <div key={p.id} className="chip-row">
              <span>{p.name}: ${p.chips}</span>
              <button onClick={() => adjustChips(p.id, 500)} className="btn-ghost btn-sm">+$500</button>
              <button onClick={() => adjustChips(p.id, -500)} className="btn-ghost btn-sm">-$500</button>
              <button onClick={() => adjustChips(p.id, 1000)} className="btn-ghost btn-sm">+$1000</button>
            </div>
          ))}
        </div>
      )}

      <div className="game-footer">
        {tableState.phase === 'waiting' && (
          <div className="waiting-bar">
            {isHost && tableState.players.length >= 2
              ? <button onClick={startGame} className="btn-primary btn-lg">Start Game</button>
              : <span className="muted">Waiting for players ({tableState.players.length}/2 min)…</span>
            }
          </div>
        )}

        {tableState.phase === 'showdown' && tableState.winners && (
          <div className="showdown-bar">
            {tableState.winners.map(w => (
              <span key={w.id} className="winner-msg">
                {w.name} wins ${w.won} — {w.handName}!
              </span>
            ))}
            <span className="muted"> · Next hand in a moment…</span>
          </div>
        )}

        {isMyTurn && inBetting && myPlayer && (
          <BettingControls tableState={tableState} myPlayer={myPlayer} onAction={sendAction} />
        )}

        {inBetting && !isMyTurn && (
          <div className="waiting-bar">
            <span className="muted">Waiting for {currentPlayer?.name}…</span>
          </div>
        )}

        <div className="action-log">
          {tableState.log.map((entry, i) => <span key={i} className="log-entry">{entry}</span>)}
        </div>
      </div>
    </div>
  );
}
