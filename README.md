# 🎮 GameSphere

GameSphere is a premium, real-time multiplayer gaming platform featuring classic strategic board games: **Chess**, **Connect 4**, and **Tic-Tac-Toe**. Built with a state-of-the-art web stack, it offers seamless matchmaking lobbies, real-time player presence tracking, Elo ratings, interactive profiles, custom achievements, direct messaging, and an advanced rematch system.

---

## ✨ Key Features

### ⚔️ Game Arenas
*   **Chess**: Fully implemented server-side chess engine validation supporting all legal moves (pieces movement, captures, castling, and en passant), drag-and-drop or click-to-move interactions, real-time state synchronization, move history tracking, captured pieces, and check/checkmate alerts.
*   **Connect 4**: Neon-styled grid design featuring smooth column hover indicators, drop animations, and immediate vertical, horizontal, and diagonal win detection.
*   **Tic-Tac-Toe**: Classic quick-match arena with custom neon animations and quick response cells.
*   **Spectator Mode**: Watch live matches in real-time. Spectators can join active lobby slots and view the board state updates live.
*   **Forfeit & Draw Resolutions**: Players can surrender matches instantly (forfeiting grants a win to the opponent and resolves ELO/XP changes) or request/trigger draws.

### 👥 Lobby & Matchmaking System
*   **Quick Match vs AI**: Instantly bypass waiting/ready check queues by choosing Chess, Connect 4, or Tic-Tac-Toe and spawning a private match lobby directly against **AlphaSphere AI**.
*   **Lobby Format Options**:
    *   `one-time` Lobbies: Designed for single-match showdowns, deleting themselves automatically upon match completion.
    *   `one-hour` Lobbies: Persistent game rooms that remain active for consecutive rematch sessions until the timer expires.
*   **Private & Public Lobbies**: Public lobbies are visible to everyone. Private lobbies are secure and protected with bcrypt-hashed passwords. Use the filter bar to search by game type or privacy status.
*   **Host Management Tools**:
    *   **Spectator/Player Toggle**: Hosts can switch between active playing or spectating to manage matches.
    *   **Kick Players**: Eject unwanted users from the lobby in real-time (triggers a Socket.IO event to dismiss the user).
    *   **Recruit Allies (Lobby Invites)**: Search and invite online friends directly from the lobby room. Hosts/players receive floating invitation banners to accept/dismiss requests.
*   **Lobby Highlights & Insight Cards**:
    *   *Strategy Tip*: Dynamic advice based on the chosen game.
    *   *Lobby Mood*: Tracks competitive telemetry status.
    *   *Lobby Format*: Shows duration format.
    *   *Privacy State*: Displays lock/unlock indicators.
*   **Squad Chat & Activity Log**:
    *   A live, scrollable console log logging all room socket activity (joining, ready status toggles, etc.).
    *   Lobby-wide text chat with unread message badges.
    *   **Quick Reactions Bar**: Send floating emojis (`🔥`, `⚔️`, `👑`, `🎯`, `😂`) overlays.

### 🧠 AlphaSphere AI Engine
AlphaSphere AI plays with a realistic **600ms latency delay** to simulate human reaction times. It features tailored algorithmic solvers per game type:
*   **Tic-Tac-Toe Engine**: Plays defensively and opportunistically. Checks for immediate wins; blocks opponent win lines; grabs the center square if open; attempts corner captures; and falls back to random cell moves.
*   **Connect 4 Engine**: Identifies columns that lead to instant wins; blocks opponent lines of 3; favors the strategic center column (column 3) 60% of the time; and drops tokens randomly in valid columns otherwise.
*   **Chess Engine**: Scans the board for all valid chess moves and aggressively prioritizes capture moves (80% capture weight preference) to simulate competitive chess play.

### 🏆 Profiles & Progression Trackers
*   **Elo Skill Rating**: Auto-calculated upon game completion using custom K-Factors based on game complexity:
    *   **Chess**: K-Factor of `32` (High Strategy)
    *   **Connect 4**: K-Factor of `20` (Medium Strategy)
    *   **Tic-Tac-Toe**: K-Factor of `12` (Quick Play)
*   **XP Rewards**: Earn Flat Experience Points (XP) per match outcome:
    *   `Win`: 50 XP
    *   `Draw`: 20 XP
    *   `Loss`: 10 XP
*   **Dynamic Divisions**: Automatically assigns players to division tiers based on their ELO rating:
    *   🛡️ **Rookie Division** (Below 1200 ELO)
    *   ⚔️ **Challenger Division** (1200+ ELO)
    *   💎 **Diamond Tier** (1300+ ELO)
    *   👑 **Grandmaster Tier** (1500+ ELO)
