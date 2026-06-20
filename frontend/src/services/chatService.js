import api from './api';

export const getLobbyChat = async (lobbyId) => {
  const response = await api.get(`/chat/lobby/${lobbyId}`);
  return response.data;
};

export const getDirectConversation = async (userId) => {
  const response = await api.get(`/chat/direct/${userId}`);
  return response.data;
};
