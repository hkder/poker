import { useState, useEffect } from 'react';

export default function BettingControls({ tableState, myPlayer, onAction }) {
  const toCall = tableState.currentBet - myPlayer.bet;
  const canCheck = toCall <= 0;
  const minRaise = tableState.minRaise || 20;
  const defaultRaise = tableState.currentBet + minRaise;
  const [raiseAmt, setRaiseAmt] = useState(defaultRaise);

  useEffect(() => { setRaiseAmt(defaultRaise); }, [defaultRaise]);

  return (
    <div className="betting-controls">
      <button onClick={() => onAction('fold')} className="btn-action btn-fold">Fold</button>

      {canCheck
        ? <button onClick={() => onAction('check')} className="btn-action btn-check">Check</button>
        : <button onClick={() => onAction('call')} className="btn-action btn-call">Call ${toCall}</button>
      }

      <div className="raise-group">
        <input
          type="number"
          value={raiseAmt}
          min={defaultRaise}
          max={myPlayer.chips + myPlayer.bet}
          onChange={e => setRaiseAmt(parseInt(e.target.value, 10) || defaultRaise)}
          className="raise-input"
        />
        <button
          onClick={() => onAction('raise', raiseAmt - tableState.currentBet)}
          disabled={raiseAmt - tableState.currentBet < minRaise || raiseAmt > myPlayer.chips + myPlayer.bet}
          className="btn-action btn-raise"
        >
          Raise to ${raiseAmt}
        </button>
      </div>

      <button onClick={() => onAction('all-in')} className="btn-action btn-allin">
        All-In (${myPlayer.chips})
      </button>
    </div>
  );
}
