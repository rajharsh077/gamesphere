import React from 'react';

const chessPieceIcons = {
  wp: '♙',
  wr: '♖',
  wn: '♘',
  wb: '♗',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  br: '♜',
  bn: '♞',
  bb: '♝',
  bq: '♛',
  bk: '♚'
};

const normalizePos = (pos) => {
  if (!pos) return { row: -1, col: -1 };
  if (Array.isArray(pos) && pos.length === 2) return { row: pos[0], col: pos[1] };
  return { row: pos.row ?? -1, col: pos.col ?? -1 };
};

const GameBoard = ({ gameType, board, onCellClick, selectedCell = null, lastMove = null, wrapperRef }) => {
  if (!board || board.length === 0) {
    return <div className="text-slate-500 py-16 text-center text-xs font-semibold uppercase tracking-wider animate-pulse">Waiting for game board layout...</div>;
  }

  const renderTicTacToe = () => {
    return (
      <div ref={wrapperRef} className="w-full max-w-[420px] mx-auto p-2">
        <div className="grid grid-cols-3 gap-4">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isX = cell === 'X';
              const isO = cell === 'O';
              const isLastMove = lastMove?.move && lastMove.move.row === rowIndex && lastMove.move.col === colIndex;
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  className={`aspect-square rounded-[2rem] border transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900/40 active:scale-95 shadow-inner flex items-center justify-center p-5 group hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] ${
                    isLastMove
                      ? 'border-emerald-500/50 bg-slate-900/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/25 animate-pulse'
                      : 'border-white/5 bg-slate-950/65'
                  }`}
                >
                  {isX ? (
                    <svg className="w-full h-full text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)] piece-shadow animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  ) : isO ? (
                    <svg className="w-full h-full text-pink-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)] piece-shadow animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <circle cx="12" cy="12" r="9"></circle>
                    </svg>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-25 text-slate-500 transition duration-300 font-black text-xl">+</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderConnect4 = () => {
    return (
      <div ref={wrapperRef} className="space-y-5 max-w-[550px] mx-auto">
        {/* Column click selectors */}
        <div className="grid grid-cols-7 gap-2.5 px-3">
          {Array.from({ length: board[0].length }).map((_, colIndex) => (
            <button
              key={colIndex}
              type="button"
              onClick={() => onCellClick(colIndex)}
              className="h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-300 transition duration-300 hover:bg-indigo-600 hover:text-white hover:glow-indigo active:scale-95 flex items-center justify-center shadow-md shadow-indigo-950/20"
            >
              ↓
            </button>
          ))}
        </div>

        {/* Board grid cabinet */}
        <div className="grid gap-2.5 rounded-[2.5rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] shadow-inner">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 gap-2.5">
              {row.map((cell, colIndex) => {
                const isCyan = cell === 'X'; // Cyan disk for X
                const isFuchsia = cell === 'O'; // Fuchsia disk for O
                
                const isLastMoveCell = lastMove?.move && typeof lastMove.move.column === 'number' && colIndex === lastMove.move.column && (() => {
                  for (let r = 0; r < board.length; r++) {
                    if (board[r][colIndex] !== null) {
                      return r === rowIndex;
                    }
                  }
                  return false;
                })();

                const coinStyle = isCyan
                  ? 'bg-gradient-to-tr from-cyan-600 via-cyan-500 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.65)] border border-cyan-400/30'
                  : isFuchsia
                  ? 'bg-gradient-to-tr from-fuchsia-600 via-fuchsia-500 to-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.65)] border border-fuchsia-400/30'
                  : '';

                const coinHighlight = isLastMoveCell ? 'ring-4 ring-emerald-500/50 animate-pulse' : '';

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`aspect-square rounded-full flex items-center justify-center p-1 bg-slate-900/50 border shadow-inner transition duration-500 ${
                      isLastMoveCell ? 'border-emerald-500/40 bg-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/5'
                    }`}
                  >
                    {cell ? (
                      <div className={`w-full h-full rounded-full transition-all duration-350 ${coinStyle} ${coinHighlight} animate-coin-drop relative overflow-hidden`}>
                        <div className="absolute inset-1.5 rounded-full bg-white/10 border-t border-white/25 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-950 border border-transparent" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChess = () => {
    return (
      <div ref={wrapperRef} className="max-w-[600px] mx-auto rounded-[2rem] border border-white/10 bg-slate-950/50 p-3.5 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-8 gap-0.5 rounded-2xl overflow-hidden border border-white/5 shadow-inner">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const hasPiece = !!cell;
              const isWhitePiece = cell ? cell[0] === 'w' : false;

              const fromPos = lastMove?.move?.from ? normalizePos(lastMove.move.from) : null;
              const toPos = lastMove?.move?.to ? normalizePos(lastMove.move.to) : null;
              const isLastMoveFrom = fromPos && fromPos.row === rowIndex && fromPos.col === colIndex;
              const isLastMoveTo = toPos && toPos.row === rowIndex && toPos.col === colIndex;

              let cellBg = isLight
                ? 'bg-slate-800/40 hover:bg-slate-700/40'
                : 'bg-slate-900/50 hover:bg-slate-800/50';

              if (isSelected) {
                cellBg = 'bg-indigo-500/35 border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)] shadow-inner';
              } else if (isLastMoveTo) {
                cellBg = 'bg-emerald-500/25 border-2 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] z-10';
              } else if (isLastMoveFrom) {
                cellBg = 'bg-amber-500/15 border border-dashed border-amber-500/30';
              }

              const pieceColor = isWhitePiece
                ? 'text-slate-100 drop-shadow-[0_2px_6px_rgba(255,255,255,0.45)]'
                : 'text-indigo-400 drop-shadow-[0_2px_6px_rgba(99,102,241,0.45)]';

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  className={`aspect-square transition-all duration-300 flex items-center justify-center border border-white/5 outline-none relative ${cellBg}`}
                >
                  {hasPiece ? (
                    <span className={`text-3xl sm:text-4xl font-normal transition-transform duration-300 hover:scale-110 select-none ${pieceColor}`}>
                      {chessPieceIcons[cell] || cell}
                    </span>
                  ) : (
                    ''
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  switch (gameType) {
    case 'connect4':
      return renderConnect4();
    case 'chess':
      return renderChess();
    default:
      return renderTicTacToe();
  }
};


export default GameBoard;
