const socket = io();

let myName = prompt("Your nickname:");
if (!myName || myName.trim() === "") myName = "Player";

socket.emit("setName", myName);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let me = { x: 100, y: 100 };
let players = {};

socket.on("players", (data) => {
    players = data;
});

/* =========================
   WORLD SIZE (MAP LIMIT)
========================= */
const world = {
    width: 2000,
    height: 2000
};

/* =========================
   CAMERA
========================= */
let camera = { x: 0, y: 0 };

/* =========================
   BACKGROUND IMAGE
========================= */
const bg = new Image();
bg.src = "background.png";

/* =========================
   MOVEMENT
========================= */
window.addEventListener("keydown", (e) => {
    const speed = 10;

    if (e.key === "w") me.y -= speed;
    if (e.key === "s") me.y += speed;
    if (e.key === "a") me.x -= speed;
    if (e.key === "d") me.x += speed;

    socket.emit("move", me);
});

/* =========================
   RENDER LOOP
========================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🎥 CAMERA FOLLOW
    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;

    // ❗ CAMERA CLAMP (NE MENJEN KI A MAPBÓL)
    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));

    // BACKGROUND (TÖLTSE KI A TELJES MAPOT)
    if (bg.complete && bg.naturalWidth > 0) {
        for (let x = 0; x < world.width; x += bg.width) {
            for (let y = 0; y < world.height; y += bg.height) {
                ctx.drawImage(bg, x - camera.x, y - camera.y);
            }
        }
    } else {
        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // PLAYERS
    for (const id in players) {
        const p = players[id];

        const x = p.x - camera.x;
        const y = p.y - camera.y;

        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(x, y, 32, 32);

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(p.name || "Player", x, y - 5);

        if (p.bubble && Date.now() - p.bubbleTime < 3000) {
            ctx.fillStyle = "yellow";
            ctx.fillText(p.bubble, x, y - 20);
        }
    }

    requestAnimationFrame(draw);
}

draw();