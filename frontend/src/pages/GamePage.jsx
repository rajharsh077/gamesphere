import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import GameBoard from '../components/GameBoard';
import { initSocket, onGameState, offGameState, emitGameMove, emitGameSubscribe, onGameChatMessage, offGameChatMessage, emitGameChat, emitGameForfeit } from '../services/socketService';
import { getGameState as fetchGameState, getGameChat } from '../services/gameService';
import Avatar from '../components/Avatar';
import { getLobby, leaveLobby as apiLeaveLobby } from '../services/lobbyService';
import { getAvatarUrl } from '../utils/avatar';
import { ArrowLeft, User, Users, BookOpen, MessageSquare, Send, Activity, Sparkles, AlertCircle, X, Clock, Info, Trophy, Crown, Zap, Target, Gamepad2 } from 'lucide-react';

const getUserIdString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return (val._id || val.id || val).toString();
  }
  return String(val);
};

const isOnlyEmojis = (msg) => {
  if (!msg) return false;
  const clean = msg.replace(/\s+/g, '');
  if (!clean) return false;
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}\u{2194}\u{2195}\u{25C0}\u{25B6}]+$/u;
  return emojiRegex.test(clean);
};

const getPlayerRank = (elo) => {
  if (elo === undefined || elo === null) return { name: 'Rookie', symbol: '🥉', color: 'text-amber-600/70 border-amber-600/20 bg-amber-600/5' };
  if (elo >= 1800) {
    return {
      name: 'Grandmaster',
      symbol: '👑',
      color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
    };
  } else if (elo >= 1500) {
    return {
      name: 'Diamond Tier',
      symbol: '💎',
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
    };
  } else if (elo >= 1200) {
    return {
      name: 'Challenger',
      symbol: '🏆',
      color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10 shadow-[0_0_12px_rgba(217,70,239,0.15)]',
    };
  } else {
    return {
      name: 'Rookie',
      symbol: '🥉',
      color: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
    };
  }
};

