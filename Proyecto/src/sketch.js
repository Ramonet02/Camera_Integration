// ===== HealthySmile Halloween - Sketch principal =====
// Paleta cálida/cute: púrpura (#6B2D7B), naranja dorado (#E8A030),
// crema (#FFF5E6), coral (#E85D3A), amarillo (#F5C518)
// Estados: 'start' → 'loading' → 'running' → 'gameover' → 'running'

let appState   = 'start';
let capture;
let detector;
let lastResult = null;
let particleSys;

// Audio
let audioCtx      = null;
let ambientBuffer = null;
let ambientSource = null;
let soundStarted  = false;

// DOM
let startScreen, loadingScreen, hudEl, timerDisplay;

// Animación de carga
let loadingOrbiters = [];

// Fantasmas decorativos de fondo (aparecen progresivamente)
let bgGhosts = [];

// Cierre de boca
let mouthCloseTimer = 0;

// Game over
let gameOverTime      = 0;
let gameOverCountdown = 0;
const GAMEOVER_SHOW   = 4;

// Fondo: valores interpolados suavemente (evitan saltos)
let bgOverlayAlpha = 100;
let bgMoonSize     = 0;
let bgStarAlpha    = 60;
let bgTreeAlpha    = 0;
let bgFogIntensity = 0;

// Anillo menguante (shrink ring)
const RING_DURATION  = 12;   // segundos para un ciclo completo
const RING_MAX       = 380;  // radio inicial (más grande)
const RING_MIN       = 18;   // radio mínimo → explosión
let ringTimer        = 0;    // temporizador del ciclo actual
let ringCycle        = 0;    // cuántas explosiones se han hecho (para escalar efecto)
let ringExplosions   = [];   // partículas de la explosión del anillo

// ===== SETUP =================================================

function setup() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent('canvas-container');

  startScreen   = document.getElementById('start-screen');
  loadingScreen = document.getElementById('loading-screen');
  hudEl         = document.getElementById('hud');
  timerDisplay  = document.getElementById('timer-display');

  document.getElementById('start-btn').addEventListener('click', startApp);

  detector    = new FaceDetector();
  particleSys = new ParticleSystem(window);

  const types = ['ghost', 'pumpkin', 'bat', 'ghost', 'pumpkin', 'sparkle'];
  for (let i = 0; i < 6; i++) {
    loadingOrbiters.push({
      angle: (TWO_PI / 6) * i,
      dist:  120 + random(30),
      type:  types[i],
      size:  random(22, 40),
    });
  }

  _initBgGhosts();
  loadAmbientSound('../assets/sounds/spooky-ambient.wav');
}

function _initBgGhosts() {
  bgGhosts = [];
  for (let i = 0; i < 10; i++) {
    bgGhosts.push({
      x:      random(CANVAS_W),
      y:      random(CANVAS_H),
      size:   random(28, 55),
      speed:  random(0.2, 0.6),
      wobble: random(TWO_PI),
      alpha:  0,
      targetAlpha: 0,
    });
  }
}

// ===== START =================================================

async function startApp() {
  startScreen.classList.add('hidden');
  loadingScreen.classList.remove('hidden');
  appState = 'loading';

  try {
    capture = createCapture(VIDEO);
    capture.size(CAM_W, CAM_H);
    capture.hide();

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (capture.elt.readyState >= 2) { clearInterval(check); resolve(); }
      }, 100);
    });

    await detector.init();
    startAmbientSound();

    loadingScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');
    _startNewRound();

  } catch (err) {
    console.error('Init error:', err);
    document.getElementById('loading-text').textContent = 'ERROR. Revisa la cámara.';
  }
}

function _startNewRound() {
  particleSys.reset();
  _initBgGhosts();
  mouthCloseTimer  = 0;
  bgOverlayAlpha   = 100;
  bgMoonSize       = 0;
  bgStarAlpha      = 60;
  bgTreeAlpha      = 0;
  bgFogIntensity   = 0;
  ringTimer        = 0;
  ringCycle        = 0;
  ringExplosions   = [];
  appState = 'running';
}

