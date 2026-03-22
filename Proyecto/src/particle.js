// ===== Partícula Halloween individual =====
// Tipos disponibles: 'sparkle', 'ghost', 'pumpkin', 'bat', 'candy'
// Cada tipo tiene su propio comportamiento de movimiento y su propio dibujo.
// El sistema de partículas (ParticleSystem) crea y gestiona estas instancias.
class Particle {
  // x, y  → posición inicial de spawn (encima de la boca del usuario)
  // type  → string con el tipo de partícula
  // p     → referencia al objeto window/p5 (necesario para acceder a funciones p5)
  constructor(x, y, type, p) {
    this.p        = p;
    this.pos      = p.createVector(x, y); // posición como vector p5 (facilita la suma con vel)
    this.type     = type;
    this.alive    = true;   // false cuando lifetime llega a 0 → ParticleSystem la elimina
    this.color    = HALLOWEEN_COLORS[Math.floor(Math.random() * HALLOWEEN_COLORS.length)];
    this.lifetime = 255;    // va de 255 a 0; también se usa como alpha al renderizar
    this.rotation = p.random(p.TWO_PI);  // ángulo inicial aleatorio
    this.rotSpeed = p.random(-0.08, 0.08); // velocidad de rotación (puede ser negativa)

    // Cada tipo inicializa sus propios parámetros de física y visual
    switch (type) {

      case 'sparkle':
        // Destello dorado-naranja, sale en cualquier dirección, pequeño y rápido
        this.vel   = p5.Vector.random2D().mult(p.random(2, 5)); // dirección aleatoria
        this.decay = p.random(4, 8);   // cuánto lifetime pierde por frame (más = vida más corta)
        this.size  = p.random(4, 10);
        this.color = [245, p.random(160, 220), p.random(20, 80)]; // dorado-naranja cálido
        break;

      case 'ghost':
        // Fantasma blanco que sube suavemente con oscilación lateral
        this.vel          = p.createVector(p.random(-1, 1), p.random(-3, -1)); // sube
        this.decay        = p.random(2, 4);  // vive más que los sparkles
        this.size         = p.random(20, 35);
        this.color        = [255, 245, 230]; // crema cálido
        this.wobbleOffset = p.random(p.TWO_PI); // fase del seno para la oscilación lateral
        break;

      case 'pumpkin':
        // Calabaza naranja que sale en dirección aleatoria con ligera tendencia a subir
        this.vel   = p5.Vector.random2D().mult(p.random(1, 3));
        this.vel.y -= 1; // componente hacia arriba extra
        this.decay = p.random(2, 4);
        this.size  = p.random(15, 28);
        this.color = [232, 160, 48]; // naranja dorado
        break;

      case 'bat':
        // Murciélago oscuro que sale rápido y aletea
        this.vel       = p.createVector(p.random(-4, 4), p.random(-4, -1)); // sube con variación horizontal
        this.decay     = p.random(1.5, 3);
        this.size      = p.random(18, 30);
        this.color     = [74, 29, 92]; // púrpura cálido
        this.wingPhase = p.random(p.TWO_PI); // fase inicial del aleteo (cada murciélago aletea diferente)
        break;

      case 'candy':
        // Caramelo de colores cálidos, sale en cualquier dirección
        this.vel   = p5.Vector.random2D().mult(p.random(1.5, 4));
        this.decay = p.random(3, 6);
        this.size  = p.random(8, 16);
        const candyColors = [[245, 197, 24], [232, 93, 58], [255, 245, 230]];
        this.color = candyColors[Math.floor(Math.random() * candyColors.length)];
        break;

      default:
        // Tipo desconocido: círculo genérico
        this.vel   = p5.Vector.random2D().mult(p.random(1, 3));
        this.decay = p.random(3, 6);
        this.size  = p.random(5, 12);
    }
  }

  // Se llama cada frame desde ParticleSystem.update()
  update() {
    const p = this.p;

    // Física básica: posición += velocidad
    this.pos.add(this.vel);

    // Fricción del aire: la velocidad se reduce un 2% cada frame
    this.vel.mult(0.98);

    // Envejecimiento: lifetime baja según el decay del tipo
    this.lifetime -= this.decay;

    // Rotación continua
    this.rotation += this.rotSpeed;

    // Comportamiento especial del fantasma: oscilación sinusoidal en X
    if (this.type === 'ghost') {
      this.pos.x += p.sin(p.frameCount * 0.05 + this.wobbleOffset) * 1.5;
    }

    // El murciélago actualiza su fase de aleteo para la animación de alas
    if (this.type === 'bat') {
      this.wingPhase += 0.15;
    }

    // Cuando lifetime llega a 0, marcamos la partícula para eliminar
    if (this.lifetime <= 0) this.alive = false;
  }

  // Se llama cada frame desde ParticleSystem.render()
  render() {
    const p     = this.p;
    const alpha = p.max(0, this.lifetime); // alpha = lifetime (255 → 0, se desvanece al morir)

    p.push();
    p.translate(this.pos.x, this.pos.y);
    p.rotate(this.rotation);
    p.noStroke();

    switch (this.type) {
      case 'sparkle': this.drawSparkle(p, alpha); break;
      case 'ghost':   this.drawGhost(p, alpha);   break;
      case 'pumpkin': this.drawPumpkin(p, alpha); break;
      case 'bat':     this.drawBat(p, alpha);     break;
      case 'candy':   this.drawCandy(p, alpha);   break;
      default:
        // Fallback: círculo de color genérico
        p.fill(this.color[0], this.color[1], this.color[2], alpha);
        p.ellipse(0, 0, this.size);
    }

    p.pop();
  }

