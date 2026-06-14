const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

// 🔌 kapcsolat
io.on("connection", (socket) => {
    console.log("Játékos csatlakozott:", socket.id);

    // új játékos
    players[socket.id] = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        name: "Player"
    };

    // név beállítás
    socket.on("setName", (name) => {
        if (players[socket.id]) {
            players[socket.id].name = name;
            io.emit("players", players);
        }
    });

    // mozgás
    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit("players", players);
        }
    });

    // chat
    socket.on("chat", (msg) => {
        const player = players[socket.id];
        if (!player) return;

        io.emit("chat", {
            id: socket.id,
            name: player.name,
            msg: msg
        });
    });

    // disconnect
    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", players);
    });
});

// 🌍 PORT (Render kompatibilis)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});