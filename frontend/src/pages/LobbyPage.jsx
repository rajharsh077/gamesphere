import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { createLobby, getLobby, getPublicLobbies, leaveLobby as apiLeaveLobby, kickPlayer as apiKickPlayer, createQuickAILobby } from '../services/lobbyService';
import { getLobbyChat } from '../services/chatService';
import { getGameState } from '../services/gameService';
import {
  emitLobbyJoin,
  emitLobbyLeave,
  emitLobbyChat,
  emitLobbyReadyToggle,
  emitLobbyToggleHostPlay,
  emitGameStart,
  getSocket,
  initSocket,
  offLobbyChatMessage,
  offLobbyUpdate,
  offGameStarted,
  onLobbyChatMessage,
  onLobbyUpdate,
  onLobbyInvite,
  onGameStarted,
  onLobbyDeleted,
  offLobbyInvite,
  offLobbyDeleted,
  onFriendPresence,
  offFriendPresence,
  emitSubscribeFriends,
  onOnlineCount,
  offOnlineCount,
  emitGetOnlineCount,
  onLobbyKicked,
  offLobbyKicked
} from '../services/socketService';
import { getFriends, searchUsers, sendFriendRequest, acceptFriendRequest, inviteFriendToLobby } from '../services/friendService';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import FriendItem from '../components/FriendItem';
import LobbyFilters from '../components/LobbyFilters';
import CustomSelect from '../components/CustomSelect';
import { getAvatarUrl } from '../utils/avatar';
import { 
  Gamepad2, Plus, Users, MessageSquare, Send, Bell, 
  Play, Lock, Unlock, Search, UserCheck, ShieldCheck, Activity, X,
  Trophy, Zap, Star, Info, Crown, Shield, Target, User, Globe, Sparkles,
  Cpu, Bot, LogOut
} from 'lucide-react';