// ===== DRAW LOOP =============================================

function draw() {
  switch (appState) {
    case 'start':    drawStartBackground();  break;
    case 'loading':  drawLoadingAnimation(); break;
    case 'running':  drawRunning();          break;
    case 'gameover': drawGameOver();         break;
  }
}

// ===== START BACKGROUND ======================================

function drawStartBackground() {
  background(74, 29, 92);
  noStroke();
  fill(245, 197, 24, 140);
  for (let i = 0; i < 60; i++) {
    ellipse((i * 239 + 11) % width, (i * 173 + 7) % (height * 0.6), (i % 3 === 0) ? 3.5 : 2);
  }
}

// ===== LOADING ANIMATION =====================================

function drawLoadingAnimation() {
  background(74, 29, 92);
  noStroke();
  fill(245, 197, 24, 100);
  for (let i = 0; i < 50; i++) {
    ellipse((i * 239 + 11) % width, (i * 173 + 7) % height, 2.5);
  }
  push();
  translate(width / 2, height / 2);
  for (const orb of loadingOrbiters) {
    orb.angle += 0.02;
    push();
    translate(cos(orb.angle) * orb.dist, sin(orb.angle) * orb.dist * 0.55);
    rotate(orb.angle * 0.5);
    _drawLoadingOrbiter(orb);
    pop();
  }
  _drawCentralPumpkin();
  pop();
}

function _drawLoadingOrbiter(orb) {
  noStroke();
  const s = orb.size;
  if (orb.type === 'ghost') {
    fill(255, 245, 230, 210);  ellipse(0, -s * 0.2, s, s * 1.1);
    fill(107, 45, 123, 200);
    ellipse(-s * 0.15, -s * 0.2, s * 0.18, s * 0.22);
    ellipse( s * 0.15, -s * 0.2, s * 0.18, s * 0.22);
  } else if (orb.type === 'pumpkin') {
    fill(232, 160, 48);  ellipse(0, 0, s, s * 0.85);
    fill(80, 140, 50);   rect(-s * 0.06, -s * 0.5, s * 0.12, s * 0.18, 2);
    fill(74, 29, 92);
    triangle(-s * 0.2, -s * 0.08, -s * 0.08, -s * 0.08, -s * 0.14, -s * 0.22);
    triangle( s * 0.2, -s * 0.08,  s * 0.08, -s * 0.08,  s * 0.14, -s * 0.22);
  } else if (orb.type === 'bat') {
    fill(74, 29, 92);
    ellipse(0, 0, s * 0.3, s * 0.5);
    triangle(-s * 0.02, 0, -s * 0.7, -s * 0.25, -s * 0.35, s * 0.08);
    triangle( s * 0.02, 0,  s * 0.7, -s * 0.25,  s * 0.35, s * 0.08);
  } else {
    fill(245, 197, 24, 200);  ellipse(0, 0, s * 0.6, s * 0.6);
  }
}

function _drawCentralPumpkin() {
  const pulse = 0.95 + 0.05 * sin(frameCount * 0.05);
  const s = 80 * pulse;
  noStroke();
  fill(232, 160, 48, 25);  ellipse(0, 0, s * 3);
  fill(245, 197, 24, 15);  ellipse(0, 0, s * 2.2);
  fill(232, 160, 48);      ellipse(0, 0, s, s * 0.85);
  fill(80, 140, 50);       rect(-s * 0.06, -s * 0.5, s * 0.12, s * 0.22, 2);
  fill(74, 29, 92);
  triangle(-s * 0.22, -s * 0.1, -s * 0.08, -s * 0.1, -s * 0.15, -s * 0.27);
  triangle( s * 0.22, -s * 0.1,  s * 0.08, -s * 0.1,  s * 0.15, -s * 0.27);
  arc(0, s * 0.1, s * 0.42, s * 0.2, 0, PI);
}

// ===== RUNNING ===============================================

