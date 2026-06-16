const socket = io();

/* =========================
   LOGIN UI AND LOGIC
========================= */
const loginScreen = document.createElement("div");
loginScreen.id = "login-screen";
loginScreen.style.position = "fixed";
loginScreen.style.top = "0";
loginScreen.style.left = "0";
loginScreen.style.width = "100%";
loginScreen.style.height = "100%";
loginScreen.style.background = "#1a1a1a";
loginScreen.style.display = "flex";
loginScreen.style.flexDirection = "column";
loginScreen.style.justifyContent = "center";
loginScreen.style.alignItems = "center";
loginScreen.style.zIndex = "9999";
loginScreen.style.color = "white";
loginScreen.style.fontFamily = "Arial, sans-serif";

loginScreen.innerHTML = `
    <h2 style="margin-bottom: 20px; letter-spacing: 2px; color: #ff3333;">FIDELITY TOWN RPG</h2>
    <input type="text" id="username" placeholder="Username" style="padding: 12px; margin: 6px; width: 220px; border: none; border-radius: 4px; background: #333; color: white;">
    <input type="password" id="password" placeholder="Password" style="padding: 12px; margin: 6px; width: 220px; border: none; border-radius: 4px; background: #333; color: white;">
    <div style="margin-top: 15px;">
        <button id="btn-login" style="padding: 10px 20px; margin: 5px; cursor: pointer; border: none; border-radius: 4px; background: #ff3333; color: white; font-weight: bold;">Login</button>
        <button id="btn-register" style="padding: 10px 20px; margin: 5px; cursor: pointer; border: none; border-radius: 4px; background: #2196f3; color: white; font-weight: bold;">Register</button>
    </div>
    <p id="login-error" style="color: #ff5252; margin-top: 15px; font-size: 14px; height: 20px;"></p>
`;
document.body.appendChild(loginScreen);

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const loginError = document.getElementById("login-error");

let myName = "Player";
let gameStarted = false; 

btnRegister.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (user && pass) {
        socket.emit("register", { username: user, password: pass });
    } else {
        loginError.textContent = "Please fill in both fields!";
    }
});

btnLogin.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (user && pass) {
        socket.emit("login", { username: user, password: pass });
    } else {
        loginError.textContent = "Please fill in both fields!";
    }
});

socket.on("loginResponse", (data) => {
    if (data.success) {
        loginScreen.style.display = "none";
        myName = data.username;
        gameStarted = true;
    } else {
        if (data.message === "Ez a felhasználónév már foglalt!") {
            loginError.textContent = "This username is already taken!";
        } else if (data.message === "Nincs ilyen felhasználó! Regisztrálj előbb.") {
            loginError.textContent = "User does not exist! Please register first.";
        } else if (data.message === "Hibás jelszó!") {
            loginError.textContent = "Incorrect password!";
        } else if (data.message === "A mezők nem lehetnek üresek!") {
            loginError.textContent = "Fields cannot be empty!";
        } else if (data.message === "Hiányzó adatok!") {
            loginError.textContent = "Missing data!";
        } else {
            loginError.textContent = data.message;
        }
    }
});

/* =========================
   GAME BASICS & ASSETS
========================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const bg = new Image();
bg.src = "background.png";

const swordImg = new Image();
swordImg.src = "sword.png"; 

let world = { width: 2000, height: 2000 };
let me = { x: 100, y: 100 };
let players = {};
let camera = { x: 0, y: 0 };
let chatBubbles = {}; 

let myDirection = "down"; 
let attackVisualTimer = 0; 

socket.on("players", (data) => { 
    players = data; 
    if (players[socket.id] && me.x === 100 && me.y === 100) {
        me.x = players[socket.id].x;
        me.y = players[socket.id].y;
    }
});

/* =========================
   CHAT + COMMANDS
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
chatInput.placeholder = "Chat or /cmd...";
chatInput.style.position = "fixed";
chatInput.style.top = "170px";
chatInput.style.right = "10px";
chatInput.style.width = "250px";
chatInput.style.zIndex = "1000";
document.body.appendChild(chatInput);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const val = chatInput.value.trim();
        if (val.startsWith("/")) {
            const parts = val.split(" ");
            const cmd = parts[0].toLowerCase();
            const arg = parts.slice(1).join(" ");
            
            if (cmd === "/nick" && arg !== "") {
                socket.emit("changeName", arg);
                myName = arg;
            } else if (cmd === "/azern") {
                socket.emit("adminCommand", "/azern");
            } else if (cmd === "/help") {
                const help = document.createElement("div");
                help.style.color = "yellow";
                help.textContent = "Commands: /nick [name]";
                chatBox.appendChild(help);
            }
        } else {
            socket.emit("chat", val);
        }
        chatInput.value = "";
    }
});

socket.on("chat", (data) => {
    const msg = document.createElement("div");
    msg.textContent = data.name + ": " + data.msg;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    chatBubbles[data.id] = { text: data.msg, time: Date.now() + 6000 };
});

/* =========================
   INPUTS & MOVEMENT
========================= */
let keys = { w:false,a:false,s:false,d:false };
let mobile = { w:false,a:false,s:false,d:false };

