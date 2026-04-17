const { Table } = require('./game/table');

const tables = new Map();
const playerTable = new Map(); // userId -> tableId

function setupSocket(io) {
  io.use((socket, next) => {
    if (socket.request.user) return next();
    next(new Error('Authentication required'));
  });

  io.on('connection', (socket) => {
    const user = socket.request.user;

    socket.emit('tables_list', getTableList());

    socket.on('create_table', ({ name } = {}) => {
      // Leave any existing table first
      const prev = playerTable.get(user.id);
      if (prev) leaveRoom(io, socket, user.id, prev);

      const id = `t_${Date.now()}`;
      const table = new Table(id, name || `${user.name}'s Table`);
      tables.set(id, table);

      const res = table.addPlayer({ ...user, socketId: socket.id });
      if (res.error) { socket.emit('error', res.error); return; }

      joinRoom(socket, user.id, id);
      broadcast(io);
      emitState(io, id);
    });

    socket.on('join_table', ({ tableId }) => {
      const table = tables.get(tableId);
      if (!table) { socket.emit('error', 'Table not found'); return; }

      const res = table.addPlayer({ ...user, socketId: socket.id });
      if (res.error) { socket.emit('error', res.error); return; }

      const prev = playerTable.get(user.id);
      if (prev && prev !== tableId) leaveRoom(io, socket, user.id, prev);

      joinRoom(socket, user.id, tableId);
      broadcast(io);
      emitState(io, tableId);
    });

    socket.on('join_by_code', ({ code }) => {
      const table = Array.from(tables.values()).find(t => t.code === code?.toUpperCase().trim());
      if (!table) { socket.emit('error', 'Room not found'); return; }
      const res = table.addPlayer({ ...user, socketId: socket.id });
      if (res.error) { socket.emit('error', res.error); return; }
      const prev = playerTable.get(user.id);
      if (prev && prev !== table.id) leaveRoom(io, socket, user.id, prev);
      joinRoom(socket, user.id, table.id);
      broadcast(io);
      emitState(io, table.id);
    });

    socket.on('leave_table', () => {
      const tid = playerTable.get(user.id);
      if (tid) leaveRoom(io, socket, user.id, tid);
    });

    socket.on('request_state', () => {
      const tid = playerTable.get(user.id);
      if (tid) emitState(io, tid);
    });

    socket.on('start_game', () => {
      const tid = playerTable.get(user.id);
      const table = tables.get(tid);
      if (!table) return;
      if (table.players[0]?.id !== user.id) { socket.emit('error', 'Only the host can start'); return; }
      if (!table.startGame()) { socket.emit('error', 'Need at least 2 players'); return; }
      emitState(io, tid);
    });

    socket.on('admin_adjust_chips', ({ playerId, amount }) => {
      const tid = playerTable.get(user.id);
      const table = tables.get(tid);
      if (!table || table.phase !== 'waiting') return;
      if (table.players[0]?.id !== user.id) return; // host only
      const target = table.players.find(p => p.id === playerId);
      if (target) {
        target.chips = Math.max(0, target.chips + amount);
        emitState(io, tid);
      }
    });

    socket.on('player_action', ({ action, amount }) => {
      const tid = playerTable.get(user.id);
      const table = tables.get(tid);
      if (!table) return;

      const res = table.processAction(user.id, action, amount);
      if (res.error) { socket.emit('error', res.error); return; }

      emitState(io, tid);

      if (table.phase === 'showdown') {
        setTimeout(() => {
          if (tables.has(tid)) {
            table.phase = 'waiting';
            emitState(io, tid);
          }
        }, 6000);
      }
    });

    socket.on('disconnect', () => {
      const tid = playerTable.get(user.id);
      if (tid) leaveRoom(io, socket, user.id, tid);
    });
  });
}

function joinRoom(socket, userId, tableId) {
  playerTable.set(userId, tableId);
  socket.join(tableId);
}

function leaveRoom(io, socket, userId, tableId) {
  const table = tables.get(tableId);
  if (table) {
    table.removePlayer(userId);
    if (table.players.length === 0) tables.delete(tableId);
    else emitState(io, tableId);
  }
  playerTable.delete(userId);
  socket.leave(tableId);
  broadcast(io);
}

function getTableList() {
  return Array.from(tables.values()).map(t => ({
    id: t.id, code: t.code, name: t.name,
    playerCount: t.players.length, maxPlayers: t.maxPlayers, phase: t.phase,
  }));
}

function broadcast(io) {
  io.emit('tables_list', getTableList());
}

function emitState(io, tableId) {
  const table = tables.get(tableId);
  if (!table) return;
  const room = io.sockets.adapter.rooms.get(tableId);
  if (!room) return;
  room.forEach(sid => {
    const sock = io.sockets.sockets.get(sid);
    if (sock) sock.emit('table_state', table.getState(sock.request.user?.id));
  });
}

module.exports = { setupSocket };
