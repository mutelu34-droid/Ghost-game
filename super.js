const hero = document.getElementById("name");
const firstMonster = document.getElementById("player");
const game = document.getElementById("game");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const upButton = document.getElementById("up");
const downButton = document.getElementById("down");
const leftButton = document.getElementById("left");
const rightButton = document.getElementById("right");
const jumpButton = document.getElementById("jump");
const attackButton = document.getElementById("attack");

const TILE = 48;                // 16px art drawn at 3x
const characterSize = 48;
const heroSpeed = 260;          // pixels per second
const upgradeButton = document.getElementById("upgrade");
const gameOverEl = document.getElementById("gameover");
const finalScoreEl = document.getElementById("finalScore");
// Weapon levels: damage, reach (px), cooldown (ms), upgrade cost (gold), look
const weapons = [
    { name: "Rusty Sword", dmg: 10, range: 90, cd: 380, cost: 0, glow: "#c9a070", filter: "sepia(1) saturate(1.5)" },
    { name: "Iron Sword", dmg: 16, range: 100, cd: 350, cost: 30, glow: "#cfd8e8", filter: "none" },
    { name: "Steel Blade", dmg: 24, range: 112, cd: 320, cost: 70, glow: "#5bc8ff", filter: "hue-rotate(150deg) saturate(1.8) drop-shadow(0 0 4px #5bc8ff)" },
    { name: "Flame Blade", dmg: 34, range: 124, cd: 290, cost: 130, glow: "#ff8a30", filter: "sepia(1) saturate(5) hue-rotate(-25deg) drop-shadow(0 0 6px #ff6a00)" },
    { name: "Dragon Slayer", dmg: 48, range: 140, cd: 260, cost: 220, glow: "#d070ff", filter: "sepia(1) saturate(5) hue-rotate(235deg) drop-shadow(0 0 8px #c050ff)" }
];
const monsterHp = { goblin: 20, skeleton: 28, slime: 24, bat: 14 };
let weaponLevel = 1, gold = 0;
function weapon() { return weapons[weaponLevel - 1]; }
const jumpDuration = 600;
const maxJumpHeight = 46;
const maxHp = 5;

let heroX, heroY, hp, score, wave, armed, gameOver, facing = 1, moving = false;
let isJumping = false, jumpHeight = 0, jumpStartedAt = 0;
let lastAttack = 0, invulnerableUntil = 0, lastTime = 0;
let monsters = [];
let swordEl = null, swordHand = null;
let cols, rows, solid = [];
const held = { up: false, down: false, left: false, right: false };

function rand(min, max) { return min + Math.random() * (max - min); }
function keepInside(value, max) { return Math.max(0, Math.min(value, max - characterSize)); }
function say(text) { statusEl.textContent = text; }

// ---------- Pixel sprites (drawn from text grids) ----------
function sprite(rowsArr, pal, mirror = false, size = 16) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    rowsArr.forEach((r, y) => {
        r = mirror ? r.padEnd(size / 2, ".").slice(0, size / 2) : r.padEnd(size, ".");
        if (mirror) r += [...r].reverse().join("");
        [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } });
    });
    return `url(${c.toDataURL()})`;
}

