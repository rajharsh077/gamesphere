import api from './api';

export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const login = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const googleLogin = async (token) => {
  const response = await api.post('/auth/google', { token });
  return response.data;
};

export const fetchMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
