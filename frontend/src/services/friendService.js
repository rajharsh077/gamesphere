import api from './api';

export const getFriends = async () => {
  const response = await api.get('/friends');
  return response.data;
};

export const searchUsers = async (query) => {
  const response = await api.get('/users/search', {
    params: { query }
  });
  return response.data;
};

export const sendFriendRequest = async (targetUserId) => {
  const response = await api.post('/friends/request', { targetUserId });
  return response.data;
};

export const acceptFriendRequest = async (requestUserId) => {
  const response = await api.post('/friends/accept', { requestUserId });
  return response.data;
};

export const inviteFriendToLobby = async (lobbyId, targetUserId) => {
  const response = await api.post(`/lobbies/${lobbyId}/invite`, { targetUserId });
  return response.data;
};

export const removeFriend = async (friendId) => {
  const response = await api.delete(`/friends/${friendId}`);
  return response.data;
};
