import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppRoutes } from './routes/AppRoutes';
import { fetchMe } from './services/authService';
import { loginSuccess, logout } from './store/slices/authSlice';
import { setAuthToken } from './services/api';
import { initSocket, disconnectSocket } from './services/socketService';

function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      return;
    }

    setAuthToken(storedToken);

    fetchMe()
      .then((data) => {
        dispatch(loginSuccess({ user: data.user, token: storedToken }));
      })
      .catch(() => {
        localStorage.removeItem('token');
        setAuthToken(null);
        dispatch(logout());
      });
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      initSocket(token);
    } else {
      disconnectSocket();
    }
  }, [token]);

  return <AppRoutes />;
}

export default App;
