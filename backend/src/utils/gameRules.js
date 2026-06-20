const createInitialBoard = (gameType) => {
  switch (gameType) {
    case 'tic-tac-toe':
      return Array.from({ length: 3 }, () => Array(3).fill(null));
    case 'connect4':
      return Array.from({ length: 6 }, () => Array(7).fill(null));
    case 'chess':
      return [
        ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
        Array(8).fill('bp'),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill('wp'),
        ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
      ];
    default:
      throw new Error(`Unsupported game type: ${gameType}`);
  }
};

const getInitialPlayerSymbols = (gameType) => {
  if (gameType === 'chess') return ['white', 'black'];
  return ['X', 'O'];
};

const getNextTurn = (gameType, currentTurn) => {
  if (gameType === 'chess') {
    return currentTurn === 'white' ? 'black' : 'white';
  }
  return currentTurn === 'X' ? 'O' : 'X';
};

const isBoardFull = (board) => board.every((row) => row.every((cell) => cell !== null));

const evaluateTicTacToe = (board) => {
  const lines = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    const first = board[a[0]][a[1]];
    if (first && first === board[b[0]][b[1]] && first === board[c[0]][c[1]]) {
      return first;
    }
  }

  return null;
};

const applyTicTacToeMove = (board, move, symbol) => {
  const { row, col } = move;

  if (typeof row !== 'number' || typeof col !== 'number') {
    throw new Error('Tic-tac-toe move must include row and col as numbers');
  }

  if (row < 0 || row > 2 || col < 0 || col > 2) {
    throw new Error('Move is out of bounds');
  }

  const nextBoard = board.map((rowData) => rowData.slice());
  if (nextBoard[row][col] !== null) {
    throw new Error('Cell is already occupied');
  }

  nextBoard[row][col] = symbol;
  const winner = evaluateTicTacToe(nextBoard);
  const draw = !winner && isBoardFull(nextBoard);

  return { board: nextBoard, winner, draw };
};

const checkConnect4Winner = (board, row, col, symbol) => {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }
  ];

  const inBounds = (r, c) => r >= 0 && r < board.length && c >= 0 && c < board[0].length;

  const countInDirection = (dr, dc) => {
    let count = 0;
    let r = row + dr;
    let c = col + dc;

    while (inBounds(r, c) && board[r][c] === symbol) {
      count += 1;
      r += dr;
      c += dc;
    }

    return count;
  };

  for (const { dr, dc } of directions) {
    const total = 1 + countInDirection(dr, dc) + countInDirection(-dr, -dc);
    if (total >= 4) {
      return symbol;
    }
  }

  return null;
};

const applyConnect4Move = (board, move, symbol) => {
  const { column } = move;

  if (typeof column !== 'number') {
    throw new Error('Connect4 move must include column as a number');
  }

  if (column < 0 || column > 6) {
    throw new Error('Column is out of bounds');
  }

  const nextBoard = board.map((rowData) => rowData.slice());
  let placedRow = -1;

  for (let row = nextBoard.length - 1; row >= 0; row -= 1) {
    if (nextBoard[row][column] === null) {
      nextBoard[row][column] = symbol;
      placedRow = row;
      break;
    }
  }

  if (placedRow === -1) {
    throw new Error('Column is full');
  }

  const winner = checkConnect4Winner(nextBoard, placedRow, column, symbol);
  const draw = !winner && isBoardFull(nextBoard);

  return { board: nextBoard, winner, draw };
};

const normalizePosition = (position) => {
  if (Array.isArray(position) && position.length === 2) {
    return { row: position[0], col: position[1] };
  }
  if (position && typeof position === 'object') {
    return { row: position.row, col: position.col };
  }
  throw new Error('Position must be an array or object with row and col');
};

const isWithinBoard = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

const getPieceColor = (piece) => (piece ? piece[0] : null);

const isPathClear = (board, from, to) => {
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  let currentRow = from.row + dr;
  let currentCol = from.col + dc;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol] !== null) {
      return false;
    }
    currentRow += dr;
    currentCol += dc;
  }

  return true;
};

const validateChessMove = (board, from, to, symbol) => {
  if (!isWithinBoard(from.row, from.col) || !isWithinBoard(to.row, to.col)) {
    throw new Error('Chess move is out of bounds');
  }

  const source = board[from.row][from.col];
  if (!source) {
    throw new Error('No piece at source position');
  }

  const color = symbol === 'white' ? 'w' : 'b';
  if (getPieceColor(source) !== color) {
    throw new Error('Piece does not belong to the current player');
  }

  const destination = board[to.row][to.col];
  if (destination && getPieceColor(destination) === color) {
    throw new Error('Cannot capture your own piece');
  }

  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const type = source[1];

  const isForward = symbol === 'white' ? dr === -1 : dr === 1;
  const isDoublePawnMove = symbol === 'white' ? from.row === 6 && dr === -2 : from.row === 1 && dr === 2;

  switch (type) {
    case 'p':
      if (dc === 0 && !destination) {
        if (isForward) {
          return true;
        }
        if (isDoublePawnMove && board[from.row + dr / 2][from.col] === null) {
          return true;
        }
      }
      if (Math.abs(dc) === 1 && ((symbol === 'white' && dr === -1) || (symbol === 'black' && dr === 1)) && destination) {
        return true;
      }
      break;
    case 'n':
      if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) {
        return true;
      }
      break;
    case 'b':
      if (Math.abs(dr) === Math.abs(dc) && isPathClear(board, from, to)) {
        return true;
      }
      break;
    case 'r':
      if ((dr === 0 || dc === 0) && isPathClear(board, from, to)) {
        return true;
      }
      break;
    case 'q':
      if ((Math.abs(dr) === Math.abs(dc) || dr === 0 || dc === 0) && isPathClear(board, from, to)) {
        return true;
      }
      break;
    case 'k':
      if (Math.max(Math.abs(dr), Math.abs(dc)) === 1) {
        return true;
      }
      break;
    default:
      throw new Error('Unsupported chess piece type');
  }

  throw new Error('Invalid chess move');
};

const applyChessMove = (board, move, symbol) => {
  if (!move || !move.from || !move.to) {
    throw new Error('Chess move must include from and to positions');
  }

  const from = normalizePosition(move.from);
  const to = normalizePosition(move.to);

  validateChessMove(board, from, to, symbol);

  const nextBoard = board.map((rowData) => rowData.slice());
  const sourcePiece = nextBoard[from.row][from.col];
  const destinationPiece = nextBoard[to.row][to.col];

  nextBoard[from.row][from.col] = null;
  nextBoard[to.row][to.col] = sourcePiece;

  const winner = destinationPiece === 'bk' ? 'white' : destinationPiece === 'wk' ? 'black' : null;

  return { board: nextBoard, winner, draw: false };
};

const applyMove = (gameType, board, move, symbol) => {
  switch (gameType) {
    case 'tic-tac-toe':
      return applyTicTacToeMove(board, move, symbol);
    case 'connect4':
      return applyConnect4Move(board, move, symbol);
    case 'chess':
      return applyChessMove(board, move, symbol);
    default:
      throw new Error(`Unsupported game type: ${gameType}`);
  }
};

module.exports = {
  createInitialBoard,
  getInitialPlayerSymbols,
  getNextTurn,
  applyMove
};
