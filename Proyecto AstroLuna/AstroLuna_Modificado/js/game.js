/* ======================================================
   ASTRO LUNA — juego de plataformas en HTML5 Canvas
   ====================================================== */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = 282;

// ---------- Carga de recursos ----------
const IMG_NAMES = [
  'player_idle', 'player_walk', 'player_jump',
  'asteroid_question', 'asteroid_rock', 'asteroid_empty',
  'alien', 'alien_flat', 'mouse', 'mouse_flat',
  'crystal', 'oxygen_tank', 'flag', 'rocket', 'launch_tower',
  'bg_surface', 'bg_cheese', 'cheese_platform', 'crater', 'cave_exit'
];
const images = {};
let imagesLoaded = 0;
IMG_NAMES.forEach(name => {
  const img = new Image();
  img.src = `assets/img/${name}.png`;
  img.onload = () => imagesLoaded++;
  images[name] = img;
});

const SOUND_NAMES = [
  'jump', 'crystal', 'hit_block', 'break', 'stomp', 'mouse_squeak',
  'powerup', 'lose_life', 'game_over', 'level_complete', 'rocket_launch',
  'oxygen_low', 'pause'
];
const sounds = {};
SOUND_NAMES.forEach(name => {
  sounds[name] = new Audio(`assets/audio/${name}.wav`);
});
function playSound(name) {
  const base = sounds[name];
  if (!base) return;
  const s = base.cloneNode();
  s.volume = 0.55;
  s.play().catch(() => {});
}

// ---------- Estado del juego ----------
const KEY = { left: false, right: false, jump: false };
let state = 'menu'; // menu | playing | paused | win | gameover
let scene = 'surface1'; // surface1 | cave | surface2
let lives = 3, score = 0, crystals = 0, oxygen = 100;
let oxygenTimer = 0;
let invulnerable = 0;
let launchSequence = null; // controla la animación final

const player = {
  x: 60, y: GROUND_Y - 48, w: 32, h: 48,
  vx: 0, vy: 0, onGround: true, facing: 1, anim: 0, walking: false
};

const GRAVITY = 0.6;
const MOVE_SPEED = 2.6;
const JUMP_FORCE = -11;

// ---------- Definición de escenas ----------
function makeScenes() {
  return {
    surface1: {
      bg: 'bg_surface',
      groundY: GROUND_Y,
      asteroids: [
        { x: 300, y: 190, w: 28, h: 28, type: 'rock', solid: true },
        { x: 334, y: 190, w: 28, h: 28, type: 'question', solid: true, used: false },
        { x: 371, y: 182, w: 28, h: 28, type: 'rock', solid: true },
        { x: 406, y: 190, w: 28, h: 28, type: 'question', solid: true, used: false },
        { x: 352, y: 118, w: 28, h: 28, type: 'question', solid: true, used: false }
      ],
      enemies: [
        { type: 'alien', x: 460, y: GROUND_Y - 36, w: 36, h: 36, dir: -1, minX: 420, maxX: 560, alive: true }
      ],
      crater: { x: 475, y: GROUND_Y - 24, w: 60, h: 24, target: 'cave' },
      exit: null,
      flag: null
    },
    cave: {
      bg: 'bg_cheese',
      groundY: GROUND_Y,
      asteroids: [],
      platform: { x: 230, y: GROUND_Y - 80, w: 200, h: 82 },
      enemies: [
        { type: 'mouse', x: 350, y: GROUND_Y - 24, w: 44, h: 24, dir: 1, minX: 260, maxX: 560, alive: true }
      ],
      crystalsField: [
        [253, 206], [283, 166], [313, 150], [343, 142], [373, 150], [403, 166], [433, 206]
      ].map(([x, y]) => ({ x, y, taken: false })),
      crater: null,
      exit: { x: 630, y: GROUND_Y - 60, w: 32, h: 60, target: 'surface2' },
      flag: null
    },
    surface2: {
      bg: 'bg_surface',
      groundY: GROUND_Y,
      asteroids: [],
      enemies: [],
      crater: null,
      exit: null,
      flag: { x: 160, y: GROUND_Y - 202, w: 4, h: 202, baseX: 150, baseY: GROUND_Y - 18 },
      rocket: { x: 480, y: GROUND_Y - 170, w: 90, h: 170 }
    }
  };
}
let scenes = makeScenes();

