import { io } from 'socket.io-client';

let socket;

export const initSocket = (token) => {
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: { token }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onLobbyUpdate = (callback) => {
  if (!socket) return;
  socket.on('lobby:update', callback);
};

export const offLobbyUpdate = (callback) => {
  if (!socket) return;
  socket.off('lobby:update', callback);
};

export const onLobbyChatMessage = (callback) => {
  if (!socket) return;
  socket.on('lobby:chat:message', callback);
};

export const offLobbyChatMessage = (callback) => {
  if (!socket) return;
  socket.off('lobby:chat:message', callback);
};

export const onLobbyInvite = (callback) => {
  if (!socket) return;
  socket.on('lobby:invite', callback);
};

export const offLobbyInvite = (callback) => {
  if (!socket) return;
  socket.off('lobby:invite', callback);
};

export const onLobbyDeleted = (callback) => {
  if (!socket) return;
  socket.on('lobby:deleted', callback);
};

export const offLobbyDeleted = (callback) => {
  if (!socket) return;
  socket.off('lobby:deleted', callback);
};

export const onPresenceUpdate = (callback) => {
  if (!socket) return;
  socket.on('presence:update', callback);
};

export const onFriendPresence = (callback) => {
  if (!socket) return;
  socket.on('friend:presence', callback);
};

export const offFriendPresence = (callback) => {
  if (!socket) return;
  socket.off('friend:presence', callback);
};

export const emitSubscribeFriends = (payload) => {
  if (!socket) return;
  socket.emit('friends:subscribe', payload);
};

export const emitLobbyJoin = (payload, callback) => {
  if (!socket) return;
  socket.emit('lobby:join', payload, callback);
};

export const emitLobbyLeave = (payload, callback) => {
  if (!socket) return;
  socket.emit('lobby:leave', payload, callback);
};

export const emitLobbyReadyToggle = (payload, callback) => {
  if (!socket) return;
  socket.emit('lobby:ready_toggle', payload, callback);
};

export const emitLobbyToggleHostPlay = (payload, callback) => {
  if (!socket) return;
  socket.emit('lobby:toggle_host_play', payload, callback);
};

export const emitLobbyChat = (payload, callback) => {
  if (!socket) return;
  socket.emit('lobby:chat:message', payload, callback);
};

export const emitGameStart = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:start', payload, callback);
};

export const emitGameMove = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:move', payload, callback);
};

export const emitGameChat = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:chat:message', payload, callback);
};

export const emitGameSubscribe = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:subscribe', payload, callback);
};

export const onGameState = (callback) => {
  if (!socket) return;
  socket.on('game:state', callback);
};

export const offGameState = (callback) => {
  if (!socket) return;
  socket.off('game:state', callback);
};

export const onGameChatMessage = (callback) => {
  if (!socket) return;
  socket.on('game:chat:message', callback);
};

export const offGameChatMessage = (callback) => {
  if (!socket) return;
  socket.off('game:chat:message', callback);
};

export const onGameStarted = (callback) => {
  if (!socket) return;
  socket.on('game:started', callback);
};

export const offGameStarted = (callback) => {
  if (!socket) return;
  socket.off('game:started', callback);
};

export const emitDirectChat = (payload, callback) => {
  if (!socket) return;
  socket.emit('chat:direct:message', payload, callback);
};

export const onOnlineCount = (callback) => {
  if (!socket) return;
  socket.on('online:count', callback);
};

export const offOnlineCount = (callback) => {
  if (!socket) return;
  socket.off('online:count', callback);
};

export const emitGetOnlineCount = (callback) => {
  if (!socket) return;
  socket.emit('online:get_count', callback);
};

export const onLobbyKicked = (callback) => {
  if (!socket) return;
  socket.on('lobby:kicked', callback);
};

export const offLobbyKicked = (callback) => {
  if (!socket) return;
  socket.off('lobby:kicked', callback);
};

export const emitGameForfeit = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:forfeit', payload, callback);
};

export const emitGameDraw = (payload, callback) => {
  if (!socket) return;
  socket.emit('game:draw', payload, callback);
};
