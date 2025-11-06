const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "loading.html")));

let players = [];
let scores = {};
let wordList = [];
let activeWords = [];
let gameEnded = false;
let animalSpawnInterval;

const wordPath = path.join(__dirname, "public", "wordlist.txt");
if (fs.existsSync(wordPath)) {
    const text = fs.readFileSync(wordPath, "utf8");
    wordList = text.split(/\r?\n/).filter(Boolean);
    console.log(`Loaded ${wordList.length} words`);
}

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    if (players.length >= 4) {
        socket.emit("roomFull");
        socket.disconnect();
        return;
    }

    const player = { id: socket.id, name: `Player ${players.length + 1}` };
    players.push(player);
    scores[socket.id] = 0;
    io.emit("updatePlayers", players);

    socket.on("registerPlayerName", (realName) => {
        const p = players.find((p) => p.id === socket.id);
        if (p && realName && realName !== "Unknown") {
            p.name = realName;
            io.emit("updatePlayers", players);
            socket.emit("nameUpdated", realName);
            console.log(`Registered name: ${p.name}`);
        }
    });

    socket.on("renamePlayer", (newName) => {
        const p = players.find((p) => p.id === socket.id);
        if (p && newName) {
            p.name = newName;
            io.emit("updatePlayers", players);
            console.log(`Renamed to ${p.name}`);
        }
    });

    socket.on("startGame", (duration) => {
        const first = players[0];
        if (first && socket.id === first.id) {
            gameEnded = false;
            io.emit("gameStarting", duration);
            setTimeout(() => {
                io.emit("gameStarted", duration);
                startAnimalSpawning();
            }, 3000);
        }
    });

    socket.on("gameEnded", () => {
        if (!gameEnded) {
            gameEnded = true;
            stopAnimalSpawning();
            
            // ส่งคะแนนสุดท้ายไปยังผู้เล่นทุกคน
            const finalScores = players.map((p) => ({
                name: p.name,
                score: scores[p.id] || 0,
            }));
            
            io.emit("gameOver", finalScores);
        }
    });

    socket.on("removeAnimal", (word) => {
        const cleaned = word.trim().toLowerCase();
        const idx = activeWords.findIndex((w) => w.word === cleaned);
        if (idx !== -1) {
            activeWords.splice(idx, 1);
            scores[socket.id] = (scores[socket.id] || 0) + 1;
            io.emit("removeAnimal", cleaned);
            io.emit(
                "updateScores",
                players.map((p) => ({
                    name: p.name,
                    score: scores[p.id] || 0,
                }))
            );
        }
    });

    socket.on("disconnect", () => {
        players = players.filter((p) => p.id !== socket.id);
        delete scores[socket.id];
        io.emit("updatePlayers", players);
        console.log("Disconnected:", socket.id);
    });
});

function startAnimalSpawning() {
    if (animalSpawnInterval) {
        clearInterval(animalSpawnInterval);
    }
    
    animalSpawnInterval = setInterval(() => {
        if (!wordList.length || gameEnded) return;
        
        const animals = ["pig", "goose", "wolf", "chick"];
        const batch = [];
        for (let i = 0; i < 2; i++) {
            const word = wordList[Math.floor(Math.random() * wordList.length)].trim();
            if (!word) continue;
            batch.push({
                type: animals[Math.floor(Math.random() * animals.length)],
                word,
                y: Math.floor(Math.random() * 400 + 150),
                goRight: Math.random() < 0.5,
            });
            activeWords.push({ word: word.toLowerCase(), time: Date.now() });
        }
        io.emit("spawnAnimal", batch);
    }, 2000);
}

function stopAnimalSpawning() {
    if (animalSpawnInterval) {
        clearInterval(animalSpawnInterval);
        animalSpawnInterval = null;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