// ---------- Entrada ----------
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft' || e.key === 'a') KEY.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') KEY.right = true;
  if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') KEY.jump = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') KEY.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') KEY.right = false;
  if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') KEY.jump = false;
});

function togglePause() {
  if (state === 'playing') { state = 'paused'; playSound('pause'); showOverlay('Pausa', 'Presiona P para continuar.', false); }
  else if (state === 'paused') { state = 'playing'; hideOverlay(); }
}

// ---------- Overlay (menú / pausa / fin) ----------
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
function showOverlay(title, text, showBtn = true, btnLabel = 'Jugar') {
  overlay.classList.remove('hidden');
  overlay.querySelector('h2').textContent = title;
  overlay.querySelector('p').textContent = text;
  startBtn.style.display = showBtn ? 'inline-block' : 'none';
  startBtn.textContent = btnLabel;
}
function hideOverlay() { overlay.classList.add('hidden'); }

startBtn.addEventListener('click', () => {
  if (state === 'menu' || state === 'gameover' || state === 'win') {
    resetGame();
    state = 'playing';
    hideOverlay();
  }
});

function resetGame() {
  lives = 3; score = 0; crystals = 0; oxygen = 100; oxygenTimer = 0;
  scene = 'surface1';
  scenes = makeScenes();
  placePlayerAtSceneStart();
}

function placePlayerAtSceneStart() {
  player.x = 60; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; player.onGround = true;
}

