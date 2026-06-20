import api from './api';

export const startGame = async (gameType, lobbyId) => {
  const response = await api.post(`/games/${gameType}/start`, { lobbyId });
  return response.data;
};

export const getGameState = async (gameId) => {
  const response = await api.get(`/games/${gameId}`);
  return response.data;
};

export const submitMove = async (gameId, move) => {
  const response = await api.post(`/games/${gameId}/move`, { move });
  return response.data;
};

export const getGameChat = async (gameId) => {
  const response = await api.get(`/chat/game/${gameId}`);
  return response.data;
};