function drawRunning() {
  _drawCameraBackground();

  const phaseIdx = particleSys.getCurrentPhase();
  const streak   = particleSys.currentStreak;

  // ---- Interpolar valores de fondo suavemente ----
  // Overlay: más transparente cuanto más avanzada la fase
  const targetOverlay = map(phaseIdx, 0, 4, 100, 40);
  bgOverlayAlpha      = lerp(bgOverlayAlpha, targetOverlay, 0.02);
  fill(74, 29, 92, bgOverlayAlpha);
  noStroke();
  rect(0, 0, width, height);

  // ---- Fondo progresivo ----
  _drawProgressiveBackground(phaseIdx, streak);

  // ---- Detección facial ----
  let jawOpen  = 0;
  let mouthPos = null;
  if (capture && capture.elt.readyState >= 2) {
    lastResult = detector.detect(capture.elt);
    if (lastResult) {
      jawOpen  = detector.getJawOpen(lastResult);
      mouthPos = detector.getMouthPosition(lastResult);
    }
  }

  let mx = width / 2, my = height / 2;
  if (mouthPos) {
    mx = width - mouthPos.x * width;
    my = mouthPos.y * height;
  }

  const isMouthOpen = jawOpen > MOUTH_OPEN_THRESHOLD;

  // ---- Lógica de cierre ----
  const dt = deltaTime / 1000;
  if (!isMouthOpen) {
    mouthCloseTimer += dt;
    if (mouthCloseTimer >= MOUTH_CLOSE_GRACE && particleSys.mouthOpenTime > 0) {
      gameOverTime      = particleSys.mouthOpenTime;
      gameOverCountdown = GAMEOVER_SHOW;
      goMaxPhase        = particleSys.currentPhaseIdx;
      goParticles       = [];
      hudEl.classList.add('hidden');
      appState = 'gameover';
      return;
    }
  } else {
    mouthCloseTimer = 0;
  }

  // ---- Partículas ----
  particleSys.update(isMouthOpen, jawOpen, mx, my);
  if (isMouthOpen) _drawMouthGlow(mx, my, jawOpen, phaseIdx);
  particleSys.render();

  // ---- Anillo menguante ----
  _updateShrinkRing(isMouthOpen, mx, my, dt);
  _drawShrinkRing(mx, my);
  _updateAndDrawRingExplosions();

  // ---- Celebración al cambiar de fase ----
  particleSys.renderPhaseBurst();

  // ---- Niebla ----
  _drawWarmFog(phaseIdx, streak);

  // ---- Contador de círculos completados (arriba izquierda) ----
  _drawRingCounter();

  _updateTimerHUD();
}

// ===== FONDO PROGRESIVO ======================================
// Todo se interpola con lerp → transiciones 100% suaves

