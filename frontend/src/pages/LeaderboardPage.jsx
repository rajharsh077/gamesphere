import { useState } from 'react';
import Avatar from '../components/Avatar';
import { getAvatarUrl } from '../utils/avatar';
import { Trophy, Medal, Sparkles, TrendingUp, Search, Eye, Award } from 'lucide-react';

const mockEloData = [
  { rank: 1, username: 'Nova', elo: 1845, xp: 9400, wins: 48, losses: 12, favorite: 'Chess', avatarSeed: 'Felix' },
  { rank: 2, username: 'Pixel', elo: 1765, xp: 8200, wins: 42, losses: 15, favorite: 'Connect 4', avatarSeed: 'Buster' },
  { rank: 3, username: 'Vortex', elo: 1680, xp: 7900, wins: 38, losses: 18, favorite: 'Tic Tac Toe', avatarSeed: 'Bella' },
  { rank: 4, username: 'Shadow', elo: 1590, xp: 6800, wins: 31, losses: 14, favorite: 'Chess', avatarSeed: 'Spooky' },
  { rank: 5, username: 'Cypher', elo: 1510, xp: 6200, wins: 27, losses: 16, favorite: 'Connect 4', avatarSeed: 'Gizmo' },
  { rank: 6, username: 'GamerX', elo: 1480, xp: 5900, wins: 25, losses: 19, favorite: 'Chess', avatarSeed: 'Midnight' },
  { rank: 7, username: 'Astro', elo: 1420, xp: 5100, wins: 21, losses: 17, favorite: 'Tic Tac Toe', avatarSeed: 'Coco' },
];

