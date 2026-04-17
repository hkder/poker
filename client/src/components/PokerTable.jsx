import PlayerSeat from './PlayerSeat';
import Card from './Card';

export default function PokerTable({ tableState, userId }) {
  const { players, communityCards, pot, dealerIndex } = tableState;

  return (
    <div className="table-wrap">
      <div className="felt">
        <div className="felt-center">
          <div className="community-cards">
            {[0, 1, 2, 3, 4].map(i => (
              <Card key={i} card={communityCards[i] || null} hidden={!communityCards[i]} />
            ))}
          </div>
          <div className="pot-display">Pot: ${pot}</div>
        </div>

        {players.map((p, i) => (
          <PlayerSeat
            key={p.id}
            player={p}
            position={i}
            total={players.length}
            isMe={p.id === userId}
            isDealer={i === dealerIndex}
          />
        ))}
      </div>
    </div>
  );
}