*   **Achievement Badges**: Custom glowing trophy toasts trigger in real-time when achieving milestones:
    *   🎯 **TTT Tactician**: Win 5 Tic-Tac-Toe matches.
    *   🎮 **Connect 4 Expert**: Win 5 Connect 4 matches.
    *   👑 **Chess Contender**: Win 3 Chess matches.
    *   🔥 **Streak Specialist**: Maintain a 3-game win streak.
    *   ⚔️ **Unstoppable Force**: Maintain a 5-game win streak.
    *   🏆 **Versatile Gamer**: Play competitive matches across all 3 game types.
    *   ⚡ **Gladiator**: Play 10 competitive matches.
    *   🛡️ **Arena Veteran**: Play 25 competitive matches.
    *   ⭐ **Challenger ELO**: Reach 1300 ELO skill rating.
    *   💎 **Grandmaster ELO**: Reach 1500 ELO skill rating.

### 💬 Social & Telemetry System
*   **Presence Indicators**: Tracks whether friends are online, offline, in-lobby, or spectating in real-time. Updates the friend's last active time when disconnecting.
*   **Friendship Requests**: Search users by username, send friend requests, accept/decline incoming invitations, and remove existing friends.
*   **Global Standings**: Comprehensive leaderboard sorted by ELO ratings to view the top players in the community.
*   **Direct Messaging (DMs)**: Private, real-time chat with friends, including message search filters.
*   **Dashboard Profiles**: Customize avatars (DiceBear collections), update usernames, and view detailed match history logs showing opponent name, date, outcome, game type, and ELO details.

---

## 🛠️ Technology Stack

### Frontend
*   **Core**: React (Vite)
*   **State Management**: Redux Toolkit (auth & local states)
*   **Styling**: Vanilla CSS / TailwindCSS (subtle ambient glows, glassmorphism, responsive flex layouts)
*   **Icons**: Lucide React
*   **Client Connection**: Socket.IO Client

### Backend
*   **Framework**: Node.js & Express
*   **Database**: MongoDB (Mongoose schemas)
*   **Authentication**: JSON Web Tokens (JWT) & bcryptjs hashing
*   **Real-time Protocol**: Socket.IO
*   **Architecture**: Controller-Service-Repository clean pattern

---

## 📂 Project Structure

```bash
GameSphere/
├── frontend/               # React Client codebase
│   ├── src/
│   │   ├── components/     # UI elements (GameBoard, Avatar, Layout, etc.)
│   │   ├── pages/          # Page routes (Lobby, GamePage, Profile, Friends)
│   │   ├── services/       # API and Socket helper handlers (socketService, lobbyService)
│   │   ├── store/          # Redux Toolkit auth slice
│   │   └── utils/          # Avatar seeds, SVG encoders, and helpers
│   ├── package.json
│   └── vite.config.js
│
└── backend/                # Express Server codebase
    ├── src/
    │   ├── config/         # JWT keys & DB connection settings
    │   ├── controllers/    # Route controllers (Lobbies, Users)
    │   ├── middleware/     # Auth checking middlewares
    │   ├── models/         # MongoDB Schemas (User, Match, Lobby, ChatMessage)
    │   ├── routes/         # Express endpoint mappings
    │   ├── services/       # Game moves validation & ELO calculations (games.service)
    │   ├── sockets/        # Socket.IO connection event hooks
    │   └── utils/          # AI engine, game rules, and lobby helpers
    ├── package.json
    └── server.js
```

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js (v16.x or higher)
*   MongoDB Instance (Local database or MongoDB Atlas cloud connection)

### Backend Configuration
1. Navigate to the backend directory:
    ```bash
    cd backend
    ```
2. Install server dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file in the backend root based on `.env.example`:
    ```env
    PORT=4000
    MONGODB_URI=mongodb://localhost:27017/gamesphere
    JWT_SECRET=your_jwt_secret_key_here
    VITE_SOCKET_URL=http://localhost:4000
    ```
4. Start the backend development server:
    ```bash
    npm run dev
    ```

### Frontend Configuration
1. Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2. Install client dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file in the frontend root:
    ```env
    VITE_API_URL=http://localhost:4000/api
    VITE_SOCKET_URL=http://localhost:4000
    ```
4. Launch the frontend development hot-reload server:
    ```bash
    npm run dev
    ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 📄 License
This repository is licensed under the MIT License.
