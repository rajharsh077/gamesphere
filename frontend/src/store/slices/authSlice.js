import { createSlice } from '@reduxjs/toolkit';

const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const initialState = {
  user: null,
  token,
  status: 'idle',
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginSuccess(state, action) {
      state.status = 'succeeded';
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
    },
    loginFailure(state, action) {
      state.status = 'failed';
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    }
  }
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
