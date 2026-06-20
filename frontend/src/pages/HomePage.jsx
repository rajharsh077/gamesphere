import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ArrowRight, Zap, Target, Star, ShieldCheck, MessageSquare,
  Trophy, Users, Timer, ChevronRight, Sword, Crown,
  Flame, Gamepad2, Sparkles, Hexagon, Circle, Bot,
  Triangle, Square
} from 'lucide-react';

const HomePage = () => {
  const token = useSelector((state) => state.auth.token);

  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400'
    },
    pink: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      text: 'text-pink-400'
    }
  };

  const games = [
    {
      icon: Target,
      title: 'Chess',
      subtitle: 'Strategic Warfare',
      desc: 'The timeless battle of minds. Plan your moves, protect your king, and deliver checkmate.',
      color: 'indigo',
      duration: '15-30 min',
      players: '2 Players',
      difficulty: 'Hard'
    },
    {
      icon: Zap,
      title: 'Connect 4',
      subtitle: 'Vertical Tactics',
      desc: 'Drop your tokens, block your opponent, and connect four in a row to claim victory.',
      color: 'purple',
      duration: '2-5 min',
      players: '2 Players',
      difficulty: 'Medium'
    },
    {
      icon: Star,
      title: 'Tic Tac Toe',
      subtitle: 'Quick Strike',
      desc: 'Fast-paced grid combat. Align three marks in any direction before your rival does.',
      color: 'pink',
      duration: '1-2 min',
      players: '2 Players',
      difficulty: 'Easy'
    }
  ];

  const stats = [
    { icon: Zap, label: 'Latency', value: '15ms', desc: 'WebSocket real-time', colorClass: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' },
    { icon: ShieldCheck, label: 'Security', value: 'Private', desc: 'Password-protected lobbies', colorClass: 'text-purple-400 bg-purple-500/5 border-purple-500/10' },
    { icon: MessageSquare, label: 'Chat', value: 'Live', desc: 'In-game communication', colorClass: 'text-pink-400 bg-pink-500/5 border-pink-500/10' }
  ];

  const topPlayers = [
    { rank: 1, name: 'Nova', elo: 2845, streak: 12 },
    { rank: 2, name: 'Pixel', elo: 2765, streak: 8 },
    { rank: 3, name: 'Vortex', elo: 2680, streak: 5 },
    { rank: 4, name: 'Zenith', elo: 2540, streak: 3 },
    { rank: 5, name: 'Apex', elo: 2490, streak: 2 }
  ];

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-400 border-amber-400/20';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300/20 to-slate-400/20 text-slate-300 border-slate-400/20';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400/20 to-amber-600/20 text-orange-400 border-orange-400/20';
    return 'bg-white/5 text-slate-500 border-white/5';
  };

  return (
    <div className="text-slate-100">
      
      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION — Full Width, Space Theme, No Live Lobbies
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Deep space ambient layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] bg-indigo-600/5 rounded-full blur-[180px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[160px]" />
          <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-pink-600/3 rounded-full blur-[120px]" />
        </div>

        {/* Floating geometric shapes — subtle space debris */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Hexagon top right */}
          <div className="absolute top-[15%] right-[12%] opacity-10">
            <Hexagon className="h-24 w-24 text-indigo-400" strokeWidth={0.5} />
          </div>
          {/* Circle mid right */}
          <div className="absolute top-[35%] right-[8%] opacity-8">
            <Circle className="h-16 w-16 text-purple-400" strokeWidth={0.5} />
          </div>
          {/* Triangle lower right */}
          <div className="absolute bottom-[25%] right-[18%] opacity-10">
            <Triangle className="h-20 w-20 text-pink-400" strokeWidth={0.5} />
          </div>
          {/* Square top left area */}
          <div className="absolute top-[20%] left-[8%] opacity-8">
            <Square className="h-14 w-14 text-indigo-400 rotate-45" strokeWidth={0.5} />
          </div>
          {/* Small circles scattered */}
          <div className="absolute top-[60%] right-[25%] h-3 w-3 rounded-full bg-indigo-500/20" />
          <div className="absolute top-[45%] right-[15%] h-2 w-2 rounded-full bg-purple-500/20" />
          <div className="absolute bottom-[30%] right-[30%] h-4 w-4 rounded-full bg-pink-500/10" />
        </div>
        
        <div className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-12 sm:py-20">
          <div className="max-w-[1800px]">
            
            {/* Top bar — badge + stats */}
           

            {/* Main hero content — centered, massive */}
            <div className="text-center space-y-10">
              
              {/* Brand mark */}
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25">
                  <Gamepad2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">GameSphere</span>
              </div>

              {/* Massive headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white leading-[0.9]">
                  Play. Compete.
                </h1>
                <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]">
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Conquer.
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                The ultimate multiplayer board game arena. Real-time Chess, Connect 4, and Tic Tac Toe 
                with ranked matchmaking and live lobbies.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {token ? (
                  <Link
                    to="/lobby"
                    className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 sm:px-12 sm:py-5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300"
                  >
                    <Sword className="h-5 w-5" />
                    <span>Enter Arena</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 sm:px-12 sm:py-5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Get Started</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 px-6 py-4 sm:px-10 sm:py-5 text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800/50 hover:border-slate-600 transition-all duration-300"
                    >
                      <span>Sign In</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Game type pills */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                {['Chess', 'Connect 4', 'Tic Tac Toe'].map((game) => (
                  <span 
                    key={game}
                    className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-bold text-slate-500"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    {game}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom feature strip */}
            <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { label: 'Real-time Multiplayer', desc: 'Zero latency gameplay' },
                { label: 'ELO Ranking', desc: 'Skill-based matchmaking' },
                { label: 'Private Lobbies', desc: 'Password protected rooms' },
                { label: 'Live Chat', desc: 'In-game communication' },
              ].map((feature, i) => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300">
                  <p className="text-sm font-bold text-white mb-1">{feature.label}</p>
                  <p className="text-xs text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ GAME CATALOG ═══ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Choose Your Arena</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white">
              Three Stellar <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Arenas</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-base">
              Each game offers unique strategic depth, competitive rankings, and real-time multiplayer action.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {games.map((game, i) => (
              <div
                key={i}
                className="group rounded-[2rem] border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-6 sm:p-8 flex flex-col hover:border-indigo-500/20 transition-all duration-500"
              >
                <div className="space-y-6 flex-1">
                  <div className="flex items-center justify-between">
                    <div className={`h-14 w-14 rounded-2xl ${colorMap[game.color].bg} border ${colorMap[game.color].border} flex items-center justify-center`}>
                      <game.icon className={`h-7 w-7 ${colorMap[game.color].text}`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${colorMap[game.color].text} ${colorMap[game.color].bg} px-3 py-1 rounded-full border ${colorMap[game.color].border}`}>
                      {game.difficulty}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{game.subtitle}</p>
                    <h3 className="text-2xl font-black text-white tracking-tight">{game.title}</h3>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-500">
                    {game.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                      <Timer className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase">{game.duration}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                      <Users className="h-4 w-4 text-slate-600 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase">{game.players}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <Link
                    to={token ? "/lobby" : "/register"}
                    className="group/btn inline-flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <span>Play Now</span>
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PLAY VS AI / PRACTICE ARENA SECTION ═══ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-16 sm:py-24 border-t border-white/5 bg-slate-950/20">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 p-6 sm:p-12 md:p-16 relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.1)]">
          {/* Ambient light flares */}
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-[50px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-6 max-w-xl text-left">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2">
                <Bot className="h-4 w-4 text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Practice Arena</span>
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-tight">
                Challenge <br />
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">AlphaSphere AI</span>
              </h2>
              
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                No players online? Or just want to hone your tactics? Jump into our new **Play vs AI** mode. Complete instant ranked matches against our tactical bot in Chess, Connect 4, or Tic Tac Toe, earning ELO rating changes and XP milestones just like normal matches!
              </p>
            </div>
            
            <div className="shrink-0">
              <Link
                to="/lobby"
                className="group inline-flex items-center gap-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-8 py-4.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 active:scale-[0.98]"
              >
                <Gamepad2 className="h-5 w-5 text-white" />
                <span>Play vs AI Now</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS SECTION ═══ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto rounded-[2rem] sm:rounded-[2.5rem] glass-panel p-5 sm:p-12 md:p-16">
          <div className="grid gap-6 sm:gap-12 md:grid-cols-3">
            {stats.map((stat, i) => (
              <div key={i} className="text-center md:text-left space-y-4">
                <div className={`inline-flex items-center gap-3 rounded-2xl ${stat.colorClass} px-5 py-2.5`}>
                  <stat.icon className="h-5 w-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</span>
                </div>
                <p className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LEADERBOARD SECTION ═══ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-pink-500/20 bg-pink-500/5 px-5 py-2">
              <Crown className="h-4 w-4 text-pink-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-pink-300">Global Rankings</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white">
              Reigning <br />
              <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">Champions</span>
            </h2>
            
            <p className="text-slate-500 text-base leading-relaxed max-w-md">
              Win active matches in lobbies to gain ELO rating points and secure your position on the global leaderboard. Only the best reach the top.
            </p>
            
            <Link
              to="/leaderboard"
              className="group inline-flex items-center gap-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 px-8 py-4 text-sm font-black uppercase tracking-wider text-pink-300 hover:bg-pink-500/20 hover:border-pink-500/40 transition-all duration-300"
            >
              <span>View Full Leaderboard</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right: Leaderboard List */}
          <div className="space-y-3">
            {topPlayers.map((player) => (
              <div
                key={player.rank}
                className="group flex items-center gap-2.5 sm:gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
              >
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl font-black text-sm sm:text-lg border ${getRankStyle(player.rank)}`}>
                  {player.rank === 1 ? <Crown className="h-4 w-4 sm:h-5 sm:w-5" /> : player.rank}
                </div>
                
                <div className="hidden sm:flex h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 items-center justify-center text-sm font-black text-white">
                  {player.name[0]}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate">{player.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">ELO {player.elo}</p>
                </div>
                
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 shrink-0">
                  <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400" />
                  <span className="text-[9px] sm:text-[10px] font-black text-orange-400">{player.streak}W</span>
                </div>
                
                <ChevronRight className="hidden sm:block h-5 w-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="w-full px-4 sm:px-10 lg:px-16 xl:px-24 py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white">
            Ready to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Dominate?</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Join thousands of players competing in real-time. Your next match is waiting.
          </p>
          <Link
            to={token ? "/lobby" : "/register"}
            className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-12 py-5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300"
          >
            <Gamepad2 className="h-5 w-5" />
            <span>{token ? "Enter Arena" : "Create Account"}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