function _drawProgressiveBackground(phaseIdx, streak) {
  noStroke();

  // ---- Luna (aparece gradualmente desde fase 0, crece hasta fase 4) ----
  const targetMoon = map(phaseIdx, 0, 4, 30, 140);
  bgMoonSize       = lerp(bgMoonSize, targetMoon, 0.015);
  const moonAlpha  = map(bgMoonSize, 30, 140, 50, 240);
  if (bgMoonSize > 5) {
    fill(245, 197, 24, moonAlpha * 0.08);  ellipse(width - 200, 130, bgMoonSize * 3.2);
    fill(232, 160, 48, moonAlpha * 0.06);  ellipse(width - 200, 130, bgMoonSize * 2.4);
    fill(245, 220, 120, moonAlpha);        ellipse(width - 200, 130, bgMoonSize);
    fill(74, 29, 92, moonAlpha * 0.6);    ellipse(width - 175, 118, bgMoonSize * 0.85);
  }

  // ---- Estrellas (intensidad crece con la fase) ----
  const targetStarA = map(phaseIdx, 0, 4, 60, 220);
  bgStarAlpha       = lerp(bgStarAlpha, targetStarA, 0.02);
  fill(245, 197, 24, bgStarAlpha);
  for (let i = 0; i < 100; i++) {
    const sx = (i * 239 + 11) % width;
    const sy = (i * 173 + 7)  % (height * 0.55);
    const twinkle = 0.5 + 0.5 * sin(frameCount * 0.035 + i * 0.8);
    const baseSize = i % 5 === 0 ? 4 : (i % 3 === 0 ? 2.5 : 1.5);
    ellipse(sx, sy, baseSize * twinkle);
  }

  // ---- Árboles (aparecen a partir de fase 2, se solidifican hacia fase 4) ----
  const targetTree = phaseIdx >= 2 ? map(phaseIdx, 2, 4, 40, 160) : 0;
  bgTreeAlpha      = lerp(bgTreeAlpha, targetTree, 0.015);
  if (bgTreeAlpha > 2) _drawDeadTrees(bgTreeAlpha);

  // ---- Fantasmas de fondo (aparecen a partir de fase 3, se hacen más visibles en fase 4) ----
  const targetGhostA = phaseIdx >= 3 ? map(phaseIdx, 3, 4, 15, 50) : 0;
  for (const g of bgGhosts) g.targetAlpha = targetGhostA;
  _updateAndDrawBgGhosts();

  // ---- Relámpagos ocasionales en fase 4 ----
  if (phaseIdx >= 4 && frameCount % 180 < 3) {
    fill(245, 220, 120, 12);
    rect(0, 0, width, height);
  }
}

function _drawDeadTrees(alpha) {
  fill(45, 18, 55, alpha);
  noStroke();
  const positions = [60, 220, 420, 680, 1050, 1360, 1600, 1780, 1900];
  for (const tx of positions) {
    const th = 130 + ((tx * 7) % 70);
    // Tronco
    rect(tx - 7, height - 50 - th, 14, th);
    // Ramas
    triangle(tx - 26, height - 50 - th * 0.5, tx + 26, height - 50 - th * 0.5, tx, height - 50 - th * 0.86);
    triangle(tx - 18, height - 50 - th * 0.33, tx + 18, height - 50 - th * 0.33, tx, height - 50 - th * 0.6);
  }
  // Suelo
  fill(45, 18, 55, alpha * 0.7);
  rect(0, height - 50, width, 50);
}

function _updateAndDrawBgGhosts() {
  noStroke();
  for (const g of bgGhosts) {
    g.alpha = lerp(g.alpha, g.targetAlpha, 0.02);
    if (g.alpha < 0.5) continue;

    g.y      -= g.speed;
    g.wobble += 0.018;
    if (g.y < -g.size) g.y = height + g.size;

    const wx = sin(g.wobble) * 16;
    const gx = g.x + wx;

    // Halo
    fill(255, 245, 230, g.alpha * 0.3);
    ellipse(gx, g.y, g.size * 1.8, g.size * 1.8);

    // Cuerpo
    fill(255, 245, 230, g.alpha);
    ellipse(gx, g.y - g.size * 0.2, g.size, g.size * 1.2);

    // Cola ondulada
    beginShape();
    vertex(gx - g.size / 2, g.y);
    for (let i = 0; i <= 4; i++) {
      vertex(
        gx - g.size / 2 + (g.size / 4) * i,
        g.y + (i % 2 === 0 ? g.size * 0.3 : g.size * 0.15)
      );
    }
    vertex(gx + g.size / 2, g.y);
    endShape(CLOSE);

    // Ojos
    fill(107, 45, 123, g.alpha);
    ellipse(gx - g.size * 0.15, g.y - g.size * 0.2, g.size * 0.18, g.size * 0.22);
    ellipse(gx + g.size * 0.15, g.y - g.size * 0.2, g.size * 0.18, g.size * 0.22);
  }
}

// ===== GLOW DE LA BOCA =======================================
// Ahora escala suavemente con 5 fases

