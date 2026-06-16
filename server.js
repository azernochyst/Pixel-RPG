const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// 1. ADATBÁZIS LÉTREHOZÁSA / MEGNYITÁSA
// Létrehoz egy 'database.db' fájlt a projekt mappájában, ha még nincs ott.
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) console.error("Adatbázis hiba:", err.message);
    else console.log("Sikeresen kapcsolódva az SQLite adatbázishoz.");
});

// 2. FELHASZNÁLÓI TÁBLA LÉTREHOZÁSA
// Biztosítja, hogy a szükséges struktúra (id, egyedi név, titkosított jelszó) meglegyen.
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`);

const players = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // REGISZTRÁCIÓ KEZELÉSE (ADATBÁZISSAL)
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
            // Jelszó biztonságos titkosítása
            const hashedPassword = await bcrypt.hash(password, 10);

            // Megpróbáljuk beszúrni az új rekordot az adatbázisba
            const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
            db.run(sql, [username, hashedPassword], function (err) {
                if (err) {
                    // Ha a hibaüzenet tartalmazza, hogy 'UNIQUE', az azt jelenti a név már létezik
                    if (err.message.includes("UNIQUE")) {
                        return socket.emit("loginResponse", { success: false, message: "Ez a felhasználónév már foglalt!" });
                    }
                    return socket.emit("loginResponse", { success: false, message: "Adatbázis hiba történt." });
                }

                console.log(`Új felhasználó regisztrálva az adatbázisba: ${username}`);
                socket.emit("loginResponse", { success: true, username: username });
                
                // Játékos inicializálása a világban
                initPlayer(socket, username);
            });
        } catch (e) {
            socket.emit("loginResponse", { success: false, message: "Szerver hiba a regisztráció során." });
        }
    });

    // BELÉPÉS KEZELÉSE (ADATBÁZISSAL)
    socket.on("login", (data) => {
        if (!data || !data.username || !data.password) {
            return socket.emit("loginResponse", { success: false, message: "Hiányzó adatok!" });
        }
        const username = data.username.trim().substring(0, 15);
        const password = data.password.trim();

        // Kikérjük a felhasználót a név alapján
        const sql = `SELECT * FROM users WHERE username = ?`;
        db.get(sql, [username], async (err, row) => {
            if (err) {
                return socket.emit("loginResponse", { success: false, message: "Adatbázis hiba történt." });
            }
            if (!row) {
                return socket.emit("loginResponse", { success: false, message: "Nincs ilyen felhasználó! Regisztrálj előbb." });
            }

            // Összehasonlítjuk a beírt nyers jelszót az adatbázisban lévő titkosított jelszóval
            const match = await bcrypt.compare(password, row.password);
            if (match) {
                // Sikeres belépés
                socket.emit("loginResponse", { success: true, username: username });
                
                // Játékos inicializálása a világban
                initPlayer(socket, username);
            } else {
                socket.emit("loginResponse", { success: false, message: "Hibás jelszó!" });
            }
        });
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