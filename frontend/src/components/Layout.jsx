import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { setAuthToken } from '../services/api';
import { getFriends } from '../services/friendService';
import { disconnectSocket } from '../services/socketService';
import Avatar from './Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Home, Gamepad2, Users, Trophy, User, LogOut } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/lobby', label: 'Lobby', icon: Gamepad2 },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User }
];

const Layout = () => {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isDashboard = token && !isHomePage && !isAuthPage;
  const isGamePage = token && location.pathname.startsWith('/game');

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    setAuthToken(null);
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
      setPendingRequestsCount(0);
      return;
    }

    const loadFriendState = async () => {
      try {
        const data = await getFriends();
        setPendingRequestsCount(data.pendingRequests.incoming?.length || 0);
      } catch (error) {
        setPendingRequestsCount(0);
      }
    };

    loadFriendState();
  }, [token]);

  return (
    <div className={`relative min-h-screen bg-[#020617] text-slate-100 font-sans overflow-x-hidden flex ${isDashboard ? 'flex-row' : 'flex-col justify-between'}`}>
      
      {/* Background Ambient Blobs */}
      {!isHomePage && !isAuthPage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] left-[8%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/10 blur-[130px] animate-blob" />
          <div className="absolute top-[25%] right-[5%] w-[35vw] h-[35vw] rounded-full bg-violet-600/10 blur-[110px] animate-blob [animation-delay:5s]" />
          <div className="absolute bottom-[20%] left-[15%] w-[45vw] h-[45vw] rounded-full bg-rose-600/5 blur-[150px] animate-blob [animation-delay:10s]" />
        </div>
      )}

      {isDashboard ? (
        <>
          {/* Desktop Sidebar (visible on md and up) */}
          {!isGamePage && (
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-slate-950/80 border-r border-white/10 backdrop-blur-2xl flex-col justify-between p-6 z-30">
            <div className="flex flex-col gap-8">
              {/* Brand Logo Identity */}
              <Link to="/" className="group flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
                  <Gamepad2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-300 via-slate-200 to-pink-300 bg-clip-text text-transparent group-hover:brightness-110 transition duration-300 uppercase font-sans">
                    GameSphere
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold tracking-[0.25em] uppercase font-mono mt-0.5">Multiplayer</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2">
                {navLinks.map((item) => {
                  const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-350 font-bold uppercase tracking-wider text-[10px] border ${
                        isActive
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                          : 'border-transparent text-slate-400 hover:border-white/5 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {/* Active Indicator Glow Pillar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-pink-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      )}
                      <Icon className={`h-4.5 w-4.5 transition-transform duration-350 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                      {item.to === '/friends' && pendingRequestsCount > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Profile Info Card at Bottom */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={user?.avatarUrl || getAvatarUrl(user?.username || 'guest')}
                    alt={user?.username ? `${user.username} avatar` : 'User avatar'}
                    size="sm"
                    className="h-9 w-9 border-2 border-indigo-500/30 rounded-full"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                </div>
                <div className="max-w-[120px] truncate text-left">
                  <p className="text-[8px] text-slate-500 font-semibold uppercase leading-none font-mono">Player Profile</p>
                  <strong className="truncate text-indigo-300 text-xs font-bold block mt-0.5">{user?.username}</strong>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-slate-900/80 hover:bg-rose-950/30 hover:border-rose-500/30 border border-white/5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-rose-350 transition duration-300 flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-450 text-rose-400" />
                <span>Logout Account</span>
              </button>
            </div>
          </aside>
          )}

          {/* Main Workspace for Authenticated Users */}
          <div className={`relative z-10 flex-grow flex flex-col min-w-0 ${isGamePage ? '' : 'md:pl-64'}`}>
            {/* Mobile Header (visible on screens < md) */}
            {!isGamePage && (
              <header className="md:hidden w-full flex items-center justify-between px-5 py-4 bg-slate-950/60 border-b border-white/5 backdrop-blur-md sticky top-0 z-30">
                <Link to="/" className="group flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md">
                    <Gamepad2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-md font-bold tracking-wider text-white uppercase">
                    GameSphere
                  </span>
                </Link>
              </header>
            )}

            {/* Mobile Floating Nav Bar Dock (visible on screens < md) */}
            {!isGamePage && (
              <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md h-16 glass-panel-heavy rounded-full border border-white/10 backdrop-blur-xl flex items-center justify-around px-4 z-30 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
                {navLinks.map((item) => {
                  const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`relative flex flex-col items-center justify-center rounded-full p-2.5 transition-all duration-300 ${
                        isActive ? 'text-indigo-400' : 'text-slate-450 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5.5 w-5.5" />
                      {item.to === '/friends' && pendingRequestsCount > 0 && (
                        <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Page Content Renderer */}
            <main className={`w-full ${isGamePage ? 'max-w-none px-2 py-2 md:py-4' : 'max-w-7xl px-4 py-4 md:py-8'} mx-auto flex-grow flex flex-col justify-center animate-slide-up [animation-delay:0.1s] ${isGamePage ? 'pb-4' : 'pb-24 md:pb-8'}`}>
              <div className={`w-full glass-panel ${isGamePage ? 'rounded-[1.5rem] p-4 sm:p-5 md:p-6' : 'rounded-[2.5rem] p-4 sm:p-8 md:p-10'} border border-white/5 shadow-[0_30px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl flex-grow`}>
                <Outlet />
              </div>
            </main>
          </div>
        </>
      ) : (
        /* Regular Layout for Unauthenticated Guest Session or Homepage (Full Width) */
        <div className="relative z-10 flex-grow flex flex-col">
          {!isAuthPage && (
            <header className="w-full max-w-[1600px] mx-auto px-4 sm:px-12 lg:px-16 py-4 sm:py-6 animate-slide-up z-50">
              <div className="p-0">
                <div className="flex items-center justify-between">
                  {/* Brand Logo Identity */}
                  <div className="flex items-center justify-between">
                    <Link to="/" className="group flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-600/15 text-purple-400 shadow-[0_0_18px_rgba(147,51,234,0.25)] group-hover:bg-purple-600/25 transition-all duration-300">
                        <Gamepad2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-black tracking-tight text-white group-hover:text-purple-100 transition duration-300 hidden sm:block">
                          GameSphere
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Auth / User Panel */}
                  <div className="flex items-center gap-2 sm:gap-3 text-sm">
                    {token ? (
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Link
                          to="/lobby"
                          className="rounded-xl bg-purple-600 px-3 py-2 sm:px-5 sm:py-2.5 text-xs font-black text-white shadow-lg shadow-purple-600/25 transition duration-300 hover:bg-purple-500 sm:text-sm"
                        >
                          Enter Arena
                        </Link>
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          <Avatar
                            src={user?.avatarUrl || getAvatarUrl(user?.username || 'guest')}
                            alt="User avatar"
                            size="xs"
                            className="h-8 w-8 border border-indigo-500/30 rounded-full"
                          />
                          <button
                            onClick={handleLogout}
                            className="rounded-lg bg-slate-900 border border-white/5 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-rose-350 hover:bg-rose-950/20 hover:border-rose-500/30 transition flex items-center gap-1"
                          >
                            <LogOut className="h-3.5 w-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Logout</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 sm:gap-5">
                        <Link
                          to="/login"
                          className="text-xs font-bold text-slate-300 transition duration-300 hover:text-white sm:text-sm"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/register"
                          className="rounded-lg bg-purple-600 px-3 py-2 sm:px-5 sm:py-2.5 text-xs font-black text-white shadow-lg shadow-purple-600/25 transition duration-300 hover:bg-purple-500 sm:text-sm"
                        >
                          Get Started
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
          )}

          <main className={isAuthPage ? 'w-full flex-grow' : isHomePage ? 'w-full max-w-[1600px] mx-auto px-4 sm:px-12 lg:px-16 flex-grow flex flex-col animate-slide-up [animation-delay:0.1s]' : 'w-full max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex-grow flex animate-slide-up [animation-delay:0.1s]'}>
            {isAuthPage || isHomePage ? (
              <Outlet />
            ) : (
              <div className="w-full glass-panel rounded-[2.5rem] border border-white/5 p-4 sm:p-8 md:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Shared Footer Block for Guests or Homepage */}
      {!isDashboard && !isAuthPage && (
        <footer className="relative z-10 border-t border-white/5 bg-slate-950/60 py-6 text-center text-xs text-slate-500 backdrop-blur-md mt-10">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-12 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} GameSphere. Crafted for peak competitive gaming.</p>
            <div className="flex gap-5 font-semibold font-mono text-[10px] uppercase tracking-wider">
              <span className="text-slate-600 hover:text-slate-400 cursor-pointer transition">Privacy Policy</span>
              <span className="text-slate-600 hover:text-slate-400 cursor-pointer transition">Terms of Service</span>
              <span className="text-slate-600 hover:text-slate-400 cursor-pointer transition">Contact Support</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
