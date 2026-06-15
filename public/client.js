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
let world = { width: 2000, height: 2000 };
let me = { x: 100, y: 100 };
let players = {};
let camera = { x: 0, y: 0 };
let chatBubbles = {}; 

/* =========================
   SOCKET
========================= */
socket.on("players", (data) => {
    players = data;
});

/* =========================
   CHAT
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

const chatInput = document.createElement("input");
chatInput.type = "text";
chatInput.placeholder = "Chat...";
chatInput.style.position = "fixed";
chatInput.style.top = "170px";
chatInput.style.right = "10px";
chatInput.style.width = "250px";
chatInput.style.zIndex = "1000";
document.body.appendChild(chatInput);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
        socket.emit("chat", chatInput.value);
        chatInput.value = "";
    }
});

socket.on("chat", (data) => {
    const msg = document.createElement("div");
    msg.textContent = data.name + ": " + data.msg;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    chatBubbles[data.id] = {
        text: data.msg,
        time: Date.now() + 6000 
    };
});

/* =========================
   BACKGROUND + INPUT + UI
========================= */
const bg = new Image();
bg.src = "background.png";

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
holdBtn("W",80,140,"w"); holdBtn("S",80,20,"s"); holdBtn("A",20,80,"a"); holdBtn("D",140,80,"d");

function btn(text,left,bottom,cb){
    const b=document.createElement("button");
    b.textContent=text;
    b.style.position="fixed";
    b.style.left=left+"px";
    b.style.bottom=bottom+"px";
    b.style.width = "60px";
    b.style.height = "60px";
    b.style.opacity=0.6;
    b.style.zIndex=1000;
    document.body.appendChild(b);
    b.addEventListener("click",cb);
}
btn("⚔️",140,200,()=>socket.emit("attack"));

/* =========================
   UPDATE + DRAW
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

function draw() {
    update();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    camera.x = Math.max(0, Math.min(me.x - canvas.width/2, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(me.y - canvas.height/2, world.height - canvas.height));

    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (bg.complete && bg.naturalWidth > 0) {
        for (let x = -bg.width; x < canvas.width + bg.width; x += bg.width) {
            for (let y = -bg.height; y < canvas.height + bg.height; y += bg.height) {
                ctx.drawImage(bg, x - (camera.x % bg.width), y - (camera.y % bg.height), bg.width, bg.height);
            }
        }
    }

    for (const id in players) {
        const p = players[id];
        const x = p.x - camera.x;
        const y = p.y - camera.y;

        // 1. Karakter méret: 48x48
        const size = 48;
        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(x, y, size, size);

        // 2. HP sáv (igazítva az új mérethez)
        if (p.hp !== undefined) {
            ctx.fillStyle = "black";
            ctx.fillRect(x, y - 10, size, 6);
            ctx.fillStyle = "lime";
            ctx.fillRect(x, y - 10, size * (p.hp / 100), 6);
        }

        // 3. Név (vastagabb, nagyobb, középre igazítva)
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(p.name || "Player", x + (size / 2), y - 20);

        // 4. Buborék rajzolása
        if (chatBubbles[id] && chatBubbles[id].time > Date.now()) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const text = chatBubbles[id].text;
            ctx.font = "14px Arial";
            const textWidth = ctx.measureText(text).width;
            
            ctx.fillRect(x + (size / 2) - (textWidth / 2) - 5, y - 65, textWidth + 10, 25);
            ctx.fillStyle = "white";
            ctx.fillText(text, x + (size / 2), y - 48);
        }
    }
    requestAnimationFrame(draw);
}
draw();