  // ---- Métodos de dibujo individuales ----
  // Todos usan coordenadas relativas al origen (0,0) porque render() hace translate primero.
  // El parámetro alpha viene de lifetime (255-0) y se usa para el desvanecimiento.

  // Estrella de 8 puntas con halo de glow naranja
  drawSparkle(p, alpha) {
    p.fill(this.color[0], this.color[1], this.color[2], alpha);
    const s = this.size;

    // Forma de estrella: alterna vértices en radio exterior (s) e interior (s*0.4)
    p.beginShape();
    for (let i = 0; i < 8; i++) {
      const angle = (p.TWO_PI / 8) * i;
      const r     = i % 2 === 0 ? s : s * 0.4; // punta o valle
      p.vertex(p.cos(angle) * r, p.sin(angle) * r);
    }
    p.endShape(p.CLOSE);

    // Halo de glow: círculo semitransparente más grande
    p.fill(this.color[0], this.color[1], this.color[2], alpha * 0.3);
    p.ellipse(0, 0, s * 2.5);
  }

  // Fantasma clásico: cuerpo elíptico + cola ondulada + ojos + boca
  drawGhost(p, alpha) {
    const s = this.size;

    // Cuerpo principal (crema cálido)
    p.fill(255, 245, 230, alpha * 0.85);
    p.ellipse(0, -s * 0.2, s, s * 1.2);

    // Cola ondulada: zigzag de vértices a distintas alturas
    p.beginShape();
    p.vertex(-s / 2, 0);
    for (let i = 0; i <= 4; i++) {
      const x = -s / 2 + (s / 4) * i;
      const y = i % 2 === 0 ? s * 0.3 : s * 0.15; // alterna alto/bajo
      p.vertex(x, y);
    }
    p.vertex(s / 2, 0);
    p.endShape(p.CLOSE);

    // Ojos oscuros
    p.fill(107, 45, 123, alpha);
    p.ellipse(-s * 0.15, -s * 0.2, s * 0.18, s * 0.22);
    p.ellipse( s * 0.15, -s * 0.2, s * 0.18, s * 0.22);

    // Boca pequeña
    p.ellipse(0, s * 0.02, s * 0.15, s * 0.12);
  }

  // Calabaza naranja con tallo verde y cara de jack-o-lantern
  drawPumpkin(p, alpha) {
    const s = this.size;

    // Cuerpo naranja
    p.fill(232, 160, 48, alpha);
    p.ellipse(0, 0, s, s * 0.85);

    // Tallo verde
    p.fill(80, 140, 50, alpha);
    p.rect(-s * 0.06, -s * 0.5, s * 0.12, s * 0.2, 2);

    // Cara: dos ojos triangulares y boca en arco
    p.fill(74, 29, 92, alpha);
    p.triangle(-s * 0.2, -s * 0.1, -s * 0.08, -s * 0.1, -s * 0.14, -s * 0.25); // ojo izq
    p.triangle( s * 0.2, -s * 0.1,  s * 0.08, -s * 0.1,  s * 0.14, -s * 0.25); // ojo der
    p.arc(0, s * 0.08, s * 0.4, s * 0.2, 0, p.PI); // boca (semicírculo inferior)
  }

  // Murciélago con alas animadas usando sin(wingPhase)
  drawBat(p, alpha) {
    const s         = this.size;
    const wingAngle = p.sin(this.wingPhase) * 0.4; // ángulo de aleteo (-0.4 a +0.4 rad)

    p.fill(107, 45, 123, alpha);

    // Cuerpo elíptico central
    p.ellipse(0, 0, s * 0.3, s * 0.5);

    // Ala izquierda: rotada negativamente (sube cuando wingAngle > 0)
    p.push();
    p.rotate(-wingAngle);
    p.beginShape();
    p.vertex(0, 0);
    p.vertex(-s * 0.7, -s * 0.3);
    p.vertex(-s * 0.5, 0);
    p.vertex(-s * 0.8, s * 0.1);
    p.vertex(-s * 0.3, s * 0.05);
    p.endShape(p.CLOSE);
    p.pop();

    // Ala derecha: rotada positivamente (sube cuando wingAngle > 0)
    p.push();
    p.rotate(wingAngle);
    p.beginShape();
    p.vertex(0, 0);
    p.vertex(s * 0.7, -s * 0.3);
    p.vertex(s * 0.5, 0);
    p.vertex(s * 0.8, s * 0.1);
    p.vertex(s * 0.3, s * 0.05);
    p.endShape(p.CLOSE);
    p.pop();

    // Ojos rojos brillantes
    p.fill(232, 93, 58, alpha);
    p.ellipse(-s * 0.06, -s * 0.08, s * 0.08);
    p.ellipse( s * 0.06, -s * 0.08, s * 0.08);
  }

  // Caramelo: triángulo simple de colores cálidos
  drawCandy(p, alpha) {
    const s = this.size;
    p.fill(this.color[0], this.color[1], this.color[2], alpha);
    p.beginShape();
    p.vertex(0, -s * 0.6);    // punta superior
    p.vertex(-s * 0.3, s * 0.4); // base izquierda
    p.vertex( s * 0.3, s * 0.4); // base derecha
    p.endShape(p.CLOSE);
  }
}
