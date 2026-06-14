const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

io.on("connection", (socket) => {
    console.log("Játékos csatlakozott:", socket.id);

    // új játékos
    players[socket.id] = {
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    name: "Player"
};
socket.on("setName", (name) => {
    if (players[socket.id]) {
        players[socket.id].name = name;
        io.emit("players", players);
    }
});
    // küldjük mindenkinek
    io.emit("players", players);

    socket.on("move", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            io.emit("players", players);
        }
    });
socket.on("chat", (msg) => {
    const player = players[socket.id];

    if (!player) return;

    io.emit("chat", {
        id: socket.id,
        name: player.name,
        msg: msg
    });
});
    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", players);
    });
});

server.listen(3000, () => {
    console.log("Szerver fut: http://localhost:3000");
});