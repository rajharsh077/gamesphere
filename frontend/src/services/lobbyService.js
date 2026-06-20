import api from './api';

export const getPublicLobbies = async () => {
  const response = await api.get('/lobbies');
  return response.data;
};

export const createLobby = async (payload) => {
  const response = await api.post('/lobbies', payload);
  return response.data;
};

export const getLobby = async (lobbyId) => {
  const response = await api.get(`/lobbies/${lobbyId}`);
  return response.data;
};

export const joinLobby = async (lobbyId, payload) => {
  const response = await api.post(`/lobbies/${lobbyId}/join`, payload);
  return response.data;
};

export const leaveLobby = async (lobbyId) => {
  const response = await api.post(`/lobbies/${lobbyId}/leave`);
  return response.data;
};

export const kickPlayer = async (lobbyId, targetUserId) => {
  const response = await api.post(`/lobbies/${lobbyId}/kick`, { targetUserId });
  return response.data;
};

export const createQuickAILobby = async (gameType) => {
  const response = await api.post('/lobbies/quick-ai', { gameType });
  return response.data;
};
