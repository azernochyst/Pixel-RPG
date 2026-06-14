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
   WORLD + CAMERA
========================= */
let world = {
    width: 2000,
    height: 2000
};

let camera = { x: 0, y: 0 };

/* =========================
   INPUT STATE (ÚJ!)
========================= */
let keys = {
    w: false,
    a: false,
    s: false,
    d: false
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
   KEY DOWN / UP (SMOOTH MOVEMENT)
========================= */
window.addEventListener("keydown", (e) => {
    if (e.key === "w") keys.w = true;
    if (e.key === "a") keys.a = true;
    if (e.key === "s") keys.s = true;
    if (e.key === "d") keys.d = true;

    if (e.key === " ") socket.emit("attack");
});

window.addEventListener("keyup", (e) => {
    if (e.key === "w") keys.w = false;
    if (e.key === "a") keys.a = false;
    if (e.key === "s") keys.s = false;
    if (e.key === "d") keys.d = false;
});

/* =========================
   MOBILE HOLD SYSTEM
========================= */
let mobileKeys = {
    w: false,
    a: false,
    s: false,
    d: false
};

function holdButton(text, left, bottom, key) {
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
        mobileKeys[key] = true;
    });

    btn.addEventListener("touchend", () => {
        mobileKeys[key] = false;
    });

    btn.addEventListener("mousedown", () => {
        mobileKeys[key] = true;
    });

    btn.addEventListener("mouseup", () => {
        mobileKeys[key] = false;
    });

    btn.addEventListener("mouseleave", () => {
        mobileKeys[key] = false;
    });
}

/* =========================
   BUTTONS
========================= */
holdButton("W", 80, 140, "w");
holdButton("S", 80, 20, "s");
holdButton("A", 20, 80, "a");
holdButton("D", 140, 80, "d");

createButton("⚔️", 140, 200, () => {
    socket.emit("attack");
});

/* =========================
   NORMAL SPEED MOVEMENT (FIX)
========================= */
const speed = 4; // ⚡ sokkal “game-feeling”

function updateMovement() {
    const k = keys;
    const m = mobileKeys;

    const up = k.w || m.w;
    const down = k.s || m.s;
    const left = k.a || m.a;
    const right = k.d || m.d;

    if (up) me.y -= speed;
    if (down) me.y += speed;
    if (left) me.x -= speed;
    if (right) me.x += speed;

    socket.emit("move", me);
}

/* =========================
   DRAW LOOP
========================= */
function draw() {
    updateMovement(); // 🔥 folyamatos movement

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    camera.x = me.x - canvas.width / 2;
    camera.y = me.y - canvas.height / 2;

    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));

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

    for (const id in players) {
        const p = players[id];

        const x = p.x - camera.x;
        const y = p.y - camera.y;

        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(x, y, 32, 32);

        if (p.hp !== undefined) {
            ctx.fillStyle = "black";
            ctx.fillRect(x, y - 18, 32, 5);

            ctx.fillStyle = "lime";
            ctx.fillRect(x, y - 18, 32 * (p.hp / 100), 5);
        }

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(p.name || "Player", x, y + 45);
    }

    requestAnimationFrame(draw);
}
draw();

/* =========================
   CHAT (UNCHANGED)
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
});