const SPR = {
    knight: sprite([
        "......RR", ".....RRR", "....KKKKKK", "...KSSSSSsK", "...KSKKKKsK", "...KSSSSSsK", "....KKssKK",
        "..KKBBBBBBKK", ".KSKBBGGBBKSK", ".KSKBBBBBBKSK", "..KFBBBBBBFK", "...KBBBBBBK", "...KssKKssK",
        "...KsKK.KsK", "..KKKK...KKKK"
    ], { K: "#1a1420", S: "#b8c4d4", s: "#7a8aa0", R: "#c7324b", G: "#e8b83a", B: "#3b5ba5", F: "#f0c8a0" }),
    sword: sprite([
        "..............SW", ".............SWs", "............SWs", "...........SWs", "..........SWs", ".........SWs",
        "....G...SWs", ".....G.SWs", "......GWs", ".....G.G", "....N", "...N", "..N", ".GG", ".G"
    ], { S: "#d8e2f0", W: "#ffffff", s: "#8fa0b8", G: "#e8b83a", N: "#7a4a2a" }),
    goblin: sprite([
        "", "", "....KKKK", "..KKGGGG", "GGKGGRRG", "KGKGGGGG", "..KGGKKK", "..KGGWKW", "...KKKKK",
        "..KNNNNN", ".KNNNNNN", ".GKNNNNN", ".GKNNNNN", "..KNNKKK", "..KGGK", "..KKKK"
    ], { K: "#1a1420", G: "#5fa84a", R: "#ff4040", W: "#f4f1e8", N: "#7a4a2a" }, true),
    skeleton: sprite([
        "", "", "...KKKKK", "..KWWWWW", "..KWKKWW", "..KWKKWW", "..KWWWWW", "...KWKWK", "....KKKK",
        "KW.KWWWW", "KW.WKKKK", "KW.KWWWW", ".K.WKKKK", "...KsWWW", "..KWWKWW", "..KWKKWK"
    ], { K: "#1a1420", W: "#e8e2cc", s: "#a39f8a" }, true),
    slime: sprite([
        "", "", "", "", "", "", "....KKKK", "..KKPPPP", ".KPLLPPP", ".KPPWKPP", ".KPPWKPP", "KPPPPPPP",
        "KPPPKKKP", "KPPPPPPP", ".KKPPPPP", "..KKKKKK"
    ], { K: "#1a1420", P: "#7a4fd0", L: "#b79cf2", W: "#f4f1e8" }, true),
    bat: sprite([
        "", "", "", ".....K", "....KDK", "....KDDK", "K..KDRDD", "KK.KDDDD", "KDKDDDDD", "KDDDDDDD",
        ".KDDDKDW", "..KKDDKK", "....KKK"
    ], { K: "#1a1420", D: "#6a4a9a", R: "#ff4040", W: "#f4f1e8" }, true),
    heart: sprite([".RR..RR.", "RRRRRRRR", "RRRRRRRR", "RRRRRRRR", ".RRRRRR.", "..RRRR..", "...RR..."],
        { R: "#d8344b" }, false, 8),
    heartEmpty: sprite([".RR..RR.", "RRRRRRRR", "RRRRRRRR", "RRRRRRRR", ".RRRRRR.", "..RRRR..", "...RR..."],
        { R: "#4a3a3a" }, false, 8)
};
const monsterTypes = ["goblin", "skeleton", "slime", "bat"];

hero.style.backgroundImage = SPR.knight;

function updateStats() {
    const hearts = Array.from({ length: maxHp }, (_, i) =>
        `<span class="heart" style="background-image:${i < hp ? SPR.heart : SPR.heartEmpty}"></span>`).join("");
    const w = weapon();
    statsEl.innerHTML = `<span>${hearts}</span><span>Score ${score}</span><span>Wave ${wave}</span>` +
        `<span class="gold">Gold ${gold}</span><span>${armed ? `${w.name} DMG ${w.dmg}` : "No weapon"}</span>`;
    const next = weapons[weaponLevel];
    upgradeButton.textContent = next ? `Upgrade ${next.cost}g` : "MAX";
    upgradeButton.classList.toggle("cant", !next || gold < next.cost || !armed);
}

// Floating damage / info numbers
function showDmg(x, y, text, cls = "") {
    const d = document.createElement("span");
    d.className = `dmg ${cls}`;
    d.textContent = text;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    game.appendChild(d);
    setTimeout(() => d.remove(), 800);
}

// ---------- Medieval map (grass, dirt road, pond, castle wall, forest) ----------
const mapCanvas = document.createElement("canvas");
mapCanvas.id = "map";
game.prepend(mapCanvas);

