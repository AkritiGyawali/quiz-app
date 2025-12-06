# 🎯 QuizMaster - Real-time Multiplayer Quiz Game

A real-time multiplayer quiz application built with **Flask** and **Socket.IO**. Host interactive quiz games where multiple players can join, compete, and see live scores updated in real-time.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)
![Socket.IO](https://img.shields.io/badge/Socket.IO-5.x-black.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## ✨ Features

- 🎮 **Real-time Multiplayer** - Multiple players can join and play simultaneously
- 🏠 **Room-based Games** - Create private game rooms with unique 6-digit codes
- ⚡ **Live Score Updates** - See scores update instantly as players answer
- 🏆 **Speed Bonuses** - Faster correct answers earn bonus points
- 📊 **Detailed Statistics** - Track correct/incorrect answers and response times
- 📱 **Responsive Design** - Works on desktop and mobile devices

---

## 🔧 How It Works

### WebSocket Communication (Socket.IO)

This application uses **Socket.IO** for real-time bidirectional communication between the server and clients:

```
┌─────────────┐         WebSocket          ┌─────────────┐
│    HOST     │ ◄─────────────────────────► │   SERVER    │
│  (Browser)  │                             │   (Flask)   │
└─────────────┘                             └─────────────┘
                                                   ▲
                                                   │ WebSocket
                                                   ▼
                                            ┌─────────────┐
                                            │   PLAYERS   │
                                            │ (Browsers)  │
                                            └─────────────┘
```

**Key Socket Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `host_create_game` | Client → Server | Host creates a new game room |
| `game_created` | Server → Client | Returns room code to host |
| `player_join` | Client → Server | Player joins with name and room code |
| `host_start_game` | Client → Server | Host starts the quiz |
| `new_question` | Server → Clients | Broadcasts question to all players |
| `player_submit_answer` | Client → Server | Player submits their answer |
| `timer_tick` | Server → Clients | Countdown timer updates |
| `round_result` | Server → Clients | Shows correct answer and scores |
| `game_over` | Server → Clients | Final standings and scores |

### Game Flow

1. **Host** creates a game and receives a 6-digit room code
2. **Players** join using the room code and their name
3. **Host** starts the game when all players have joined
4. **Questions** are displayed with a 15-second timer
5. **Players** select answers; faster correct answers earn bonus points
6. **Scores** update in real-time after each question
7. **Final standings** are displayed at the end

### Scoring System

- ✅ Correct Answer: **+5 points**
- ❌ Wrong Answer: **-5 points**
- ⏭️ Skipped: **0 points**
- 🥇 1st Fastest Correct: **+10 bonus**
- 🥈 2nd Fastest Correct: **+5 bonus**
- 🥉 3rd Fastest Correct: **+2 bonus**

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/quiz-app.git
   cd quiz-app
   ```

2. **Create a virtual environment**

   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**

   - **Linux/macOS:**
     ```bash
     source venv/bin/activate
     ```
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**

   ```bash
   python app.py
   ```

6. **Open in browser**

   Navigate to `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
quiz-app/
├── app.py              # Flask server with Socket.IO
├── requirements.txt    # Python dependencies
├── index.html          # Frontend HTML
├── style.css           # Styles
├── script.js           # Frontend JavaScript (Socket.IO client)
├── data/
│   └── gk_sansthan.json    # Quiz questions database
└── README.md
```

---

## 🎮 How to Play

### As a Host:
1. Click **"Host Game"**
2. Share the 6-digit room code with players
3. Wait for players to join
4. Click **"Start Game"** when ready
5. Click **"Next Question"** after each round

### As a Player:
1. Click **"Join Game"**
2. Enter your name and the room code
3. Wait for the host to start
4. Answer questions as fast as you can!

---

## 🛠️ Technologies Used

- **Backend:** Flask, Flask-SocketIO
- **Frontend:** HTML5, TailwindCSS, JavaScript
- **Real-time:** Socket.IO (WebSocket)
- **Styling:** TailwindCSS

---

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Contact

For questions or feedback, please open an issue on GitHub.
