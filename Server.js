const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "loading.html"));
});
app.use(express.static(__dirname));
let players = [];

io.on("connection", (socket) => {
    console.log("A player connected:", socket.id);

    if (players.length >= 4) {
        socket.emit("roomFull");
        socket.disconnect();
        return;
    }

    socket.on("setName", (name) => {
        const playerNumber = players.length + 1;
        const playerName = name || `Player ${playerNumber}`;
        players.push({ id: socket.id, name: playerName });
        io.emit("updatePlayers", players);
        console.log(`${playerName} joined (${players.length}/4)`);
    });

    socket.on("disconnect", () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit("updatePlayers", players);
        console.log(`Player left (${players.length}/4)`);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
