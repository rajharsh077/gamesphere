# 🎮 GameSphere

GameSphere is a premium, real-time multiplayer gaming platform featuring classic strategic games such as **Chess**, **Connect 4**, and **Tic-Tac-Toe**. Built with a state-of-the-art tech stack, it provides seamless matchmaking lobbies, real-time player presence tracking, ELO ratings, profile card previews, direct messages, and an interactive achievements/rematch system.

---

## ✨ Key Features

### ⚔️ Game Arenas
*   **Chess**: Fully implemented chess engine validation with complete movement rules (capture, castling, en passant) and interactive board states.
*   **Connect 4**: Smooth column-dropping grid pattern logic, with automatic vertical, horizontal, and diagonal win detection.
*   **Tic-Tac-Toe**: Neon-styled quick-match classic.
*   **AlphaSphere AI**: Intelligent opponent engine supporting local training matches across all game types.

### 👥 Lobby & Matchmaking System
*   **Dynamic Custom Banners**: Monochrome, game-themed background watermarks that dynamically adapt based on Chess, Connect 4, or Tic-Tac-Toe configurations.
*   **Lobby Durations**: Support for `one-time` quick match lobbies and persistent `one-hour` lobbies.
*   **Player Profile Previews**: Click on any player in the lobby to inspect their mini-card (ELO, XP, Rank Tier, recent W/L form bubbles, and favorite game charts).
*   **Rematch System ("Play Again")**: Non-one-time lobbies and AI matches support an instant rematch request. The requesting player sees a `Waiting for Opponent...` pulse, while the opponent receives a glowing, bouncing `Opponent wants a rematch!` prompt with side-by-side **Accept** and **Leave** buttons.

### 🏆 Profiles & Achievements
*   **Progression Trackers**: Real-time ELO rating and Experience Points (XP) level updates upon match outcomes.
*   **Dynamic Divisions**: Auto-ranks players into divisions: `Rookie` 🛡️, `Challenger` ⚔️, `Diamond Tier` 💎, and `Grandmaster` 👑.
*   **Achievement Toasts**: Custom-styled gold ambient-glowing toasts featuring the Lucide Trophy icon trigger in real-time when profile achievements are unlocked:
    *   🎯 **TTT Tactician**: Win 5 Tic-Tac-Toe matches.
    *   🎮 **Connect 4 Expert**: Win 5 Connect 4 matches.
    *   👑 **Chess Contender**: Win 3 Chess matches.
    *   🔥 **Streak Specialist**: 3-game win streak.
    *   ⚔️ **Unstoppable Force**: 5-game win streak.
    *   🏆 **Versatile Gamer**: Play competitive matches across all 3 games.
    *   ⚡ **Gladiator**: Play 10 competitive matches.
    *   🛡️ **Arena Veteran**: Play 25 competitive matches.
    *   ⭐ **Challenger ELO**: Reach 1300 ELO skill rating.
    *   💎 **Grandmaster ELO**: Reach 1500 ELO skill rating.

### 💬 Social & Presence Telemetry
*   **Friendships**: Real-time presence indicators tracking online, offline, and in-lobby telemetry status for friends.
*   **Global Standings**: Visual percentile ranks and matchmaking form trackers.
*   **Chat Channels**: Real-time Socket.IO chat rooms for Lobbies, Live Match Arenas (with quick reaction emojis), and private Direct Messages.

---

## 🛠️ Technology Stack

### Frontend
*   **Core**: React (Vite)
*   **State Management**: Redux Toolkit (auth & local states)
*   **Styling**: Modern CSS / TailwindCSS (subtle ambient glows, glassmorphism, responsive flex layouts)
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
