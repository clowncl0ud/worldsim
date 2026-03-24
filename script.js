// Canvas setup
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth - 180;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// World settings
const TILE_SIZE = 16;
const WORLD_W = 200;
const WORLD_H = 200;

let cameraX = 0;
let cameraY = 0;
let zoom = 2;

// Brush
const brush = document.getElementById("brush");

// Tools
let currentTool = "grass";
document.querySelectorAll(".tool").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentTool = btn.dataset.tool;
  });
});
document.querySelector(".tool").classList.add("selected");

// Pixel-art sprites (Base64)
const tileSprites = {
  grass: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ..."), 
  sand: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ..."),
  water: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ..."),
  mountain: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQ...")
};

const creatureSprites = {
  human: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICA..."),
  animal: loadSprite("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICA...")
};

function loadSprite(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// World grid
const world = [];
for (let y = 0; y < WORLD_H; y++) {
  const row = [];
  for (let x = 0; x < WORLD_W; x++) {
    row.push({
      terrain: "water",
      creatures: [],
      structure: null
    });
  }
  world.push(row);
}

// Coordinate helpers
function worldToScreen(x, y) {
  const size = TILE_SIZE * zoom;
  return {
    sx: x * size - cameraX,
    sy: y * size - cameraY,
    size
  };
}

function screenToWorld(mx, my) {
  const size = TILE_SIZE * zoom;
  return {
    wx: Math.floor((mx + cameraX) / size),
    wy: Math.floor((my + cameraY) / size)
  };
}

// Drawing
function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const size = TILE_SIZE * zoom;

  const startX = Math.max(0, Math.floor(cameraX / size) - 2);
  const startY = Math.max(0, Math.floor(cameraY / size) - 2);
  const endX = Math.min(WORLD_W, Math.ceil((cameraX + canvas.width) / size) + 2);
  const endY = Math.min(WORLD_H, Math.ceil((cameraY + canvas.height) / size) + 2);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = world[y][x];
      const { sx, sy } = worldToScreen(x, y);

      ctx.drawImage(tileSprites[tile.terrain], sx, sy, size, size);

      if (tile.structure === "house") {
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(sx + size * 0.2, sy + size * 0.2, size * 0.6, size * 0.6);
      }

      tile.creatures.forEach(c => {
        ctx.drawImage(creatureSprites[c.type], sx + size * 0.25, sy + size * 0.25, size * 0.5, size * 0.5);
      });
    }
  }
}

// Creature movement
function updateCreatures() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const tile = world[y][x];

      tile.creatures.forEach((c, i) => {
        if (Math.random() < 0.02) {
          const dx = Math.floor(Math.random() * 3) - 1;
          const dy = Math.floor(Math.random() * 3) - 1;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && ny >= 0 && nx < WORLD_W && ny < WORLD_H) {
            world[ny][nx].creatures.push(c);
            tile.creatures.splice(i, 1);
          }
        }
      });
    }
  }
}

// Human AI
function humanAI() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const tile = world[y][x];

      tile.creatures.forEach(c => {
        if (c.type === "human") {
          if (!tile.structure && Math.random() < 0.001) {
            tile.structure = "house";
          }
        }
      });
    }
  }
}

// Hunting
function huntingAI() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const tile = world[y][x];

      const humans = tile.creatures.filter(c => c.type === "human");
      const animals = tile.creatures.filter(c => c.type === "animal");

      if (humans.length > 0 && animals.length > 0) {
        if (Math.random() < 0.05) {
          tile.creatures = humans;
        }
      }
    }
  }
}

// Disasters
function meteor(x, y) {
  for (let r = 0; r < 5; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < WORLD_W && ny < WORLD_H) {
          world[ny][nx].terrain = "mountain";
          world[ny][nx].creatures = [];
        }
      }
    }
  }
}

function spreadFire() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (world[y][x].terrain === "fire") {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        dirs.forEach(([dx,dy]) => {
          const nx = x + dx, ny = y + dy;
          if (nx>=0 && ny>=0 && nx<WORLD_W && ny<WORLD_H) {
            if (Math.random() < 0.1) {
              world[ny][nx].terrain = "fire";
            }
          }
        });
      }
    }
  }
}

function tornado(x, y) {
  for (let i = 0; i < 200; i++) {
    const nx = x + Math.floor(Math.random()*20 - 10);
    const ny = y + Math.floor(Math.random()*20 - 10);

    if (nx>=0 && ny>=0 && nx<WORLD_W && ny<WORLD_H) {
      world[ny][nx].terrain = "sand";
      world[ny][nx].creatures = [];
    }
  }
}

function flood(x, y) {
  for (let r = 0; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx>=0 && ny>=0 && nx<WORLD_W && ny<WORLD_H) {
          world[ny][nx].terrain = "water";
        }
      }
    }
  }
}

function plague() {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const tile = world[y][x];
      tile.creatures = tile.creatures.filter(c => Math.random() > 0.3);
    }
  }
}

// Mouse input
canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const { wx, wy } = screenToWorld(mx, my);
  const size = parseInt(brush.value);

  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const nx = wx + dx;
      const ny = wy + dy;

      if (nx >= 0 && ny >= 0 && nx < WORLD_W && ny < WORLD_H) {
        const tile = world[ny][nx];

        if (["grass","sand","water","mountain"].includes(currentTool)) {
          tile.terrain = currentTool;
        } else if (["human","animal"].includes(currentTool)) {
          tile.creatures.push({ type: currentTool });
        } else if (currentTool === "meteor") {
          meteor(nx, ny);
        } else if (currentTool === "fire") {
          tile.terrain = "fire";
        } else if (currentTool === "tornado") {
          tornado(nx, ny);
        } else if (currentTool === "flood") {
          flood(nx, ny);
        } else if (currentTool === "plague") {
          plague();
        }
      }
    }
  }
});

// Zoom
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  zoom = Math.max(1, Math.min(6, zoom + (e.deltaY < 0 ? 0.2 : -0.2)));
});

// Camera movement
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function updateCamera() {
  const speed = 10;
  if (keys["w"]) cameraY -= speed;
  if (keys["s"]) cameraY += speed;
  if (keys["a"]) cameraX -= speed;
  if (keys["d"]) cameraX += speed;
}

// Main loop
function loop() {
  updateCamera();
  updateCreatures();
  humanAI();
  huntingAI();
  spreadFire();
  drawWorld();
  requestAnimationFrame(loop);
}

loop();