const getUserIdString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return (val._id || val.id || val).toString();
  }
  return String(val);
};

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-[2rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-6 ${className}`}>
    {children}
  </div>
);

const PanelHeader = ({ icon: Icon, title, meta, iconClassName = 'text-cyan-300' }) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
    <div className="flex min-w-0 items-center gap-2 text-white">
      {Icon ? <Icon className={`h-5 w-5 shrink-0 ${iconClassName}`} /> : <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse-glow" />}
      <h2 className="truncate text-base font-black uppercase tracking-[0.15em] sm:text-lg">{title}</h2>
    </div>
    {meta && (
      <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/75 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
        {meta}
      </span>
    )}
  </div>
);

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-8 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
    {children}
  </div>
);

const PasswordModal = ({ lobby, value, onChange, onCancel, onSubmit }) => {
  if (!lobby) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.7)] animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">Private Room</p>
            <h3 className="mt-2 text-xl font-black text-white">{lobby.name}</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
              Enter the room password to join this protected lobby.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-400 transition hover:text-white"
            aria-label="Close password dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</span>
            <input
              autoFocus
              type="password"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-rose-400/80 focus:ring-2 focus:ring-rose-500/20"
              placeholder="Enter lobby password"
              required
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-rose-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-rose-400"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const QuickAIModal = ({ value, onChange, onCancel, onSubmit }) => {
  const gamesList = [
    {
      value: 'tic-tac-toe',
      label: 'Tic Tac Toe',
      subtitle: '3x3 Arena',
      desc: 'Align 3 symbols in a row to win',
      icon: Target,
      colorClass: 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
      hoverClass: 'hover:border-cyan-500/40 hover:bg-cyan-500/5',
      activeGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)] border-cyan-500 bg-cyan-950/40'
    },
    {
      value: 'connect4',
      label: 'Connect 4',
      subtitle: '4-in-a-Row',
      desc: 'Connect 4 disks under gravity rules',
      icon: Zap,
      colorClass: 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)]',
      hoverClass: 'hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5',
      activeGlow: 'shadow-[0_0_20px_rgba(217,70,239,0.25)] border-fuchsia-500 bg-fuchsia-950/40'
    },
    {
      value: 'chess',
      label: 'Chess',
      subtitle: 'Grandmaster Bot',
      desc: 'Strategic battle of wits and capture',
      icon: Trophy,
      colorClass: 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
      hoverClass: 'hover:border-indigo-500/40 hover:bg-indigo-500/5',
      activeGlow: 'shadow-[0_0_20px_rgba(99,102,241,0.25)] border-indigo-500 bg-indigo-950/40'
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.7)] animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Play vs AI</p>
            <h3 className="mt-2 text-xl font-black text-white">Choose Arena</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
              Select the game type you want to play against AlphaSphere AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-400 transition hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Available Games
            </span>
            <div className="flex flex-col gap-3">
              {gamesList.map((g) => {
                const isSelected = value === g.value;
                const Icon = g.icon;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => onChange(g.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden ${
                      isSelected
                        ? `${g.activeGlow} border-2`
                        : 'border-white/10 bg-slate-900/55 text-slate-300 hover:text-white ' + g.hoverClass
                    }`}
                  >
                    {/* Background radial highlight for selected state */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none" />
                    )}
                    
                    {/* Icon block */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                      isSelected ? g.colorClass : 'bg-slate-950/50 border-white/5 text-slate-400'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Info block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black tracking-wide text-white">{g.label}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isSelected 
                            ? 'border-white/10 bg-white/5 text-slate-200' 
                            : 'border-white/5 bg-slate-950/40 text-slate-500'
                        }`}>
                          {g.subtitle}
                        </span>
                      </div>
                      <p className={`mt-1 text-[11px] leading-normal transition-colors duration-300 ${
                        isSelected ? 'text-slate-300 font-medium' : 'text-slate-400'
                      }`}>
                        {g.desc}
                      </p>
                    </div>

                    {/* Check indicator */}
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 self-center absolute right-4 top-4 animate-pulse-glow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition active:scale-[0.98] shadow-lg shadow-indigo-500/20"
            >
              Start Match
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};


const CreateLobbyForm = ({ onCreateLobby, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    gameType: 'tic-tac-toe',
    isPrivate: false,
    password: '',
    durationType: 'one-time',
    maxPlayers: 2
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onCreateLobby(form);
    if (success) {
      setForm({
        name: '',
        gameType: 'tic-tac-toe',
        isPrivate: false,
        password: '',
        durationType: 'one-time',
        maxPlayers: 2
      });
    }
  };

  return (
    <div className="relative rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-400 transition hover:text-white"
          aria-label="Close form"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-white">
          <Plus className="h-4 w-4 text-purple-400" />
          <h2 className="text-base font-black uppercase tracking-[0.15em]">Create Lobby</h2>
        </div>
        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Set up your own game room</p>
      </div>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="lobby-name">
            Lobby Name
          </label>
          <input
            id="lobby-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-xs text-white outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
            placeholder="My epic game..."
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="game-type">
              Game Type
            </label>
            <CustomSelect
              id="game-type"
              value={form.gameType}
              onChange={(val) => setForm({ ...form, gameType: val })}
              options={[
                { value: 'tic-tac-toe', label: 'Tic Tac Toe', icon: Star },
                { value: 'connect4', label: 'Connect 4', icon: Zap },
                { value: 'chess', label: 'Chess', icon: Trophy }
              ]}
              icon={Gamepad2}
              className="border-white/10 bg-slate-950/70"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="duration-type">
              Lobby Type
            </label>
            <CustomSelect
              id="duration-type"
              value={form.durationType}
              onChange={(val) => setForm({ ...form, durationType: val })}
              options={[
                { value: 'one-time', label: 'One-Time', icon: Gamepad2 },
                { value: 'one-hour', label: '1-Hour', icon: Activity }
              ]}
              icon={Activity}
              className="border-white/10 bg-slate-950/70"
            />
          </div>
        </div>

        {/* Max Players Slider */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Max Players</span>
            <span className="text-purple-400 text-sm font-extrabold">{form.maxPlayers}</span>
          </div>
          <input
            type="range"
            min="2"
            max="4"
            value={form.maxPlayers}
            onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
            className="w-full accent-purple-500 h-1.5 bg-slate-900 border border-white/5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3 pt-4 px-1.5">
          <input
            type="checkbox"
            id="private-check"
            checked={form.isPrivate}
            onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
            className="h-4 w-4 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30"
          />
          <label htmlFor="private-check" className="text-xs font-bold uppercase tracking-wider text-slate-300 select-none cursor-pointer">
            Private Password Room
          </label>
        </div>

        {form.isPrivate && (
          <div className="space-y-2 animate-fadeIn">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="lobby-pass">
              Room Password
            </label>
            <input
              id="lobby-pass"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-xs text-white outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
              placeholder="Enter password"
              required
            />
          </div>
        )}

        <button className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition duration-300 active:scale-[0.98] flex items-center justify-center gap-2">
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Create Game</span>
        </button>
      </form>
    </div>
  );
};

const formatLastActive = (dateString) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'Offline';

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getStrategyTip = (gameType) => {
  switch (gameType) {
    case 'chess':
      return 'Control the center and keep your pieces active.';
    case 'connect4':
      return 'Control the middle column to maximize winning paths.';
    case 'tic-tac-toe':
      return 'Focus on the center square first, then the corners.';
    default:
      return 'Play strategically and anticipate your opponent\'s moves.';
  }
};

const isOnlyEmojis = (msg) => {
  if (!msg) return false;
  const clean = msg.replace(/\s+/g, '');
  if (!clean) return false;
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}\u{2194}\u{2195}\u{25C0}\u{25B6}]+$/u;
  return emojiRegex.test(clean);
};

const LobbyPage = () => {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [lobbies, setLobbies] = useState([]);
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatContainerRef = useRef(null);
  const isInitialLoadRef = useRef(false);
  const activityFeedRef = useRef(null);

  const checkIsAtBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return true;
    const threshold = 15;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const handleChatScroll = () => {
    if (checkIsAtBottom()) {
      setUnreadCount(0);
    }
  };

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (chatMessages.length === 0) return;
    // Always auto-scroll to bottom to show new messages instantly
    setTimeout(scrollToBottom, 50);
  }, [chatMessages]);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [startedMatch, setStartedMatch] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [activityLog, setActivityLog] = useState(['The arena awaits challengers.', 'Searching for opponents...']);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allySearchQuery, setAllySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteNotification, setInviteNotification] = useState(null);
  const [pendingInviteIds, setPendingInviteIds] = useState([]);
  const [friendStatusMessage, setFriendStatusMessage] = useState('');
  const [privateJoinLobby, setPrivateJoinLobby] = useState(null);
  const [privateJoinPassword, setPrivateJoinPassword] = useState('');
  const [showQuickAIModal, setShowQuickAIModal] = useState(false);
  const [quickAIGameType, setQuickAIGameType] = useState('tic-tac-toe');
  const [search, setSearch] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    if (activityFeedRef.current) {
      activityFeedRef.current.scrollTop = activityFeedRef.current.scrollHeight;
    }
  }, [activityLog]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOnlyMyLobbies, setShowOnlyMyLobbies] = useState(false);
  const [filters, setFilters] = useState({ gameType: 'all', privacy: 'all', minPlayers: 0 });
  const gameTypes = Array.from(new Set(lobbies.map((l) => l.gameType))).filter(Boolean);
  const onlineFriends = friends.filter((friend) => friend.online).length;
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = !!a.online;
      const bOnline = !!b.online;
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return 0;
    });
  }, [friends]);
  const friendIdsKey = useMemo(
    () => friends.map((friend) => friend._id || friend.id).filter(Boolean).sort().join(','),
    [friends]
  );
  const filteredLobbies = lobbies.filter((l) => {
    if (!l) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.gameType !== 'all' && l.gameType !== filters.gameType) return false;
    if (filters.privacy !== 'all') {
      if (filters.privacy === 'private' && !l.isPrivate) return false;
      if (filters.privacy === 'public' && l.isPrivate) return false;
    }
    if ((l.maxPlayers || 2) < (filters.minPlayers || 0)) return false;
    return true;
  });

  const myLobbies = useMemo(() => {
    const uId = getUserIdString(user);
    return filteredLobbies.filter((l) => {
      if (!l) return false;
      const isHost = getUserIdString(l.host) === uId;
      const isParticipant = l.players?.some((player) => getUserIdString(player) === uId);
      return isHost || isParticipant;
    });
  }, [filteredLobbies, user]);

  const exploreLobbies = useMemo(() => {
    const uId = getUserIdString(user);
    return filteredLobbies.filter((l) => {
      if (!l) return false;
      const isHost = getUserIdString(l.host) === uId;
      const isParticipant = l.players?.some((player) => getUserIdString(player) === uId);
      return !(isHost || isParticipant);
    });
  }, [filteredLobbies, user]);

  const lobbiesToRender = useMemo(() => {
    return showOnlyMyLobbies ? myLobbies : filteredLobbies.filter((l) => l.status === 'waiting');
  }, [showOnlyMyLobbies, myLobbies, filteredLobbies]);

  const renderLobbyCard = (lobby) => {
    const isChess = lobby.gameType === 'chess';
    const isConnect4 = lobby.gameType === 'connect4';

    const uId = getUserIdString(user);
    const isHost = getUserIdString(lobby.host) === uId;
    const isParticipant = lobby.players?.some((player) => getUserIdString(player) === uId);
    const isJoined = isHost || isParticipant;

    const itemTheme = (() => {
      const defaultBtn = 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20';
      if (isChess) {
        return {
          name: 'Chess',
          icon: Crown,
          glowClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          borderHoverClass: 'hover:border-amber-500/30',
          titleHoverClass: 'group-hover:text-amber-400',
          cardBgGradient: isJoined
            ? 'bg-gradient-to-br from-amber-500/10 via-indigo-950/20 to-slate-950/45 border-indigo-500/20'
            : 'bg-gradient-to-br from-amber-500/5 via-slate-950/45 to-slate-950/45 hover:from-amber-500/10 hover:border-amber-500/20',
          btnGradient: defaultBtn,
        };
      } else if (isConnect4) {
        return {
          name: 'Connect 4',
          icon: Zap,
          glowClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          borderHoverClass: 'hover:border-purple-500/30',
          titleHoverClass: 'group-hover:text-purple-400',
          cardBgGradient: isJoined
            ? 'bg-gradient-to-br from-purple-500/10 via-indigo-950/20 to-slate-950/45 border-indigo-500/20'
            : 'bg-gradient-to-br from-purple-500/5 via-slate-950/45 to-slate-950/45 hover:from-purple-500/10 hover:border-purple-500/20',
          btnGradient: defaultBtn,
        };
      } else {
        return {
          name: 'Tic Tac Toe',
          icon: Target,
          glowClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
          borderHoverClass: 'hover:border-pink-500/30',
          titleHoverClass: 'group-hover:text-pink-400',
          cardBgGradient: isJoined
            ? 'bg-gradient-to-br from-pink-500/10 via-indigo-950/20 to-slate-950/45 border-indigo-500/20'
            : 'bg-gradient-to-br from-pink-500/5 via-slate-950/45 to-slate-950/45 hover:from-pink-500/10 hover:border-pink-500/20',
          btnGradient: defaultBtn,
        };
      }
    })();

    const isWaiting = (lobby.players?.length || 0) < (lobby.maxPlayers || 2);
    const statusText = isWaiting ? 'Waiting' : 'In Progress';
    const statusBadgeClass = isWaiting 
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-pulse-glow' 
      : 'border-orange-500/30 bg-orange-500/10 text-orange-400';

    return (
      <div 
        key={lobby._id} 
        className={`group rounded-[1.8rem] border ${isJoined ? '' : 'border-white/5'} ${itemTheme.cardBgGradient} ${itemTheme.borderHoverClass} glass-card-hover p-4 sm:p-5 transition-all duration-300 shadow-md cursor-pointer`}
        onClick={() => {
          selectLobby(lobby._id);
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Game Mode Icon */}
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner transition-transform group-hover:scale-105 duration-300 ${itemTheme.glowClass}`}>
              <itemTheme.icon className="h-6 w-6" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-black text-white ${itemTheme.titleHoverClass} transition duration-300 truncate leading-none`}>
                  {lobby.name}
                </h3>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${itemTheme.glowClass}`}>
                  {itemTheme.name}
                </span>

                {!isHost && isParticipant && (
                  <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] text-indigo-400 flex items-center gap-1 font-black uppercase tracking-wider">
                    <UserCheck className="h-2.5 w-2.5" />
                    <span>Joined</span>
                  </span>
                )}
                {lobby.isPrivate && (
                  <span className="bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] text-rose-400 flex items-center gap-1 font-black uppercase tracking-wider">
                    <Lock className="h-2.5 w-2.5" />
                    <span>Private</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-400 leading-none">
                Hosted by <span className="text-slate-200">{getPlayerDisplayName(lobby.host)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 flex-wrap sm:flex-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Status Badge */}
            <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${statusBadgeClass}`}>
              {statusText}
            </span>

            {/* Player Count */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold">{lobby.players?.length ?? 0}/{lobby.maxPlayers || 2}</span>
            </div>

            {/* Button CTA */}
            {isJoined ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectLobby(lobby._id);
                }}
                className="rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-wider transition duration-350 active:scale-[0.97] bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/10"
              >
                Enter Room
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWaiting) {
                    handleJoin(lobby);
                  }
                }}
                disabled={!isWaiting}
                className={`rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-wider transition duration-350 active:scale-[0.97] ${
                  isWaiting
                    ? itemTheme.btnGradient
                    : 'bg-slate-900 border border-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };


  const loadLobbies = async () => {
    console.log('[LobbyPage] loadLobbies called');
    setLoadingLobbies(true);
    try {
      const data = await getPublicLobbies();
      console.log('[LobbyPage] loadLobbies success:', data);
      setLobbies(data.lobbies || []);
    } catch (error) {
      console.error('[LobbyPage] loadLobbies error:', error);
      setStatusMessage('Unable to load lobbies.');
    } finally {
      setLoadingLobbies(false);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await getFriends();
      setFriends((prevFriends) => {
        const newFriends = data.friends || [];
        return newFriends.map((nf) => {
          const existing = prevFriends.find((ef) => (ef._id || ef.id || '').toString() === (nf._id || nf.id || '').toString());
          if (existing) {
            return {
              ...nf,
              online: existing.online,
              currentLobbyId: existing.currentLobbyId,
              lastActive: existing.lastActive
            };
          }
          return nf;
        });
      });
      setIncomingRequests(data.pendingRequests.incoming || []);
      setOutgoingRequests(data.pendingRequests.outgoing || []);
    } catch (error) {
      setFriendStatusMessage('Unable to load friends.');
    }
  };

  const setActiveLobbyId = (lobbyId) => {
    if (lobbyId) {
      localStorage.setItem('activeLobbyId', lobbyId);
    } else {
      localStorage.removeItem('activeLobbyId');
    }
  };

  const setActiveMatchId = (matchId) => {
    if (matchId) {
      localStorage.setItem('activeMatchId', matchId);
    } else {
      localStorage.removeItem('activeMatchId');
    }
  };

  const isUserInLobby = (lobby) => {
    if (!lobby) return false;
    const uId = getUserIdString(user);
    const isHost = getUserIdString(lobby.host) === uId;
    const isPlayer = lobby.players?.some((player) => getUserIdString(player) === uId);
    return isHost || isPlayer;
  };

  const getFriendGameElo = (friend, gameType) => {
    const pIdStr = (friend._id || friend.id)?.toString();
    if (!pIdStr) return 1200;
    
    let gameElo = 1200;
    const targetGameType = (gameType || '').toLowerCase();
    
    if (friend.matchHistory) {
      for (const m of friend.matchHistory) {
        const mGameType = (m.gameType || '').toLowerCase();
        const isMatchGame = mGameType === targetGameType || 
          (targetGameType.includes('tic-tac-toe') && mGameType.includes('tic-tac-toe'));
          
        if (isMatchGame && m.players) {
          const playerEntry = m.players.find(pe => {
            if (!pe.userId) return false;
            const peUserIdStr = pe.userId._id ? pe.userId._id.toString() : pe.userId.toString();
            return peUserIdStr === pIdStr;
          });
          if (playerEntry) {
            gameElo = Math.max(0, gameElo + (playerEntry.eloChange || 0));
          }
        }
      }
    }
    return gameElo;
  };

  const getPlayerDisplayName = (player) => {
    if (!player) return 'Unknown';
    if (typeof player === 'string') return 'Guest';
    return player.username || player.name || player._id || 'Guest';
  };

  const getLobbyWaitingText = (lobby) => {
    if (!lobby) return 'No lobby selected';
    const currentCount = lobby.players?.length || 0;
    const maxCount = lobby.maxPlayers || 2;
    const waitingCount = Math.max(0, maxCount - currentCount);
    if (waitingCount <= 0) {
      return 'Ready to start';
    }
    return waitingCount === 1
      ? 'Waiting for 1 more player'
      : `Waiting for ${waitingCount} more players`;
  };

  const refreshLobbyDetails = async (lobbyId) => {
    try {
      const { lobby, activeMatchId } = await getLobby(lobbyId);
      if (lobby) {
        setSelectedLobby(lobby);
      }
      if (activeMatchId) {
        try {
          const { gameState } = await getGameState(activeMatchId);
          if (gameState && gameState.lobbyId === lobbyId) {
            setStartedMatch(gameState);
          } else {
            setStartedMatch(null);
          }
        } catch (e) {
          setStartedMatch(null);
        }
      } else {
        setStartedMatch(null);
      }
      return lobby;
    } catch (error) {
      setStatusMessage('Unable to load lobby details.');
      return null;
    }
  };

  const selectLobby = async (lobbyId) => {
    const lobby = await refreshLobbyDetails(lobbyId);
    if (lobby && isUserInLobby(lobby)) {
      emitLobbyJoin({ lobbyId, password: '' }, (response) => {
        if (response.status === 'ok') {
          loadLobbyChat(lobbyId);
          setActiveLobbyId(lobbyId);
        } else {
          setStatusMessage(response.message || 'Failed to connect to lobby socket');
        }
      });
    }
  };

  const restoreActiveLobby = async () => {
    if (!token || !user) return;

    const storedLobbyId = localStorage.getItem('activeLobbyId');
    if (!storedLobbyId) return;

    try {
      const { lobby } = await getLobby(storedLobbyId);
      if (!lobby || lobby.status === 'completed' || !isUserInLobby(lobby)) {
        setActiveLobbyId(null);
        setActiveMatchId(null);
        return;
      }

      if (!getSocket()) {
        initSocket(token);
      }

      emitLobbyJoin({ lobbyId: storedLobbyId, password: '' }, async (response) => {
        if (response.status === 'ok') {
          setSelectedLobby(response.lobby);
          loadLobbyChat(response.lobby._id);
          setActiveLobbyId(response.lobby._id);
          setStatusMessage(`Reconnected to lobby ${response.lobby.name}`);

          const storedMatchId = localStorage.getItem('activeMatchId');
          if (storedMatchId) {
            try {
              const { gameState } = await getGameState(storedMatchId);
              if (gameState && gameState.lobbyId === response.lobby._id) {
                setStartedMatch(gameState);
              } else {
                setActiveMatchId(null);
              }
            } catch (error) {
              setActiveMatchId(null);
            }
          } else {
            setStartedMatch(null);
          }
        } else {
          setActiveLobbyId(null);
          setActiveMatchId(null);
        }
      });
    } catch (error) {
      setActiveLobbyId(null);
      setActiveMatchId(null);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const data = await searchUsers(searchQuery.trim());
      const uId = getUserIdString(user);
      const results = (data.users || []).filter((result) => getUserIdString(result) !== uId);
      setSearchResults(results);
    } catch (error) {
      setFriendStatusMessage('Unable to search players.');
    }
  };

  const handleSendFriendRequest = async (targetUserId) => {
    try {
      await sendFriendRequest(targetUserId);
      setFriendStatusMessage('Friend request sent.');
      loadFriends();
    } catch (error) {
      setFriendStatusMessage(error.response?.data?.message || 'Unable to send friend request.');
    }
  };

  const handleAcceptFriendRequest = async (requestUserId) => {
    try {
      await acceptFriendRequest(requestUserId);
      setFriendStatusMessage('Friend request accepted.');
      loadFriends();
    } catch (error) {
      setFriendStatusMessage(error.response?.data?.message || 'Unable to accept friend request.');
    }
  };

  const handleInviteFriend = async (friendId) => {
    if (!selectedLobby) {
      setFriendStatusMessage('Join a lobby before inviting friends.');
      return;
    }

    if (pendingInviteIds.includes(friendId)) {
      setFriendStatusMessage('Invite already in progress for this friend.');
      return;
    }

    const currentPlayers = selectedLobby.players?.length || 0;
    const maxPlayers = selectedLobby.maxPlayers || 2;
    if (currentPlayers >= maxPlayers) {
      setFriendStatusMessage('Lobby is already full.');
      return;
    }

    const isAlreadyInvited = selectedLobby.invitedUsers?.some((invitee) => {
      return getUserIdString(invitee) === friendId;
    });

    setPendingInviteIds((prev) => [...prev, friendId]);

    try {
      const response = await inviteFriendToLobby(selectedLobby._id, friendId);
      await refreshLobbyDetails(selectedLobby._id);
      setFriendStatusMessage(response.reinvited ? 'Invitation resent.' : 'Friend invited to lobby.');
    } catch (error) {
      setFriendStatusMessage(error.response?.data?.message || 'Unable to invite friend to lobby.');
    } finally {
      setPendingInviteIds((prev) => prev.filter((id) => id !== friendId));
    }
  };

  const handleJoinInvitedLobby = async () => {
    if (!inviteNotification) return;

    emitLobbyJoin({ lobbyId: inviteNotification._id, password: '' }, (response) => {
      if (response.status === 'ok') {
        setSelectedLobby(response.lobby);
        setInviteNotification(null);
        setActiveMatchId(null);
        loadLobbyChat(response.lobby._id);
        setActiveLobbyId(response.lobby._id);
        setStatusMessage(`Joined invited lobby ${response.lobby.name}`);
      } else {
        setStatusMessage(response.message);
      }
    });
  };

  useEffect(() => {
    console.log('[LobbyPage] token useEffect triggered, token exists:', !!token);
    if (!token) return; // don't load lobbies if not authenticated
    loadLobbies();
    loadFriends();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const sock = getSocket() || initSocket(token);
    if (!sock) return;

    const handlePresence = ({ userId, online, currentLobbyId, lastActive }) => {
      console.log('[LobbyPage Socket] friend:presence received:', { userId, online, currentLobbyId, lastActive });
      setFriends((prev) => prev.map((f) => {
        const fId = (f._id || f.id || '').toString();
        const targetId = (userId || '').toString();
        if (fId === targetId) {
          console.log(`[LobbyPage Socket] Updating online status of friend ${f.username} to ${online}`);
          return { ...f, online, currentLobbyId, lastActive };
        }
        return f;
      }));
    };

    const handleGlobalPresence = ({ userId, status }) => {
      console.log('[LobbyPage Socket] presence:update received:', { userId, status });
      setFriends((prev) => prev.map((f) => {
        const fId = (f._id || f.id || '').toString();
        const targetId = (userId || '').toString();
        if (fId === targetId) {
          console.log(`[LobbyPage Socket] Updating online status of friend ${f.username} to ${status === 'online'}`);
          return { ...f, online: status === 'online' };
        }
        return f;
      }));
    };

    onFriendPresence(handlePresence);
    sock.on('presence:update', handleGlobalPresence);

    const subscribe = () => {
      const friendIds = friends.map((f) => f._id || f.id).filter(Boolean);
      console.log('[LobbyPage Socket] Emitting friends:subscribe with IDs:', friendIds);
      if (friendIds.length > 0) {
        emitSubscribeFriends({ friendIds });
      }
    };

    sock.on('connect', subscribe);
    subscribe();

    return () => {
      console.log('[LobbyPage Socket] Cleaning up socket listeners');
      offFriendPresence(handlePresence);
      sock.off('presence:update', handleGlobalPresence);
      sock.off('connect', subscribe);
    };
  }, [token, friendIdsKey]);

  useEffect(() => {
    if (!token) return;
    initSocket(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const sock = getSocket();
    if (!sock) return;

    const handleOnlineCount = ({ count }) => {
      setOnlineCount(count);
    };

    onOnlineCount(handleOnlineCount);

    emitGetOnlineCount((response) => {
      if (response && typeof response.count === 'number') {
        setOnlineCount(response.count);
      }
    });

    return () => {
      offOnlineCount(handleOnlineCount);
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    restoreActiveLobby();
  }, [token, user]);

  useEffect(() => {
    if (!selectedLobby) return;
    setActiveLobbyId(selectedLobby._id);
  }, [selectedLobby]);

  useEffect(() => {
    const handleLobbyUpdate = ({ lobby }) => {
      setLobbies((prev) => prev.map((item) => (item._id === lobby._id ? lobby : item)));
      if (selectedLobby?._id === lobby._id) {
        // Compare players list for joins/leaves/ready status changes to generate activity logs
        if (selectedLobby.players && lobby.players) {
          const oldPlayers = selectedLobby.players;
          const newPlayers = lobby.players;
          const oldIds = oldPlayers.map((p) => getUserIdString(p));
          const newIds = newPlayers.map((p) => getUserIdString(p));

          // 1. Joins
          newPlayers.forEach((p) => {
            const pId = getUserIdString(p);
            if (!oldIds.includes(pId)) {
              setActivityLog((prev) => [...prev.slice(-19), `${getPlayerDisplayName(p)} joined the lobby`]);
            }
          });

          // 2. Leaves
          oldPlayers.forEach((p) => {
            const pId = getUserIdString(p);
            if (!newIds.includes(pId)) {
              setActivityLog((prev) => [...prev.slice(-19), `${getPlayerDisplayName(p)} left the lobby`]);
            }
          });

          // 3. Ready status changes
          newPlayers.forEach((p) => {
            const pId = getUserIdString(p);
            const oldP = oldPlayers.find((op) => getUserIdString(op) === pId);
            
            const isReadyNow = pId === getUserIdString(lobby.host) || (lobby.readyPlayers && lobby.readyPlayers.some((rp) => getUserIdString(rp) === pId));
            const wasReadyBefore = oldP && (pId === getUserIdString(selectedLobby.host) || (selectedLobby.readyPlayers && selectedLobby.readyPlayers.some((rp) => getUserIdString(rp) === pId)));
            
            if (isReadyNow && !wasReadyBefore) {
              setActivityLog((prev) => [...prev.slice(-19), `${getPlayerDisplayName(p)} became ready`]);
            } else if (!isReadyNow && wasReadyBefore) {
              setActivityLog((prev) => [...prev.slice(-19), `${getPlayerDisplayName(p)} is no longer ready`]);
            }
          });
        }
        setSelectedLobby(lobby);
      }
    };

    const handleLobbyChatMessage = ({ message: chat }) => {
      if (selectedLobby && chat.targetId === selectedLobby._id) {
        setChatMessages((prev) => [...prev, chat]);
      }
    };

    const handleGameStarted = ({ match }) => {
      if (!selectedLobby || match.lobbyId !== selectedLobby._id) {
        return;
      }
      setStartedMatch(match);
      setStatusMessage('Match started — ready to play!');
    };

    onLobbyUpdate(handleLobbyUpdate);
    onLobbyChatMessage(handleLobbyChatMessage);
    const handleLobbyInvite = ({ lobby }) => {
      setInviteNotification(lobby);
      setStatusMessage(`You were invited to lobby ${lobby.name}`);
    };
    const handleLobbyDeleted = ({ lobbyId }) => {
      setLobbies((prev) => prev.filter((l) => l._id !== lobbyId));
      if (selectedLobby?._id === lobbyId) {
        setSelectedLobby(null);
        setChatMessages([]);
        setActiveLobbyId(null);
        setStartedMatch(null);
      }
      setStatusMessage('A lobby was removed');
    };
    const handleLobbyKicked = ({ lobbyId }) => {
      if (selectedLobby && selectedLobby._id === lobbyId) {
        setSelectedLobby(null);
        setChatMessages([]);
        setActiveLobbyId(null);
        setStartedMatch(null);
        loadLobbies();
        setStatusMessage('You have been kicked from the lobby by the host.');
      }
    };

    onLobbyInvite(handleLobbyInvite);
    onLobbyDeleted(handleLobbyDeleted);
    onGameStarted(handleGameStarted);
    onLobbyKicked(handleLobbyKicked);

    return () => {
      offLobbyUpdate(handleLobbyUpdate);
      offLobbyChatMessage(handleLobbyChatMessage);
      offLobbyInvite(handleLobbyInvite);
      offLobbyDeleted(handleLobbyDeleted);
      offGameStarted(handleGameStarted);
      offLobbyKicked(handleLobbyKicked);
    };
  }, [selectedLobby]);

  const loadLobbyChat = async (lobbyId) => {
    try {
      const data = await getLobbyChat(lobbyId);
      isInitialLoadRef.current = true;
      setChatMessages(data.messages || []);
      setTimeout(() => {
        scrollToBottom();
        isInitialLoadRef.current = false;
      }, 100);
    } catch (error) {
      setStatusMessage('Unable to load chat.');
    }
  };

  const handleCreate = async (formData) => {
    try {
      const response = await createLobby(formData);
      const newLobby = response?.lobby || response;
      setStatusMessage('Lobby created successfully.');
      setShowCreateForm(false);
      loadLobbies();
      if (newLobby && newLobby._id) {
        selectLobby(newLobby._id);
      }
      return true;
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Failed to create lobby.');
      return false;
    }
  };

  const handleQuickAISubmit = async (e) => {
    e.preventDefault();
    try {
      setStatusMessage('Creating AI arena...');
      setShowQuickAIModal(false);
      const response = await createQuickAILobby(quickAIGameType);
      if (response && response.match) {
        setStartedMatch(response.match);
        setActiveMatchId(response.match._id);
        navigate(`/game/${response.match._id}`);
      } else {
        setStatusMessage('Failed to start AI match.');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(err.response?.data?.message || 'Failed to start AI match.');
    }
  };

  const handleQuickAICancel = () => {
    setShowQuickAIModal(false);
  };

  const handleQuickMatch = () => {
    setShowQuickAIModal(true);
    setQuickAIGameType('tic-tac-toe');
  };

  const handlePrivateJoinSubmit = (e) => {
    e.preventDefault();
    if (!privateJoinLobby) return;

    emitLobbyJoin(
      { lobbyId: privateJoinLobby._id, password: privateJoinPassword },
      async (response) => {
        if (response.status === 'ok') {
          await refreshLobbyDetails(response.lobby._id);
          setStartedMatch(null);
          setActiveMatchId(null);
          loadLobbyChat(response.lobby._id);
          setActiveLobbyId(response.lobby._id);
          setStatusMessage(`Joined lobby ${response.lobby.name}`);
          setPrivateJoinLobby(null);
          setPrivateJoinPassword('');
        } else {
          setStatusMessage(response.message);
        }
      }
    );
  };

  const handlePrivateJoinCancel = () => {
    setPrivateJoinLobby(null);
    setPrivateJoinPassword('');
  };

  const handleJoin = (lobby) => {
    if (lobby.isPrivate) {
      setPrivateJoinLobby(lobby);
      setPrivateJoinPassword('');
      return;
    }

    emitLobbyJoin(
      { lobbyId: lobby._id, password: '' },
      async (response) => {
        if (response.status === 'ok') {
          await refreshLobbyDetails(response.lobby._id);
          setStartedMatch(null);
          setActiveMatchId(null);
          loadLobbyChat(response.lobby._id);
          setActiveLobbyId(response.lobby._id);
          setStatusMessage(`Joined lobby ${response.lobby.name}`);
        } else {
          setStatusMessage(response.message);
        }
      }
    );
  };

  const handleToggleReady = () => {
    if (!selectedLobby) return;
    emitLobbyReadyToggle({ lobbyId: selectedLobby._id }, (response) => {
      if (response.status === 'ok') {
        setSelectedLobby(response.lobby);
      } else {
        setStatusMessage(response.message || 'Unable to update ready status.');
      }
    });
  };

  const handleToggleHostPlay = () => {
    if (!selectedLobby) return;
    emitLobbyToggleHostPlay({ lobbyId: selectedLobby._id }, (response) => {
      if (response.status === 'ok') {
        setSelectedLobby(response.lobby);
      } else {
        setStatusMessage(response.message || 'Unable to toggle role.');
      }
    });
  };

  const handleStartGame = () => {
    if (!selectedLobby) return;
    emitGameStart(
      { gameType: selectedLobby.gameType, lobbyId: selectedLobby._id },
      (response) => {
        if (response.status === 'ok') {
          setStartedMatch(response.match);
          setActiveMatchId(response.match._id);
          navigate(`/game/${response.match._id}`);
        } else {
          setStatusMessage(response.message);
        }
      }
    );
  };



  const handleLeave = async () => {
    console.log('handleLeave invoked', { selectedLobby });
    if (!selectedLobby) return console.log('no selectedLobby');
    setStatusMessage('Leaving lobby...');

    try {
      const sock = getSocket();
      if (sock) {
        console.log('socket present, emitting lobby:leave');
        emitLobbyLeave({ lobbyId: selectedLobby._id }, (response) => {
          console.log('emitLobbyLeave response', response);
          try {
            if (response.status === 'ok') {
              setStatusMessage('Left lobby.');
              setSelectedLobby(null);
              setChatMessages([]);
              setActiveLobbyId(null);
              setStartedMatch(null);
              loadLobbies();
            } else {
              setStatusMessage(response.message || 'Unable to leave lobby.');
            }
          } catch (err) {
            console.error('error handling emit response', err);
          }
        });
      } else {
        console.log('no socket, calling API leave');
        await apiLeaveLobby(selectedLobby._id);
        setStatusMessage('Left lobby.');
        setSelectedLobby(null);
        setChatMessages([]);
        setActiveLobbyId(null);
        setStartedMatch(null);
        loadLobbies();
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to leave lobby.');
    }
  };

  const handleKickPlayer = async (targetUserId) => {
    if (!selectedLobby) return;
    try {
      await apiKickPlayer(selectedLobby._id, targetUserId);
      setStatusMessage('Player kicked successfully.');
      await refreshLobbyDetails(selectedLobby._id);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to kick player.');
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!selectedLobby || !chatInput.trim()) return;

    emitLobbyChat(
      { lobbyId: selectedLobby._id, message: chatInput.trim() },
      (response) => {
        if (response.status === 'ok') {
          setChatInput('');
        } else {
          setStatusMessage(response.message);
        }
      }
    );
  };

  const handleScrollToCreate = () => {
    setShowCreateForm((prev) => !prev);
    if (!showCreateForm) {
      setTimeout(() => {
        const element = document.getElementById('create-lobby-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = element.querySelector('input');
          if (input) {
            input.focus();
          }
        }
      }, 100);
    }
  };

  if (!token) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 font-semibold">Please log in to access lobbies.</p>
        </div>
      </section>
    );
  }

  if (selectedLobby) {
    const lobby = selectedLobby;
    const isChess = lobby.gameType === 'chess';
    const isConnect4 = lobby.gameType === 'connect4';

    const uId = getUserIdString(user);
    const isHost = getUserIdString(lobby.host) === uId;
    const isHostPlaying = lobby.players?.some((p) => getUserIdString(p) === getUserIdString(lobby.host));
    const otherPlayers = lobby.players?.filter((p) => {
      return getUserIdString(p) !== getUserIdString(lobby.host);
    }) || [];

    const allOtherPlayersReady = otherPlayers.length > 0 && otherPlayers.every((p) => {
      const pId = getUserIdString(p);
      return lobby.readyPlayers?.some((rp) => {
        return getUserIdString(rp) === pId;
      });
    });

    const amIReady = lobby.readyPlayers?.some((rp) => {
      return getUserIdString(rp) === uId;
    });

    const getPlayerRank = (rating) => {
      const elo = rating || 1200;
      if (elo >= 1500) {
        return {
          name: 'Grandmaster',
          color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
          symbol: '👑'
        };
      } else if (elo >= 1400) {
        return {
          name: 'Diamond Tier',
          color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
          symbol: '💎'
        };
      } else if (elo >= 1300) {
        return {
          name: 'Challenger',
          color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10 shadow-[0_0_12px_rgba(217,70,239,0.15)]',
          symbol: '⚔️'
        };
      } else {
        return {
          name: 'Rookie',
          color: 'text-slate-400 border-white/10 bg-slate-800/10',
          symbol: '🛡️'
        };
      }
    };

    const isWaiting = (lobby.players?.length || 0) < (lobby.maxPlayers || 2);

    const theme = (() => {
      if (isChess) {
        return {
          name: 'Chess',
          color: 'amber',
          textClass: 'text-amber-400',
          borderClass: 'border-amber-500/20',
          borderHoverClass: 'hover:border-amber-500/30',
          bgClass: 'bg-amber-500/5',
          glowClass: 'glow-amber',
          badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          gradient: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-500/10',
          icon: Crown,
          blobColor: 'bg-amber-500/10',
        };
      } else if (isConnect4) {
        return {
          name: 'Connect 4',
          color: 'purple',
          textClass: 'text-purple-400',
          borderClass: 'border-purple-500/20',
          borderHoverClass: 'hover:border-purple-500/30',
          bgClass: 'bg-purple-500/5',
          glowClass: 'glow-purple',
          badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          gradient: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/10',
          icon: Zap,
          blobColor: 'bg-purple-500/10',
        };
      } else {
        return {
          name: 'Tic Tac Toe',
          color: 'pink',
          textClass: 'text-pink-400',
          borderClass: 'border-pink-500/20',
          borderHoverClass: 'hover:border-pink-500/30',
          bgClass: 'bg-pink-500/5',
          glowClass: 'glow-rose',
          badgeBg: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
          gradient: 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-500/10',
          icon: Target,
          blobColor: 'bg-pink-500/10',
        };
      }
    })();

    const readyShadowClass = (() => {
      if (isChess) return 'shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)]';
      if (isConnect4) return 'shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:shadow-[0_0_30px_rgba(168,85,247,0.55)]';
      return 'shadow-[0_0_20px_rgba(236,72,153,0.35)] hover:shadow-[0_0_30px_rgba(236,72,153,0.55)]';
    })();

    const isLobbyWaitingText = isWaiting ? 'Waiting' : 'In Progress';
    const statusBadgeClass = isWaiting 
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-pulse-glow' 
      : 'border-orange-500/30 bg-orange-500/10 text-orange-400';

    const bannerData = (() => {
      if (isChess) {
        return {
          symbol: '♟️',
          title: 'ROYAL CHESS ARENA',
          tagline: 'Only the strongest mind survives.',
          gradient: 'from-slate-950 via-amber-950/20 to-black',
          borderColor: 'border-amber-500/20 shadow-amber-500/10'
        };
      } else if (isConnect4) {
        return {
          symbol: '⚡',
          title: 'CONNECT4 BATTLE ZONE',
          tagline: 'Drop Smart. Win Fast.',
          gradient: 'from-slate-950 via-purple-950/20 to-black',
          borderColor: 'border-purple-500/20 shadow-purple-500/10'
        };
      } else {
        return {
          symbol: '❌',
          title: 'TACTICAL GRID',
          tagline: 'Every Move Matters.',
          gradient: 'from-slate-950 via-pink-950/20 to-black',
          borderColor: 'border-pink-500/20 shadow-pink-500/10'
        };
      }
    })();

    const readyCount = lobby.players?.filter((p) => {
      const pId = getUserIdString(p);
      const hostId = getUserIdString(lobby.host);
      return pId === hostId || lobby.readyPlayers?.some((rp) => getUserIdString(rp) === pId);
    }).length || 0;
    const totalPlayersCount = lobby.players?.length || 0;
    const BannerIcon = theme.icon;

    const isSearching = totalPlayersCount < (lobby.maxPlayers || 2);
    const isLiveMatch = startedMatch && startedMatch.lobbyId === lobby._id;
    const isBattleReadyState = !isSearching && !isLiveMatch && allOtherPlayersReady;

    let battleStatusText = '';
    let battleStatusDesc = '';
    let battleStatusColor = '';
    let battleStatusPulse = '';
    let battleStatusIcon = '';

    if (isLiveMatch && startedMatch) {
      const p1 = startedMatch.players?.[0];
      const p2 = startedMatch.players?.[1];
      const p1Name = p1?.userId?.username || p1?.username || 'Player 1';
      const p2Name = p2?.userId?.username || p2?.username || 'Player 2';
      
      const getSymbolEmoji = (symbol, gameType) => {
        if (gameType === 'tic-tac-toe') {
          return symbol === 'X' ? '❌' : '⭕';
        }
        if (gameType === 'connect4') {
          return symbol === 'X' ? '🔴' : '🟡';
        }
        if (gameType === 'chess') {
          return symbol === 'white' ? '⚪' : '⚫';
        }
        return symbol || '';
      };

      const p1Symbol = getSymbolEmoji(p1?.symbol, lobby.gameType);
      const p2Symbol = getSymbolEmoji(p2?.symbol, lobby.gameType);
      
      const currentTurnPlayer = startedMatch.players?.find(p => p.symbol === startedMatch.currentTurn);
      const currentTurnName = currentTurnPlayer?.userId?.username || currentTurnPlayer?.username || 'Opponent';

      battleStatusText = 'LIVE MATCH';
      battleStatusDesc = `Active Match: ${p1Symbol} ${p1Name} vs ${p2Symbol} ${p2Name} • Turn: ${currentTurnName}`;
      battleStatusColor = 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400';
      battleStatusPulse = 'animate-pulse-glow';
      battleStatusIcon = '⚔️';
    } else if (isBattleReadyState) {
      battleStatusText = 'BATTLE READY';
      battleStatusDesc = isHost ? 'Everyone is ready! Press "Start Match" to begin.' : 'Everyone is ready. Waiting for host to start...';
      battleStatusColor = 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
      battleStatusPulse = 'animate-pulse-glow';
      battleStatusIcon = '⚡';
    } else if (!isSearching) {
      battleStatusText = 'WAITING FOR PLAYERS...';
      battleStatusDesc = 'Waiting for everyone to ready up.';
      battleStatusColor = 'border-amber-500/25 bg-amber-950/15 text-amber-400';
      battleStatusPulse = 'animate-pulse';
      battleStatusIcon = '⏳';
    } else {
      battleStatusText = 'WAITING FOR PLAYERS...';
      battleStatusDesc = `Waiting for players to join (${totalPlayersCount}/${lobby.maxPlayers || 2}).`;
      battleStatusColor = 'border-indigo-500/20 bg-indigo-950/10 text-indigo-400';
      battleStatusPulse = 'animate-pulse';
      battleStatusIcon = '📡';
    }

    return (
      <section className="relative w-full animate-slide-up space-y-6">
        {/* Background highlights */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full ${theme.blobColor} blur-3xl`} />
          <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />
          <div className="absolute left-10 bottom-24 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        {/* Back/Exit Button (Outside Header, Top Left) */}
        <div className="flex justify-start">
          {(!isUserInLobby(lobby) || (isHost && !isHostPlaying)) ? (
            <button
              onClick={() => {
                setSelectedLobby(null);
                setChatMessages([]);
                setActiveLobbyId(null);
                setStartedMatch(null);
              }}
              className="rounded-full border border-white/10 bg-slate-900/60 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:text-slate-200 transition flex items-center gap-1.5 self-start"
            >
              ← Back to Lobbies
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-full border border-rose-500/40 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-900/35 px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-rose-300 hover:text-white transition flex items-center gap-1.5 self-start shadow-md hover:shadow-rose-500/10 animate-fade-in"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isHost ? 'Exit Lobby' : 'Exit Arena'}</span>
            </button>
          )}
        </div>

        {/* Hero Banner Header */}
        <div className={`relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br ${bannerData.gradient} p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full group transition-all duration-300 shadow-[0_0_60px_rgba(99,102,241,0.25)] ${theme.borderClass}`}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute h-1.5 w-1.5 bg-indigo-400 rounded-full left-[10%] bottom-[10%] animate-particle-1" />
            <div className="absolute h-2 w-2 bg-purple-400 rounded-full left-[30%] bottom-[15%] animate-particle-2" />
            <div className="absolute h-1 w-1 bg-pink-400 rounded-full left-[50%] bottom-[5%] animate-particle-3" />
            <div className="absolute h-2 w-2 bg-blue-400 rounded-full left-[70%] bottom-[20%] animate-particle-4" />
            <div className="absolute h-1.5 w-1.5 bg-emerald-400 rounded-full left-[90%] bottom-[12%] animate-particle-5" />
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className={`p-3 rounded-2xl border ${theme.borderClass} flex items-center justify-center shrink-0 animate-float shadow-inner bg-slate-950/60`}>
              <BannerIcon className={`h-8 w-8 ${theme.textClass}`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase">{lobby.name}</h1>
                {!isUserInLobby(lobby) && (
                  <button
                    type="button"
                    onClick={() => handleJoin(lobby)}
                    className="rounded-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition duration-300 active:scale-95 shadow-md shadow-blue-500/20"
                  >
                    JOIN LOBBY
                  </button>
                )}
                {lobby.isPrivate && (
                  <span className="bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] text-rose-400 font-extrabold uppercase tracking-wider">
                    Private Room
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest leading-none">
                GameSphere Arcade • {lobby.gameType === 'chess' ? 'Chess' : lobby.gameType === 'connect4' ? 'Connect 4' : 'Tic Tac Toe'} Arena • Hosted by {getPlayerDisplayName(lobby.host)}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-350 italic mt-1 font-sans">
                "{bannerData.tagline}"
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 self-center md:self-auto w-full md:w-auto justify-center sm:justify-between md:justify-end">
            <div className="flex flex-col gap-1 items-center md:items-end">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>{totalPlayersCount}/{lobby.maxPlayers || 2} PLAYERS</span>
              </div>
              <span className="text-[9px] font-extrabold text-slate-500 tracking-wider uppercase">
                LAUNCH STATUS: {totalPlayersCount >= (lobby.maxPlayers || 2) ? 'Ready to Launch' : 'Awaiting Players'}
              </span>
            </div>
            <span className={`rounded-full border px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)] ${statusBadgeClass}`}>
              {readyCount} / {totalPlayersCount} READY
            </span>
          </div>
        </div>

        {/* Room Main Layout */}
        <div className="space-y-6 w-full relative z-10">
          {/* Battle Status Card */}
          <div className={`rounded-[2rem] border ${battleStatusColor} p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group/battle transition-all duration-300`}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-30 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-left">
                <span className={`text-2xl ${battleStatusPulse} shrink-0`}>{battleStatusIcon}</span>
                <div>
                  <h3 className="text-base font-black tracking-wider uppercase text-white">
                    {battleStatusText}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">{battleStatusDesc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  {isLiveMatch ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/game/${startedMatch._id}`)}
                      className="w-full md:w-auto rounded-full bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-555 px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] border border-white/10 transition-all duration-350 active:scale-[0.95] flex items-center justify-center gap-2 transform hover:-translate-y-0.5 animate-pulse-glow"
                    >
                      {lobby.players?.some((p) => getUserIdString(p) === uId) ? '⚔️ ENTER BATTLE' : '👁️ SEE MATCH'}
                    </button>
                  ) : isUserInLobby(lobby) && !isHost ? (
                    <button
                      type="button"
                      onClick={handleToggleReady}
                      className={`w-full md:w-auto rounded-full px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white transition-all duration-350 active:scale-[0.95] flex items-center justify-center gap-2 transform hover:-translate-y-0.5 border border-white/10 ${
                        amIReady 
                          ? 'bg-gradient-to-r from-rose-600 to-pink-650 hover:from-rose-500 hover:to-pink-550 shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_30px_rgba(244,63,94,0.55)]' 
                          : `bg-gradient-to-r ${theme.gradient} ${readyShadowClass}`
                      }`}
                    >
                      {amIReady ? '✕ CANCEL READY' : '✓ I\'M READY'}
                    </button>
                  ) : lobby.players?.length >= 2 && isHost ? (
                    allOtherPlayersReady ? (
                      <button
                        type="button"
                        onClick={handleStartGame}
                        className="w-full md:w-auto rounded-full bg-gradient-to-r from-indigo-650 via-purple-650 to-pink-650 hover:from-indigo-550 hover:via-purple-555 hover:to-pink-550 px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_0_25px_rgba(219,39,119,0.4)] hover:shadow-[0_0_35px_rgba(219,39,119,0.6)] border border-white/10 transition-all duration-350 active:scale-[0.95] flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 animate-pulse-glow"
                      >
                        <span>⚔️ START MATCH</span>
                      </button>
                    ) : (
                      <div className="w-full md:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-5 py-3 shadow-[0_0_15px_rgba(245,158,11,0.1)] animate-pulse select-none">
                        <span className="text-sm">⏳</span>
                        <span>Waiting for players to ready up</span>
                      </div>
                    )
                  ) : null}

                  {/* Host Player/Spectator Toggle Button */}
                  {isHost && !isLiveMatch && (isHostPlaying || (lobby.players?.length || 0) < (lobby.maxPlayers || 2)) && (
                    <button
                      type="button"
                      onClick={handleToggleHostPlay}
                      className={`w-full md:w-auto rounded-full border px-7 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all duration-350 active:scale-[0.95] flex items-center justify-center gap-2 ${
                        isHostPlaying
                          ? 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                          : 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-300 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      }`}
                    >
                      {isHostPlaying ? '👁️ SPECTATE MATCH' : '⚔️ JOIN TO PLAY'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Symmetrical Two Columns Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            
            {/* Left Column: Player Slots & Highlights */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* PLAYER TEAM CARD */}
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-4">
                <div>
                  {/* Slots Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border shrink-0 bg-emerald-950/40 border-emerald-500/20 text-emerald-400">
                        <Users className="h-5.5 w-5.5" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">PLAYER TEAM</h2>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">Lobby Members</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-400">
                      {readyCount} / {totalPlayersCount} READY
                    </span>
                  </div>

                  {/* Player Slots List */}
                  <div className="space-y-3 mt-6">
                    {/* Host/Spectator Card */}
                    {!isHostPlaying && lobby.host && (
                      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_12px_rgba(99,102,241,0.1)]">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {lobby.host.avatarUrl ? (
                            <Avatar
                              src={lobby.host.avatarUrl}
                              alt={lobby.host.username || 'Host'}
                              size="xs"
                              className="h-9 w-9 border border-indigo-500/25 rounded-full shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 uppercase border text-amber-400 bg-amber-500/10 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                              {(lobby.host.username || 'Host').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white leading-tight">{lobby.host.username || 'Host'}</p>
                              <span className="text-[8px] bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 font-extrabold uppercase px-1 py-0.5 rounded leading-none shrink-0">
                                Host / Spectator
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">Watching & Managing Room</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 sm:hidden">Status</span>
                          <span className="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.1)]">
                            SPECTATING
                          </span>
                        </div>
                      </div>
                    )}

                    {Array.from({ length: lobby.maxPlayers || 2 }).map((_, index) => {
                      const isOccupied = index < (lobby.players?.length || 0);
                      
                      if (isOccupied) {
                        const player = lobby.players[index];
                        const playerData = typeof player === 'string' ? { _id: player, username: 'Player' } : player;
                        const playerId = getUserIdString(playerData);
                        const isPlayerHost = playerId === getUserIdString(lobby.host);
                        
                        let isPlayerReady = isPlayerHost || (lobby.readyPlayers && lobby.readyPlayers.some((rp) => {
                          return getUserIdString(rp) === playerId;
                        }));

                        const initials = playerData.username?.slice(0, 2).toUpperCase() || 'P';
                        const rating = playerData.gameElo || 1200;
                        const xp = playerData.xp || 0;
                        const tier = getPlayerRank(rating);

                        return (
                          <div key={playerId || index} className="rounded-2xl border border-white/5 bg-slate-900/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition duration-300 hover:border-white/10">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              {playerData.avatarUrl ? (
                                <Avatar
                                  src={playerData.avatarUrl}
                                  alt={playerData.username}
                                  size="xs"
                                  className="h-9 w-9 border border-slate-700/60 rounded-full shrink-0"
                                />
                              ) : (
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 uppercase border ${
                                  isPlayerHost
                                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                                }`}>
                                  {initials}
                                </div>
                              )}
                              <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold text-white leading-tight">{playerData.username}</p>
                                  {isPlayerHost && (
                                    <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold uppercase px-1 py-0.5 rounded leading-none shrink-0">
                                      Host
                                    </span>
                                  )}
                                </div>
                                
                                {/* XP, ELO, Tier Badge row */}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[9px] font-black text-slate-400">
                                    {xp} XP
                                  </span>
                                  <span className="text-slate-650 text-slate-500">•</span>
                                  <span className="text-[9px] font-black text-slate-400">
                                    {rating} ELO
                                  </span>
                                  <span className="text-slate-650 text-slate-500">•</span>
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[7.5px] font-black uppercase tracking-wider leading-none ${tier.color}`}>
                                    <span>{tier.symbol}</span>
                                    <span>{tier.name}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 sm:hidden">Status</span>
                              <div className="flex items-center gap-2">
                                {isPlayerReady ? (
                                  <span className="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                                    READY
                                  </span>
                                ) : (
                                  <span className="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-full border border-slate-700 bg-slate-800/40 text-slate-400">
                                    NOT READY
                                  </span>
                                )}

                                {isHost && !isPlayerHost && (
                                  <button
                                    type="button"
                                    onClick={() => handleKickPlayer(playerId)}
                                    className="rounded-full border border-rose-500/30 hover:border-rose-500/60 bg-rose-950/20 hover:bg-rose-900/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-rose-400 transition flex items-center gap-1 active:scale-[0.95]"
                                    title="Kick from lobby"
                                  >
                                    <X className="h-3 w-3" />
                                    <span>KICK</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const isUserAlreadyIn = isUserInLobby(lobby);
                        return (
                          <div key={`open-slot-${index}`} className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-9 w-9 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                                <User className="h-4.5 w-4.5 text-slate-500" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-400 leading-tight">Waiting for Challenger</p>
                                {!isUserAlreadyIn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleJoin(lobby)}
                                    className="mt-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition duration-300 active:scale-95 shadow-md shadow-blue-500/10"
                                  >
                                    JOIN LOBBY
                                  </button>
                                ) : (
                                  <p className="text-[10px] font-semibold text-slate-600 mt-1 uppercase tracking-wider leading-none">
                                    Awaiting challenger...
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {isUserAlreadyIn && (
                              <span className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-650 text-slate-600 border border-transparent">
                                OPEN
                              </span>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>

                {/* Recruit allies panel inside Player Team card */}
                {isUserInLobby(lobby) && (
                  <div className="border-t border-white/5 pt-4 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-left">
                        <Plus className="h-4 w-4 text-purple-400" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Recruit allies (online)</span>
                      </div>
                      <input
                        type="text"
                        value={allySearchQuery}
                        onChange={(e) => setAllySearchQuery(e.target.value)}
                        placeholder="Search allies..."
                        className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-white outline-none focus:border-purple-500/80 transition font-semibold w-full sm:w-40"
                      />
                    </div>
                    {sortedFriends.filter(f => f.online && f.username.toLowerCase().includes(allySearchQuery.toLowerCase())).length === 0 ? (
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left py-1">
                        {allySearchQuery.trim() ? "No matching online allies found." : "No online friends available."}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                        {sortedFriends.filter(f => f.online && f.username.toLowerCase().includes(allySearchQuery.toLowerCase())).map((friend) => {
                          const friendId = friend._id || friend.id;
                          const isAlreadyIn = lobby.players?.some(p => (p._id || p.id || p) === friendId);
                          const isInvited = lobby.invitedUsers?.some(u => (u._id || u.id || u) === friendId);
                          const friendRating = getFriendGameElo(friend, lobby.gameType);
                          const friendTier = getPlayerRank(friendRating);
                          
                          return (
                            <div key={friendId} className="w-full rounded-2xl border border-white/5 bg-slate-900/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition duration-300 hover:border-white/10">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Avatar src={friend.avatarUrl} alt={friend.username} size="xs" className="rounded-full shrink-0" />
                                <div className="text-left">
                                  <p className="text-xs font-bold text-white leading-tight">{friend.username}</p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="text-[9px] font-black text-slate-400">
                                      {friendRating} ELO
                                    </span>
                                    <span className="text-slate-650 text-slate-500">•</span>
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[7.5px] font-black uppercase tracking-wider leading-none ${friendTier.color}`}>
                                      <span>{friendTier.symbol}</span>
                                      <span>{friendTier.name}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t border-white/5 pt-2 sm:border-t-0 sm:pt-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 sm:hidden">Recruit</span>
                                {isAlreadyIn ? (
                                  <span className="px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                    Joined
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleInviteFriend(friendId)}
                                    disabled={pendingInviteIds.includes(friendId) || (lobby.players?.length || 0) >= (lobby.maxPlayers || 2)}
                                    className="w-full sm:w-auto text-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-500 hover:to-purple-550 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-white transition duration-300 active:scale-95 shadow-md disabled:opacity-45 disabled:cursor-not-allowed"
                                  >
                                    {isInvited ? 'Re-Inv' : 'Invite'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LOBBY HIGHLIGHTS CARD */}
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
                <div>
                  {/* Highlights Header */}
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border shrink-0 bg-purple-950/40 border-purple-500/20 text-purple-400">
                      <Sparkles className="h-5.5 w-5.5" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">LOBBY HIGHLIGHTS</h2>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">Quick Insight Cards</p>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {/* Strategy Tip Card */}
                    <div className="rounded-2xl border border-amber-500/10 bg-slate-900/25 p-4 flex flex-col justify-between min-h-[90px] hover:border-amber-500/25 transition duration-300">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Strategy Tip</span>
                        <Trophy className="h-4 w-4 text-amber-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-350 text-slate-300 leading-normal text-left">
                        {getStrategyTip(lobby.gameType)}
                      </p>
                    </div>

                    {/* Lobby Mood Card */}
                    <div className="rounded-2xl border border-pink-500/10 bg-slate-900/25 p-4 flex flex-col justify-between min-h-[90px] hover:border-pink-500/25 transition duration-300">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Lobby Mood</span>
                        <Activity className="h-4 w-4 text-pink-400 animate-pulse" />
                      </div>
                      <p className="text-xs font-semibold text-slate-350 text-slate-300 leading-normal text-left">
                        Competitive and focused
                      </p>
                    </div>

                    {/* Lobby Format Card */}
                    <div className="rounded-2xl border border-purple-500/10 bg-slate-900/25 p-4 flex flex-col justify-between min-h-[90px] hover:border-purple-500/25 transition duration-300">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Lobby Format</span>
                        <Zap className="h-4 w-4 text-purple-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-350 text-slate-300 leading-normal text-left">
                        {lobby.durationType === 'one-time' ? 'Single Game Battle' : '1-Hour Open Session'}
                      </p>
                    </div>

                    {/* Privacy Card */}
                    <div className={`rounded-2xl border ${lobby.isPrivate ? 'border-rose-500/10 hover:border-rose-500/25' : 'border-emerald-500/10 hover:border-emerald-500/25'} bg-slate-900/25 p-4 flex flex-col justify-between min-h-[90px] transition duration-300`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Privacy</span>
                        {lobby.isPrivate ? <Lock className="h-4 w-4 text-rose-400" /> : <Unlock className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <p className="text-xs font-semibold text-slate-350 text-slate-300 leading-normal text-left">
                        {lobby.isPrivate ? 'Invite-only with secure access' : 'Public room open to everyone'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Chat Network & Activity Feed */}
            <div className="lg:col-span-5 flex flex-col animate-fade-in">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between h-[580px] w-full">
                <div className="space-y-4 flex flex-col h-full flex-1 min-h-0">
                  
                  {/* Chat Header */}
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Lobby Chat Network</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Secure Squad Channel</p>
                    </div>
                  </div>

                  {isUserInLobby(lobby) ? (
                    <div className="flex flex-col flex-1 h-0 justify-between space-y-4">
                      
                      {/* Activity Feed Sub-section */}
                      <div className="flex flex-col space-y-1.5 text-left">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          Live Activity Log
                        </span>
                        <div 
                          ref={activityFeedRef}
                          className="h-[75px] overflow-y-auto bg-slate-950/60 border border-white/5 rounded-xl p-2.5 font-mono text-[9px] text-slate-400 space-y-1 select-none scroll-smooth"
                        >
                          {activityLog.map((log, idx) => (
                            <div key={idx} className="flex items-center gap-1 truncate text-slate-350">
                              <span className="text-indigo-400/80">❯</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 h-0 flex flex-col rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-inner relative justify-between overflow-hidden">
                        {chatMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center flex-1 py-12">
                            <p className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              No lobby messages yet. Send a greeting!
                            </p>
                          </div>
                        ) : (
                          <div ref={chatContainerRef} onScroll={handleChatScroll} className="space-y-3.5 overflow-y-auto pr-1 flex-1 h-0 scroll-smooth">
                            {chatMessages.map((messageItem) => {
                              const senderId = getUserIdString(messageItem.sender);
                              const isCurrentUser = senderId === getUserIdString(user);
                              const senderName = messageItem.sender?.username || 'Player';
                              const senderAvatar = messageItem.sender?.avatarUrl || getAvatarUrl(senderName);
                              const msgTime = messageItem.createdAt 
                                ? new Date(messageItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                              return (
                                <div key={messageItem._id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} space-y-1`}>
                                  <div className={`flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <Avatar src={senderAvatar} alt={senderName} size="xs" className="rounded-full border border-white/5 shrink-0" />
                                    <div className={`flex items-baseline gap-1.5 text-[9px] font-bold ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                      <span className="text-white font-extrabold">{senderName}</span>
                                      <span className="text-slate-500 font-medium">{msgTime}</span>
                                    </div>
                                  </div>
                                  <div className={`max-w-[85%] rounded-2xl break-words text-left leading-relaxed ${
                                    isOnlyEmojis(messageItem.message)
                                      ? 'text-2xl px-1 py-1'
                                      : `px-3 py-2 text-[11px] text-white ${
                                          isCurrentUser 
                                            ? 'bg-indigo-650/30 border border-indigo-500/20 rounded-tr-none text-indigo-100' 
                                            : 'bg-slate-900/50 border border-white/5 rounded-tl-none text-slate-200'
                                        }`
                                  }`}>
                                    {messageItem.message}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={scrollToBottom}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-lg transition duration-300 active:scale-95 animate-bounce z-10"
                          >
                            <span className="text-[11px]">↓</span>
                            <span>{unreadCount} New</span>
                          </button>
                        )}
                      </div>

                      {/* Quick Reactions bar & message input */}
                      <div className="space-y-2 mt-auto">
                        
                        {/* Quick Reactions Bar */}
                        <div className="flex items-center gap-2 px-1 text-left">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 select-none mr-1">Quick:</span>
                          {['🔥', '⚔️', '👑', '🎯', '😂'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                emitLobbyChat(
                                  { lobbyId: selectedLobby._id, message: emoji },
                                  (response) => {
                                    if (response.status !== 'ok') {
                                      setStatusMessage(response.message);
                                    }
                                  }
                                );
                              }}
                              className="text-sm transition hover:scale-125 hover:-translate-y-0.5 duration-200 active:scale-90"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Text form message */}
                        <form className="flex gap-2" onSubmit={handleSendMessage}>
                          <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Write squad message..."
                            className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500/80 transition font-semibold"
                          />
                          <button
                            type="submit"
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-500 hover:to-purple-550 px-4 py-3 text-xs font-black uppercase text-white shadow-sm transition duration-300 flex items-center gap-1.5 shrink-0"
                          >
                            <span>Send</span>
                            <Send className="h-3 w-3" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 rounded-2xl border border-white/5 bg-slate-950/35 flex flex-col items-center justify-center p-6 text-center shadow-inner mt-4 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-900/40 text-slate-400 mb-4 shadow-inner">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400 max-w-[200px] leading-relaxed">
                        Join the lobby to participate in live squad chat.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="relative w-full animate-slide-up">
      {/* Background highlights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="absolute left-10 bottom-24 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative space-y-8">
            {/* Password Modal */}
            {privateJoinLobby && (
              <PasswordModal
                lobby={privateJoinLobby}
                value={privateJoinPassword}
                onChange={setPrivateJoinPassword}
                onCancel={handlePrivateJoinCancel}
                onSubmit={handlePrivateJoinSubmit}
              />
            )}

            {/* Quick AI Modal */}
            {showQuickAIModal && (
              <QuickAIModal
                value={quickAIGameType}
                onChange={setQuickAIGameType}
                onCancel={handleQuickAICancel}
                onSubmit={handleQuickAISubmit}
              />
            )}

            {/* Invite Notification Banner */}
            {inviteNotification && (
              <div className="mx-auto mb-6 w-full max-w-[920px] rounded-[2rem] border border-white/10 bg-slate-950/90 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Bell className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300">Match Invitation</p>
                      <p className="mt-2 text-sm font-semibold text-white leading-tight">
                        <span className="text-indigo-300 font-black">{getPlayerDisplayName(inviteNotification.host)}</span> invited you to play <span className="text-amber-400 font-bold">{inviteNotification.gameType === 'tic-tac-toe' ? 'Tic Tac Toe' : inviteNotification.gameType === 'connect4' ? 'Connect 4' : inviteNotification.gameType === 'chess' ? 'Chess' : inviteNotification.gameType}</span> in lobby <span className="text-purple-300 font-bold">"{inviteNotification.name}"</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleJoinInvitedLobby}
                      className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:opacity-95"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteNotification(null)}
                      className="rounded-2xl border border-white/10 bg-slate-900/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Page Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-wider text-white">Active Lobbies</h1>
                <p className="text-xs text-slate-400 font-bold mt-1">Join a game, or challenge AlphaSphere AI instantly</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse-glow" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                    {lobbies.length} {lobbies.length === 1 ? 'lobby' : 'lobbies'} available
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickMatch}
                  className="rounded-full border border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20 px-5 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-300 transition flex items-center justify-center gap-1.5 shadow-md active:scale-[0.97]"
                  title="Start an instant rated match against AlphaSphere AI bot"
                >
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Play vs AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyMyLobbies((prev) => !prev)}
                  className={`rounded-full border px-5 py-1.5 text-[10px] font-black uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1.5 shadow-md active:scale-[0.97] ${
                    showOnlyMyLobbies 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500/40 shadow-md shadow-indigo-500/20' 
                      : 'border-white/10 bg-slate-900/40 hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>My Lobbies</span>
                </button>
                <button
                  onClick={handleScrollToCreate}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-white/10 px-5 py-1.5 text-[10px] font-black uppercase tracking-wider transition duration-300 active:scale-[0.97] shadow-md flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Lobby</span>
                </button>
              </div>
            </div>

            {/* Play vs AI Info Banner */}
            <div className="w-full rounded-[1.5rem] border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(99,102,241,0.05)] backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute -inset-y-12 -inset-x-12 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Bot className="h-5 w-5 animate-pulse" />
                </div>
                <div className="text-left text-wrap max-w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">Instant AI Matches</span>
                  <p className="mt-0.5 text-xs text-slate-400 font-medium leading-relaxed">
                    No active players online? Click <strong className="text-indigo-300">Play vs AI</strong> in the header to instantly start a rated match against <strong>AlphaSphere AI</strong>. Matches grant rating shifts and XP rewards!
                  </p>
                </div>
              </div>
            </div>

            {/* Two Columns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
              
              {/* Left Column: Lobbies Marketplace List */}
              <div className={showCreateForm ? "lg:col-span-8 space-y-4 flex flex-col" : "lg:col-span-12 space-y-4 flex flex-col"}>
                {/* Lobby Filters */}
                <LobbyFilters filters={filters} setFilters={setFilters} gameTypes={gameTypes} search={search} setSearch={setSearch} />

                {/* Lobbies List */}
                <div className="space-y-4 p-2">
                  {loadingLobbies ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div 
                          key={i} 
                          className="rounded-[1.8rem] border border-white/5 bg-slate-950/45 p-4 sm:p-5 transition-all duration-300 shadow-md animate-fade-in"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/5 animate-pulse shrink-0" />
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="h-4 w-32 bg-slate-900 rounded animate-pulse" />
                                  <div className="h-4 w-16 bg-slate-900 rounded animate-pulse" />
                                </div>
                                <div className="h-3.5 w-24 bg-slate-900 rounded animate-pulse" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 flex-wrap sm:flex-nowrap shrink-0">
                              <div className="h-5 w-16 rounded-full bg-slate-900 animate-pulse" />
                              <div className="h-4 w-10 bg-slate-900 animate-pulse" />
                              <div className="h-9 w-24 bg-slate-900 rounded-xl animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : lobbiesToRender.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-8 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      {showOnlyMyLobbies 
                        ? "No active rooms found in 'My Lobbies' matching filters."
                        : "No active lobbies found. Create one to start!"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lobbiesToRender.map((lobby) => renderLobbyCard(lobby))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Persistent Create Lobby card */}
              {showCreateForm && (
                <div id="create-lobby-section" className="lg:col-span-4 space-y-6">
                  <CreateLobbyForm onCreateLobby={handleCreate} onClose={() => setShowCreateForm(false)} />
                </div>
              )}
            </div>
          </div>
        </section>
      );
    };

    export default LobbyPage;
