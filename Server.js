const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "loading.html"));
});

let players = [];

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
    console.log(`${playerName} joined (${players.length}/4)`);
    socket.on("renamePlayer", (newName) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.name = newName || player.name;
            io.emit("updatePlayers", players);
            console.log(`Player ${socket.id} renamed to ${newName}`);
        }
    });
    socket.on("startGame", () => {
        const firstPlayer = players[0];
        if (firstPlayer && socket.id === firstPlayer.id) {
            console.log("Game started by Player 1");
            io.emit("gameStarted");
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