const getGameRankDetails = (eloValue) => {
  const value = eloValue ?? 1200;
  if (value >= 1500) return { name: 'Grandmaster', symbol: '👑', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]' };
  if (value >= 1400) return { name: 'Diamond Tier', symbol: '💎', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]' };
  if (value >= 1300) return { name: 'Challenger', symbol: '⚔️', color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10 shadow-[0_0_12px_rgba(217,70,239,0.15)]' };
  return { name: 'Rookie', symbol: '🛡️', color: 'text-slate-400 border-white/10 bg-white/5 shadow-none' };
};

const getPlayerGameElo = (playerUserId, gameType) => {
  if (!playerUserId || typeof playerUserId !== 'object') return 1200;
  const matchHistory = playerUserId.matchHistory;
  if (!matchHistory || !Array.isArray(matchHistory)) return playerUserId.elo ?? 1200;

  let gameElo = 1200;
  const targetGameType = (gameType || '').toLowerCase();
  const pIdStr = playerUserId._id ? playerUserId._id.toString() : String(playerUserId);

  for (const m of matchHistory) {
    if (!m) continue;
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
  return gameElo;
};

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [match, setMatch] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const notifiedRef = useRef(false);
  const boardContainerRef = useRef(null);
  const boardRef = useRef(null);
  const [boardScale, setBoardScale] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatContainerRef = useRef(null);
  const isInitialLoadRef = useRef(false);
  const isInitialStateLoadedRef = useRef(false);

  // Overhaul states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const isChatOpenRef = useRef(false);
  const [lobby, setLobby] = useState(null);

  useEffect(() => {
    if (match?.lobbyId) {
      getLobby(match.lobbyId)
        .then((data) => {
          setLobby(data.lobby);
        })
        .catch((err) => {
          console.error('Error fetching lobby for host check:', err);
        });
    }
  }, [match?.lobbyId]);

  const isHost = useMemo(() => {
    if (!lobby || !user) return false;
    return getUserIdString(lobby.host) === getUserIdString(user);
  }, [lobby, user]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const checkIsAtBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return true;
    const threshold = 15;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const handleChatScroll = () => {
    if (isChatOpenRef.current && checkIsAtBottom()) {
      setUnreadCount(0);
    }
  };

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      if (isChatOpenRef.current) {
        setUnreadCount(0);
      }
    }
  };

  useEffect(() => {
    if (chatMessages.length === 0) return;
    setTimeout(scrollToBottom, 50);
  }, [chatMessages]);

  const playerSymbol = useMemo(() => {
    if (!match || !user) return null;
    const uId = getUserIdString(user);
    const player = match.players.find((p) => getUserIdString(p.userId) === uId);
    return player?.symbol || null;
  }, [match, user]);

  const canExit = useMemo(() => {
    if (!match) return true;
    return match.status !== 'active' || !playerSymbol;
  }, [match, playerSymbol]);

  const displayBoard = useMemo(() => {
    if (!match || !match.board) return [];
    if (match.gameType === 'connect4' && playerSymbol && match.status !== 'completed') {
      return match.board.map((row) =>
        row.map((cell) => (cell === playerSymbol ? null : cell))
      );
    }
    return match.board;
  }, [match?.board, match?.gameType, match?.status, playerSymbol]);

  const displayLastMove = useMemo(() => {
    if (!match || !match.moves || match.moves.length === 0) return null;
    const last = match.moves[match.moves.length - 1];
    if (match.gameType === 'connect4' && playerSymbol && match.status !== 'completed') {
      const lastPlayerIdStr = last.playerId ? getUserIdString(last.playerId) : '';
      if (last.symbol === playerSymbol || lastPlayerIdStr === getUserIdString(user)) {
        return null;
      }
    }
    return last;
  }, [match?.moves, match?.gameType, match?.status, playerSymbol, user]);

  const gameDetails = useMemo(() => {
    if (!match) return { title: 'Unknown', symbol: '🎮', icon: Gamepad2, themeColor: 'text-indigo-400', glowClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    if (match.gameType === 'chess') {
      return {
        title: 'Chess',
        symbol: '♟️',
        icon: Crown,
        themeColor: 'text-amber-400',
        glowClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    } else if (match.gameType === 'connect4') {
      return {
        title: 'Connect 4',
        symbol: '⚡',
        icon: Zap,
        themeColor: 'text-purple-400',
        glowClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    } else {
      return {
        title: 'Tic Tac Toe',
        symbol: '❌',
        icon: Target,
        themeColor: 'text-pink-400',
        glowClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      };
    }
  }, [match]);

  const player1 = match?.players?.[0];
  const player2 = match?.players?.[1];

  const p1User = player1?.userId;
  const p2User = player2?.userId;

  const p1Name = typeof p1User === 'object' ? p1User?.username : (p1User ? 'Player 1' : 'Waiting...');
  const p1Avatar = typeof p1User === 'object' ? (p1User?.avatarUrl || getAvatarUrl(p1Name)) : getAvatarUrl('Player 1');

  const p2Name = typeof p2User === 'object' ? p2User?.username : (p2User ? 'Player 2' : 'Waiting...');
  const p2Avatar = typeof p2User === 'object' ? (p2User?.avatarUrl || getAvatarUrl(p2Name)) : getAvatarUrl('Player 2');

  const p1GameElo = useMemo(() => match ? getPlayerGameElo(p1User, match.gameType) : 1200, [match, p1User]);
  const p2GameElo = useMemo(() => match ? getPlayerGameElo(p2User, match.gameType) : 1200, [match, p2User]);

  const p1GameRank = useMemo(() => getGameRankDetails(p1GameElo), [p1GameElo]);
  const p2GameRank = useMemo(() => getGameRankDetails(p2GameElo), [p2GameElo]);

  // Moves calculation
  const movesCount = useMemo(() => {
    const counts = {};
    if (p1User) counts[getUserIdString(p1User)] = 0;
    if (p2User) counts[getUserIdString(p2User)] = 0;
    if (match && match.moves) {
      match.moves.forEach((m) => {
        const id = getUserIdString(m.playerId);
        counts[id] = (counts[id] || 0) + 1;
      });
    }
    return counts;
  }, [match, p1User, p2User]);

  const sortedPlayersForSidebar = useMemo(() => {
    if (!match || !match.players) return [];
    if (match.status !== 'completed') {
      return match.players;
    }
    return [...match.players].sort((a, b) => {
      if (a.result === 'win' && b.result !== 'win') return -1;
      if (b.result === 'win' && a.result !== 'win') return 1;
      return 0;
    });
  }, [match]);

  // Elapsed Match Timer
  useEffect(() => {
    if (!match || match.status !== 'active' || !match.createdAt) {
      if (match && match.status === 'completed' && match.createdAt && match.completedAt) {
        const diffMs = new Date(match.completedAt) - new Date(match.createdAt);
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        const min = Math.floor(diffSecs / 60).toString().padStart(2, '0');
        const sec = (diffSecs % 60).toString().padStart(2, '0');
        setElapsedTime(`${min}:${sec}`);
      }
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date() - new Date(match.createdAt);
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const min = Math.floor(diffSecs / 60).toString().padStart(2, '0');
      const sec = (diffSecs % 60).toString().padStart(2, '0');
      setElapsedTime(`${min}:${sec}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [match]);

  useEffect(() => {
    if (!token) return;
    initSocket(token);
  }, [token]);

  useEffect(() => {
    let active = true;

    const handleStateUpdate = (state) => {
      if (!active || !state) return;
      if (state.status === 'completed' && !isInitialStateLoadedRef.current) {
        navigate('/lobby', { replace: true });
        return;
      }
      isInitialStateLoadedRef.current = true;
      setMatch(state);
      setIsLoading(false);
    };

    const handleGameUpdate = (payload) => {
      const state = payload.match || payload.gameState || payload;
      handleStateUpdate(state);
    };

    if (!gameId) return undefined;

    emitGameSubscribe({ gameId }, (response) => {
      if (response.status === 'ok') {
        handleStateUpdate(response.gameState || response.match);
      } else {
        addToast(response.message || 'Unable to subscribe to game.', 'error');
      }
    });

    onGameState(handleGameUpdate);
    onGameChatMessage(handleGameChatMessage);

    fetchGameState(gameId)
      .then((data) => {
        handleStateUpdate(data.gameState);
      })
      .catch(() => {
        if (active) {
          addToast('Unable to load game state.', 'error');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      offGameState(handleGameUpdate);
      offGameChatMessage(handleGameChatMessage);
    };
  }, [gameId, token, navigate]);

  useEffect(() => {
    if (!gameId || !token) return;
    let active = true;
    isInitialLoadRef.current = true;

    getGameChat(gameId)
      .then((data) => {
        if (active) {
          setChatMessages(data.messages || []);
          setTimeout(() => {
            scrollToBottom();
            isInitialLoadRef.current = false;
          }, 100);
        }
      })
      .catch(() => {
        isInitialLoadRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [gameId, token]);

  const handleGameChatMessage = ({ message: chat }) => {
    setChatMessages((prev) => [...prev, chat]);
    if (!isChatOpenRef.current) {
      setUnreadCount((c) => c + 1);
    }
  };

  const handleSendChatMessage = (event) => {
    event.preventDefault();
    if (!match || !chatInput.trim()) return;

    emitGameChat({ gameId, message: chatInput.trim() }, (response) => {
      if (response.status === 'ok') {
        setChatInput('');
      } else {
        addToast(response.message || 'Unable to send chat message.', 'error');
      }
    });
  };

  const handleMove = (rowOrColumn, col) => {
    if (!match || match.status === 'completed') return;
    if (!playerSymbol) {
      addToast('You are a spectator. Only players can make moves.', 'error');
      return;
    }

    if (match.currentTurn !== playerSymbol) {
      addToast("It's not your turn!", 'error');
      return;
    }

    const movePayload = (() => {
      if (match.gameType === 'connect4') {
        return { column: rowOrColumn };
      }
      if (match.gameType === 'chess') {
        const clicked = { row: rowOrColumn, col };
        if (!selectedCell) {
          setSelectedCell(clicked);
          return null;
        }
        const from = selectedCell;
        const to = clicked;
        setSelectedCell(null);
        return { from, to };
      }
      return { row: rowOrColumn, col };
    })();

    if (!movePayload) return;

    emitGameMove({ gameId, move: movePayload }, (response) => {
      if (response.status === 'ok') {
        setMatch(response.gameState || response.match);
        addToast('Move accepted!', 'success');
      } else {
        addToast(response.message || 'Invalid move.', 'error');
      }
    });
  };

  const currentPlayer = useMemo(() => {
    if (!match) return null;
    return match.players.find((player) => player.symbol === match.currentTurn);
  }, [match]);

  const handleForfeit = () => {
    if (!match || match.status === 'completed') return;
    setShowForfeitConfirm(true);
  };

  const confirmForfeit = () => {
    setShowForfeitConfirm(false);
    emitGameForfeit({ gameId }, (response) => {
      if (response.status === 'ok') {
        setMatch(response.gameState || response.match);
        addToast('You forfeited the match.', 'info');
      } else {
        addToast(response.message || 'Unable to forfeit match.', 'error');
      }
    });
  };

  const handleExit = async () => {
    localStorage.removeItem('activeLobbyId');
    navigate('/lobby');
  };

  const winnerText = useMemo(() => {
    if (!match || match.status !== 'completed') return null;
    if (match.winner === 'draw') return 'Game ended in a draw.';
    
    const winnerSymbol = match.winner?.symbol || match.winner;
    const winnerUserId = getUserIdString(match.winner?.userId || match.winner);

    if (playerSymbol) {
      const won = winnerSymbol === playerSymbol;
      return `Winner: ${won ? 'You' : 'Opponent'} (${winnerSymbol})`;
    }

    const winnerPlayer = match.players.find(p => getUserIdString(p.userId) === winnerUserId || p.symbol === winnerSymbol);
    const winnerName = winnerPlayer?.userId?.username || winnerPlayer?.username || 'Winner';
    return `Winner: ${winnerName} (${winnerSymbol})`;
  }, [match, playerSymbol]);

  const playWinSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.stop(ctx.currentTime + 0.7);
    } catch (e) {
    }
  };

  const fireConfetti = () => {
    const cvs = document.createElement('canvas');
    cvs.style.position = 'fixed';
    cvs.style.left = '0';
    cvs.style.top = '0';
    cvs.style.pointerEvents = 'none';
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
    cvs.style.zIndex = '9999';
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    const colors = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a78bfa'];
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height * 0.4,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
      });
    }
    let t0 = performance.now();
    let requestId;
    const tick = (t) => {
      const dt = (t - t0) / 16.666;
      t0 = t;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.06 * dt;
        p.rot += 0.1 * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      requestId = requestAnimationFrame(tick);
    };
    requestId = requestAnimationFrame(tick);
    setTimeout(() => {
      cancelAnimationFrame(requestId);
      cvs.remove();
    }, 4000);
  };

  useEffect(() => {
    if (match && match.status === 'completed' && !notifiedRef.current) {
      notifiedRef.current = true;
      const won = match.winner !== 'draw' && (match.winner.symbol === playerSymbol || match.winner === playerSymbol);
      if (won) {
        playWinSound();
        fireConfetti();
      }
    }
  }, [match, playerSymbol]);

  useEffect(() => {
    const handleResize = () => {
      if (!boardContainerRef.current || !boardRef.current) return;
      const containerWidth = boardContainerRef.current.clientWidth - 32;
      let boardWidth = 480;
      if (match) {
        if (match.gameType === 'chess') boardWidth = 600;
        else if (match.gameType === 'connect4') boardWidth = 550;
        else boardWidth = 420;
      }
      if (containerWidth < boardWidth) {
        setBoardScale(containerWidth / boardWidth);
      } else {
        setBoardScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [match]);

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col justify-between text-slate-100">
      
      {/* Toast container */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => {
          let toastBg = 'bg-slate-900/90 border-slate-700/50 text-slate-200';
          let iconColor = 'text-indigo-400';
          if (toast.type === 'success') {
            toastBg = 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            toastBg = 'bg-rose-950/90 border-rose-500/45 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
            iconColor = 'text-rose-405 text-rose-400';
          }
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-slide-up pointer-events-auto ${toastBg}`}
            >
              <AlertCircle className={`h-4.5 w-4.5 shrink-0 ${iconColor}`} />
              <span className="text-xs font-black tracking-wide uppercase">{toast.message}</span>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center text-xs text-slate-500 py-32 font-semibold uppercase tracking-wider animate-pulse flex flex-col items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-indigo-500 animate-spin" />
          <span>Calibrating Board State...</span>
        </div>
      ) : match ? (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-6 flex-grow items-stretch relative min-h-0">
          
          {/* LEFT COLUMN: Arena details and players */}
          <div className="flex flex-col gap-6 bg-slate-950/45 border border-white/5 rounded-[2rem] p-5 shadow-2xl backdrop-blur-md justify-between animate-fade-in">
            <div className="space-y-6">
              
              {/* Arena Header Card */}
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner bg-slate-950/65 ${gameDetails.glowClass}`}>
                  {gameDetails.icon ? (
                    <gameDetails.icon className="h-6 w-6" />
                  ) : (
                    <span className="text-2xl select-none leading-none">{gameDetails.symbol}</span>
                  )}
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-black tracking-wider text-white uppercase leading-tight">
                    {gameDetails.title}
                  </h1>
                  <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">
                    Live Arena
                  </p>
                </div>
              </div>

              {/* Players card section */}
              <div className="space-y-4">
                {match?.status === 'completed' ? (
                  <>
                    <div className="flex items-center justify-between text-left">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Result</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Finished</span>
                    </div>

                    <div className="space-y-3">
                      {sortedPlayersForSidebar.map((player) => {
                        const isMe = getUserIdString(player.userId) === getUserIdString(user);
                        const pName = typeof player.userId === 'object' ? player.userId?.username : (player.userId ? 'Player' : 'Waiting...');
                        const pAvatar = typeof player.userId === 'object' ? (player.userId?.avatarUrl || getAvatarUrl(pName)) : getAvatarUrl('Player');
                        
                        const pElo = getPlayerGameElo(player.userId, match.gameType);
                        const pRank = getGameRankDetails(pElo);
                        
                        const eloChangeVal = player.eloChange ?? 0;
                        const eloChangeText = eloChangeVal >= 0 ? `+${eloChangeVal}` : `${eloChangeVal}`;
                        const eloChangeColor = eloChangeVal > 0 ? 'text-emerald-400' : eloChangeVal < 0 ? 'text-rose-400' : 'text-slate-400';

                        let outcomeLabel = 'Draw';
                        let cardBorder = 'border-slate-800 bg-slate-900/35';
                        let badgeColor = 'bg-slate-500/10 border-slate-500/20 text-slate-400';

                        if (player.result === 'win') {
                          outcomeLabel = 'Winner';
                          cardBorder = 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10';
                          badgeColor = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
                        } else if (player.result === 'loss') {
                          outcomeLabel = 'Loser';
                          cardBorder = 'border-rose-500/35 bg-rose-950/15 shadow-[0_0_15px_rgba(244,63,94,0.08)]';
                          badgeColor = 'bg-rose-500/15 border-rose-500/30 text-rose-400';
                        }

                        return (
                          <div key={player._id || player.id || getUserIdString(player.userId)} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${cardBorder}`}>
                            <div className="relative">
                              <Avatar src={pAvatar} alt={pName} size="sm" className="rounded-full border border-indigo-500/20" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-xs font-black text-white leading-none truncate flex items-center gap-1.5 justify-between">
                                <span>{pName} {isMe && <span className="text-[9px] font-normal text-slate-400">(You)</span>}</span>
                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 rounded shrink-0">
                                  {player.symbol}
                                </span>
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[9px] font-bold text-slate-400">{pElo} ELO</span>
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[7.5px] font-black uppercase tracking-wider leading-none ${pRank.color}`}>
                                  <span>{pRank.symbol}</span>
                                  <span>{pRank.name}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className={`text-[8.5px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {outcomeLabel}
                                </span>
                                <span className={`text-[9.5px] font-black font-mono ${eloChangeColor}`}>
                                  {eloChangeText} ELO
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-left">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Arena Competitors</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">2 in match</span>
                    </div>

                    <div className="space-y-3">
                      {/* Player 1 Card */}
                      {(() => {
                        const isMe = getUserIdString(p1User) === getUserIdString(user);
                        const isP1Turn = match?.currentTurn === player1?.symbol;
                        
                        const cardBorder = isP1Turn
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10'
                          : 'border-white/5 bg-slate-900/35';

                        return (
                          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${cardBorder}`}>
                            <div className="relative">
                              <Avatar src={p1Avatar} alt={p1Name} size="sm" className="rounded-full border border-indigo-500/20" />
                              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${isP1Turn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-xs font-black text-white leading-none truncate flex items-center gap-1.5 justify-between">
                                <span>{p1Name}</span>
                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 rounded shrink-0">
                                  {player1?.symbol}
                                </span>
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[9px] font-bold text-slate-400">{p1GameElo} ELO</span>
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[7.5px] font-black uppercase tracking-wider leading-none ${p1GameRank.color}`}>
                                  <span>{p1GameRank.symbol}</span>
                                  <span>{p1GameRank.name}</span>
                                </span>
                              </div>
                              <p className={`text-[8.5px] font-extrabold uppercase tracking-widest mt-1.5 leading-none ${isP1Turn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                                {isP1Turn ? (isMe ? 'Your move' : 'Thinking...') : 'Waiting...'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* VS Divider badge */}
                      <div className="flex justify-center my-1">
                        <span className="text-[9px] font-black text-pink-500 bg-pink-500/10 border border-pink-500/20 rounded-full px-2 py-0.5">
                          VS
                        </span>
                      </div>

                      {/* Player 2 Card */}
                      {(() => {
                        const isMe = getUserIdString(p2User) === getUserIdString(user);
                        const isP2Turn = match?.currentTurn === player2?.symbol;

                        const cardBorder = isP2Turn
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10'
                          : 'border-white/5 bg-slate-900/35';

                        return (
                          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${cardBorder}`}>
                            <div className="relative">
                              <Avatar src={p2Avatar} alt={p2Name} size="sm" className="rounded-full border border-pink-500/20" />
                              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${isP2Turn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-xs font-black text-white leading-none truncate flex items-center gap-1.5 justify-between">
                                <span>{p2Name}</span>
                                <span className="text-[9px] font-black text-pink-400 bg-pink-500/10 border border-pink-500/20 px-1 rounded shrink-0">
                                  {player2?.symbol}
                                </span>
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[9px] font-bold text-slate-400">{p2GameElo} ELO</span>
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[7.5px] font-black uppercase tracking-wider leading-none ${p2GameRank.color}`}>
                                  <span>{p2GameRank.symbol}</span>
                                  <span>{p2GameRank.name}</span>
                                </span>
                              </div>
                              <p className={`text-[8.5px] font-extrabold uppercase tracking-widest mt-1.5 leading-none ${isP2Turn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                                {isP2Turn ? (isMe ? 'Your move' : 'Thinking...') : 'Waiting...'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons at bottom of left panel */}
            <div className="pt-4 border-t border-white/5 space-y-2 text-left animate-slide-up">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Match Options</div>
              {canExit ? (
                <button
                  onClick={handleExit}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-350 hover:bg-slate-800 transition duration-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{isHost ? 'Exit Lobby' : 'Exit Arena'}</span>
                </button>
              ) : (
                match?.status === 'active' && playerSymbol && (
                  <button
                    onClick={handleForfeit}
                    className="w-full rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-600/10 hover:bg-rose-600/20 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400 transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    🏳️ Forfeit Match
                  </button>
                )
              )}
            </div>
          </div>

          {/* CENTER COLUMN: The Game Board */}
          <div className="flex flex-col items-center justify-center bg-slate-950/20 border border-white/5 rounded-[2.2rem] p-6 shadow-md relative min-w-0">
            
            {/* Active Turn/Your Turn Info Board above the game */}
            {match && (
              <div className="w-full max-w-[600px] mb-6 flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-950/65 border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 text-left">
                  <span className={`h-2.5 w-2.5 rounded-full ${match.status === 'completed' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                    {match.status === 'completed' ? 'Match Completed' : (match.currentTurn === playerSymbol ? 'Your Turn' : "Opponent's Turn")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canExit ? (
                    <button
                      onClick={handleExit}
                      className="rounded-lg border border-white/10 bg-slate-900/80 hover:bg-slate-800 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-305 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>{isHost ? 'Exit Lobby' : 'Exit Arena'}</span>
                    </button>
                  ) : (
                    match?.status === 'active' && playerSymbol && (
                      <button
                        onClick={handleForfeit}
                        className="rounded-lg border border-rose-500/30 hover:border-rose-500 bg-rose-600/10 hover:bg-rose-600/20 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-rose-400 hover:text-white transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        🏳️ Forfeit
                      </button>
                    )
                  )}
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2.5 py-0.5 rounded border border-indigo-500/10 shadow-sm shadow-indigo-950/20">
                    <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    <span>{elapsedTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Banner */}
            {match && match.status === 'completed' && (() => {
              const isDraw = match.winner === 'draw';
              const isWin = !isDraw && (match.winner.symbol === playerSymbol || match.winner === playerSymbol || (match.winner.userId && getUserIdString(match.winner.userId) === getUserIdString(user)));
              const isLoss = !isDraw && !isWin;

              let bannerTitle = '';
              let bannerSubtitle = '';
              let bannerGlow = '';
              let bannerBorder = '';
              let bannerBg = '';
              let bannerTextGradient = '';
              let BannerIcon = Sparkles;

              if (isWin) {
                bannerTitle = 'VICTORY';
                bannerSubtitle = 'You have conquered the arena!';
                bannerBorder = 'border-emerald-500/30';
                bannerBg = 'bg-emerald-950/35';
                bannerGlow = 'shadow-[0_0_35px_rgba(16,185,129,0.25)]';
                bannerTextGradient = 'from-emerald-400 via-teal-300 to-cyan-400';
                BannerIcon = Trophy;
              } else if (isLoss) {
                bannerTitle = 'DEFEAT';
                bannerSubtitle = 'Honor in battle. Retrain and fight again!';
                bannerBorder = 'border-rose-500/30';
                bannerBg = 'bg-rose-950/20';
                bannerGlow = 'shadow-[0_0_35px_rgba(244,63,94,0.2)]';
                bannerTextGradient = 'from-rose-500 via-pink-400 to-orange-400';
                BannerIcon = AlertCircle;
              } else {
                bannerTitle = 'DRAW';
                bannerSubtitle = 'A balanced standoff. The minds are equal!';
                bannerBorder = 'border-slate-500/30';
                bannerBg = 'bg-slate-900/40';
                bannerGlow = 'shadow-[0_0_35px_rgba(148,163,184,0.15)]';
                bannerTextGradient = 'from-slate-400 via-slate-200 to-indigo-300';
                BannerIcon = Info;
              }

              return (
                <div className={`w-full max-w-[600px] mb-6 rounded-3xl border ${bannerBorder} ${bannerBg} ${bannerGlow} py-3.5 px-5 text-center backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center gap-2 animate-slide-up`}>
                  {/* Background Ambient Glow */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] bg-gradient-to-r ${bannerTextGradient}`} />
                  </div>
                  
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <div className={`p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center`}>
                      <BannerIcon className={`h-5 w-5 bg-gradient-to-r ${bannerTextGradient} bg-clip-text text-transparent`} style={{ stroke: isWin ? '#34d399' : isLoss ? '#f43f5e' : '#94a3b8' }} />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-black tracking-widest bg-gradient-to-r ${bannerTextGradient} bg-clip-text text-transparent uppercase`}>
                        {bannerTitle}
                      </h2>
                    </div>
                  </div>
                  
                  <p className="text-[11px] font-semibold text-slate-350 relative z-10">{bannerSubtitle}</p>
                  
                  <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/5 px-6 py-1.5 rounded-full text-slate-400 relative z-10">
                    {isDraw ? 'Standoff' : `Winner: ${isWin ? 'You' : 'Opponent'} (${match.winner.symbol || match.winner})`}
                  </div>
                </div>
              );
            })()}

            {/* Visual Board Screen */}
            <div ref={boardContainerRef} className="w-full flex-grow flex items-center justify-center overflow-hidden py-4 rounded-3xl bg-slate-950/40 border border-white/5 shadow-inner relative min-h-[400px]">
              <div className="w-full flex justify-center">
                <div
                  ref={boardRef}
                  className="w-full max-w-[600px] transition-transform duration-300"
                  style={{ transform: `scale(${boardScale})`, transformOrigin: 'center center' }}
                >
                  <GameBoard
                    gameType={match.gameType}
                    board={displayBoard}
                    onCellClick={handleMove}
                    selectedCell={selectedCell}
                    lastMove={displayLastMove}
                  />
                </div>
              </div>
            </div>

            {match.gameType === 'chess' && selectedCell && (
              <div className="mt-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 py-1.5 px-4 text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest animate-pulse">
                Selected Piece Coordinates: Row {selectedCell.row}, Column {selectedCell.col}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Chat Trigger & Match Info */}
          <div className="flex flex-col gap-6 justify-between items-stretch">
            
            {/* TOP RIGHT: Message Icon card / Chat network toggle */}
            <div className="bg-slate-950/45 border border-white/5 rounded-[2rem] p-5 shadow-2xl backdrop-blur-md text-left flex flex-col justify-center items-center py-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 mb-4 text-center">MATCH CHAT CHANNEL</p>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`relative p-5 rounded-3xl border transition-all duration-300 group flex items-center justify-center active:scale-95 cursor-pointer ${
                  unreadCount > 0
                    ? 'border-rose-500 bg-rose-950/20 text-rose-350 hover:text-white hover:border-rose-450 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                    : 'border-white/10 bg-slate-950/80 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-slate-900/60 shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                }`}
              >
                <MessageSquare className={`h-8 w-8 transition-transform group-hover:scale-105 ${unreadCount > 0 ? 'text-rose-450' : 'text-indigo-400'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-2 text-[10px] font-black text-white border-2 border-slate-950 shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                    {unreadCount}
                  </span>
                )}
              </button>
              <p className={`text-[9.5px] font-black uppercase tracking-wider mt-3.5 text-center leading-relaxed ${unreadCount > 0 ? 'text-rose-400' : 'text-indigo-300'}`}>
                {isChatOpen ? 'CLOSE CHAT PANEL' : (unreadCount > 0 ? `${unreadCount} NEW MESSAGES` : 'OPEN TACTICAL CHAT')}
              </p>
            </div>

            {/* BOTTOM RIGHT: Match stats / telemetry */}
            <div className="bg-slate-950/45 border border-white/5 rounded-[2rem] p-6 shadow-2xl backdrop-blur-md text-left flex flex-col justify-between flex-grow">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5 border-b border-white/5 pb-3.5">
                  <Info className="h-4 w-4 text-pink-400 animate-pulse" />
                  <span>Match Stats telemetry</span>
                </p>
                
                <div className="mt-4 space-y-4">
                  {/* Elapsed stats card */}
                  <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-3.5 animate-slide-up">
                    <p className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider leading-none">Total match duration</p>
                    <p className="mt-2 text-2xl font-black text-indigo-400 font-mono leading-none">{elapsedTime}</p>
                  </div>

                  {/* Moves counters */}
                  <div className="space-y-2.5 animate-slide-up">
                    <p className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">Move Stats count</p>
                    
                    {/* Player 1 move details */}
                    <div className="flex items-center justify-between text-xs bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                      <span className="font-bold text-slate-350 truncate pr-2">{p1Name}</span>
                      <span className="font-black text-indigo-300 font-mono bg-slate-950 border border-white/5 px-2 py-0.5 rounded shrink-0">
                        {movesCount[getUserIdString(p1User)] || 0} moves
                      </span>
                    </div>

                    {/* Player 2 move details */}
                    <div className="flex items-center justify-between text-xs bg-slate-900/35 border border-white/5 rounded-xl p-2.5">
                      <span className="font-bold text-slate-350 truncate pr-2">{p2Name}</span>
                      <span className="font-black text-pink-300 font-mono bg-slate-950 border border-white/5 px-2 py-0.5 rounded shrink-0">
                        {movesCount[getUserIdString(p2User)] || 0} moves
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Rules snippet at bottom right */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Guidelines</span>
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5 leading-relaxed">
                  {match.gameType === 'tic-tac-toe' && 'Form a straight line of 3 symbols in any direction to claim victory.'}
                  {match.gameType === 'connect4' && 'Drop coins to line up 4 continuous tokens in any direction to win.'}
                  {match.gameType === 'chess' && 'Capture the enemy King or force a draw. Move rules apply per piece.'}
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center text-xs text-slate-500 py-32 font-semibold uppercase tracking-wider">
          Unable to establish match parameters.
        </div>
      )}

      {/* Floating Chat Panel overlay on the right side */}
      <div className={`fixed top-0 right-0 h-screen w-full sm:w-[330px] bg-slate-950/95 border-l border-white/10 rounded-none sm:rounded-l-[2.2rem] shadow-2xl z-50 flex flex-col justify-between p-5 transform transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
            <span>Match Chat Channel</span>
          </h3>
          <button
            onClick={() => setIsChatOpen(false)}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg border border-transparent transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 h-0 flex flex-col rounded-2xl border border-white/5 bg-slate-950/30 p-3.5 shadow-inner mt-4 relative justify-between overflow-hidden">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-6">
              <p className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                No comments yet in this match.
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
                  <div key={messageItem._id || messageItem.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} space-y-1`}>
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
                              ? 'bg-indigo-600/30 border border-indigo-500/20 rounded-tr-none text-indigo-100' 
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
        </div>

        {/* Quick Reactions bar & message input */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 px-1 text-left">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 select-none mr-1">Quick:</span>
            {['🔥', '⚔️', '👑', '🎯', '😂'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  emitGameChat(
                    { gameId, message: emoji },
                    (response) => {
                      if (response.status !== 'ok') {
                        addToast(response.message || 'Unable to send emoji.', 'error');
                      }
                    }
                  );
                }}
                className="text-sm transition hover:scale-125 hover:-translate-y-0.5 duration-200 active:scale-90 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form className="flex gap-2" onSubmit={handleSendChatMessage}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message inside the arena..."
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition font-semibold"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-3 text-xs font-black uppercase text-white shadow-sm transition duration-300 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Forfeit Confirmation Modal overlay */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[2rem] border border-rose-500/20 bg-slate-950 p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-scale-up">
            <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-widest text-white uppercase leading-none">Forfeit Match?</h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-400">
                Are you sure you want to forfeit? This counts as an immediate defeat and will reduce your ELO rating.
              </p>
            </div>
            <div className="w-full flex gap-3 mt-2">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 rounded-2xl border border-white/10 bg-slate-900 hover:bg-slate-800 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition duration-200 cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmForfeit}
                className="flex-1 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 transition duration-200 cursor-pointer active:scale-95"
              >
                Yes, Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GamePage;
