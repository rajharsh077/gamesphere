import React from 'react';
import { Search, Gamepad2, Star, Zap, Trophy, Users, Clock, UserCheck } from 'lucide-react';
import CustomSelect from './CustomSelect';

const LobbyFilters = ({ filters, setFilters, gameTypes, search, setSearch, sortBy, setSortBy }) => {
  const selectOptions = [
    { value: 'all', label: 'Game Type', icon: Gamepad2 },
    { value: 'tic-tac-toe', label: 'Tic Tac Toe', icon: Star },
    { value: 'connect4', label: 'Connect 4', icon: Zap },
    { value: 'chess', label: 'Chess', icon: Trophy }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest Lobbies', icon: Clock },
    { value: 'friends-inside', label: 'Friends Inside', icon: UserCheck }
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center w-full mb-6">
      {/* Search Input */}
      <div className="relative w-full sm:flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lobbies..."
          className="w-full rounded-2xl border border-white/5 bg-slate-950/45 pl-11 pr-4 py-3 text-xs text-white outline-none focus:border-indigo-500/60 focus:bg-slate-950/70 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 font-bold"
        />
      </div>

      {/* Game Type Custom Select */}
      <div className="w-full sm:w-44">
        <CustomSelect
          value={filters.gameType}
          onChange={(val) => setFilters((f) => ({ ...f, gameType: val }))}
          options={selectOptions}
          icon={Gamepad2}
          className="border-white/5 bg-slate-950/40 text-slate-400 hover:text-white"
        />
      </div>

      {/* Sort Selector */}
      <div className="w-full sm:w-44">
        <CustomSelect
          value={sortBy}
          onChange={setSortBy}
          options={sortOptions}
          icon={Clock}
          className="border-white/5 bg-slate-950/40 text-slate-400 hover:text-white"
        />
      </div>

      {/* Status / Privacy Segmented Control */}
      <div className="flex rounded-2xl border border-white/5 bg-slate-950/40 p-1 gap-1 w-full sm:w-auto shrink-0 shadow-inner">
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, privacy: 'all' }))}
          className={`flex-1 sm:flex-initial rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition duration-300 active:scale-95 ${
            filters.privacy === 'all'
              ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, privacy: 'public' }))}
          className={`flex-1 sm:flex-initial rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition duration-300 active:scale-95 ${
            filters.privacy === 'public'
              ? 'bg-emerald-650 bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, privacy: 'private' }))}
          className={`flex-1 sm:flex-initial rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition duration-300 active:scale-95 ${
            filters.privacy === 'private'
              ? 'bg-rose-650 bg-rose-600 text-white shadow-md shadow-rose-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Private
        </button>
      </div>
    </div>
  );
};

export default LobbyFilters;