// ---------- Lógica de física y colisiones ----------
function update() {
  if (state !== 'playing') return;

  const s = scenes[scene];

  // Oxígeno (actúa como el contador de tiempo)
  oxygenTimer++;
  if (oxygenTimer >= 20) { // ~3 veces por segundo a 60fps
    oxygenTimer = 0;
    oxygen--;
    if (oxygen <= 20 && oxygen > 0 && oxygen % 5 === 0) playSound('oxygen_low');
    if (oxygen <= 0) { loseLife(true); }
  }

  if (invulnerable > 0) invulnerable--;

  // Movimiento horizontal
  player.vx = 0;
  if (KEY.left) { player.vx = -MOVE_SPEED; player.facing = -1; }
  if (KEY.right) { player.vx = MOVE_SPEED; player.facing = 1; }
  player.walking = KEY.left || KEY.right;

  // Salto
  if (KEY.jump && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    playSound('jump');
  }

  // Gravedad
  player.vy += GRAVITY;
  if (player.vy > 14) player.vy = 14;

  let nx = player.x + player.vx;
  let ny = player.y + player.vy;

  // Límites laterales
  nx = Math.max(0, Math.min(W - player.w, nx));

  // Colisión con asteroides (sólidos, se puede estar encima o golpear desde abajo)
  player.onGround = false;
  if (s.asteroids) {
    for (const a of s.asteroids) {
      if (a.type === 'empty') continue;
      const withinX = nx + player.w > a.x && nx < a.x + a.w;
      // Aterrizar encima
      if (withinX && player.vy >= 0 && player.y + player.h <= a.y + 6 && ny + player.h >= a.y) {
        ny = a.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
      // Golpear desde abajo
      else if (withinX && player.vy < 0 && player.y >= a.y + a.h - 6 && ny <= a.y + a.h) {
        ny = a.y + a.h;
        player.vy = 1;
        if (a.type === 'question' && !a.used) {
          hitQuestionAsteroid(a);
        } else if (a.type === 'rock') {
          playSound('hit_block');
        }
      }
      // Bloqueo lateral de asteroides sólidos
      else {
        const withinY = ny + player.h > a.y + 4 && ny < a.y + a.h - 4;
        if (withinY && player.x + player.w <= a.x && nx + player.w > a.x) nx = a.x - player.w;
        else if (withinY && player.x >= a.x + a.w && nx < a.x + a.w) nx = a.x + a.w;
      }
    }
  }

  // Plataforma de queso (cave)
  if (s.platform) {
    const pf = s.platform;
    const topY = pf.y + 20; // superficie inclinada aproximada
    const withinX = nx + player.w > pf.x + 10 && nx < pf.x + pf.w - 10;
    if (withinX && player.vy >= 0 && player.y + player.h <= topY + 10 && ny + player.h >= topY) {
      ny = topY - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // Suelo
  if (ny + player.h >= GROUND_Y) {
    ny = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  player.x = nx;
  player.y = ny;

  if (player.walking) player.anim += 0.18; else player.anim = 0;

  // Enemigos
  if (s.enemies) {
    for (const e of s.enemies) {
      if (!e.alive) continue;
      e.x += e.dir * (e.type === 'mouse' ? 1.1 : 0.9);
      if (e.x < e.minX || e.x + e.w > e.maxX) e.dir *= -1;

      const overlapX = player.x < e.x + e.w && player.x + player.w > e.x;
      const overlapY = player.y < e.y + e.h && player.y + player.h > e.y;
      if (overlapX && overlapY) {
        const stomping = player.vy > 0 && (player.y + player.h) - e.y < 16;
        if (stomping) {
          e.alive = false;
          player.vy = JUMP_FORCE * 0.6;
          score += 100;
          playSound('stomp');
          if (e.type === 'mouse') setTimeout(() => playSound('mouse_squeak'), 90);
        } else if (invulnerable === 0) {
          loseLife(false);
        }
      }
    }
  }

  // Cráter (baja al mundo de queso)
  if (s.crater) {
    const c = s.crater;
    if (player.x + player.w > c.x + 10 && player.x < c.x + c.w - 10 && player.y + player.h >= GROUND_Y - 4) {
      changeScene(c.target, 40, GROUND_Y - player.h - 2);
    }
  }

  // Salida de la cueva (sube a la superficie)
  if (s.exit) {
    const ex = s.exit;
    if (player.x + player.w > ex.x && player.x < ex.x + ex.w && player.y < ex.y + ex.h) {
      changeScene(ex.target, 60, GROUND_Y - player.h);
    }
  }

  // Cristales flotantes (cueva)
  if (s.crystalsField) {
    for (const c of s.crystalsField) {
      if (c.taken) continue;
      const dx = (player.x + player.w / 2) - c.x;
      const dy = (player.y + player.h / 2) - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) {
        c.taken = true;
        crystals++;
        score += 50;
        playSound('crystal');
      }
    }
  }

  // Bandera + cohete (final)
  if (scene === 'surface2' && !launchSequence) {
    const f = s.flag;
    if (player.x + player.w > f.x - 10 && player.x < f.x + 20 && player.y + player.h >= f.baseY - 10) {
      startLaunchSequence();
    }
  }

  updateHUD();
}

function hitQuestionAsteroid(a) {
  a.type = 'empty';
  a.used = true;
  score += 200;
  crystals++;
  playSound('powerup');
}

function loseLife(byOxygen) {
  lives--;
  invulnerable = 90;
  playSound('lose_life');
  if (lives <= 0) {
    state = 'gameover';
    playSound('game_over');
    showOverlay('GAME OVER', `Puntuación final: ${score}. Cristales recolectados: ${crystals}.`, true, 'Reintentar');
    return;
  }
  oxygen = 100; oxygenTimer = 0;
  if (byOxygen) {
    // Te quedaste sin oxígeno: reinicia en la escena actual
    placePlayerAtSceneStart();
  } else {
    placePlayerAtSceneStart();
  }
}

function changeScene(target, startX, startY) {
  scene = target;
  player.x = startX; player.y = startY; player.vx = 0; player.vy = 0;
}

function startLaunchSequence() {
  launchSequence = { t: 0, phase: 'climb' };
  state = 'win-sequence';
}

function updateLaunchSequence() {
  const s = scenes.surface2;
  launchSequence.t++;
  if (launchSequence.phase === 'climb') {
    player.x = s.flag.baseX - 6;
    player.y = s.flag.baseY - 18 - Math.min(170, launchSequence.t * 3);
    if (launchSequence.t > 60) { launchSequence.phase = 'count'; launchSequence.t = 0; playSound('level_complete'); }
  } else if (launchSequence.phase === 'count') {
    score += 5;
    if (launchSequence.t > 90) { launchSequence.phase = 'launch'; launchSequence.t = 0; playSound('rocket_launch'); }
  } else if (launchSequence.phase === 'launch') {
    s.rocket.y -= 2.2;
    if (launchSequence.t > 120) {
      state = 'win';
      showOverlay('¡NIVEL COMPLETADO!', `El cohete despegó con éxito. Puntuación final: ${score}. Cristales: ${crystals}.`, true, 'Jugar de nuevo');
    }
  }
  updateHUD();
}

function updateHUD() {
 document.getElementById('hud-lives').textContent = `Vidas: ${lives} Christopher`;
  document.getElementById('hud-score').textContent = `Puntuación: ${score} Christopher`;
  document.getElementById('hud-crystals').textContent = `Cristales: ${crystals} Christopher`;
  const oxEl = document.getElementById('hud-oxygen');
  oxEl.textContent = `Oxígeno: ${Math.max(0, oxygen)} Christopher`;
  oxEl.classList.toggle('low', oxygen <= 20);
}

// ---------- Dibujo ----------
function draw() {
  ctx.clearRect(0, 0, W, H);
  const s = scenes[scene];
  if (images[s.bg] && imagesLoaded) ctx.drawImage(images[s.bg], 0, 0, W, H);

  if (s.crater) ctx.drawImage(images.crater, s.crater.x - 10, s.crater.y - 2, s.crater.w + 20, 28);
  if (s.platform) ctx.drawImage(images.cheese_platform, s.platform.x, s.platform.y, s.platform.w, s.platform.h);
  if (s.exit) ctx.drawImage(images.cave_exit, s.exit.x, s.exit.y, s.exit.w, s.exit.h);

  if (s.asteroids) {
    for (const a of s.asteroids) {
      const key = a.type === 'question' ? 'asteroid_question' : a.type === 'rock' ? 'asteroid_rock' : 'asteroid_empty';
      ctx.drawImage(images[key], a.x, a.y, a.w, a.h);
    }
  }

  if (s.crystalsField) {
    for (const c of s.crystalsField) {
      if (c.taken) continue;
      ctx.drawImage(images.crystal, c.x - 10, c.y - 12 + Math.sin(Date.now() / 300 + c.x) * 3, 20, 24);
    }
  }

  if (s.enemies) {
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const key = e.type === 'alien' ? 'alien' : 'mouse';
      ctx.save();
      if (e.dir < 0) { ctx.translate(e.x + e.w, e.y); ctx.scale(-1, 1); ctx.drawImage(images[key], 0, 0, e.w, e.h); }
      else { ctx.drawImage(images[key], e.x, e.y, e.w, e.h); }
      ctx.restore();
    }
  }

  if (scene === 'surface2') {
    const f = s.flag;
    ctx.drawImage(images.flag, f.baseX, f.baseY - f.h, 24, f.h + 18);
    ctx.drawImage(images.launch_tower, s.rocket.x - 30, s.rocket.y + 10, 54, 170);
    ctx.drawImage(images.rocket, s.rocket.x, s.rocket.y, s.rocket.w, s.rocket.h);
    if (launchSequence && launchSequence.phase === 'launch') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.moveTo(s.rocket.x + 20, s.rocket.y + s.rocket.h);
      ctx.lineTo(s.rocket.x + 45, s.rocket.y + s.rocket.h + 30 + Math.random() * 10);
      ctx.lineTo(s.rocket.x + 70, s.rocket.y + s.rocket.h);
      ctx.fill();
      ctx.restore();
    }
  }

  // Jugador
  if (!(launchSequence && launchSequence.phase !== 'climb')) {
    let key = 'player_idle';
    if (!player.onGround) key = 'player_jump';
    else if (player.walking) key = 'player_walk';
    ctx.save();
    if (invulnerable > 0 && Math.floor(invulnerable / 6) % 2 === 0) ctx.globalAlpha = 0.4;
    if (player.facing < 0) {
      ctx.translate(player.x + player.w, player.y);
      ctx.scale(-1, 1);
      ctx.drawImage(images[key], 0, 0, player.w, player.h);
    } else {
      ctx.drawImage(images[key], player.x, player.y, player.w, player.h);
    }
    ctx.restore();
  }

  // Mensajes de fase de la secuencia final
  if (launchSequence && launchSequence.phase === 'count') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Contando puntaje... ${score}`, W / 2, 40);
  }
}

// ---------- Loop principal ----------
function loop() {
  update();
  if (state === 'win-sequence') updateLaunchSequence();
  draw();
  requestAnimationFrame(loop);
}

updateHUD();
showOverlay('Astro Luna', 'Un astronauta explora la superficie lunar, cae por un cráter hasta un mundo de queso, y regresa a la superficie para lanzar su cohete antes de quedarse sin oxígeno.');
requestAnimationFrame(loop);