const mockXpData = [
  { rank: 1, username: 'Nova', elo: 1845, xp: 9400, wins: 48, losses: 12, favorite: 'Chess', avatarSeed: 'Felix' },
  { rank: 2, username: 'Pixel', elo: 1765, xp: 8200, wins: 42, losses: 15, favorite: 'Connect 4', avatarSeed: 'Buster' },
  { rank: 3, username: 'Vortex', elo: 1680, xp: 7900, wins: 38, losses: 18, favorite: 'Tic Tac Toe', avatarSeed: 'Bella' },
  { rank: 4, username: 'Shadow', elo: 1590, xp: 6800, wins: 31, losses: 14, favorite: 'Chess', avatarSeed: 'Spooky' },
  { rank: 5, username: 'Cypher', elo: 1510, xp: 6200, wins: 27, losses: 16, favorite: 'Connect 4', avatarSeed: 'Gizmo' },
  { rank: 6, username: 'GamerX', elo: 1480, xp: 5900, wins: 25, losses: 19, favorite: 'Chess', avatarSeed: 'Midnight' },
  { rank: 7, username: 'Astro', elo: 1420, xp: 5100, wins: 21, losses: 17, favorite: 'Tic Tac Toe', avatarSeed: 'Coco' },
];

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState('elo');
  const data = activeTab === 'elo' ? mockEloData : mockXpData;

  const podium = data.slice(0, 3);
  const rest = data.slice(3);

  // Sorting podium to put rank 1 in center, rank 2 left, rank 3 right
  const sortedPodium = [podium[1], podium[0], podium[2]];

  return (
    <section className="space-y-8 animate-slide-up">
      {/* Header Info */}
      <div className="rounded-[2rem] border border-white/5 bg-slate-950/30 p-6 sm:p-8 shadow-lg backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/5 px-3.5 py-1.5 text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.2em] shadow-[0_0_12px_rgba(99,102,241,0.15)]">
              <Trophy className="h-3.5 w-3.5" />
              <span>Competitive Standings</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Global Leaderboard</h1>
            <p className="max-w-xl text-xs leading-relaxed text-slate-400 font-medium">
              Compare ratings, ELO standings, and XP progressions. Dominate active matches to climb the podium!
            </p>
          </div>

          {/* Toggle Button */}
          <div className="flex rounded-2xl bg-slate-950 border border-white/10 p-1.5 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('elo')}
              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-350 flex items-center gap-1.5 ${
                activeTab === 'elo'
                  ? 'bg-indigo-600 text-white shadow-md glow-indigo'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>ELO Standings</span>
            </button>
            <button
              onClick={() => setActiveTab('xp')}
              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-350 flex items-center gap-1.5 ${
                activeTab === 'xp'
                  ? 'bg-indigo-600 text-white shadow-md glow-indigo'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>XP Standings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Podium View */}
      <div className="grid gap-8 md:grid-cols-3 items-end pt-12 max-w-4xl mx-auto px-4">
        {sortedPodium.map((player, idx) => {
          if (!player) return null;
          const isFirst = player.rank === 1;
          const isSecond = player.rank === 2;
          const isThird = player.rank === 3;

          const rankClass = isFirst
            ? 'border-amber-400/30 bg-amber-400/5 glow-amber'
            : isSecond
            ? 'border-slate-350/30 bg-slate-350/5 glow-silver'
            : 'border-amber-700/30 bg-amber-750/5 bg-amber-700/5 glow-bronze';

          const podiumColor = isFirst
            ? 'bg-gradient-to-t from-amber-500/20 via-amber-500/5 to-transparent'
            : isSecond
            ? 'bg-gradient-to-t from-slate-450/20 via-slate-450/5 to-transparent'
            : 'bg-gradient-to-t from-amber-700/20 via-amber-700/5 to-transparent';

          const textRank = isFirst ? 'Gold tier' : isSecond ? 'Silver tier' : 'Bronze tier';
          const avatarBorder = isFirst ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : isSecond ? 'border-slate-300' : 'border-amber-700';

          return (
            <article
              key={player.username}
              className={`relative rounded-[2rem] border p-6 text-center transition duration-300 hover:-translate-y-1.5 shadow-lg flex flex-col justify-between ${rankClass} ${podiumColor} ${
                isFirst ? 'md:py-12' : 'md:py-7'
              }`}
            >
              {/* Medal Indicator */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex h-13 w-13 items-center justify-center rounded-2xl border bg-slate-950 text-xl shadow-md h-12 w-12 border-white/10 font-bold">
                {isFirst ? '🥇' : isSecond ? '🥈' : '🥉'}
              </div>

              <div className="mt-4 flex flex-col items-center">
                <Avatar
                  src={getAvatarUrl(player.avatarSeed)}
                  alt={player.username}
                  size="md"
                  className={`h-14 w-14 rounded-full border-2 ${avatarBorder}`}
                />
                <h3 className="mt-3 text-base font-black text-white">{player.username}</h3>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">{textRank}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-4">
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase">Rating</p>
                  <p className="text-white font-black text-sm">{player.elo}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase">XP Logs</p>
                  <p className="text-indigo-400 font-black text-sm">{player.xp}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Main Ranking Table List */}
      <div className="rounded-[2.2rem] border border-white/5 bg-slate-950/20 p-6 shadow-md backdrop-blur-md">
        <h2 className="text-md font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-glow" />
          Ranking Directory
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <th className="py-4 px-5">Rank</th>
                <th className="py-4 px-5">Player</th>
                <th className="py-4 px-5">ELO Rating</th>
                <th className="py-4 px-5">Experience (XP)</th>
                <th className="py-4 px-5">Wins / Losses</th>
                <th className="py-4 px-5">Fav Mode</th>
              </tr>
            </thead>
            <tbody>
              {data.map((player) => {
                const winRate = ((player.wins / (player.wins + player.losses)) * 100).toFixed(0);
                const isTopThree = player.rank <= 3;
                const rowGlow = isTopThree ? 'bg-indigo-500/5' : 'hover:bg-slate-900/30';
                
                return (
                  <tr
                    key={player.username}
                    className={`border-b border-white/5 transition duration-300 group ${rowGlow}`}
                  >
                    <td className="py-4 px-5 font-black text-slate-400 group-hover:text-indigo-400">
                      #{player.rank}
                    </td>
                    <td className="py-4 px-5 font-black text-white flex items-center gap-3.5">
                      <Avatar
                        src={getAvatarUrl(player.avatarSeed)}
                        alt={player.username}
                        size="xs"
                        className="h-8 w-8 rounded-full border-2 border-slate-700/60"
                      />
                      <span className="font-bold">{player.username}</span>
                    </td>
                    <td className="py-4 px-5 text-slate-200 font-bold">{player.elo}</td>
                    <td className="py-4 px-5 text-slate-400 font-semibold">{player.xp.toLocaleString()} XP</td>
                    <td className="py-4 px-5 text-slate-400 font-semibold">
                      <span className="text-emerald-400">{player.wins}W</span>
                      <span className="text-slate-600 px-1">/</span>
                      <span className="text-rose-400">{player.losses}L</span>{' '}
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-950/50 border border-white/5 px-2 py-0.5 rounded ml-1.5">({winRate}%)</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-slate-400 uppercase tracking-widest font-extrabold text-[9px] bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg">
                        {player.favorite}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default LeaderboardPage;