function drawTile(g, t, ox, oy, r, c) {
    const P = (x, y, col) => { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); };
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); };
    const grass = () => {
        R(0, 0, 16, 16, (r + c) % 2 ? "#4a7c3a" : "#477838");
        for (let i = 0; i < 6; i++) P(Math.floor(rand(0, 16)), Math.floor(rand(0, 16)), i % 2 ? "#5a8f46" : "#3d6b30");
    };
    if (t === 1) {                                   // dirt road
        R(0, 0, 16, 16, "#a98558");
        for (let i = 0; i < 9; i++) P(Math.floor(rand(0, 16)), Math.floor(rand(0, 16)), i % 2 ? "#c4a070" : "#8d6d42");
    } else if (t === 2) {                            // pond
        R(0, 0, 16, 16, "#2f5fa8");
        for (let i = 0; i < 3; i++) R(Math.floor(rand(0, 12)), Math.floor(rand(0, 15)), 3, 1, "#5b93da");
    } else if (t === 3) {                            // castle wall
        R(0, 0, 16, 16, "#80808e");
        R(0, 0, 16, 1, "#4e4e5a"); R(0, 5, 16, 1, "#4e4e5a"); R(0, 10, 16, 1, "#4e4e5a"); R(0, 15, 16, 1, "#4e4e5a");
        for (let k = 0; k < 3; k++) { const o = (k % 2) * 4; R(o, k * 5, 1, 5, "#4e4e5a"); R(o + 8, k * 5, 1, 5, "#4e4e5a"); }
        R(0, 1, 16, 1, "#9a9aa8");
    } else {
        grass();
        if (t === 4) {                               // tree
            R(7, 11, 3, 5, "#5a3a1e");
            for (let y = 0; y < 13; y++) for (let x = 0; x < 16; x++) {
                const d = Math.hypot(x - 8, y - 6.5);
                if (d < 6.5) P(x, y, d > 5.4 ? "#1d3a1a" : (x + y) % 5 === 0 ? "#3f8238" : "#2d5a27");
            }
        } else if (t === 5) {                        // rock
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
                const d = Math.hypot((x - 8) / 5, (y - 11) / 3.2);
                if (d < 1) P(x, y, d > 0.8 ? "#3a3a44" : y < 10 ? "#a0a0ac" : "#7c7c88");
            }
        } else if (t === 6) {                        // flowers
            [[3, 4, "#f4f1e8"], [11, 9, "#f2c230"], [6, 12, "#e0505f"]].forEach(([x, y, col]) => { P(x, y, col); P(x, y + 1, "#2f5a24"); });
        }
    }
}

function buildMap() {
    cols = Math.ceil(game.clientWidth / TILE);
    rows = Math.ceil(game.clientHeight / TILE);
    const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
        const edge = r < 1 || c < 1 || r >= rows - 1 || c >= cols - 1;
        const n = Math.random();
        if (edge) return n < 0.75 ? 4 : 0;
        return n < 0.05 ? 4 : n < 0.08 ? 5 : n < 0.14 ? 6 : 0;
    }));
    if (cols >= 10 && rows >= 8) {                   // pond
        const cx = cols * 0.2, cy = rows * 0.4;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
            if (((c - cx) / 2.3) ** 2 + ((r - cy) / 1.7) ** 2 < 1) grid[r][c] = 2;
    }
    if (cols >= 12 && rows >= 8) {                   // castle wall with a gate
        for (let c = cols - 10; c <= cols - 3; c++) {
            const gate = c === cols - 7 || c === cols - 6;
            grid[2][c] = grid[3][c] = gate ? 1 : 3;
        }
    }
    const mr = Math.floor(rows / 2), mc = Math.floor(cols / 2);   // dirt road crossing the middle
    for (let c = 0; c < cols; c++) grid[mr][c] = grid[mr + 1] ? grid[mr + 1][c] = 1 : 1;
    for (let r = 0; r < rows; r++) grid[r][mc] = grid[r][mc + 1] = 1;

    solid = grid.map((row) => row.map((t) => t >= 2 && t <= 5));
    mapCanvas.width = cols * 16;
    mapCanvas.height = rows * 16;
    mapCanvas.style.width = `${cols * TILE}px`;
    mapCanvas.style.height = `${rows * TILE}px`;
    const g = mapCanvas.getContext("2d");
    grid.forEach((row, r) => row.forEach((t, c) => drawTile(g, t, c * 16, r * 16, r, c)));
}

