import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFriends, searchUsers, sendFriendRequest, acceptFriendRequest, inviteFriendToLobby, removeFriend } from '../services/friendService';
import { initSocket, onFriendPresence, offFriendPresence, emitSubscribeFriends } from '../services/socketService';
import { getUserMatchHistory } from '../services/userService';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Users, Search, UserCheck, Inbox, Plus, Hourglass, Bell, UserPlus, Clock, X, Trophy, Shield, Zap, Gamepad2 } from 'lucide-react';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showIncomingRequests, setShowIncomingRequests] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendMatches, setFriendMatches] = useState([]);
  const [friendGameElos, setFriendGameElos] = useState({ chess: 1200, connect4: 1200, ttt: 1200 });
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const searchSectionRef = useRef(null);
  const notificationRef = useRef(null);
  const detailsSectionRef = useRef(null);

  const handleSelectFriend = async (friend) => {
    setSelectedFriend(friend);
    setLoadingMatches(true);
    setFriendMatches([]);
    setFriendGameElos({ chess: 1200, connect4: 1200, ttt: 1200 });
    setShowAddFriend(false);
    
    // Auto-scroll to details panel on mobile/tablet screens
    setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const data = await getUserMatchHistory(friend._id || friend.id);
      const rawMatches = data.matches || [];
      
      // Calculate ELO of each game chronologically for the friend
      let chess = 1200;
      let connect4 = 1200;
      let ttt = 1200;
      
      const chronological = [...rawMatches].reverse();
      const pId = friend._id || friend.id;
      
      for (const match of chronological) {
        const getPlayerId = (playerObj) => {
          if (!playerObj || !playerObj.userId) return null;
          return typeof playerObj.userId === 'object'
            ? playerObj.userId._id || playerObj.userId.id
            : playerObj.userId;
        };
        const player = match.players.find((p) => {
          const pid = getPlayerId(p);
          return pid && pid.toString() === pId.toString();
        });
        const rawEloChange = player?.eloChange || 0;
        const gameType = (match.gameType || match.game || '').toLowerCase();
        
        if (gameType === 'chess') {
          chess = Math.max(0, chess + rawEloChange);
        } else if (gameType === 'connect4') {
          connect4 = Math.max(0, connect4 + rawEloChange);
        } else if (gameType === 'tic-tac-toe' || gameType === 'tic-tac-toe strike') {
          ttt = Math.max(0, ttt + rawEloChange);
        }
      }
      setFriendGameElos({ chess, connect4, ttt });

      // Format last 5 matches outcome
      const formatted = rawMatches.slice(0, 5).map((match) => {
        const getPlayerId = (playerObj) => {
          if (!playerObj || !playerObj.userId) return null;
          return typeof playerObj.userId === 'object'
            ? playerObj.userId._id || playerObj.userId.id
            : playerObj.userId;
        };
        const player = match.players.find((p) => {
          const pid = getPlayerId(p);
          return pid && pid.toString() === pId.toString();
        });
        return player?.result || 'draw';
      });
      setFriendMatches(formatted);
    } catch (error) {
      console.error('Failed to load friend match history:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
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
    } catch (error) {
      setStatusMessage('Unable to load friends.');
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadFriends();
  }, [token]);

  // Handle clicking outside the incoming requests modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowIncomingRequests(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Subscribe to real-time friend requests and removals
  useEffect(() => {
    if (!token) return;
    const socket = initSocket(token);
    if (!socket) return;

    const handleIncomingRequest = ({ requester }) => {
      setIncomingRequests((prev) => {
        if (prev.some((req) => (req._id || req.id) === requester._id)) return prev;
        return [requester, ...prev];
      });
      setStatusMessage(`New friend request from ${requester.username}!`);
      setTimeout(() => setStatusMessage(''), 4500);
    };

    const handleRequestAccepted = ({ friend }) => {
      setFriends((prev) => {
        if (prev.some((f) => (f._id || f.id) === friend._id)) return prev;
        return [...prev, friend];
      });
      setStatusMessage(`${friend.username} accepted your friend request!`);
      setTimeout(() => setStatusMessage(''), 4500);
    };

    const handleFriendRemoved = ({ friendId }) => {
      setFriends((prev) => prev.filter((f) => (f._id || f.id) !== friendId));
      setSelectedFriend((prev) => {
        if (prev && (prev._id === friendId || prev.id === friendId)) {
          return null;
        }
        return prev;
      });
    };

    socket.on('friend:request:incoming', handleIncomingRequest);
    socket.on('friend:request:accepted', handleRequestAccepted);
    socket.on('friend:removed', handleFriendRemoved);

    return () => {
      socket.off('friend:request:incoming', handleIncomingRequest);
      socket.off('friend:request:accepted', handleRequestAccepted);
      socket.off('friend:removed', handleFriendRemoved);
    };
  }, [token]);

  const friendIdsKey = useMemo(
    () => friends.map((f) => f._id || f.id).filter(Boolean).sort().join(','),
    [friends.length]
  );

  // Subscribe to friend presence updates
  useEffect(() => {
    if (!token || !friendIdsKey) return;
    if (!initSocket(token)) return;

    const friendIds = friendIdsKey.split(',').filter(Boolean);
    emitSubscribeFriends({ friendIds });

    const handlePresence = ({ userId, online, currentLobbyId, lastActive }) => {
      setFriends((prev) => prev.map((f) => {
        const fId = (f._id || f.id || '').toString();
        const targetId = (userId || '').toString();
        if (fId === targetId) {
          return { ...f, online, currentLobbyId, lastActive };
        }
        return f;
      }));
    };

    onFriendPresence(handlePresence);

    return () => {
      if (token) {
        offFriendPresence(handlePresence);
      }
    };
  }, [token, friendIdsKey]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const data = await searchUsers(searchQuery.trim());
      setSearchResults(data.users || []);
    } catch (error) {
      setStatusMessage('Unable to search players.');
    }
  };

  const handleSendFriendRequest = async (targetUserId) => {
    try {
      await sendFriendRequest(targetUserId);
      setStatusMessage('Friend request sent.');
      setSearchResults((prev) => prev.filter((item) => item._id !== targetUserId));
      loadFriends();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to send friend request.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleAcceptFriendRequest = async (requestUserId) => {
    try {
      await acceptFriendRequest(requestUserId);
      setStatusMessage('Friend request accepted.');
      loadFriends();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to accept friend request.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await removeFriend(friendId);
      setStatusMessage('Friend removed.');
      setFriends((prev) => prev.filter((f) => (f._id || f.id) !== friendId));
      setSelectedFriend((prev) => {
        if (prev && (prev._id === friendId || prev.id === friendId)) {
          return null;
        }
        return prev;
      });
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Unable to remove friend.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to map rating ELO to game tier (Rookie, Challenger, Diamond Tier, Grandmaster matching ProfilePage)
  const getRankDetailsFromElo = (eloVal) => {
    const elo = eloVal || 1200;
    if (elo >= 1600) {
      return {
        name: 'Grandmaster',
        symbol: '👑',
        badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      };
    } else if (elo >= 1400) {
      return {
        name: 'Diamond Tier',
        symbol: '💎',
        badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
      };
    } else if (elo >= 1200) {
      return {
        name: 'Challenger',
        symbol: '⚔️',
        badgeColor: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
      };
    } else {
      return {
        name: 'Rookie',
        symbol: '🛡️',
        badgeColor: 'border-white/10 bg-white/5 text-slate-400'
      };
    }
  };

  // Helper to map game-specific ELO to game division badge (matching ProfilePage range details)
  const getGameRankDetails = (eloValue) => {
    const value = eloValue ?? 1200;
    if (value >= 1500) {
      return {
        name: 'Grandmaster',
        symbol: '👑',
        badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      };
    } else if (value >= 1400) {
      return {
        name: 'Diamond Tier',
        symbol: '💎',
        badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
      };
    } else if (value >= 1300) {
      return {
        name: 'Challenger',
        symbol: '⚔️',
        badgeColor: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
      };
    } else {
      return {
        name: 'Rookie',
        symbol: '🛡️',
        badgeColor: 'border-white/10 bg-white/5 text-slate-400'
      };
    }
  };

  // Format last active time stamp
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

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Helper to assign a initials badge color based on username
  const getInitialsColor = (username) => {
    if (!username) return 'bg-blue-600/80 text-blue-200 border-blue-500/30';
    const charCodeSum = [...username].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-650 bg-blue-600/80 text-blue-250 text-blue-200 border-blue-500/30',
      'bg-purple-650 bg-purple-600/80 text-purple-250 text-purple-200 border-purple-500/30',
      'bg-amber-650 bg-amber-600/80 text-amber-250 text-amber-200 border-amber-500/30',
      'bg-rose-650 bg-rose-600/80 text-rose-250 text-rose-200 border-rose-500/30',
      'bg-emerald-650 bg-emerald-600/80 text-emerald-250 text-emerald-200 border-emerald-500/30',
      'bg-indigo-650 bg-indigo-600/80 text-indigo-250 text-indigo-200 border-indigo-500/30',
      'bg-cyan-650 bg-cyan-600/80 text-cyan-250 text-cyan-200 border-cyan-500/30'
    ];
    return colors[charCodeSum % colors.length];
  };

  // Custom renderer for profile avatars (initials or img)
  const renderUserAvatar = (username, avatarUrl, size = 'sm') => {
    const firstLetter = username ? username.charAt(0).toUpperCase() : '?';
    const sizeMap = {
      sm: 'h-10 w-10 text-sm font-black',
      md: 'h-12 w-12 text-base font-black',
      lg: 'h-16 w-16 text-lg font-black'
    };
    
    if (avatarUrl && !avatarUrl.includes('robohash.org')) {
      return (
        <Avatar
          src={avatarUrl}
          alt={`${username} avatar`}
          size={size}
          className="border border-slate-700/60 rounded-full object-cover shrink-0"
        />
      );
    }

    return (
      <div className={`flex items-center justify-center rounded-full border shadow-inner shrink-0 ${sizeMap[size]} ${getInitialsColor(username)}`}>
        {firstLetter}
      </div>
    );
  };

  // Derive counts
  const onlineCount = friends.filter((f) => f.online).length;

  // Local filtering of friends list
  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <section className="relative w-full animate-slide-up">
      {/* Background highlights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px] animate-blob" />
        <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-pink-500/10 blur-[100px] animate-blob [animation-delay:4s]" />
        <div className="absolute left-10 bottom-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-[90px] animate-blob [animation-delay:8s]" />
      </div>

      <div className="relative space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-left">
          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-wider bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent drop-shadow-md">Friends</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1.5 tracking-wide">Track competitors, strengthen connections, and stay ready for every challenge.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md px-4 py-2 text-xs font-bold text-slate-200 transition duration-300 shadow-inner">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>{friends.length} Friends</span>
            </div>
            
            {/* Incoming Requests Dropdown Trigger */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowIncomingRequests((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md hover:border-rose-500/20 px-4.5 py-2 text-xs font-extrabold text-slate-200 transition-all duration-300 active:scale-95 shadow-md shadow-slate-950/20"
              >
                <Bell className="h-4 w-4 text-rose-455 text-rose-400" />
                <span>{incomingRequests.length} Requests</span>
                {incomingRequests.length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse-glow" />
                )}
              </button>
              
              {showIncomingRequests && (
                <div className="absolute right-0 top-12 z-50 w-85 rounded-[1.8rem] border border-white/10 bg-slate-950/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-fade-in glow-indigo">
                  <div className="border-b border-white/5 pb-3.5 flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse-glow" />
                      Incoming Requests
                    </h3>
                    {incomingRequests.length > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 text-[9px] font-black text-slate-950 shadow-md">
                        {incomingRequests.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {incomingRequests.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/5 bg-slate-950/40 p-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        No pending invitations
                      </div>
                    ) : (
                      incomingRequests.map((request) => (
                        <div key={request._id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/60 p-3 shadow-inner transition duration-300">
                          <div className="flex items-center gap-3 min-w-0">
                            {renderUserAvatar(request.username, request.avatarUrl, 'sm')}
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-black text-white truncate">{request.username}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Wants to connect</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptFriendRequest(request._id)}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-[1.03] active:scale-[0.97] px-3.5 py-2 text-[9px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all duration-300 flex items-center gap-1 shrink-0"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowAddFriend((prev) => !prev);
                if (!showAddFriend) {
                  setTimeout(() => {
                    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 shadow-md shadow-blue-500/15"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Friend</span>
            </button>
          </div>
        </div>

        {/* Status Message Notification Toast/Banner */}
        {statusMessage && (
          <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 px-4 py-3.5 text-center text-xs text-indigo-300 font-black uppercase tracking-wider animate-fade-in flex items-center justify-center gap-2 shadow-inner">
            <Bell className="h-3.5 w-3.5 animate-bounce" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Two Columns Grid */}
        <div className="grid gap-6 lg:grid-cols-12 w-full items-start">
          
          {/* Left Column: Connections / Friends list */}
          <div className={(showAddFriend || selectedFriend) ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
            
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6 relative overflow-hidden min-h-[550px] flex flex-col">
              {/* Premium top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-20" />
              
              {/* Card Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5 text-left mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.24em] text-indigo-400 text-glow-indigo">Social Center</span>
                    <h2 className="text-xl font-black  tracking-wider text-white mt-0.5">My Connections</h2>
                    <p className="text-[12px] text-slate-500 font-bold  tracking-wider mt-0.5">{onlineCount} online - {friends.length} total friends</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-450 bg-emerald-400 animate-pulse-glow" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    {onlineCount} Online
                  </span>
                </div>
              </div>

              {/* Local Search / Filter */}
              <div className="relative w-full mt-5 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter friends..."
                  className="w-full rounded-2xl border border-white/5 bg-slate-950/40 pl-11 pr-4 py-3.5 text-xs text-white outline-none focus:border-indigo-500/60 focus:bg-slate-950/70 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 font-bold"
                />
              </div>

              {/* Friends list scroll area with custom vertical scroll bar */}
              <div className="mt-5 space-y-3 h-[360px] overflow-y-scroll pr-2 custom-scrollbar">
                {loadingFriends ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between gap-3 rounded-[1.6rem] border border-white/5 bg-slate-950/45 px-4 py-3.5 shadow-sm animate-fade-in"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 md:flex-initial md:w-5/12 text-left">
                          <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-700/60 animate-pulse shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-3.5 w-24 bg-slate-900 rounded animate-pulse" />
                              <div className="h-3.5 w-16 bg-slate-900 rounded-full animate-pulse" />
                            </div>
                            <div className="flex gap-2">
                              <div className="h-3.5 w-16 bg-slate-900 rounded animate-pulse" />
                              <div className="h-3.5 w-16 bg-slate-900 rounded animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:flex flex-1 justify-center px-4 min-w-0 md:w-3/12">
                          <div className="h-3.5 w-32 bg-slate-900 rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-3.5 shrink-0 md:w-4/12 justify-end">
                          <div className="h-6.5 w-20 rounded-xl bg-slate-900 animate-pulse" />
                          <div className="h-8.5 w-8.5 rounded-xl bg-slate-900 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/45 p-12 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    {friends.length === 0 
                      ? 'You have not added any friends yet. Use Discovery to connect!' 
                      : 'No connections match your query.'}
                  </div>
                ) : (
                  filteredFriends.map((friend) => (
                    <div 
                      key={friend._id} 
                      onClick={() => handleSelectFriend(friend)}
                      className={`group flex items-center justify-between gap-3 rounded-[1.6rem] border px-4 py-3.5 transition duration-350 cursor-pointer glass-card-hover shadow-sm ${
                        selectedFriend && (selectedFriend._id === friend._id || selectedFriend.id === friend.id)
                          ? 'border-indigo-500 bg-slate-900/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                          : 'border-white/5 bg-slate-950/45 hover:bg-slate-900/30 hover:border-indigo-500/30'
                      }`}
                    >
                      {/* Left: Avatar, Username, Rank details, ELO/XP */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 md:flex-initial md:w-5/12 text-left">
                        <div className="relative shrink-0">
                          {renderUserAvatar(friend.username, friend.avatarUrl, 'sm')}
                          {friend.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 shadow-md" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-white group-hover:text-indigo-300 transition duration-300 truncate leading-none">{friend.username}</p>
                            {(() => {
                              const r = getRankDetailsFromElo(friend.elo);
                              return (
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${r.badgeColor} shrink-0 shadow-sm`}>
                                  <span className="text-[9px]">{r.symbol}</span>
                                  <span>{r.name}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-extrabold mt-2 tracking-wide flex items-center gap-3 flex-wrap leading-none">
                            <span className="flex items-center gap-1 bg-slate-900/40 border border-white/5 rounded px-1.5 py-0.5">
                              <Shield className="h-3 w-3 text-slate-500" />
                              <span className="text-white font-black">{friend.elo ?? 1200}</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">ELO</span>
                            </span>
                            <span className="flex items-center gap-1 bg-slate-900/40 border border-white/5 rounded px-1.5 py-0.5">
                              <Zap className="h-3 w-3 text-indigo-400 animate-pulse" />
                              <span className="text-indigo-300 font-black">{friend.xp || 0}</span>
                              <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider">XP</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Middle: Tagline */}
                      <div className="hidden md:flex flex-1 justify-center px-4 min-w-0 md:w-3/12">
                        {friend.tagline ? (
                          <span className="text-xs text-indigo-300/80 font-semibold italic truncate max-w-[180px] text-glow-indigo group-hover:text-indigo-200 transition-colors duration-300" title={friend.tagline}>
                            “{friend.tagline}”
                          </span>
                        ) : (
                          <span className="text-xs text-slate-700 italic font-bold">-</span>
                        )}
                      </div>
                      
                      {/* Right: Online/offline status, remove button */}
                      <div className="flex items-center gap-3.5 shrink-0 md:w-4/12 justify-end">
                        {friend.online ? (
                          friend.currentLobbyId ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-400 animate-pulse glow-amber shadow-sm">
                              <Gamepad2 className="h-3.5 w-3.5 text-amber-400" />
                              <span>In Game</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 glow-emerald shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                              <span>Online</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/40 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 shadow-inner">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>{formatLastActive(friend.lastActive)}</span>
                          </span>
                        )}
                        
                        <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleRemoveFriend(friend._id || friend.id);
                           }}
                           className="rounded-xl border border-white/5 hover:border-rose-500/30 bg-slate-900/30 p-2 text-slate-500 hover:text-rose-455 hover:text-rose-400 hover:bg-rose-500/10 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm md:opacity-0 group-hover:opacity-100"
                           title="Remove Friend"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Friend Details Side Panel */}
          {selectedFriend && (
            <div ref={detailsSectionRef} className="lg:col-span-4 rounded-[2rem] border border-white/10 bg-slate-950/80 p-0 shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden text-left min-h-[550px] flex flex-col">
              {/* Premium top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-30" />
              
              {/* Banner Card Background cover */}
              <div className="h-16 w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-pink-950 relative border-b border-white/5 z-10">
                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]" />
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors p-1.5 bg-slate-950/60 hover:bg-slate-900/80 rounded-full border border-white/10 z-30"
                  title="Close Panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fixed Profile Header Container (outside scrollbar to prevent clipping) */}
              <div className="px-6 pb-4 border-b border-white/5 relative z-20">
                {/* Header Cover elements */}
                <div className="flex items-end gap-3.5 -mt-8 mb-3">
                  {/* Avatar with gradient glow */}
                  <div className="relative shrink-0 z-20">
                    <div className="w-20 h-20 rounded-full p-[2.5px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.45)]">
                      <img
                        src={selectedFriend.avatarUrl || getAvatarUrl(selectedFriend.username || 'player')}
                        alt="Friend avatar"
                        className="w-full h-full rounded-full border-2 border-slate-950 bg-slate-950 object-cover"
                      />
                    </div>
                    {selectedFriend.online && (
                      <span className="absolute right-0.5 bottom-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-md animate-pulse" />
                    )}
                  </div>
                  
                  {/* Username and tagline/stats */}
                  <div className="min-w-0 pb-1">
                    <h2 className="text-xl font-black text-white tracking-tight leading-none truncate">{selectedFriend.username}</h2>
                    {(() => {
                      const r = getRankDetailsFromElo(selectedFriend.elo);
                      return (
                        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider mt-2 ${r.badgeColor}`}>
                          <span className="text-[10px]">{r.symbol}</span>
                          <span>{r.name}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Tagline */}
                {selectedFriend.tagline ? (
                  <p className="text-[11px] text-indigo-300 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl px-4 py-2.5 font-semibold italic tracking-wide leading-relaxed mt-2" title={selectedFriend.tagline}>
                    "{selectedFriend.tagline}"
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2 italic px-1">
                    No tagline set by friend
                  </p>
                )}
              </div>
              
              {/* Scrollable Content Container */}
              <div className="p-6 pt-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* ELO & XP details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-3 text-center shadow-inner hover:border-white/10 transition-colors duration-300">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Elo Rating</span>
                    <span className="text-lg font-black text-white block mt-1 tracking-tight text-glow-indigo">{selectedFriend.elo ?? 1200}</span>
                  </div>
                  <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-3 text-center shadow-inner hover:border-white/10 transition-colors duration-300">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Experience</span>
                    <span className="text-lg font-black text-indigo-400 block mt-1 tracking-tight">{selectedFriend.xp ?? 0} XP</span>
                  </div>
                </div>

                {/* Game Specific ELOs & Badges */}
                <div className="mt-5 space-y-2.5 text-left">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block px-1">Game Performance</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Chess */}
                    {(() => {
                      const r = getGameRankDetails(friendGameElos.chess);
                      return (
                        <div className="bg-slate-900/20 border border-white/5 hover:border-purple-500/30 rounded-2xl p-2.5 text-center flex flex-col justify-between min-h-[105px] transition-all duration-300 group/item shadow-inner">
                          <span className="text-[8px] font-black uppercase tracking-wider text-purple-400 block">Chess</span>
                          <span className="text-sm font-black text-white block mt-1">{friendGameElos.chess}</span>
                          <div className={`inline-flex items-center justify-center gap-0.5 rounded-lg border px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider mt-2.5 ${r.badgeColor} w-full truncate shadow-sm`}>
                            <span>{r.symbol}</span>
                            <span className="truncate">{r.name.split(' ')[0]}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Connect 4 */}
                    {(() => {
                      const r = getGameRankDetails(friendGameElos.connect4);
                      return (
                        <div className="bg-slate-900/20 border border-white/5 hover:border-blue-500/30 rounded-2xl p-2.5 text-center flex flex-col justify-between min-h-[105px] transition-all duration-300 group/item shadow-inner">
                          <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 block">Connect 4</span>
                          <span className="text-sm font-black text-white block mt-1">{friendGameElos.connect4}</span>
                          <div className={`inline-flex items-center justify-center gap-0.5 rounded-lg border px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider mt-2.5 ${r.badgeColor} w-full truncate shadow-sm`}>
                            <span>{r.symbol}</span>
                            <span className="truncate">{r.name.split(' ')[0]}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tic Tac Toe */}
                    {(() => {
                      const r = getGameRankDetails(friendGameElos.ttt);
                      return (
                        <div className="bg-slate-900/20 border border-white/5 hover:border-pink-500/30 rounded-2xl p-2.5 text-center flex flex-col justify-between min-h-[105px] transition-all duration-300 group/item shadow-inner">
                          <span className="text-[8px] font-black uppercase tracking-wider text-pink-400 block">Tic Tac Toe</span>
                          <span className="text-sm font-black text-white block mt-1">{friendGameElos.ttt}</span>
                          <div className={`inline-flex items-center justify-center gap-0.5 rounded-lg border px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider mt-2.5 ${r.badgeColor} w-full truncate shadow-sm`}>
                            <span>{r.symbol}</span>
                            <span className="truncate">{r.name.split(' ')[0]}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Match Outcomes (Last 5 matches) */}
                <div className="mt-6 pt-5 border-t border-white/5 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3 px-1">
                    <Trophy className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    <span>Recent Form</span>
                  </span>
                  
                  {loadingMatches ? (
                    <div className="flex justify-center gap-2.5 py-4">
                      {[...Array(5)].map((_, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full bg-slate-900/40 border border-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : friendMatches.length === 0 ? (
                    <p className="text-[10px] text-slate-500 font-bold uppercase py-4 text-center tracking-wider bg-slate-900/10 border border-dashed border-white/5 rounded-2xl">No match logs found</p>
                  ) : (
                    <div className="flex gap-2.5 justify-center py-1">
                      {friendMatches.map((outcome, idx) => {
                        if (outcome === 'win') {
                          return (
                            <div key={idx} className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:scale-110 transition-transform duration-200 cursor-default" title="Win">
                              W
                            </div>
                          );
                        } else if (outcome === 'loss') {
                          return (
                            <div key={idx} className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/40 text-rose-450 text-rose-400 text-xs font-black shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:scale-110 transition-transform duration-200 cursor-default" title="Loss">
                              L
                            </div>
                          );
                        } else {
                          return (
                            <div key={idx} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-500/10 border border-slate-500/40 text-slate-400 text-xs font-black shadow-[0_0_12px_rgba(148,163,184,0.15)] hover:scale-110 transition-transform duration-200 cursor-default" title="Draw">
                              D
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>

                {/* Remove Action Button */}
                <div className="mt-6 pt-5 border-t border-white/5">
                  <button
                    onClick={() => handleRemoveFriend(selectedFriend._id || selectedFriend.id)}
                    className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/45 hover:shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-400 font-bold text-xs py-3.5 transition duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <X className="h-4 w-4" />
                    <span>Remove Friend</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Discovery Search (Only open when Add Friend clicked) */}
          {showAddFriend && (
            <div ref={searchSectionRef} className="lg:col-span-4 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl animate-fade-in text-left min-h-[550px] flex flex-col relative overflow-hidden">
              {/* Premium top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-20" />
              
              <div className="border-b border-white/5 pb-4 flex items-center justify-between mt-2">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse-glow" />
                  Discovery Search
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFriend(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-900/60 hover:bg-slate-800/80 rounded-full border border-white/10"
                  title="Close Panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form className="mt-5 flex gap-2" onSubmit={handleSearch}>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player username..."
                    className="w-full rounded-2xl border border-white/5 bg-slate-950/40 pl-10 pr-4 py-3.5 text-xs text-white outline-none focus:border-indigo-500 focus:bg-slate-950/70 transition duration-300 font-bold"
                  />
                </div>
                <button className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  Search
                </button>
              </form>

              <div className="mt-5 space-y-3 h-[320px] overflow-y-scroll pr-1 custom-scrollbar">
                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/5 bg-slate-900/10 p-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Find active rivals by name
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <div key={result._id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/20 p-3 shadow-inner hover:border-white/10 transition duration-300">
                      <div className="flex items-center gap-3 min-w-0">
                        {renderUserAvatar(result.username, result.avatarUrl, 'sm')}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{result.username}</p>
                          <p className="text-[9px] text-indigo-400 font-extrabold uppercase mt-0.5 tracking-wider">{result.elo || 1200} ELO</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendFriendRequest(result._id)}
                        className="rounded-xl bg-purple-600 hover:bg-purple-500 hover:scale-[1.03] active:scale-[0.97] px-3.5 py-2 text-[9px] font-black uppercase tracking-wider text-white transition-all duration-300 flex items-center gap-1 shrink-0 shadow-md shadow-purple-500/20"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Connect</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};

export default FriendsPage;
