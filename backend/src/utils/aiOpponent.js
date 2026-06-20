const { validateChessMove } = require('./gameRules');

const getTicTacToeAIMove = (board, aiSymbol) => {
  const opponentSymbol = aiSymbol === 'X' ? 'O' : 'X';
  const emptyCells = [];
  
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === null) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length === 0) return null;

  // 1. Can AI win?
  for (const cell of emptyCells) {
    const testBoard = board.map(row => row.slice());
    testBoard[cell.row][cell.col] = aiSymbol;
    if (checkTicTacToeWinner(testBoard) === aiSymbol) {
      return cell;
    }
  }

  // 2. Can opponent win? Block it!
  for (const cell of emptyCells) {
    const testBoard = board.map(row => row.slice());
    testBoard[cell.row][cell.col] = opponentSymbol;
    if (checkTicTacToeWinner(testBoard) === opponentSymbol) {
      return cell;
    }
  }

  // 3. Take center if open
  const center = emptyCells.find(cell => cell.row === 1 && cell.col === 1);
  if (center) return center;

  // 4. Random corners
  const corners = emptyCells.filter(cell => (cell.row === 0 || cell.row === 2) && (cell.col === 0 || cell.col === 2));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Random
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

const checkTicTacToeWinner = (board) => {
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

const getConnect4AIMove = (board, aiSymbol) => {
  const opponentSymbol = aiSymbol === 'X' ? 'O' : 'X';
  const validColumns = [];
  
  for (let c = 0; c < 7; c++) {
    if (board[0][c] === null) {
      validColumns.push(c);
    }
  }

  if (validColumns.length === 0) return null;

  // 1. Can AI win?
  for (const col of validColumns) {
    const testBoard = board.map(row => row.slice());
    let placedRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (testBoard[r][col] === null) {
        testBoard[r][col] = aiSymbol;
        placedRow = r;
        break;
      }
    }
    if (placedRow !== -1 && checkConnect4Winner(testBoard, placedRow, col, aiSymbol)) {
      return { column: col };
    }
  }

  // 2. Can opponent win? Block it!
  for (const col of validColumns) {
    const testBoard = board.map(row => row.slice());
    let placedRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (testBoard[r][col] === null) {
        testBoard[r][col] = opponentSymbol;
        placedRow = r;
        break;
      }
    }
    if (placedRow !== -1 && checkConnect4Winner(testBoard, placedRow, col, opponentSymbol)) {
      return { column: col };
    }
  }

  // 3. Favor center column
  if (validColumns.includes(3) && Math.random() < 0.6) {
    return { column: 3 };
  }

  // 4. Random column
  const randomCol = validColumns[Math.floor(Math.random() * validColumns.length)];
  return { column: randomCol };
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
    if (total >= 4) return symbol;
  }
  return null;
};

const getChessAIMove = (board, aiSymbol) => {
  const color = aiSymbol === 'white' ? 'w' : 'b';
  const validMoves = [];

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece[0] === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            try {
              validateChessMove(board, { row: fromRow, col: fromCol }, { row: toRow, col: toCol }, aiSymbol);
              const targetPiece = board[toRow][toCol];
              validMoves.push({
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                captures: !!targetPiece
              });
            } catch (e) {
              // invalid move, skip
            }
          }
        }
      }
    }
  }

  if (validMoves.length === 0) return null;

  const captureMoves = validMoves.filter(m => m.captures);
  if (captureMoves.length > 0 && Math.random() < 0.8) {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
  }

  return validMoves[Math.floor(Math.random() * validMoves.length)];
};

const getAIMove = (gameType, board, aiSymbol) => {
  switch (gameType) {
    case 'tic-tac-toe':
      return getTicTacToeAIMove(board, aiSymbol);
    case 'connect4':
      return getConnect4AIMove(board, aiSymbol);
    case 'chess':
      return getChessAIMove(board, aiSymbol);
    default:
      return null;
  }
};

module.exports = {
  getAIMove
};
