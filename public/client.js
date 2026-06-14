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
   PC MOVEMENT
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

    // Füves háttér
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fű mintázat
    for (let x = 0; x < canvas.width; x += 40) {
        for (let y = 0; y < canvas.height; y += 40) {

            const r = (x * 13 + y * 7) % 3;

            if (r === 0) ctx.fillStyle = "#5dbb63";
            if (r === 1) ctx.fillStyle = "#4caf50";
            if (r === 2) ctx.fillStyle = "#43a047";

            ctx.fillRect(x, y, 40, 40);
        }
    }

    // Kövek és virágok
    for (let i = 0; i < 60; i++) {

        const x = (i * 137) % canvas.width;
        const y = (i * 211) % canvas.height;

        ctx.fillStyle = "#777";
        ctx.fillRect(x, y, 4, 4);

        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(x + 8, y + 8, 3, 3);
    }

    // Játékosok
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
   CHAT (TOP RIGHT)
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
   MOBILE CONTROLS (BOTTOM LEFT)
========================= */
function createButton(text, left, bottom, onDown) {
    const btn = document.createElement("button");
    btn.textContent = text;

    btn.style.position = "fixed";
    btn.style.left = left + "px";
    btn.style.bottom = bottom + "px";
    btn.style.width = "60px";
    btn.style.height = "60px";
    btn.style.fontSize = "16px";
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

// D-pad bal alul
createButton("W", 80, 140, () => {
    me.y -= speed;
    socket.emit("move", me);
});

createButton("S", 80, 20, () => {
    me.y += speed;
    socket.emit("move", me);
});

createButton("A", 20, 80, () => {
    me.x -= speed;
    socket.emit("move", me);
});

createButton("D", 140, 80, () => {
    me.x += speed;
    socket.emit("move", me);
});