function _drawMouthGlow(x, y, jawOpen, phaseIdx) {
  noStroke();
  const base = map(jawOpen, MOUTH_OPEN_THRESHOLD, 1, 30, 160);
  const size = base * map(phaseIdx, 0, 4, 1, 1.8);

  // Halo externo (púrpura en fases altas)
  if (phaseIdx >= 2) {
    const purpleA = map(phaseIdx, 2, 4, 8, 22);
    fill(180, 80, 200, purpleA);
    ellipse(x, y, size * 3.6);
  }
  if (phaseIdx >= 1) {
    fill(107, 45, 123, map(phaseIdx, 1, 4, 10, 28));
    ellipse(x, y, size * 2.6);
  }

  // Halo naranja (siempre presente, crece)
  fill(232, 160, 48, map(phaseIdx, 0, 4, 16, 34));
  ellipse(x, y, size * 2.0);

  // Halo amarillo interior
  fill(245, 197, 24, map(phaseIdx, 0, 4, 14, 36));
  ellipse(x, y, size * 1.2);

  // Punto central brillante
  fill(255, 220, 80, map(phaseIdx, 0, 4, 18, 40));
  ellipse(x, y, size * 0.5);

  // Pulso en fases 3+
  if (phaseIdx >= 3) {
    const pulse = 0.5 + 0.5 * sin(frameCount * 0.12);
    fill(255, 220, 80, 10 * pulse);
    ellipse(x, y, size * 5);
  }
}

// ===== NIEBLA ================================================

function _drawWarmFog(phaseIdx, streak) {
  noStroke();
  const targetFog = map(phaseIdx, 0, 4, 0.4, 2.5);
  bgFogIntensity  = lerp(bgFogIntensity, targetFog, 0.015);

  for (let i = 0; i < 6; i++) {
    const sway = sin(frameCount * 0.008 + i * 1.2) * 100;
    fill(107, 45, 123, (16 - i * 2) * bgFogIntensity);
    ellipse(width / 2 + sway, height - 20 - i * 28, width * 1.5, 55);
  }

  // Niebla naranja sutil en fase 4
  if (phaseIdx >= 4) {
    fill(232, 160, 48, 6);
    ellipse(width / 2, height - 100, width * 1.3, 120);
  }
}

// ===== INDICADOR DE FASE =====================================

function _drawRingCounter() {
  if (ringCycle <= 0) return;

  noStroke();
  // Fondo píldora
  fill(74, 29, 92, 170);
  rect(20, 20, 120, 44, 22);

  // Icono de explosión
  fill(232, 160, 48);
  textAlign(LEFT, CENTER);
  textSize(22);
  text('💥', 32, 42);

  // Número
  fill(255, 245, 230);
  textSize(24);
  text(`x${ringCycle}`, 66, 42);
}

// ===== GAME OVER =============================================

// Partículas de celebración del game over (independientes del sistema principal)
let goParticles    = [];
let goSpawnTimer   = 0;
let goMaxPhase     = 0; // fase máxima alcanzada (se guarda al entrar en gameover)

