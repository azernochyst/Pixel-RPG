const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

/* =========================
   CONNECTION
========================= */
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // NEW PLAYER
    players[socket.id] = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        name: "Player",
        hp: 100
    };

    io.emit("players", players);

    // NAME
    socket.on("setName", (name) => {
        if (players[socket.id]) {
            // Megszorítás: max 15 karakteres nevek
            players[socket.id].name = name.toString().substring(0, 15);
            io.emit("players", players);
        }
    });

    // MOVE
    socket.on("move", (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x = data.x;
        players[socket.id].y = data.y;

        io.emit("players", players);
    });

    // CHAT
    socket.on("chat", (msg) => {
        const p = players[socket.id];
        if (!p || !msg) return;

        // Megszorítás: max 50 karakteres üzenetek
        const cleanMsg = msg.toString().substring(0, 50);

        io.emit("chat", {
            id: socket.id, // Ez a legfontosabb a buborékhoz
            name: p.name,
            msg: cleanMsg
        });
    });

    // ATTACK
    socket.on("attack", () => {
        const attacker = players[socket.id];
        if (!attacker) return;

        const range = 60;

        for (const id in players) {
            if (id === socket.id) continue;

            const p = players[id];
            const dx = p.x - attacker.x;
            const dy = p.y - attacker.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < range) {
                p.hp -= 20;

                if (p.hp <= 0) {
                    p.hp = 100;
                    p.x = 100 + Math.random() * 300;
                    p.y = 100 + Math.random() * 300;
                }
            }
        }
        io.emit("players", players);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", players);
    });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});