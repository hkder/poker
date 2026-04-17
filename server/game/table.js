const { createDeck, shuffle } = require('./deck');
const { determineWinners, HAND_NAMES } = require('./handEvaluator');

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_CHIPS = 1000;

class Table {
  constructor(id, name, maxPlayers = 6) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.communityCards = [];
    this.deck = [];
    this.pot = 0;
    this.phase = 'waiting';
    this.currentPlayerIndex = 0;
    this.dealerIndex = -1;
    this.currentBet = 0;
    this.minRaise = BIG_BLIND;
    this.toActQueue = [];
    this.log = [];
    this.winners = null;
  }

  addPlayer(user) {
    if (this.players.length >= this.maxPlayers) return { error: 'Table is full' };
    if (this.players.find(p => p.id === user.id)) return { error: 'Already seated' };
    if (this.phase !== 'waiting') return { error: 'Game in progress' };
    this.players.push({
      id: user.id, name: user.name, avatar: user.avatar,
      chips: STARTING_CHIPS, holeCards: [], bet: 0,
      folded: false, allIn: false, socketId: user.socketId,
    });
    return { success: true };
  }

  removePlayer(userId) {
    this.players = this.players.filter(p => p.id !== userId);
    if (this.players.length < 2 && this.phase !== 'waiting') {
      this.phase = 'waiting';
    }
  }

  startGame() {
    if (this.players.length < 2 || this.phase !== 'waiting') return false;

    this.deck = shuffle(createDeck());
    this.communityCards = [];
    this.pot = 0;
    this.winners = null;
    this.log = [];
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    this.players.forEach(p => {
      p.holeCards = [];
      p.bet = 0;
      p.folded = false;
      p.allIn = false;
    });

    for (let i = 0; i < 2; i++) {
      this.players.forEach(p => p.holeCards.push(this.deck.pop()));
    }

    const sbIdx = (this.dealerIndex + 1) % this.players.length;
    const bbIdx = (this.dealerIndex + 2) % this.players.length;
    this._postBlind(sbIdx, SMALL_BLIND, 'small blind');
    this._postBlind(bbIdx, BIG_BLIND, 'big blind');

    this.currentBet = BIG_BLIND;
    this.minRaise = BIG_BLIND;
    this.phase = 'pre-flop';

    // UTG acts first pre-flop; BB acts last (gets option)
    const utgIdx = (bbIdx + 1) % this.players.length;
    this.toActQueue = this._buildQueue(utgIdx, bbIdx);
    this.currentPlayerIndex = this.toActQueue[0];
    return true;
  }

  _postBlind(idx, amount, label) {
    const p = this.players[idx];
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.bet = actual;
    this.pot += actual;
    if (p.chips === 0) p.allIn = true;
    this.log.push(`${p.name} posts ${label} ($${actual})`);
  }

  _buildQueue(startIdx, endIdx) {
    const queue = [];
    let idx = startIdx;
    const n = this.players.length;
    let safety = 0;
    do {
      const p = this.players[idx];
      if (!p.folded && !p.allIn) queue.push(idx);
      if (idx === endIdx) break;
      idx = (idx + 1) % n;
      safety++;
    } while (safety < n + 1);
    return queue;
  }

  _activePlayers() {
    return this.players.filter(p => !p.folded);
  }

  processAction(playerId, action, amount) {
    if (!this.toActQueue.length) return { error: 'No action expected' };
    const idx = this.toActQueue[0];
    const player = this.players[idx];

    if (!player || player.id !== playerId) return { error: 'Not your turn' };

    const toCall = this.currentBet - player.bet;

    switch (action) {
      case 'fold':
        player.folded = true;
        this.log.push(`${player.name} folds`);
        break;

      case 'check':
        if (toCall > 0) return { error: 'Cannot check — must call or raise' };
        this.log.push(`${player.name} checks`);
        break;

      case 'call': {
        if (toCall <= 0) return { error: 'Nothing to call' };
        const actual = Math.min(toCall, player.chips);
        player.chips -= actual;
        player.bet += actual;
        this.pot += actual;
        if (player.chips === 0) player.allIn = true;
        this.log.push(`${player.name} calls $${actual}`);
        break;
      }

      case 'raise': {
        const raise = parseInt(amount, 10);
        if (isNaN(raise) || raise < this.minRaise) return { error: `Min raise is $${this.minRaise}` };
        const newBet = this.currentBet + raise;
        const needed = newBet - player.bet;
        if (needed > player.chips) return { error: 'Not enough chips' };
        player.chips -= needed;
        this.pot += needed;
        player.bet = newBet;
        this.minRaise = raise;
        this.currentBet = newBet;
        if (player.chips === 0) player.allIn = true;
        this.log.push(`${player.name} raises to $${newBet}`);
        this._requeueAfterAggression(idx);
        break;
      }

      case 'all-in': {
        const chips = player.chips;
        player.bet += chips;
        this.pot += chips;
        player.chips = 0;
        player.allIn = true;
        if (player.bet > this.currentBet) {
          this.minRaise = player.bet - this.currentBet;
          this.currentBet = player.bet;
          this.log.push(`${player.name} goes all-in ($${chips})`);
          this._requeueAfterAggression(idx);
          break;
        }
        this.log.push(`${player.name} goes all-in ($${chips})`);
        break;
      }

      default:
        return { error: 'Unknown action' };
    }

    if (action !== 'raise' && action !== 'all-in') {
      this.toActQueue.shift();
    }

    const active = this._activePlayers();
    if (active.length === 1) {
      active[0].chips += this.pot;
      this.winners = [{ ...active[0], won: this.pot, handName: 'Last player standing' }];
      this.phase = 'showdown';
      return { success: true };
    }

    if (this.toActQueue.length === 0) {
      this._advancePhase();
    } else {
      this.currentPlayerIndex = this.toActQueue[0];
    }

    return { success: true };
  }

  _requeueAfterAggression(aggressorIdx) {
    const n = this.players.length;
    const queue = [];
    let idx = (aggressorIdx + 1) % n;
    let steps = 0;
    while (steps < n - 1) {
      const p = this.players[idx];
      if (!p.folded && !p.allIn) queue.push(idx);
      idx = (idx + 1) % n;
      steps++;
    }
    this.toActQueue = queue;
  }

  _advancePhase() {
    this.players.forEach(p => { p.bet = 0; });
    this.currentBet = 0;
    this.minRaise = BIG_BLIND;

    if (this.phase === 'pre-flop') {
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.phase = 'flop';
    } else if (this.phase === 'flop') {
      this.communityCards.push(this.deck.pop());
      this.phase = 'turn';
    } else if (this.phase === 'turn') {
      this.communityCards.push(this.deck.pop());
      this.phase = 'river';
    } else if (this.phase === 'river') {
      this._resolveShowdown();
      return;
    }

    // Post-flop: first active player after dealer
    const n = this.players.length;
    let startIdx = (this.dealerIndex + 1) % n;
    let safety = 0;
    while ((this.players[startIdx].folded || this.players[startIdx].allIn) && safety < n) {
      startIdx = (startIdx + 1) % n;
      safety++;
    }

    const queue = [];
    for (let i = 0; i < n; i++) {
      const idx = (startIdx + i) % n;
      if (!this.players[idx].folded && !this.players[idx].allIn) queue.push(idx);
    }
    this.toActQueue = queue;

    if (this.toActQueue.length === 0) {
      this._advancePhase();
    } else {
      this.currentPlayerIndex = this.toActQueue[0];
    }
  }

  _resolveShowdown() {
    this.phase = 'showdown';
    const active = this._activePlayers();
    const winners = determineWinners(active, this.communityCards);
    const share = Math.floor(this.pot / winners.length);
    winners.forEach(w => {
      const p = this.players.find(pl => pl.id === w.id);
      if (p) p.chips += share;
    });
    this.winners = winners.map(w => ({
      ...w,
      won: share,
      handName: HAND_NAMES[w.best.ev.rank],
    }));
  }

  getState(viewerId) {
    return {
      id: this.id,
      name: this.name,
      phase: this.phase,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      winners: this.winners,
      log: this.log.slice(-8),
      players: this.players.map((p, i) => ({
        id: p.id, name: p.name, avatar: p.avatar,
        chips: p.chips, bet: p.bet, folded: p.folded, allIn: p.allIn,
        isCurrentPlayer: i === this.currentPlayerIndex,
        holeCards: p.id === viewerId
          ? p.holeCards
          : (this.phase === 'showdown' && !p.folded ? p.holeCards : p.holeCards.map(() => null)),
      })),
    };
  }
}

module.exports = { Table };
