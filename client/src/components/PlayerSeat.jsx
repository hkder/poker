import Card from './Card';

export default function PlayerSeat({ player, isMe, isDealer, position, total }) {
  const angle = (position / total) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const rx = 42, ry = 38;
  const x = 50 + rx * Math.cos(rad);
  const y = 50 + ry * Math.sin(rad);

  return (
    <div
      className={`player-seat ${player.folded ? 'folded' : ''} ${player.isCurrentPlayer ? 'active' : ''} ${isMe ? 'me' : ''} ${player.allIn ? 'all-in' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="seat-inner">
        {player.avatar
          ? <img src={player.avatar} alt="" className="seat-avatar" />
          : <div className="seat-avatar placeholder">{player.name[0]}</div>
        }
        <div className="seat-name">{isMe ? 'You' : player.name}{isDealer ? ' (D)' : ''}</div>
        <div className="seat-chips">${player.chips}</div>
        {player.bet > 0 && <div className="seat-bet">Bet: ${player.bet}</div>}
        {player.folded && <div className="seat-status">Folded</div>}
        {player.allIn && !player.folded && <div className="seat-status allin">All-In</div>}
        <div className="seat-cards">
          {player.holeCards.map((c, i) => <Card key={i} card={c} hidden={!c} small />)}
        </div>
      </div>
    </div>
  );
}