function drawGameOver() {
  _drawCameraBackground();

  // Overlay púrpura oscuro
  fill(42, 15, 60, 200);
  noStroke();
  rect(0, 0, width, height);

  // Estrellas de fondo (estáticas, doradas)
  fill(245, 197, 24, 120);
  for (let i = 0; i < 80; i++) {
    const sx      = (i * 239 + 11) % width;
    const sy      = (i * 173 + 7)  % height;
    const twinkle = 0.5 + 0.5 * sin(frameCount * 0.03 + i * 1.1);
    ellipse(sx, sy, (i % 5 === 0 ? 4 : 2) * twinkle);
  }

  // Partículas de celebración continua (salen desde los laterales)
  const dt = deltaTime / 1000;
  goSpawnTimer += dt;
  if (goSpawnTimer > 0.08) {
    goSpawnTimer = 0;
    for (let s = 0; s < 3; s++) {
      const fromLeft = random() > 0.5;
      goParticles.push({
        x:     fromLeft ? -10 : width + 10,
        y:     random(height * 0.15, height * 0.85),
        vx:    (fromLeft ? 1 : -1) * random(2, 5),
        vy:    random(-2, -0.5),
        life:  255,
        size:  random(6, 16),
        color: HALLOWEEN_COLORS[floor(random(HALLOWEEN_COLORS.length))],
        rot:   random(TWO_PI),
        rotS:  random(-0.08, 0.08),
        decay: random(2, 4),
      });
    }
  }

  // Actualizar y dibujar partículas de celebración
  noStroke();
  for (let i = goParticles.length - 1; i >= 0; i--) {
    const gp = goParticles[i];
    gp.x    += gp.vx;
    gp.y    += gp.vy;
    gp.vy   += 0.03;
    gp.vx   *= 0.995;
    gp.life -= gp.decay;
    gp.rot  += gp.rotS;
    if (gp.life <= 0) { goParticles.splice(i, 1); continue; }

    push();
    translate(gp.x, gp.y);
    rotate(gp.rot);
    fill(gp.color[0], gp.color[1], gp.color[2], gp.life);
    // Estrella de 4 puntas
    beginShape();
    for (let j = 0; j < 8; j++) {
      const a = (TWO_PI / 8) * j;
      const r = j % 2 === 0 ? gp.size : gp.size * 0.35;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();
  }

  // Niebla inferior cálida
  _drawWarmFog(4, 0);

  // ---- Panel principal ----
  const pw = 900, ph = 440;
  const px = width / 2 - pw / 2;
  const py = height / 2 - ph / 2;

  // Sombra del panel
  fill(42, 15, 60, 140);
  rect(px + 8, py + 10, pw, ph, 28);

  // Fondo crema del panel
  fill(255, 248, 238);
  rect(px, py, pw, ph, 28);

  // Borde doble: naranja exterior, coral interior
  stroke(232, 160, 48);
  strokeWeight(5);
  noFill();
  rect(px, py, pw, ph, 28);
  stroke(232, 93, 58, 120);
  strokeWeight(2);
  rect(px + 10, py + 10, pw - 20, ph - 20, 22);
  noStroke();

  textAlign(CENTER, CENTER);

  // Calabazas decorativas en las esquinas superiores
  textSize(44);
  text('🎃', px + 55, py + 48);
  text('🎃', px + pw - 55, py + 48);

  // Título
  fill(107, 45, 123);
  textSize(46);
  text('¡Buen trabajo!', width / 2, py + 60);

  // Línea divisoria decorativa
  stroke(232, 160, 48, 100);
  strokeWeight(2);
  line(px + 120, py + 95, px + pw - 120, py + 95);
  noStroke();

  // Subtexto
  fill(74, 29, 92, 180);
  textSize(20);
  text('Mantuviste la boca abierta durante', width / 2, py + 128);

  // Tiempo grande con fondo naranja (como las cajas de la referencia)
  const timeBoxW = 320, timeBoxH = 80;
  const tbx = width / 2 - timeBoxW / 2;
  const tby = py + 152;

  // Fondo naranja redondeado para el tiempo
  fill(232, 160, 48);
  rect(tbx, tby, timeBoxW, timeBoxH, 16);
  // Sombra inferior
  fill(196, 130, 20);
  rect(tbx, tby + timeBoxH - 8, timeBoxW, 8, 0, 0, 16, 16);

  // Texto del tiempo
  const mins = String(Math.floor(gameOverTime / 60)).padStart(2, '0');
  const secs = String(Math.floor(gameOverTime % 60)).padStart(2, '0');
  const ms   = String(Math.floor((gameOverTime % 1) * 10));
  fill(255, 248, 238);
  textSize(52);
  text(`${mins}:${secs}.${ms}`, width / 2, tby + timeBoxH / 2);

  // ---- Estadísticas (dos cajas debajo del tiempo) ----
  const statsY   = tby + timeBoxH + 28;
  const statsW   = 180;
  const statsH   = 70;
  const statsGap = 40;

  // Caja 1: Círculos completados
  const box1x = width / 2 - statsW - statsGap / 2;
  fill(107, 45, 123);
  rect(box1x, statsY, statsW, statsH, 12);
  fill(255, 245, 230);
  textSize(28);
  text(`${ringCycle}`, box1x + statsW / 2, statsY + 26);
  textSize(11);
  text('EXPLOSIONES', box1x + statsW / 2, statsY + 54);

  // Caja 2: Fase máxima
  const box2x = width / 2 + statsGap / 2;
  fill(232, 93, 58);
  rect(box2x, statsY, statsW, statsH, 12);
  fill(255, 245, 230);
  textSize(28);
  const phaseName = goMaxPhase < PHASES.length ? PHASES[goMaxPhase].name : '???';
  text(`${goMaxPhase + 1}/5`, box2x + statsW / 2, statsY + 26);
  textSize(11);
  text('FASE MÁXIMA', box2x + statsW / 2, statsY + 54);

  // ---- Cuenta atrás ----
  gameOverCountdown -= dt;
  fill(107, 45, 123, 140);
  textSize(16);
  text(`Nueva partida en ${Math.ceil(Math.max(0, gameOverCountdown))}...`, width / 2, py + ph - 28);

  // Barra de progreso visual para la cuenta atrás
  const cdProgress = 1 - Math.max(0, gameOverCountdown) / GAMEOVER_SHOW;
  fill(232, 160, 48, 60);
  rect(px + 60, py + ph - 12, (pw - 120) * cdProgress, 5, 3);

  if (gameOverCountdown <= 0) {
    goParticles = [];
    hudEl.classList.remove('hidden');
    _startNewRound();
  }
}

// ===== HELPERS ===============================================

function _drawCameraBackground() {
  background(74, 29, 92);
  if (capture && capture.elt.readyState >= 2) {
    const s    = Math.max(width / CAM_W, height / CAM_H);
    const offX = (width  - CAM_W * s) / 2;
    const offY = (height - CAM_H * s) / 2;
    push();
    translate(width + offX, offY);
    scale(-s, s);
    image(capture, 0, 0, CAM_W, CAM_H);
    pop();
  }
}

function _updateTimerHUD() {
  const t    = particleSys.mouthOpenTime;
  const mins = String(Math.floor(t / 60)).padStart(2, '0');
  const secs = String(Math.floor(t % 60)).padStart(2, '0');
  timerDisplay.textContent = `${mins}:${secs}`;
}

// ===== ANILLO MENGUANTE ======================================

function _updateShrinkRing(mouthOpen, mx, my, dt) {
  if (!mouthOpen) {
    // Si la boca se cierra, el anillo se resetea suavemente
    ringTimer = max(0, ringTimer - dt * 2);
    return;
  }

  ringTimer += dt;

  // Cada ciclo sucesivo es un poco más rápido (min 7s)
  const cycleDuration = max(7, RING_DURATION - ringCycle * 0.5);

  if (ringTimer >= cycleDuration) {
    // ¡Explosión!
    _triggerRingExplosion(mx, my);
    ringTimer = 0;
    ringCycle++;
  }
}

function _drawShrinkRing(mx, my) {
  if (ringTimer <= 0) return;

  const cycleDuration = max(7, RING_DURATION - ringCycle * 0.5);
  const progress      = ringTimer / cycleDuration; // 0 → 1
  const radius        = lerp(RING_MAX, RING_MIN, progress);

  // Color: de naranja dorado a rojo coral conforme se cierra
  const r = lerp(232, 232, progress);
  const g = lerp(160, 60,  progress);
  const b = lerp(48,  58,  progress);

  // Grosor: más grueso conforme se cierra
  const weight = lerp(2, 6, progress);

  noFill();

  // Anillo principal
  stroke(r, g, b, lerp(120, 255, progress));
  strokeWeight(weight);
  ellipse(mx, my, radius * 2);

  // Anillo fantasma exterior (halo pulsante)
  const pulse = 0.5 + 0.5 * sin(frameCount * 0.15);
  stroke(r, g, b, 30 + 30 * pulse);
  strokeWeight(1.5);
  ellipse(mx, my, radius * 2 + 24 - 10 * progress);

  // Arco de progreso (como un reloj vaciándose)
  stroke(245, 197, 24, lerp(80, 200, progress));
  strokeWeight(weight + 2);
  arc(mx, my, radius * 2 + 12, radius * 2 + 12, -HALF_PI, -HALF_PI + TWO_PI * progress);

  noStroke();

  // Brillo central cuando está casi cerrado
  if (progress > 0.7) {
    const glow = map(progress, 0.7, 1, 0, 35);
    fill(245, 197, 24, glow);
    ellipse(mx, my, radius * 3);
  }
}

function _triggerRingExplosion(mx, my) {
  // Más partículas en ciclos avanzados (25 base + 8 por ciclo, max 60)
  const count = min(60, 25 + ringCycle * 8);

  for (let i = 0; i < count; i++) {
    const angle = (TWO_PI / count) * i + random(-0.15, 0.15);
    const speed = random(5, 14) + ringCycle * 1.5;

    ringExplosions.push({
      x:    mx,
      y:    my,
      vx:   cos(angle) * speed,
      vy:   sin(angle) * speed,
      life: 255,
      size: random(4, 12 + ringCycle * 2),
      // Color aleatorio de la paleta cálida
      color: HALLOWEEN_COLORS[floor(random(HALLOWEEN_COLORS.length))],
      decay: random(4, 8),
      rot:   random(TWO_PI),
      rotS:  random(-0.1, 0.1),
    });
  }

  // También inyectar partículas "reales" al sistema principal como bonus
  const phaseIdx = particleSys.getCurrentPhase();
  const types    = PHASES[phaseIdx].types;
  const bonus    = min(20, 10 + ringCycle * 3);
  for (let i = 0; i < bonus; i++) {
    if (particleSys.particles.length >= MAX_PARTICLES) break;
    const type  = types[floor(random(types.length))];
    const angle = random(TWO_PI);
    const part  = new Particle(mx, my, type, window);
    part.vel    = createVector(cos(angle) * random(3, 8), sin(angle) * random(3, 8));
    part.lifetime = 300;
    particleSys.particles.push(part);
  }
}

function _updateAndDrawRingExplosions() {
  noStroke();
  for (let i = ringExplosions.length - 1; i >= 0; i--) {
    const p = ringExplosions[i];

    // Física
    p.x    += p.vx;
    p.y    += p.vy;
    p.vx   *= 0.95;
    p.vy   *= 0.95;
    p.vy   += 0.15; // gravedad leve
    p.life -= p.decay;
    p.rot  += p.rotS;

    if (p.life <= 0) {
      ringExplosions.splice(i, 1);
      continue;
    }

    // Dibujar como estrella de 4 puntas
    push();
    translate(p.x, p.y);
    rotate(p.rot);
    fill(p.color[0], p.color[1], p.color[2], p.life);
    beginShape();
    for (let j = 0; j < 8; j++) {
      const a = (TWO_PI / 8) * j;
      const r = j % 2 === 0 ? p.size : p.size * 0.35;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);

    // Halo
    fill(p.color[0], p.color[1], p.color[2], p.life * 0.2);
    ellipse(0, 0, p.size * 2.5);
    pop();
  }
}

// ===== AUDIO =================================================

async function loadAmbientSound(url) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    ambientBuffer = await audioCtx.decodeAudioData(buf);
  } catch (e) {
    console.warn('Could not load ambient sound:', e);
  }
}

function startAmbientSound() {
  if (!audioCtx || !ambientBuffer || soundStarted) return;
  try {
    const gain = audioCtx.createGain();
    gain.gain.value = 0.25;
    gain.connect(audioCtx.destination);
    ambientSource        = audioCtx.createBufferSource();
    ambientSource.buffer = ambientBuffer;
    ambientSource.loop   = true;
    ambientSource.connect(gain);
    ambientSource.start(0);
    soundStarted = true;
  } catch (e) {
    console.warn('Could not start ambient sound:', e);
  }
}
