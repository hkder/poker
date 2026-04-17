const HAND_RANKS = {
  HIGH_CARD: 0, ONE_PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3,
  STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8, ROYAL_FLUSH: 9,
};

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [head, ...tail] = arr;
  return [
    ...combinations(tail, k - 1).map(c => [head, ...c]),
    ...combinations(tail, k),
  ];
}

function evaluate5(cards) {
  const vals = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  const uniq = [...new Set(vals)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5 && uniq[0] - uniq[4] === 4) {
    isStraight = true;
    straightHigh = uniq[0];
  }
  if (uniq.join() === '14,5,4,3,2') {
    isStraight = true;
    straightHigh = 5;
  }

  const freq = {};
  vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const groups = Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (isFlush && isStraight)
    return { rank: straightHigh === 14 ? HAND_RANKS.ROYAL_FLUSH : HAND_RANKS.STRAIGHT_FLUSH, tb: [straightHigh] };
  if (groups[0][1] === 4)
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, tb: [+groups[0][0], +groups[1][0]] };
  if (groups[0][1] === 3 && groups[1][1] === 2)
    return { rank: HAND_RANKS.FULL_HOUSE, tb: [+groups[0][0], +groups[1][0]] };
  if (isFlush)
    return { rank: HAND_RANKS.FLUSH, tb: vals };
  if (isStraight)
    return { rank: HAND_RANKS.STRAIGHT, tb: [straightHigh] };
  if (groups[0][1] === 3)
    return { rank: HAND_RANKS.THREE_OF_A_KIND, tb: [+groups[0][0], ...groups.slice(1).map(g => +g[0]).sort((a, b) => b - a)] };
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = [+groups[0][0], +groups[1][0]].sort((a, b) => b - a);
    return { rank: HAND_RANKS.TWO_PAIR, tb: [...pairs, +groups[2][0]] };
  }
  if (groups[0][1] === 2)
    return { rank: HAND_RANKS.ONE_PAIR, tb: [+groups[0][0], ...groups.slice(1).map(g => +g[0]).sort((a, b) => b - a)] };
  return { rank: HAND_RANKS.HIGH_CARD, tb: vals };
}

function compareEvals(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.tb.length, b.tb.length); i++) {
    if (a.tb[i] !== b.tb[i]) return a.tb[i] - b.tb[i];
  }
  return 0;
}

function getBestHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  let best = null;
  for (const combo of combinations(all, 5)) {
    const ev = evaluate5(combo);
    if (!best || compareEvals(ev, best.ev) > 0) best = { ev, cards: combo };
  }
  return best;
}

const HAND_NAMES = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];

function determineWinners(players, communityCards) {
  const withHands = players.map(p => ({ ...p, best: getBestHand(p.holeCards, communityCards) }));
  let winners = [withHands[0]];
  for (let i = 1; i < withHands.length; i++) {
    const cmp = compareEvals(withHands[i].best.ev, winners[0].best.ev);
    if (cmp > 0) winners = [withHands[i]];
    else if (cmp === 0) winners.push(withHands[i]);
  }
  return winners;
}

module.exports = { determineWinners, getBestHand, HAND_NAMES };
