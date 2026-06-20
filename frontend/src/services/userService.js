import api from './api';

export const getUserMatchHistory = async (userId) => {
  const response = await api.get(`/users/${userId}/match-history`);
  return response.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId, updates) => {
  const response = await api.patch(`/users/${userId}`, updates);
  return response.data;
};
