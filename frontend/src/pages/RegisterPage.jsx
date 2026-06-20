import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { register, googleLogin } from '../services/authService';
import { setAuthToken } from '../services/api';
import { avatarOptions, getAvatarUrl } from '../utils/avatar';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, Gamepad2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(avatarOptions[0].seed);
  const [error, setError] = useState(null);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const navigate = useNavigate();
   if (token) {
  return <Navigate to="/lobby" replace />;
}

  const avatarUrl = getAvatarUrl(selectedAvatarSeed);

  const handleGoogleSuccess = async (credentialResponse) => {
    dispatch(loginStart());
    try {
      const data = await googleLogin(credentialResponse.credential);
      localStorage.setItem('token', data.accessToken);
      setAuthToken(data.accessToken);
      dispatch(loginSuccess({ user: data.user, token: data.accessToken }));
      navigate('/lobby', { replace: true });
    } catch (err) {
      dispatch(loginFailure(err.message));
      setError(err.response?.data?.message || 'Google authentication failed');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    dispatch(loginStart());

    try {
      const avatarUrl = getAvatarUrl(selectedAvatarSeed);
      const data = await register({ username, email, password, avatarUrl });
      localStorage.setItem('token', data.accessToken);
      setAuthToken(data.accessToken);
      dispatch(loginSuccess({ user: data.user, token: data.accessToken }));
      navigate('/lobby', { replace: true });
    } catch (err) {
      dispatch(loginFailure(err.message));
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const abstractImageUrl = 'https://images.unsplash.com/photo-1659469377768-4f42f2f091c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=900';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07060f] text-neutral-50 animate-slide-up">
      <div className="relative mx-auto grid min-h-screen overflow-hidden lg:grid-cols-2">
        
        {/* Left Section - Brand and Marketing */}
        <section className="relative flex min-h-[46vh] items-center justify-center overflow-hidden px-6 py-14 lg:min-h-screen">
          <img
            src={abstractImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07060f]/90 via-[#0a0914]/95 to-[#07060f]" />
          
          {/* Ambient Glows */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.2),transparent_60%)]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[90px]" />
          <div className="absolute top-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[80px]" />

          {/* Floating Glassmorphic Background Elements */}
          <div className="absolute left-[12%] top-[18%] h-32 w-32 rotate-12 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-2xl animate-float" />
          <div className="absolute bottom-[16%] left-[15%] h-24 w-24 -rotate-12 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm shadow-xl animate-float [animation-delay:2s]" />

          <div className="relative z-10 max-w-sm text-center">
            {/* Game Controller Icon Wrapper */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 shadow-[0_0_40px_rgba(147,51,234,0.45)]">
              <Gamepad2 className="h-10 w-10 text-white" />
            </div>

            {/* Gradient Logo Text */}
            <h1 className="mt-8 bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">
              GameSphere
            </h1>
            
            {/* Subheading */}
            <p className="mt-3 text-lg font-bold tracking-wide text-cyan-400">Join the Arena</p>
            
            {/* Description */}
            <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-slate-400 font-medium">
              Real-time multiplayer board games. Challenge friends, climb the ranks, and rule the board.
            </p>

            {/* Statistics */}
            <div className="mt-10 flex items-center justify-center gap-8">
              <div>
                <p className="text-3xl font-black text-indigo-400">12K+</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Players</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-3xl font-black text-cyan-400">340</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Rooms</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Register Card Form */}
        <section className="relative flex items-center justify-center bg-[#07060f] px-6 py-12 lg:min-h-screen">
          <div className="w-full max-w-md rounded-[2.5rem] border border-white/5 bg-[#0e0c15]/80 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-10">
            
            {/* Pill Container Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-full border border-white/5 bg-white/[0.02] p-1.5">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-full py-3 text-xs font-bold text-slate-400 transition hover:text-slate-200"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Register
              </button>
            </div>

            {/* Credentials Registration Form */}
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="username-input">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors" />
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/5 bg-[#13111e]/60 pl-11 pr-4 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    placeholder="GameMaster"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="email-input">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors" />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/5 bg-[#13111e]/60 pl-11 pr-4 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="password-input">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/5 bg-[#13111e]/60 pl-11 pr-11 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Avatar Selector Wrapper */}
              <div className="rounded-[1.25rem] border border-white/5 bg-slate-950/40 p-4 shadow-inner mt-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pick an Avatar</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 font-medium font-sans">Select an identity seed.</p>
                  </div>
                  <div className="h-11 w-11 rounded-full border-2 border-indigo-500/30 bg-slate-900 p-0.5 shadow-md shadow-indigo-500/10">
                    <img src={avatarUrl} alt="Selected avatar preview" className="h-full w-full rounded-full object-cover" />
                  </div>
                </div>

                {/* Options Grid */}
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {avatarOptions.map((option) => {
                    const url = getAvatarUrl(option.seed);
                    const isSelected = selectedAvatarSeed === option.seed;
                    return (
                      <button
                        type="button"
                        key={option.seed}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedAvatarSeed(option.seed)}
                        className={`flex aspect-square items-center justify-center rounded-lg border p-0.5 transition duration-300 transform active:scale-95 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                            : 'border-white/5 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <img src={url} alt={`${option.label} option`} className="h-full w-full rounded-md object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-[11px] text-rose-300 font-semibold animate-pulse">
                  {error}
                </div>
              )}

              {/* Initialize Profile Button (White/Silver Gradient button) */}
              <button
                type="submit"
                className="relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-white bg-slate-100 text-slate-950 hover:brightness-105 font-bold shadow-[0_4px_20px_rgba(168,85,247,0.25)] transition duration-300 active:scale-[0.99] mt-2"
              >
                Initialize Profile
              </button>
            </form>

            {/* Separator */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500">or continue with</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="h-11 overflow-hidden rounded-xl border border-white/5 flex items-center justify-center bg-[#13111e]/40 hover:bg-white/[0.02]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed')}
                  theme="filled_black"
                  shape="square"
                  text="signup_with"
                  size="large"
                  width="180px"
                />
              </div>
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/5 bg-[#13111e]/40 px-5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.02] hover:border-white/10"
              >
                <svg className="h-4 w-4 text-[#5865F2]" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.89-.65,1.76-1.34,2.58-2.06a75.22,75.22,0,0,0,72.76,0c.82.72,1.69,1.41,2.58,2.06a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.06-18.83C129.87,48.24,124,25.43,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
                Discord
              </button>
            </div>

            <div className="mt-6 text-center text-xs font-semibold text-slate-500 lg:hidden">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition">
                Login here
              </Link>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
