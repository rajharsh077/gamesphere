import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LobbyPage from '../pages/LobbyPage';
import GamePage from '../pages/GamePage';
import ProfilePage from '../pages/ProfilePage';
import LeaderboardPage from '../pages/LeaderboardPage';
import FriendsPage from '../pages/FriendsPage';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="lobby" element={<LobbyPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="game/:gameId" element={<GamePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
