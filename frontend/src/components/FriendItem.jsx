import { useState } from 'react';
import Avatar from './Avatar';

const FriendItem = ({ friend, onInvite, onJoinFriend, disabled, isPending, isInvited }) => {
  const [open, setOpen] = useState(false);

  const online = !!friend.online;
  const lobbyId = friend.currentLobbyId || friend.activeLobbyId || null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/40 px-3 py-2.5 hover:border-slate-800 transition duration-300">
        <div className="flex items-center gap-3">
          <Avatar src={friend.avatarUrl} alt={friend.username} size="xs" className="h-9 w-9 rounded-full border border-slate-700" />
          <div>
            <p className="text-xs font-bold text-white">{friend.username}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Rating: {friend.elo || 1200} ELO</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} title={online ? 'Online' : 'Offline'} />
          {lobbyId ? (
            <button
              onClick={() => onJoinFriend && onJoinFriend(lobbyId)}
              className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-black uppercase text-white hover:bg-indigo-500 transition"
            >
              Join
            </button>
          ) : (
            <button
              onClick={() => onInvite && onInvite(friend._id)}
              disabled={disabled}
              className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-black uppercase text-white disabled:opacity-40 transition"
            >
              {isPending ? 'Inviting...' : isInvited ? 'Reinvite' : 'Invite'}
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} className="ml-2 text-[11px] text-slate-400 hover:text-white">Profile</button>
        </div>
      </div>

      {open && (
        <div className="mt-2 rounded-2xl border border-white/5 bg-slate-950/80 p-3 text-sm text-slate-300">
          <p className="font-bold text-white">{friend.username}</p>
          <p className="text-[11px] mt-1">ELO: {friend.elo || 1200}</p>
          <p className="text-[11px] mt-1">Status: {online ? 'Online' : 'Offline'}</p>
          {lobbyId && <p className="text-[11px] mt-1">In Lobby: <span className="font-bold">{lobbyId}</span></p>}
        </div>
      )}
    </div>
  );
};

export default FriendItem;
