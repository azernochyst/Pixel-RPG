const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// 1. ADATBÁZIS LÉTREHOZÁSA (Bővítve x, y, hp oszlopokkal)
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) console.error("Adatbázis hiba:", err.message);
    else console.log("Sikeresen kapcsolódva az SQLite adatbázishoz.");
});

// Új oszlopok: x, y, hp (Alapértelmezett értékekkel)
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    x REAL DEFAULT 100.0,
    y REAL DEFAULT 100.0,
    hp INTEGER DEFAULT 100
)`);

const players = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // REGISZTRÁCIÓ KEZELÉSE
    socket.on("register", async (data) => {
        if (!data || !data.username || !data.password) {
            return socket.emit("loginResponse", { success: false, message: "Hiányzó adatok!" });
        }
        const username = data.username.trim().substring(0, 15);
        const password = data.password.trim();

        if (username === "" || password === "") {
            return socket.emit("loginResponse", { success: false, message: "A mezők nem lehetnek üresek!" });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
            
            db.run(sql, [username, hashedPassword], function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE")) {
                        return socket.emit("loginResponse", { success: false, message: "Ez a felhasználónév már foglalt!" });
                    }
                    return socket.emit("loginResponse", { success: false, message: "Adatbázis hiba történt." });
                }

                console.log(`Új felhasználó regisztrálva: ${username}`);
                
                // JAVÍTVA: Fix kezdő koordinátákat is küldünk
                socket.emit("loginResponse", { success: true, username: username, x: 100, y: 100 });
                
                // Új játékos inicializálása alapértelmezett koordinátákkal
                initPlayer(socket, username, 100, 100, 100);
            });
        } catch (e) {
            socket.emit("loginResponse", { success: false, message: "Szerver hiba a regisztráció során." });
        }
    });

    // BELÉPÉS KEZELÉSE
    socket.on("login", (data) => {
        if (!data || !data.username || !data.password) {
            return socket.emit("loginResponse", { success: false, message: "Hiányzó adatok!" });
        }
        const username = data.username.trim().substring(0, 15);
        const password = data.password.trim();

        const sql = `SELECT * FROM users WHERE username = ?`;
        db.get(sql, [username], async (err, row) => {
            if (err) {
                return socket.emit("loginResponse", { success: false, message: "Adatbázis hiba történt." });
            }
            if (!row) {
                return socket.emit("loginResponse", { success: false, message: "Nincs ilyen felhasználó! Regisztrálj előbb." });
            }

            try {
                const match = await bcrypt.compare(password, row.password);
                if (match) {
                    // JAVÍTVA: Biztonsági háló! Ha régi az adatbázis és nincs x, y, hp, akkor 100-ra állítja.
                    const startX = row.x ?? 100;
                    const startY = row.y ?? 100;
                    const startHp = row.hp ?? 100;

                    // JAVÍTVA: Elküldjük a biztonságos koordinátákat a kliensnek
                    socket.emit("loginResponse", { success: true, username: username, x: startX, y: startY });
                    
                    initPlayer(socket, username, startX, startY, startHp);
                } else {
                    socket.emit("loginResponse", { success: false, message: "Hibás jelszó!" });
                }
            } catch (bcryptErr) {
                socket.emit("loginResponse", { success: false, message: "Szerver hiba a belépés során." });
            }
        });
    });

    function initPlayer(socket, username, savedX, savedY, savedHp) {
        players[socket.id] = {
            dbUsername: username, 
            x: savedX ?? 100, // Dupla védelem a szerveren
            y: savedY ?? 100,
            name: username,
            hp: savedHp ?? 100,
            isAdmin: false,
            lastAttackTime: 0
        };
        io.emit("players", players);
    }

    socket.on("move", (data) => {
        if (!players[socket.id]) return;
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        players[socket.id].direction = data.direction; // Ezt is áthozzuk a kard irányához
    });

    socket.on("changeName", (newName) => {
        if (players[socket.id]) {
            players[socket.id].name = newName.toString().substring(0, 15);
        }
    });

    socket.on("adminCommand", (cmd) => {
        if (players[socket.id] && players[socket.id].name === "Azern" && cmd === "/azern") {
            players[socket.id].isAdmin = true;
        }
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
        if (attacker.lastAttackTime && (now - attacker.lastAttackTime < 1000)) return;
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
    });

    // KILÉPÉSKOR KIMENTJÜK AZ ÁLLÁST AZ ADATBÁZISBA
    socket.on("disconnect", () => {
        const p = players[socket.id];
        if (p && p.dbUsername) {
            const sql = `UPDATE users SET x = ?, y = ?, hp = ? WHERE username = ?`;
            db.run(sql, [p.x, p.y, p.hp, p.dbUsername], (err) => {
                if (err) console.error("Hiba a játékos mentésekor:", err.message);
                else console.log(`Játékos állása elmentve: ${p.dbUsername}`);
                
                delete players[socket.id];
                io.emit("players", players);
            });
        } else {
            delete players[socket.id];
            io.emit("players", players);
        }
    });
});

setInterval(() => {
    if (Object.keys(players).length > 0) {
        io.emit("players", players);
    }
}, 50); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});