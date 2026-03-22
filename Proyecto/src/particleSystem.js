// ===== Sistema de partículas Halloween (5 fases progresivas) =====
class ParticleSystem {
  constructor(p) {
    this.p              = p;
    this.particles      = [];
    this.mouthOpenTime  = 0;
    this.currentStreak  = 0;
    this.lastFrameOpen  = false;

    // Fase actual y anterior (para detectar cambio de fase)
    this.currentPhaseIdx = 0;
    this.prevPhaseIdx    = -1;

    // Efecto de celebración al cambiar de fase
    this.phaseBurst = null; // { x, y, timer, phaseIdx }
  }

  update(mouthOpen, jawOpenValue, mouthX, mouthY) {
    const dt = this.p.deltaTime / 1000;

    if (mouthOpen) {
      this.mouthOpenTime += dt;
      this.currentStreak += dt;
      this.lastFrameOpen  = true;

      // Calcular fase actual
      this.prevPhaseIdx    = this.currentPhaseIdx;
      this.currentPhaseIdx = this._getPhaseIndex();

      // ¡Nueva fase! → lanzar celebración
      if (this.currentPhaseIdx > this.prevPhaseIdx && this.prevPhaseIdx >= 0) {
        this._triggerPhaseBurst(mouthX, mouthY);
      }

      this._spawnParticles(mouthX, mouthY, jawOpenValue);
    } else {
      this.currentStreak = 0;
      this.lastFrameOpen = false;
    }

    // Actualizar partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (!this.particles[i].alive) this.particles.splice(i, 1);
    }

    // Actualizar celebración de fase
    if (this.phaseBurst) {
      this.phaseBurst.timer -= dt;
      if (this.phaseBurst.timer <= 0) this.phaseBurst = null;
    }
  }

  _getPhaseIndex() {
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (this.currentStreak >= PHASES[i].time) return i;
    }
    return 0;
  }

  _spawnParticles(mx, my, jawValue) {
    const p     = this.p;
    const phase = PHASES[this.currentPhaseIdx];
    const types = phase.types;

    // Escala con apertura de boca (0.5x – 1.5x)
    const spawnCount = Math.ceil(
      phase.pps * p.map(jawValue, MOUTH_OPEN_THRESHOLD, 1, 0.5, 1.5)
    );

    for (let i = 0; i < spawnCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const type   = types[Math.floor(Math.random() * types.length)];
      const spawnX = mx + p.random(-35, 35);
      const spawnY = my + p.random(-25, 25);
      this.particles.push(new Particle(spawnX, spawnY, type, p));
    }
  }

  // Explosión de 40 partículas variadas al subir de fase
  _triggerPhaseBurst(mx, my) {
    const p     = this.p;
    const phase = PHASES[this.currentPhaseIdx];
    this.phaseBurst = { x: mx, y: my, timer: 2.5, phaseIdx: this.currentPhaseIdx };

    for (let i = 0; i < 40; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const type   = phase.types[Math.floor(Math.random() * phase.types.length)];
      const angle  = (p.TWO_PI / 40) * i;
      const speed  = p.random(4, 10);
      const part   = new Particle(mx, my, type, p);
      // Sobreescribir velocidad para que salgan en anillo
      part.vel = p.createVector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      part.lifetime = 300; // un poco más de vida
      this.particles.push(part);
    }
  }

  render() {
    for (const particle of this.particles) {
      particle.render();
    }
  }

  // Feedback visual de celebración (solo anillos, sin texto)
  renderPhaseBurst() {
    if (!this.phaseBurst) return;
    const p     = this.p;
    const pb    = this.phaseBurst;
    const alpha = p.map(pb.timer, 2.5, 0, 255, 0);

    // Anillo expansivo
    const ringSize = p.map(pb.timer, 2.5, 0, 50, 500);
    p.noFill();
    p.stroke(232, 160, 48, alpha * 0.5);
    p.strokeWeight(4);
    p.ellipse(pb.x, pb.y, ringSize);
    p.stroke(245, 197, 24, alpha * 0.3);
    p.strokeWeight(2);
    p.ellipse(pb.x, pb.y, ringSize * 1.4);
    p.noStroke();
  }

  getCurrentPhase() {
    return this.currentPhaseIdx;
  }

  getPhaseProgress() {
    // Progreso dentro de la fase actual (0-1)
    const curr = PHASES[this.currentPhaseIdx];
    const next = PHASES[this.currentPhaseIdx + 1];
    if (!next) return 1;
    return Math.min(1, (this.currentStreak - curr.time) / (next.time - curr.time));
  }

  getParticleCount() {
    return this.particles.length;
  }

  reset() {
    this.particles      = [];
    this.mouthOpenTime  = 0;
    this.currentStreak  = 0;
    this.lastFrameOpen  = false;
    this.currentPhaseIdx = 0;
    this.prevPhaseIdx    = -1;
    this.phaseBurst      = null;
  }
}