// Hero feet box against solid tiles (trees, rocks, water, walls).
function blocked(x, y) {
    return [[x + 12, y + 28], [x + 36, y + 28], [x + 12, y + 46], [x + 36, y + 46]]
        .some(([px, py]) => solid[Math.floor(py / TILE)]?.[Math.floor(px / TILE)]);
}

// ---------- Rendering ----------
function renderHero(now) {
    const bob = moving && !isJumping ? Math.abs(Math.sin(now / 70)) * 3 : 0;
    const s = isJumping ? 1.08 : 1;
    hero.style.transform = `translate(${heroX}px, ${heroY - jumpHeight - bob}px) scale(${facing * s}, ${s})`;
}

function renderMonster(m, now) {
    const bob = Math.sin(now / 120 + m.phase) * 3;
    const flip = heroX < m.x ? -1 : 1;
    m.el.style.transform = `translate(${m.x}px, ${m.y + bob}px) scaleX(${flip})`;
    m.bar.style.transform = `translate(${m.x + 4}px, ${m.y - 8}px)`;
}

// ---------- Monsters ----------
function spawnMonster() {
    const useFirst = !firstMonster.dataset.used;
    const el = useFirst ? firstMonster : document.createElement("span");
    firstMonster.dataset.used = "1";
    el.className = "monster";
    el.style.display = "";
    const type = monsterTypes[Math.floor(rand(0, 4))];
    el.style.backgroundImage = SPR[type];
    if (!el.parentNode) game.appendChild(el);

    let x, y, tries = 0;                             // random edge, far from the hero
    do {
        const edge = Math.floor(rand(0, 4));
        x = edge === 0 ? 0 : edge === 1 ? game.clientWidth - characterSize : rand(0, game.clientWidth - characterSize);
        y = edge === 2 ? 0 : edge === 3 ? game.clientHeight - characterSize : rand(0, game.clientHeight - characterSize);
    } while (Math.hypot(x - heroX, y - heroY) < 300 && ++tries < 20);

    const hpMax = monsterHp[type] + wave * 6;
    const bar = document.createElement("span");
    bar.className = "hpbar";
    bar.innerHTML = "<i></i>";
    game.appendChild(bar);
    const m = { el, bar, x, y, hp: hpMax, hpMax, phase: rand(0, 6), speed: Math.min(55 + wave * 9, 150) + rand(-10, 10) };
    monsters.push(m);
    renderMonster(m, 0);
}

function startWave() {
    for (let i = 0; i < 2 + wave; i++) spawnMonster();
    say(armed ? `Wave ${wave}: ຟັນສັດຮ້າຍໃຫ້ໝົດ!` : "ເກັບດາບກ່ອນ ແລ້ວຄ່ອຍຟັນ!");
    updateStats();
}

// ---------- Sword ----------
function spawnSword() {
    let c, r, tries = 0;
    do {
        c = Math.floor(rand(2, cols - 2)); r = Math.floor(rand(3, rows - 2));
    } while ((solid[r][c] || Math.hypot(c * TILE - heroX, r * TILE - heroY) < 200) && ++tries < 60);
    swordEl = document.createElement("span");
    swordEl.className = "sword-pickup";
    swordEl.style.backgroundImage = SPR.sword;
    swordEl.dataset.x = c * TILE;
    swordEl.dataset.y = r * TILE;
    swordEl.style.left = `${c * TILE}px`;
    swordEl.style.top = `${r * TILE}px`;
    game.appendChild(swordEl);
}

function applyWeaponLook() {
    if (swordHand) swordHand.style.filter = weapon().filter;
}

function grabSword() {
    armed = true;
    swordEl.remove();
    swordEl = null;
    swordHand = document.createElement("span");
    swordHand.className = "sword-hand";
    swordHand.style.backgroundImage = SPR.sword;
    hero.appendChild(swordHand);
    applyWeaponLook();
    say("ໄດ້ດາບແລ້ວ! ກົດ J ຟັນ, ກົດ U ເພື່ອອັບເກຣດດາບດ້ວຍຄຳ");
    updateStats();
}

// ---------- Actions ----------
// Jumping makes the hero untouchable for a moment.
function jump() {
    if (gameOver || isJumping) return;
    isJumping = true;
    jumpStartedAt = performance.now();
}

