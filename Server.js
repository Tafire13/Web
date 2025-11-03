const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "loading.html"));
});
app.use(express.static(__dirname));


let players = [];
let wordList = [];
const wordPath = path.join(__dirname, "public", "wordlist.txt");
if (fs.existsSync(wordPath)) {
    const text = fs.readFileSync(wordPath, "utf8");
    wordList = text.split(/\r?\n/).filter(Boolean);
    console.log(`Loaded ${wordList.length} words from wordlist.txt`);
} else {
    console.log("wordlist.txt not found!");
}

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    if (players.length >= 4) {
        socket.emit("roomFull");
        socket.disconnect();
        return;
    }
    const playerNumber = players.length + 1;
    const playerName = `Player ${playerNumber}`;
    const player = { id: socket.id, name: playerName };
    players.push(player);
    io.emit("updatePlayers", players);

    socket.on("renamePlayer", (newName) => {
        const p = players.find(p => p.id === socket.id);
        if (p) {
            p.name = newName || p.name;
            io.emit("updatePlayers", players);
        }
    });
    socket.on("startGame", (duration) => {
        const firstPlayer = players[0];
        if (firstPlayer && socket.id === firstPlayer.id) {
            console.log(`Game starting in 3 seconds (duration ${duration || "?"} min)`);
            io.emit("gameStarting", duration);
            setTimeout(() => {
                io.emit("gameStarted", duration);
                console.log("Game started for everyone!");
            }, 3000);
        } else {
            socket.emit("notAllowed", "Only Player 1 can start the game!");
        }
    });

    socket.on("disconnect", () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit("updatePlayers", players);
        console.log(`Player disconnected. (${players.length}/4 left)`);
    });
});
setInterval(() => {
    if (wordList.length === 0) return;

    const animals = ["pig", "goose", "wolf", "chick"];
    const batch = [];

    for (let i = 0; i < 2; i++) {
        batch.push({
            type: animals[Math.floor(Math.random() * animals.length)],
            word: wordList[Math.floor(Math.random() * wordList.length)],
            y: Math.floor(Math.random() * 400 + 150),
            goRight: Math.random() < 0.5
        });
    }

    io.emit("spawnAnimal", batch);
}, 2000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
