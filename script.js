const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");

const palette = {
  skyTop: "#ffeefd",
  skyBottom: "#ffd4ec",
  horizonGlow: "rgba(255, 200, 232, 0.55)",
  cloud: "#fff7ff",
  hillFar: "#f4b6da",
  hillNear: "#e993c7",
  stripe: "#f8c6e4",
  ground: "#8a3d6b",
  flowerA: "#ff6db3",
  flowerB: "#ff94c7",
  dino: "#ff5fb0",
  dinoShade: "#f04e9f",
  dinoLight: "#ffd0e9",
  dinoOutline: "#9e2c6b",
  dinoBlush: "#ff8ec5",
  bow: "#d62d89",
  obstacle: "#a63f79",
  obstacleDetail: "#c85b95",
  text: "#5c2344",
  hudBg: "rgba(255, 245, 252, 0.82)",
};

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: canvas.height - 38,
  speed: 330,
  maxSpeed: 660,
  gravity: 2050,
  spawnEvery: 1.2,
  spawnClock: 0,
};

const dino = {
  x: 70,
  y: 0,
  w: 44,
  h: 48,
  vy: 0,
  jumpForce: 760,
  grounded: true,
};

dino.y = world.groundY - dino.h;

const clouds = Array.from({ length: 6 }, (_, i) => ({
  x: 90 + i * 150,
  y: 25 + (i % 3) * 24,
  size: 24 + (i % 4) * 8,
  speed: 18 + (i % 3) * 6,
}));

const sparkles = [];

const state = {
  started: false,
  over: false,
  paused: false,
  score: 0,
  scoreFloat: 0,
  best: Number(localStorage.getItem("miniDinoBest") || "0"),
  shakeTime: 0,
  obstacles: [],
  lastTime: 0,
};

function setOverlay(text, visible) {
  overlayText.textContent = text;
  overlay.classList.toggle("visible", visible);
}

function resetGame() {
  state.over = false;
  state.paused = false;
  state.score = 0;
  state.scoreFloat = 0;
  state.shakeTime = 0;
  state.obstacles = [];
  world.speed = 330;
  world.spawnEvery = 1.2;
  world.spawnClock = 0;
  sparkles.length = 0;
  dino.y = world.groundY - dino.h;
  dino.vy = 0;
  dino.grounded = true;
  setOverlay("", false);
}

function togglePause() {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  setOverlay(state.paused ? "Paused - Press P" : "", state.paused);
}

function spawnJumpSparkles() {
  for (let i = 0; i < 6; i += 1) {
    sparkles.push({
      x: dino.x + 16 + Math.random() * 12,
      y: dino.y + dino.h - 3,
      vx: -40 + Math.random() * 70,
      vy: -70 - Math.random() * 70,
      life: 0.45 + Math.random() * 0.25,
      maxLife: 0.65,
      size: 2 + Math.random() * 2,
    });
  }
}

function jump() {
  if (!state.started) {
    state.started = true;
    resetGame();
    return;
  }

  if (state.over) {
    resetGame();
    return;
  }

  if (state.paused) return;

  if (dino.grounded) {
    dino.vy = -dino.jumpForce;
    dino.grounded = false;
    spawnJumpSparkles();
  }
}