function updateJump(now) {
    if (!isJumping) return;
    const progress = (now - jumpStartedAt) / jumpDuration;
    if (progress >= 1) { isJumping = false; jumpHeight = 0; return; }
    jumpHeight = Math.sin(progress * Math.PI) * maxJumpHeight;
}

function killMonster(m) {
    score += 10;
    gold += 5 + wave * 2;
    m.bar.remove();
    m.el.classList.add("hit");
    setTimeout(() => { if (m.el === firstMonster) m.el.style.display = "none"; else m.el.remove(); }, 220);
}

function attack() {
    if (gameOver) return;
    if (!armed) { say("ເກັບດາບກ່ອນ!"); return; }
    const w = weapon();
    const now = performance.now();
    if (now - lastAttack < w.cd) return;
    lastAttack = now;

    swordHand.classList.remove("swing");
    void swordHand.offsetWidth;                      // restart the swing animation
    swordHand.classList.add("swing");

    const slash = document.createElement("span");
    slash.className = "slash";
    slash.style.width = slash.style.height = `${w.range * 2}px`;
    slash.style.margin = `${-w.range}px 0 0 ${-w.range}px`;
    slash.style.borderRightColor = w.glow;
    slash.style.left = `${heroX + characterSize / 2}px`;
    slash.style.top = `${heroY + characterSize / 2}px`;
    game.appendChild(slash);
    setTimeout(() => slash.remove(), 260);

    let killed = 0;
    for (const m of monsters) {
        const dist = Math.hypot(m.x - heroX, m.y - heroY);
        if (dist > w.range) continue;
        const crit = Math.random() < 0.15;
        const dmg = Math.round(w.dmg * (crit ? 2 : 1) * rand(0.9, 1.1));
        m.hp -= dmg;
        showDmg(m.x + 14, m.y - 18, crit ? `${dmg}!` : dmg, crit ? "crit" : "");
        m.el.classList.add("flash");
        setTimeout(() => m.el.classList.remove("flash"), 90);
        if (dist > 0) { m.x += ((m.x - heroX) / dist) * 22; m.y += ((m.y - heroY) / dist) * 22; }
        if (m.hp <= 0) { killMonster(m); killed++; }
        else m.bar.firstChild.style.width = `${(m.hp / m.hpMax) * 100}%`;
    }
    monsters = monsters.filter((m) => m.hp > 0);
    updateStats();

    if (killed && monsters.length === 0) {
        wave++;
        score += 25;
        gold += 20;
        say(`ຊະນະ Wave ${wave - 1}! +25 ຄະແນນ +20 ຄຳ`);
        updateStats();
        setTimeout(() => { if (!gameOver) startWave(); }, 900);
    }
}

function upgrade() {
    if (gameOver) return;
    if (!armed) { say("ເກັບດາບກ່ອນ!"); return; }
    const next = weapons[weaponLevel];
    if (!next) { say("ດາບຂັ້ນສູງສຸດແລ້ວ!"); return; }
    if (gold < next.cost) { say(`ຕ້ອງການຄຳ ${next.cost} (ມີ ${gold})`); return; }
    gold -= next.cost;
    weaponLevel++;
    applyWeaponLook();
    say(`ອັບເກຣດແລ້ວ: ${next.name} — DMG ${next.dmg}`);
    showDmg(heroX - 10, heroY - 30, "UPGRADE!", "up");
    updateStats();
}

// ---------- Input ----------
function bindHold(button, dir) {
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); held[dir] = true; });
}
bindHold(upButton, "up");
bindHold(downButton, "down");
bindHold(leftButton, "left");
bindHold(rightButton, "right");
["pointerup", "pointercancel", "blur"].forEach((type) =>
    window.addEventListener(type, () => { held.up = held.down = held.left = held.right = false; }));

function bindTouchButton(button, action) {
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); action(); });
}
bindTouchButton(jumpButton, jump);
bindTouchButton(attackButton, attack);

const keyDirs = {
    ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right"
};

