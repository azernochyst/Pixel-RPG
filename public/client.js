const socket = io();

let myName = prompt("Add meg a neved:");
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
   MOVEMENT (PC)
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

    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const id in players) {
        const p = players[id];

        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(p.x, p.y, 32, 32);

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(p.name || "Player", p.x, p.y - 5);

        if (p.bubble && Date.now() - p.bubbleTime < 3000) {
            ctx.fillStyle = "yellow";
            ctx.fillText(p.bubble, p.x, p.y - 20);
        }
    }

    requestAnimationFrame(draw);
}
draw();

/* =========================
   CHAT UI (TOP RIGHT FIX)
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

/* =========================
   MOBILE CONTROLS (RIGHT SIDE FIX)
========================= */
function createButton(text, right, bottom, onDown) {
    const btn = document.createElement("button");
    btn.textContent = text;

    btn.style.position = "fixed";
    btn.style.right = right + "px";
    btn.style.bottom = bottom + "px";
    btn.style.width = "60px";
    btn.style.height = "60px";
    btn.style.fontSize = "20px";
    btn.style.zIndex = "1000";
    btn.style.opacity = "0.6";

    document.body.appendChild(btn);

    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        onDown();
    });

    btn.addEventListener("mousedown", onDown);
}

const speed = 10;

// D-pad jobb oldalon
createButton("⬆️", 80, 140, () => {
    me.y -= speed;
    socket.emit("move", me);
});

createButton("⬇️", 80, 20, () => {
    me.y += speed;
    socket.emit("move", me);
});

createButton("⬅️", 140, 80, () => {
    me.x -= speed;
    socket.emit("move", me);
});

createButton("➡️", 20, 80, () => {
    me.x += speed;
    socket.emit("move", me);
});