function localAttack() {
    socket.emit("attack");
    attackVisualTimer = 10; 
}

window.addEventListener("keydown", (e) => {
    if (!gameStarted) return; 
    if (document.activeElement === chatInput || document.activeElement === usernameInput || document.activeElement === passwordInput) return; 

    if (e.key === "w") { keys.w = true; myDirection = "up"; }
    if (e.key === "a") { keys.a = true; myDirection = "left"; }
    if (e.key === "s") { keys.s = true; myDirection = "down"; }
    if (e.key === "d") { keys.d = true; myDirection = "right"; }
    if (e.key === " ") localAttack();
});

window.addEventListener("keyup", (e) => {
    if (e.key === "w") keys.w = false;
    if (e.key === "a") keys.a = false;
    if (e.key === "s") keys.s = false;
    if (e.key === "d") keys.d = false;
});

function holdBtn(text, left, bottom, key, dir) {
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
    const on = () => { 
        if(gameStarted) {
            mobile[key] = true; 
            myDirection = dir;
        }
    };
    const off = () => mobile[key] = false;
    b.addEventListener("touchstart", (e)=>{e.preventDefault(); on();});
    b.addEventListener("touchend", off);
    b.addEventListener("mousedown", on);
    b.addEventListener("mouseup", off);
    b.addEventListener("mouseleave", off);
}
holdBtn("W",80,140,"w","up"); holdBtn("S",80,20,"s","down"); holdBtn("A",20,80,"a","left"); holdBtn("D",140,80,"d","right");

function btn(text, right, bottom, cb){
    const b = document.createElement("button");
    b.textContent = text;
    b.style.position = "fixed";
    b.style.right = right + "px";
    b.style.bottom = bottom + "px";
    b.style.width = "60px";
    b.style.height = "60px";
    b.style.opacity = 0.6;
    b.style.zIndex = 1000;
    document.body.appendChild(b);
    
    b.addEventListener("click", () => {
        if(!gameStarted) return;
        cb();
        b.disabled = true;
        b.style.opacity = 0.2;
        setTimeout(() => {
            b.disabled = false;
            b.style.opacity = 0.6;
        }, 1000);
    });
}
btn("⚔️", 20, 80, () => localAttack());

const speed = 4;
function update() {
    const k = keys;
    const m = mobile;
    if (k.w || m.w) me.y -= speed;
    if (k.s || m.s) me.y += speed;
    if (k.a || m.a) me.x -= speed;
    if (k.d || m.d) me.x += speed;
    
    me.direction = myDirection;
    socket.emit("move", me);

    if (attackVisualTimer > 0) attackVisualTimer--;
}

/* =========================
   DRAWING SYSTEM WITH WEAPON
========================= */
function draw() {
    if (!gameStarted) {
        requestAnimationFrame(draw);
        return;
    }

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
        const size = 48;

        // 1. Draw Player Base
        ctx.fillStyle = (id === socket.id) ? "red" : "blue";
        ctx.fillRect(x, y, size, size);

        // 2. DRAW SWORD (GIANT VERSION)
        if (swordImg.complete && swordImg.naturalWidth > 0) {
            ctx.save();
            
            const centerX = x + size / 2;
            const centerY = y + size / 2;
            ctx.translate(centerX, centerY);

            let dir = p.direction || "down";
            
            let angle = 0;
            if (dir === "down") angle = 0;
            if (dir === "up") angle = Math.PI; 
            if (dir === "left") angle = Math.PI / 2; 
            if (dir === "right") angle = -Math.PI / 2; 

            if (id === socket.id && attackVisualTimer > 0) {
                // Energetic slash sweep
                angle += Math.sin((attackVisualTimer / 10) * Math.PI) * 0.9; 
            }

            ctx.rotate(angle);

            // CHANGED: Massive size boost (Almost as long as the player cube!)
            const swordW = 32;  // Up from 24
            const swordH = 70;  // Up from 52
            
            // CHANGED: Calibrated offsets so the handle stays perfectly in character bounds
            let offset = 8;
            if (id === socket.id && attackVisualTimer > 0) offset = 22; 

            // CHANGED: Aligned the center-x pivot (-swordW / 3) for ideal giant look
            ctx.drawImage(swordImg, -swordW / 3, offset, swordW, swordH);
            
            ctx.restore();
        }

        // 3. Draw UI (HP Bar)
        if (p.hp !== undefined) {
            ctx.fillStyle = "black";
            ctx.fillRect(x, y - 10, size, 6);
            ctx.fillStyle = "lime";
            ctx.fillRect(x, y - 10, size * (p.hp / 100), 6);
        }

        // 4. Draw Name Tag
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        if (p.isAdmin) {
            ctx.fillStyle = "red";
            ctx.fillText("(Admin) " + p.name, x + (size / 2), y - 20);
        } else {
            ctx.fillStyle = "white";
            ctx.fillText(p.name || "Player", x + (size / 2), y - 20);
        }

        // 5. Draw Chat Bubbles
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