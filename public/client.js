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

/* =========================
   PLAYER
========================= */
let me = { x: 100, y: 100 };
let players = {};

/* =========================
   CAMERA
========================= */
let camera = { x: 0, y: 0 };

/* =========================
   WORLD
========================= */
const world = {
    width: 2000,
    height: 2000
};

/* =========================
   SOCKET
========================= */
socket.on("players", (data) => {
    players = data;
});

/* =========================
   BACKGROUND
========================= */
const bg = new Image();
bg.src = "background.png";

/* =========================
   MOVEMENT + ATTACK
========================= */
window.addEventListener("keydown", (e) => {
    const speed = 10;

    if (e.key === "w") me.y -= speed;
    if (e.key === "s") me.y += speed;
    if (e.key === "a") me.x -= speed;
    if (e.key === "d") me.x += speed;

    socket.emit("move", me);

    if (e.key === " ") {
        socket.emit("attack");
    }
});

/* =========================
   DRAW LOOP
========================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;

    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));

    /* BACKGROUND */
    if (bg.complete && bg.naturalWidth > 0) {
        const tileW = bg.width;
        const tileH = bg.height;

        for (let x = -tileW; x < canvas.width + tileW; x += tileW) {
            for (let y = -tileH; y < canvas.height + tileH; y += tileH) {
                ctx.drawImage(bg, x - (camera.x % tileW), y - (camera.y % tileH));
            }
        }
    } else {
        ctx.fillStyle = "#2e7d32";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /* PLAYERS */
    for (const id in players) {
        const p = players[id];

        const x = p.x - camera.x;
        const y = p.y - camera.y;

        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(x, y, 32, 32);

        /* HP */
        if (p.hp !== undefined) {
            ctx.fillStyle = "black";
            ctx.fillRect(x, y - 18, 32, 5);

            ctx.fillStyle = "lime";
            ctx.fillRect(x, y - 18, 32 * (p.hp / 100), 5);
        }

        /* NAME (a HP ALATT) */
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(p.name || "Player", x, y + 45);

        /* BUBBLE */
        if (p.bubble && Date.now() - p.bubbleTime < 3000) {
            ctx.fillStyle = "yellow";
            ctx.fillText(p.bubble, x, y - 30);
        }
    }

    requestAnimationFrame(draw);
}
draw();

/* =========================
   CHAT UI
========================= */
const chatBox = document.createElement("div");
chatBox.style.position = "fixed";
chatBox.style.top = "10px";
chatBox.style.right = "10px";
chatBox.style.width = "250px";
chatBox.style.height = "150px";
chatBox.style.overflowY = "auto";
chatBox.style.background = "rgba(0,0,0,0.5)";
chatBox.style.color = "white";
chatBox.style.padding = "5px";
chatBox.style.fontSize = "12px";
chatBox.style.zIndex = "1000";
document.body.appendChild(chatBox);

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Chat...";
input.style.position = "fixed";
input.style.top = "170px";
input.style.right = "10px";
input.style.width = "250px";
input.style.zIndex = "1000";
document.body.appendChild(input);

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") {
        socket.emit("chat", input.value);
        input.value = "";
    }
});

socket.on("chat", (data) => {
    const msg = document.createElement("div");
    msg.textContent = data.name + ": " + data.msg;

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (players[data.id]) {
        players[data.id].bubble = data.msg;
        players[data.id].bubbleTime = Date.now();
    }
});