document.addEventListener("keydown", (event) => {
    if (gameOver && (event.key === "Enter" || event.key === "r" || event.key === "R")) { restart(false); return; }
    if (event.key === "u" || event.key === "U") { upgrade(); return; }
    if (event.key === " " || event.key === "Spacebar") { event.preventDefault(); jump(); return; }
    if ("jJkK".includes(event.key) && event.key.length === 1) { attack(); return; }
    const dir = keyDirs[event.key];
    if (!dir) return;
    event.preventDefault();
    held[dir] = true;
});
document.addEventListener("keyup", (event) => { const dir = keyDirs[event.key]; if (dir) held[dir] = false; });

window.addEventListener("resize", () => {
    buildMap();
    heroX = keepInside(heroX, game.clientWidth);
    heroY = keepInside(heroY, game.clientHeight);
    if (blocked(heroX, heroY)) { heroX = game.clientWidth / 2 - 24; heroY = Math.floor(rows / 2) * TILE; }
});

// ---------- Main loop ----------
function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!gameOver) {
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
        const len = Math.hypot(dx, dy) || 1;
        moving = dx !== 0 || dy !== 0;
        if (dx) facing = dx;
        const nx = keepInside(heroX + (dx / len) * heroSpeed * dt, game.clientWidth);
        if (!blocked(nx, heroY)) heroX = nx;
        const ny = keepInside(heroY + (dy / len) * heroSpeed * dt, game.clientHeight);
        if (!blocked(heroX, ny)) heroY = ny;

        updateJump(now);
        renderHero(now);

        if (swordEl && Math.hypot(heroX - swordEl.dataset.x, heroY - swordEl.dataset.y) < 50) grabSword();

        for (const m of monsters) {
            const mx = heroX - m.x, my = heroY - m.y;
            const dist = Math.hypot(mx, my);
            if (dist > 0) { m.x += (mx / dist) * m.speed * dt; m.y += (my / dist) * m.speed * dt; }
            renderMonster(m, now);

            if (dist < 36 && !isJumping && now > invulnerableUntil) {
                hp--;
                invulnerableUntil = now + 1000;
                hero.classList.add("hurt");
                setTimeout(() => hero.classList.remove("hurt"), 1000);
                const kx = keepInside(heroX - (mx / (dist || 1)) * 70, game.clientWidth);
                const ky = keepInside(heroY - (my / (dist || 1)) * 70, game.clientHeight);
                if (!blocked(kx, ky)) { heroX = kx; heroY = ky; }
                showDmg(heroX + 8, heroY - 20, "-1", "hurt");
                updateStats();
                if (hp <= 0) {
                    endGame();
                    break;
                }
            }
        }
    }
    requestAnimationFrame(tick);
}

// ---------- Death, respawn, new game ----------
function endGame() {
    gameOver = true;
    game.classList.add("caught");
    held.up = held.down = held.left = held.right = false;
    finalScoreEl.textContent = `Score ${score} · Wave ${wave} · Gold ${gold}`;
    gameOverEl.hidden = false;
}

// fresh = new game (reset weapon, gold, score, wave); otherwise respawn on the current wave.
function restart(fresh) {
    monsters.forEach((m) => { m.bar.remove(); if (m.el !== firstMonster) m.el.remove(); });
    monsters = [];
    firstMonster.dataset.used = "";
    firstMonster.style.display = "";
    firstMonster.className = "";
    if (fresh) {
        score = 0; wave = 1; gold = 0; weaponLevel = 1; armed = false;
        if (swordHand) { swordHand.remove(); swordHand = null; }
    }
    if (!armed) { if (swordEl) swordEl.remove(); swordEl = null; }
    game.classList.remove("caught");
    hero.classList.remove("hurt");
    gameOverEl.hidden = true;

    buildMap();
    heroX = Math.floor(cols / 2) * TILE - 24;
    heroY = Math.floor(rows / 2) * TILE;
    hp = maxHp;
    gameOver = false;
    isJumping = false; jumpHeight = 0; invulnerableUntil = 0;
    renderHero(0);
    if (!armed) spawnSword();
    startWave();
}

bindTouchButton(upgradeButton, upgrade);
document.getElementById("respawn").addEventListener("click", () => restart(false));
document.getElementById("newgame").addEventListener("click", () => restart(true));

restart(true);
requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(tick); });