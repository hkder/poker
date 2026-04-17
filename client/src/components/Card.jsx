const RED_SUITS = new Set(['♥', '♦']);

export default function Card({ card, hidden, small }) {
  if (hidden || !card) {
    return <div className={`card card-back ${small ? 'card-sm' : ''}`}>🂠</div>;
  }
  const red = RED_SUITS.has(card.suit);
  return (
    <div className={`card ${red ? 'red' : 'black'} ${small ? 'card-sm' : ''}`}>
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{card.suit}</span>
    </div>
  );
}
