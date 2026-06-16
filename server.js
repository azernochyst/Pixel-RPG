const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};
// Memóriában tárolt felhasználók regisztrációhoz (Szerver restartkor ürül)
const registeredUsers = {}; 

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // REGISZTRÁCIÓ KEZELÉSE
    socket.on("register", (data) => {
        if (!data || !data.username || !data.password) {
            return socket.emit("loginResponse", { success: false, message: "Hiányzó adatok!" });
        }
        const username = data.username.trim().substring(0, 15);
        const password = data.password.trim();

        if (username === "" || password === "") {
            return socket.emit("loginResponse", { success: false, message: "A mezők nem lehetnek üresek!" });
        }

        if (registeredUsers[username]) {
            socket.emit("loginResponse", { success: false, message: "Ez a felhasználónév már foglalt!" });
        } else {
            // Mentés a memóriába
            registeredUsers[username] = password;
            socket.emit("loginResponse", { success: true, username: username });
            
            // Játékos inicializálása a világban
            initPlayer(socket, username);
        }
    });

    // BELÉPÉS KEZELÉSE
    socket.on("login", (data) => {
        if (!data || !data.username || !data.password) {
            return socket.emit("loginResponse", { success: false, message: "Hiányzó adatok!" });
        }
        const username = data.username.trim().substring(0, 15);
        const password = data.password.trim();

        if (!registeredUsers[username]) {
            socket.emit("loginResponse", { success: false, message: "Nincs ilyen felhasználó! Regisztrálj előbb." });
        } else if (registeredUsers[username] !== password) {
            socket.emit("loginResponse", { success: false, message: "Hibás jelszó!" });
        } else {
            // Sikeres belépés
            socket.emit("loginResponse", { success: true, username: username });
            
            // Játékos inicializálása a világban
            initPlayer(socket, username);
        }
    });

    // Közös segédfüggvény a játékos világba helyezéséhez
    function initPlayer(socket, username) {
        players[socket.id] = {
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            name: username,
            hp: 100,
            isAdmin: false,
            lastAttackTime: 0
        };
        io.emit("players", players);
    }

    // A korábbi névbeállító eseményekre már nincs szükségünk a login miatt, de a /nick parancshoz a changeName-et meghagyjuk:
    socket.on("changeName", (newName) => {
        if (players[socket.id]) {
            players[socket.id].name = newName.toString().substring(0, 15);
            io.emit("players", players);
        }
    });

    socket.on("adminCommand", (cmd) => {
        if (players[socket.id] && players[socket.id].name === "Azern" && cmd === "/azern") {
            players[socket.id].isAdmin = true;
            io.emit("players", players);
        }
    });

    socket.on("move", (data) => {
        if (!players[socket.id]) return;
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        io.emit("players", players);
    });

    socket.on("chat", (msg) => {
        const p = players[socket.id];
        if (!p || !msg) return;
        const cleanMsg = msg.toString().substring(0, 50);
        io.emit("chat", { id: socket.id, name: p.name, msg: cleanMsg });
    });

    socket.on("attack", () => {
        const attacker = players[socket.id];
        if (!attacker) return;

        const now = Date.now();
        if (attacker.lastAttackTime && (now - attacker.lastAttackTime < 1000)) {
            return;
        }
        attacker.lastAttackTime = now;

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

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});