import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import PokerTable from '../components/PokerTable';
import BettingControls from '../components/BettingControls';

export default function Game({ user }) {
  const [tableState, setTableState] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.on('table_state', setTableState);
    socket.on('error', msg => { setError(msg); setTimeout(() => setError(null), 3000); });
    return () => { socket.off('table_state'); socket.off('error'); };
  }, []);

  const leaveTable = () => { socket.emit('leave_table'); navigate('/lobby'); };
  const startGame = () => socket.emit('start_game');
  const sendAction = (action, amount) => socket.emit('player_action', { action, amount });

  if (!tableState) return <div className="loading">Connecting…</div>;

  const myPlayer = tableState.players.find(p => p.id === user.id);
  const currentPlayer = tableState.players[tableState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === user.id && !myPlayer?.folded;
  const isHost = tableState.players[0]?.id === user.id;
  const inBetting = !['waiting', 'showdown'].includes(tableState.phase);

  return (
    <div className="game-page">
      <div className="game-topbar">
        <span className="table-name">{tableState.name}</span>
        <span className="phase-badge">{tableState.phase}</span>
        <button onClick={leaveTable} className="btn-ghost">Leave</button>
      </div>

      {error && <div className="error-toast">{error}</div>}

      <PokerTable tableState={tableState} userId={user.id} />

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