function addObstacle() {
  const flyingChance = state.score >= 800 ? 0.28 : 0;
  const isFlying = Math.random() < flyingChance;
  const height = isFlying ? 16 + Math.random() * 14 : 24 + Math.random() * 40;
  const width = isFlying ? 30 + Math.random() * 14 : 16 + Math.random() * 22;
  const y = isFlying
    ? world.groundY - (58 + Math.random() * 34)
    : world.groundY - height;

  state.obstacles.push({
    x: world.width + width,
    y,
    w: width,
    h: height,
    type: isFlying ? "flying" : "ground",
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * dt;
    if (cloud.x + cloud.size * 2 < 0) {
      cloud.x = world.width + 30;
      cloud.y = 16 + Math.random() * 70;
      cloud.size = 20 + Math.random() * 20;
      cloud.speed = 14 + Math.random() * 16;
    }
  }

  for (let i = sparkles.length - 1; i >= 0; i -= 1) {
    const p = sparkles[i];
    p.life -= dt;
    p.vy += 260 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) {
      sparkles.splice(i, 1);
    }
  }

  if (!state.started || state.over || state.paused) return;

  world.speed = Math.min(world.maxSpeed, world.speed + dt * 7.5);
  world.spawnClock += dt;
  state.scoreFloat += dt * (world.speed * 0.09);
  while (state.scoreFloat >= 1) {
    state.score += 1;
    state.scoreFloat -= 1;
  }

  const spawnInterval = Math.max(0.45, world.spawnEvery - state.score / 3500);
  if (world.spawnClock >= spawnInterval) {
    world.spawnClock = 0;
    addObstacle();
  }

  dino.vy += world.gravity * dt;
  dino.y += dino.vy * dt;

  if (dino.y >= world.groundY - dino.h) {
    dino.y = world.groundY - dino.h;
    dino.vy = 0;
    dino.grounded = true;
  }

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obs = state.obstacles[i];
    obs.x -= world.speed * dt;

    if (obs.x + obs.w < 0) {
      state.obstacles.splice(i, 1);
      state.score += obs.type === "flying" ? 14 : 10;
      continue;
    }

    const dinoHitbox = {
      x: dino.x + 8,
      y: dino.y + 8,
      w: dino.w - 14,
      h: dino.h - 10,
    };

    if (intersects(dinoHitbox, obs)) {
      state.over = true;
      state.paused = false;
      state.shakeTime = 0.28;
      state.best = Math.max(state.best, state.score);
      localStorage.setItem("miniDinoBest", String(state.best));
      setOverlay("Game Over - Press Space", true);
      break;
    }
  }

}

