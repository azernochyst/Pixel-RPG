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
   WORLD + PLAYER
========================= */
let world = {
    width: 2000,
    height: 2000
};

let me = { x: 100, y: 100 };
let players = {};

let camera = { x: 0, y: 0 };

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
   INPUT
========================= */
let keys = { w:false,a:false,s:false,d:false };
let mobile = { w:false,a:false,s:false,d:false };

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
   MOBILE HOLD BUTTONS
========================= */
function holdBtn(text, left, bottom, key) {
    const b = document.createElement("button");
    b.textContent = text;

    b.style.position = "fixed";
    b.style.left = left + "px";
    b.style.bottom = bottom + "px";
    b.style.width = "60px";
    b.style.height = "60px";
    b.style.opacity = 0.6;
    b.style.zIndex = 1000;

    document.body.appendChild(b);

    const on = () => mobile[key] = true;
    const off = () => mobile[key] = false;

    b.addEventListener("touchstart", (e)=>{e.preventDefault(); on();});
    b.addEventListener("touchend", off);
    b.addEventListener("mousedown", on);
    b.addEventListener("mouseup", off);
    b.addEventListener("mouseleave", off);
}

holdBtn("W",80,140,"w");
holdBtn("S",80,20,"s");
holdBtn("A",20,80,"a");
holdBtn("D",140,80,"d");

/* attack button */
function btn(text,left,bottom,cb){
    const b=document.createElement("button");
    b.textContent=text;
    b.style.position="fixed";
    b.style.left=left+"px";
    b.style.bottom=bottom+"px";
    b.style.width="60px";
    b.style.height="60px";
    b.style.opacity=0.6;
    b.style.zIndex=1000;

    document.body.appendChild(b);
    b.addEventListener("click",cb);
}
btn("⚔️",140,200,()=>socket.emit("attack"));

/* =========================
   MOVEMENT
========================= */
const speed = 4;

function update() {
    const k = keys;
    const m = mobile;

    if (k.w || m.w) me.y -= speed;
    if (k.s || m.s) me.y += speed;
    if (k.a || m.a) me.x -= speed;
    if (k.d || m.d) me.x += speed;

    socket.emit("move", me);
}

/* =========================
   DRAW LOOP
========================= */
function draw() {
    update();

    ctx.clearRect(0,0,canvas.width,canvas.height);

    /* CAMERA */
    camera.x = me.x - canvas.width/2;
    camera.y = me.y - canvas.height/2;

    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));

    /* =========================
       BACKGROUND (SHARP TILE)
    ========================= */
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (bg.complete && bg.naturalWidth > 0) {
        const tileW = bg.width;
        const tileH = bg.height;

        for (let x = -tileW; x < canvas.width + tileW; x += tileW) {
            for (let y = -tileH; y < canvas.height + tileH; y += tileH) {
                ctx.drawImage(
                    bg,
                    x - (camera.x % tileW),
                    y - (camera.y % tileH),
                    tileW,
                    tileH
                );
            }
        }
    }

    /* =========================
       PLAYERS
    ========================= */
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