function drawCloud(cloud) {
  ctx.fillStyle = palette.cloud;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.size * 0.42, 0, Math.PI * 2);
  ctx.arc(cloud.x + cloud.size * 0.45, cloud.y - 7, cloud.size * 0.35, 0, Math.PI * 2);
  ctx.arc(cloud.x + cloud.size * 0.9, cloud.y, cloud.size * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  const sunX = world.width * 0.82;
  const sunY = 56;
  const sunPulse = 36 + Math.sin(performance.now() / 900) * 2;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, sunPulse);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.horizonGlow;
  ctx.fillRect(0, world.groundY - 38, world.width, 50);

  for (const cloud of clouds) {
    drawCloud(cloud);
  }

  const twinkle = 0.4 + Math.abs(Math.sin(performance.now() / 450));
  for (let i = 0; i < 8; i += 1) {
    const x = (i * 117 + 63) % world.width;
    const y = 20 + (i % 4) * 14;
    ctx.fillStyle = `rgba(255,255,255,${(0.2 + twinkle * 0.18).toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const shiftFar = (performance.now() * 0.018) % world.width;
  ctx.fillStyle = palette.hillFar;
  for (let x = -world.width; x < world.width * 2; x += 220) {
    ctx.beginPath();
    ctx.ellipse(x - shiftFar, world.groundY + 12, 150, 45, 0, Math.PI, 0, true);
    ctx.fill();
  }

  const shiftNear = (performance.now() * 0.032) % world.width;
  ctx.fillStyle = palette.hillNear;
  for (let x = -world.width; x < world.width * 2; x += 180) {
    ctx.beginPath();
    ctx.ellipse(x - shiftNear, world.groundY + 16, 110, 30, 0, Math.PI, 0, true);
    ctx.fill();
  }

  ctx.strokeStyle = palette.stripe;
  ctx.lineWidth = 2;
  for (let i = 0; i < world.width; i += 56) {
    ctx.beginPath();
    ctx.moveTo(i - ((performance.now() / 11) % 56), world.groundY + 13);
    ctx.lineTo(i + 24 - ((performance.now() / 11) % 56), world.groundY + 13);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.ground;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, world.groundY + 1);
  ctx.lineTo(world.width, world.groundY + 1);
  ctx.stroke();

  // Foreground flowers for added depth.
  const flowerShift = (performance.now() * 0.07) % 64;
  for (let i = -1; i < Math.ceil(world.width / 64) + 1; i += 1) {
    const baseX = i * 64 - flowerShift;
    const stemH = 9 + ((i + 3) % 3);
    ctx.strokeStyle = "rgba(126, 63, 102, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baseX + 8, world.groundY + 1);
    ctx.lineTo(baseX + 8, world.groundY - stemH);
    ctx.stroke();

    ctx.fillStyle = i % 2 === 0 ? palette.flowerA : palette.flowerB;
    ctx.beginPath();
    ctx.arc(baseX + 8, world.groundY - stemH - 1, 2.6, 0, Math.PI * 2);
    ctx.arc(baseX + 5.8, world.groundY - stemH + 0.2, 1.7, 0, Math.PI * 2);
    ctx.arc(baseX + 10.2, world.groundY - stemH + 0.2, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle vignette to focus gameplay area.
  const vignette = ctx.createRadialGradient(
    world.width * 0.5,
    world.height * 0.4,
    80,
    world.width * 0.5,
    world.height * 0.45,
    world.width * 0.62
  );
  vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
  vignette.addColorStop(1, "rgba(123, 43, 91, 0.11)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawDino() {
  const t = performance.now();
  const runningFrame = Math.floor(t / 110) % 2;
  const px = Math.round(dino.x);
  const py = Math.round(dino.y + (dino.grounded ? (Math.sin(t / 135) > 0 ? 0 : 1) : -1));
  const legA = !dino.grounded ? 0 : runningFrame === 0 ? -2 : 2;
  const legB = !dino.grounded ? 0 : -legA;
  const tailWag = Math.sin(t / 160) * 2;
  const blink = Math.sin(t / 820) > 0.96;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Tail
  ctx.beginPath();
  ctx.moveTo(px + 2, py + 30);
  ctx.lineTo(px - 8, py + 24 + tailWag);
  ctx.lineTo(px + 1, py + 38);
  ctx.closePath();
  ctx.fillStyle = palette.dinoShade;
  ctx.fill();

  // Body
  ctx.fillStyle = palette.dino;
  ctx.fillRect(px + 2, py + 14, 24, 24);

  // Head
  ctx.fillRect(px + 21, py + 2, 17, 16);
  ctx.fillRect(px + 17, py + 10, 8, 10);

  // Belly + cheek
  ctx.fillStyle = palette.dinoLight;
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 27, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + 30, py + 12, 4.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back spikes
  ctx.fillStyle = palette.dinoShade;
  ctx.fillRect(px + 5, py + 12, 4, 4);
  ctx.fillRect(px + 10, py + 10, 4, 5);
  ctx.fillRect(px + 15, py + 9, 4, 6);

  // Arms
  ctx.fillStyle = palette.dino;
  ctx.fillRect(px + 24, py + 20, 4, 5);
  ctx.fillRect(px + 27, py + 22, 3, 4);

  // Legs
  ctx.fillStyle = palette.dinoOutline;
  ctx.fillRect(px + 8, py + 36 + legA, 6, 10 - legA);
  ctx.fillRect(px + 17, py + 36 + legB, 6, 10 - legB);

  // Toes
  ctx.fillStyle = palette.dinoShade;
  ctx.fillRect(px + 7, py + 45 + legA, 8, 2);
  ctx.fillRect(px + 16, py + 45 + legB, 8, 2);

  // Eye + blush
  ctx.fillStyle = palette.dinoOutline;
  if (blink) {
    ctx.fillRect(px + 31, py + 7, 4, 1);
  } else {
    ctx.fillRect(px + 31, py + 6, 3, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 32, py + 6, 1, 1);
  }
  ctx.fillStyle = palette.dinoBlush;
  ctx.fillRect(px + 30, py + 11, 4, 2);

  // Bow
  ctx.fillStyle = palette.bow;
  ctx.fillRect(px + 27, py + 1, 3, 3);
  ctx.fillRect(px + 24, py + 2, 3, 2);
  ctx.fillRect(px + 30, py + 2, 3, 2);

  ctx.restore();
}

function drawObstacles() {
  for (const obs of state.obstacles) {
    if (obs.type === "flying") {
      const flap = Math.sin((performance.now() + obs.x * 3.1) / 85) * 6;
      const bx = obs.x;
      const by = obs.y;
      const bw = obs.w;
      const bh = obs.h;
      const cx = bx + bw * 0.5;
      const cy = by + bh * 0.58;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Wings (clear bird silhouette)
      ctx.strokeStyle = "#7a3d63";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 1, cy + 1);
      ctx.quadraticCurveTo(cx - bw * 0.42, cy - bh * 0.34 - flap, cx - bw * 0.2, cy + bh * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 1, cy + 1);
      ctx.quadraticCurveTo(cx + bw * 0.34, cy - bh * 0.3 + flap, cx + bw * 0.18, cy + bh * 0.14);
      ctx.stroke();

      // Body
      ctx.fillStyle = "#8f4e74";
      ctx.beginPath();
      ctx.ellipse(cx, cy, bw * 0.2, bh * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head (facing left toward player)
      ctx.fillStyle = "#7a3d63";
      ctx.beginPath();
      ctx.arc(cx - bw * 0.2, cy - bh * 0.06, bh * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#f7b25b";
      ctx.beginPath();
      ctx.moveTo(cx - bw * 0.34, cy - bh * 0.06);
      ctx.lineTo(cx - bw * 0.48, cy - bh * 0.1);
      ctx.lineTo(cx - bw * 0.34, cy + bh * 0.02);
      ctx.closePath();
      ctx.fill();

      // Tail feathers
      ctx.strokeStyle = "#a9658e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.18, cy + bh * 0.03);
      ctx.lineTo(cx + bw * 0.34, cy - bh * 0.02);
      ctx.moveTo(cx + bw * 0.18, cy + bh * 0.08);
      ctx.lineTo(cx + bw * 0.36, cy + bh * 0.08);
      ctx.stroke();

      // Eye
      ctx.fillStyle = "#fff";
      ctx.fillRect(cx - bw * 0.25, cy - bh * 0.11, 2.2, 2.2);
      ctx.fillStyle = "#2a1623";
      ctx.fillRect(cx - bw * 0.24, cy - bh * 0.1, 1.2, 1.2);

      ctx.restore();
      continue;
    }

    ctx.fillStyle = palette.obstacle;
    ctx.fillRect(obs.x, obs.y + 3, obs.w, obs.h - 3);

    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + 4);
    ctx.lineTo(obs.x + obs.w * 0.4, obs.y - 2);
    ctx.lineTo(obs.x + obs.w * 0.78, obs.y + 5);
    ctx.lineTo(obs.x + obs.w, obs.y + 3);
    ctx.lineTo(obs.x + obs.w, obs.y + 7);
    ctx.lineTo(obs.x, obs.y + 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.obstacleDetail;
    ctx.fillRect(obs.x + obs.w * 0.35, obs.y + 9, 3, 5);
    ctx.fillRect(obs.x + obs.w * 0.55, obs.y + 18, 3, 5);
  }
}

function drawSparkles() {
  for (const p of sparkles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = `rgba(255, 95, 176, ${alpha.toFixed(3)})`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

function drawRoundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawScore() {
  const hudX = world.width - 200;
  const hudY = 12;

  ctx.fillStyle = palette.hudBg;
  ctx.strokeStyle = "rgba(138, 61, 107, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundedRect(hudX, hudY, 182, 50, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.font = "700 18px Candara, Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${String(state.score).padStart(5, "0")}`, hudX + 12, hudY + 22);

  ctx.font = "700 14px Candara, Trebuchet MS, sans-serif";
  ctx.fillText(`BEST ${String(state.best).padStart(5, "0")}`, hudX + 12, hudY + 41);
}

function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000 || 0);
  state.lastTime = timestamp;

  if (state.shakeTime > 0) {
    state.shakeTime = Math.max(0, state.shakeTime - dt);
  }

  update(dt);
  ctx.save();
  if (state.shakeTime > 0) {
    const shake = state.shakeTime * 14;
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawBackground();
  drawObstacles();
  drawSparkles();
  drawDino();
  drawScore();
  ctx.restore();

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }
});

window.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    jump();
  },
  { passive: false }
);

setOverlay("Press Space to Start", true);
requestAnimationFrame(loop);
